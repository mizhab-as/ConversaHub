import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.user import User

@pytest.mark.asyncio
async def test_admin_user_management_flow(client: AsyncClient, db_session):
    """
    Test Admin user management endpoints:
    1. Only Admins can list users.
    2. Admins can update roles.
    3. Admins can toggle active/inactive status.
    4. Admins can delete users.
    5. Admins cannot deactivate or delete themselves.
    """
    # 1. Sign up admin, customer, and agent
    admin_email = "admin_mgt@example.com"
    cust_email = "cust_mgt@example.com"
    password = "password123"

    # Create admin
    await client.post("/api/v1/auth/signup", json={"email": admin_email, "password": password, "role": "admin"})
    admin_login = await client.post("/api/v1/auth/login", data={"username": admin_email, "password": password})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create customer
    await client.post("/api/v1/auth/signup", json={"email": cust_email, "password": password, "role": "customer"})
    cust_login = await client.post("/api/v1/auth/login", data={"username": cust_email, "password": password})
    cust_token = cust_login.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    cust_id = cust_login.json().get("user", {}).get("id")

    # If signup doesn't return user info directly, we retrieve users to get IDs
    users_resp = await client.get("/api/v1/users", headers=admin_headers)
    assert users_resp.status_code == 200
    user_list = users_resp.json()
    
    admin_user = next(u for u in user_list if u["email"] == admin_email)
    customer_user = next(u for u in user_list if u["email"] == cust_email)

    # 2. Verify non-admin (customer) cannot list users (RBAC check)
    failed_list = await client.get("/api/v1/users", headers=cust_headers)
    assert failed_list.status_code == 403

    # 3. Toggle active status of customer
    deactivate_resp = await client.put(
        f"/api/v1/users/{customer_user['id']}/active",
        json={"is_active": False},
        headers=admin_headers
    )
    assert deactivate_resp.status_code == 200
    assert deactivate_resp.json()["is_active"] is False

    # 4. Verify admin cannot deactivate themselves
    self_deactivate = await client.put(
        f"/api/v1/users/{admin_user['id']}/active",
        json={"is_active": False},
        headers=admin_headers
    )
    assert self_deactivate.status_code == 400

    # 5. Swap customer role to agent
    role_resp = await client.put(
        f"/api/v1/users/{customer_user['id']}/role",
        json={"role": "agent"},
        headers=admin_headers
    )
    assert role_resp.status_code == 200
    assert role_resp.json()["role"] == "agent"

    # 6. Delete user account
    delete_resp = await client.delete(
        f"/api/v1/users/{customer_user['id']}",
        headers=admin_headers
    )
    assert delete_resp.status_code == 200
    assert delete_resp.json()["message"] == "User deleted successfully"

    # Verify user is gone from database
    post_delete_list = await client.get("/api/v1/users", headers=admin_headers)
    assert not any(u["id"] == customer_user["id"] for u in post_delete_list.json())

    # 7. Verify admin cannot delete themselves
    self_delete = await client.delete(
        f"/api/v1/users/{admin_user['id']}",
        headers=admin_headers
    )
    assert self_delete.status_code == 400
