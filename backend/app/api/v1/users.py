from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RoleChecker, get_current_active_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserResponse

router = APIRouter()

require_admin = RoleChecker(["admin"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all registered users.
    Admin only — used for the user management panel.
    """
    user_repo = UserRepository(db)
    users = await user_repo.get_all()
    return users


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Change a user's role (customer / agent / admin).
    Admin only. An admin cannot demote themselves.
    """
    new_role = role_data.get("role", "").lower()
    if new_role not in ("customer", "agent", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: customer, agent, admin",
        )
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role.",
        )

    user_repo = UserRepository(db)
    target = await user_repo.get(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updated = await user_repo.update(db_obj=target, obj_in={"role": new_role})
    return updated


@router.put("/{user_id}/active", response_model=UserResponse)
async def toggle_user_active(
    user_id: int,
    active_data: dict,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate or deactivate a user account.
    Admin only. Cannot deactivate yourself.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    is_active = bool(active_data.get("is_active", True))
    user_repo = UserRepository(db)
    target = await user_repo.get(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updated = await user_repo.update(db_obj=target, obj_in={"is_active": is_active})
    return updated


@router.delete("/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently delete a user account.
    Admin only. Cannot delete yourself.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    user_repo = UserRepository(db)
    target = await user_repo.get(user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await user_repo.remove(id=user_id)
    return {"message": "User deleted successfully", "id": user_id}
