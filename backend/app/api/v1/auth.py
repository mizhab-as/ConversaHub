from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User
from app.repositories.token import TokenRepository
from app.repositories.user import UserRepository
from app.schemas.message import Message
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.
    Validates email uniqueness and hashes passwords before storage.
    """
    user_repo = UserRepository(db)
    
    # 1. Check if user already exists
    existing_user = await user_repo.get_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
        
    # 2. Restrict non-customer signups in production for security
    role = user_in.role or "customer"
    if settings.ENVIRONMENT == "production" and role != "customer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration with elevated roles is restricted in production.",
        )

    # 3. Create user record
    hashed_password = security.get_password_hash(user_in.password)
    user_data = {
        "email": user_in.email,
        "hashed_password": hashed_password,
        "role": role,
        "is_active": True,
    }
    
    new_user = await user_repo.create(obj_in=user_data)
    return new_user


@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth2 compatible token login. Receives form-encoded email (username) and password.
    Returns access token, refresh token, and sets the refresh token in an HTTP-only cookie.
    """
    user_repo = UserRepository(db)
    token_repo = TokenRepository(db)
    
    # 1. Authenticate user credentials
    user = await user_repo.get_by_email(form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated.",
        )

    # 2. Create JWT Access & Refresh tokens
    access_token = security.create_access_token(subject=user.id, role=user.role)
    refresh_token_str = security.create_refresh_token(subject=user.id)
    
    # 3. Store the Refresh Token in the database
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    token_data = {
        "token": refresh_token_str,
        "user_id": user.id,
        "expires_at": expires_at.replace(tzinfo=None),  # Remove timezone for SQLite compatibility
        "is_revoked": False,
    }
    await token_repo.create(obj_in=token_data)

    # 4. Set Refresh Token in an HTTP-only Cookie for security (prevents XSS theft)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_str,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_str,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh(
    response: Response,
    request: Request,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh JWT access tokens.
    Implements Rolling Refresh Token Rotation (RTR) to detect token replay/theft.
    """
    token_repo = TokenRepository(db)
    user_repo = UserRepository(db)
    
    # If the token is not in the cookies, attempt to extract it from the JSON body
    if not refresh_token:
        try:
            body = await request.json()
            refresh_token = body.get("refresh_token")
        except Exception:
            pass

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    # 1. Decode token
    try:
        payload = security.decode_token(refresh_token)
        token_type = payload.get("type")
        if token_type != "refresh":
            raise jwt.PyJWTError()
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise jwt.PyJWTError()
        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Clear identity map cache and discard stale transaction snapshots in tests
    await db.rollback()
    db.expire_all()

    # 2. Fetch token from database
    db_token = await token_repo.get_by_token(refresh_token)
    
    # REPLAY ATTACK DETECTION:
    # If the token exists but is already revoked, it suggests a stolen token replay!
    # As a nuclear option, we revoke ALL active tokens for this user.
    if db_token and db_token.is_revoked:
        await token_repo.revoke_all_user_tokens(user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session compromised. Please re-authenticate.",
        )

    if not db_token or db_token.expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or invalid",
        )

    # 3. Retrieve user
    user = await user_repo.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account deactivated or missing",
        )

    # 4. Generate new Access and Refresh tokens (RTR Rotation)
    new_access_token = security.create_access_token(subject=user.id, role=user.role)
    new_refresh_token_str = security.create_refresh_token(subject=user.id)

    # 5. Revoke old token and store new token in database
    await token_repo.revoke_token(refresh_token)
    
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_token_data = {
        "token": new_refresh_token_str,
        "user_id": user.id,
        "expires_at": new_expires_at.replace(tzinfo=None),
        "is_revoked": False,
    }
    await token_repo.create(obj_in=new_token_data)

    # 6. Set updated Refresh Token Cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token_str,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token_str,
        "token_type": "bearer",
    }


@router.post("/logout", response_model=Message)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes the current refresh token, terminating the active session.
    """
    token_repo = TokenRepository(db)
    if refresh_token:
        # Revoke the refresh token in database
        await token_repo.revoke_token(refresh_token)
        
    # Clear the refresh token cookie
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get profile information of the currently authenticated user.
    """
    return current_user
