import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.token import RefreshToken


@pytest.mark.asyncio
async def test_auth_signup_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test that a customer user can sign up successfully.
    """
    signup_data = {
        "email": "customer@example.com",
        "password": "strongpassword123",
        "role": "customer"
    }
    
    response = await client.post("/api/v1/auth/signup", json=signup_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == "customer@example.com"
    assert data["role"] == "customer"
    assert "id" in data
    assert "hashed_password" not in data  # Sensitive fields must never leak!

    # Check database status
    query = select(User).where(User.email == "customer@example.com")
    result = await db_session.execute(query)
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.role == "customer"


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    """
    Test that signing up with an already registered email throws an error.
    """
    signup_data = {
        "email": "duplicate@example.com",
        "password": "password123"
    }
    
    # First signup
    response = await client.post("/api/v1/auth/signup", json=signup_data)
    assert response.status_code == 201
    
    # Duplicate signup
    response_dup = await client.post("/api/v1/auth/signup", json=signup_data)
    assert response_dup.status_code == 400
    assert "already exists" in response_dup.json()["detail"]


@pytest.mark.asyncio
async def test_auth_login_flow(client: AsyncClient):
    """
    Test user authentication (login) with email and password form.
    Verify response returns tokens and sets the secure HttpOnly cookie.
    """
    # 1. Sign up user
    signup_data = {
        "email": "login@example.com",
        "password": "loginpassword123"
    }
    await client.post("/api/v1/auth/signup", json=signup_data)

    # 2. Login
    login_data = {
        "username": "login@example.com",
        "password": "loginpassword123"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    
    # 3. Check Cookie headers
    assert "refresh_token" in response.cookies
    assert response.cookies["refresh_token"] == data["refresh_token"]


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """
    Test login returns 401 when given incorrect password.
    """
    signup_data = {
        "email": "invalid@example.com",
        "password": "correctpassword123"
    }
    await client.post("/api/v1/auth/signup", json=signup_data)

    login_data = {
        "username": "invalid@example.com",
        "password": "wrongpassword"
    }
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_replay_detection(client: AsyncClient, db_session: AsyncSession):
    """
    Test Refresh Token Rotation (RTR) and verification logic.
    Also test the replay attack handler (multiple use of same token).
    """
    # 1. Signup and login
    email = "rtr@example.com"
    await client.post("/api/v1/auth/signup", json={"email": email, "password": "rtrpassword123"})
    login_resp = await client.post("/api/v1/auth/login", data={"username": email, "password": "rtrpassword123"})
    tokens = login_resp.json()
    refresh_token = tokens["refresh_token"]

    # 2. Use refresh token to rotate sessions
    # Pass token in payload
    refresh_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_resp.status_code == 200
    rotated_tokens = refresh_resp.json()
    
    assert rotated_tokens["access_token"] != tokens["access_token"]
    assert rotated_tokens["refresh_token"] != tokens["refresh_token"]

    # Check db: old token must be revoked, new token must be active
    # (Since we are using transaction isolation, we need to refresh the db_session)
    
    # 3. REPLAY ATTACK DETECTION test:
    # Clear cookies so the new rotated cookie token isn't automatically sent,
    # forcing the API to extract the old token from the JSON body.
    client.cookies.clear()
    
    replay_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert replay_resp.status_code == 401
    assert "compromised" in replay_resp.json()["detail"]


@pytest.mark.asyncio
async def test_role_based_access_control(client: AsyncClient):
    """
    Test permission checking across Customer, Agent, and Admin roles.
    """
    # 1. Sign up Customer, Agent, and Admin users
    await client.post("/api/v1/auth/signup", json={"email": "cust@test.com", "password": "password123", "role": "customer"})
    await client.post("/api/v1/auth/signup", json={"email": "agent@test.com", "password": "password123", "role": "agent"})
    await client.post("/api/v1/auth/signup", json={"email": "admin@test.com", "password": "password123", "role": "admin"})

    # 2. Login to retrieve respective authorization tokens
    cust_login = await client.post("/api/v1/auth/login", data={"username": "cust@test.com", "password": "password123"})
    agent_login = await client.post("/api/v1/auth/login", data={"username": "agent@test.com", "password": "password123"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "password123"})

    cust_token = cust_login.json()["access_token"]
    agent_token = agent_login.json()["access_token"]
    admin_token = admin_login.json()["access_token"]

    # 3. Test RBAC endpoints with Customer Token
    headers_cust = {"Authorization": f"Bearer {cust_token}"}
    
    resp = await client.get("/api/v1/test-rbac/customer-only", headers=headers_cust)
    assert resp.status_code == 200
    
    resp = await client.get("/api/v1/test-rbac/agent-only", headers=headers_cust)
    assert resp.status_code == 403  # Forbidden!
    
    resp = await client.get("/api/v1/test-rbac/admin-only", headers=headers_cust)
    assert resp.status_code == 403  # Forbidden!

    # 4. Test RBAC endpoints with Agent Token
    headers_agent = {"Authorization": f"Bearer {agent_token}"}
    
    resp = await client.get("/api/v1/test-rbac/customer-only", headers=headers_agent)
    assert resp.status_code == 200
    
    resp = await client.get("/api/v1/test-rbac/agent-only", headers=headers_agent)
    assert resp.status_code == 200
    
    resp = await client.get("/api/v1/test-rbac/admin-only", headers=headers_agent)
    assert resp.status_code == 403  # Forbidden!

    # 5. Test RBAC endpoints with Admin Token
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    resp = await client.get("/api/v1/test-rbac/customer-only", headers=headers_admin)
    assert resp.status_code == 200
    
    resp = await client.get("/api/v1/test-rbac/agent-only", headers=headers_admin)
    assert resp.status_code == 200
    
    resp = await client.get("/api/v1/test-rbac/admin-only", headers=headers_admin)
    assert resp.status_code == 200  # Allowed!
