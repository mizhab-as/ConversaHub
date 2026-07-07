from fastapi import APIRouter, Depends

from app.api.deps import RoleChecker
from app.models.user import User
from app.schemas.message import Message

router = APIRouter()


@router.get("/customer-only", response_model=Message)
async def customer_route(
    current_user: User = Depends(RoleChecker(allowed_roles=["customer", "agent", "admin"]))
):
    """
    Endpoint accessible by anyone authenticated (Customer, Agent, Admin).
    """
    return {"message": f"Hello {current_user.email}! You accessed the customer portal as a {current_user.role}."}


@router.get("/agent-only", response_model=Message)
async def agent_route(
    current_user: User = Depends(RoleChecker(allowed_roles=["agent", "admin"]))
):
    """
    Endpoint accessible ONLY by Support Agents and Admins.
    """
    return {"message": f"Welcome back, {current_user.role}! You accessed the Agent Escalation Dashboard."}


@router.get("/admin-only", response_model=Message)
async def admin_route(
    current_user: User = Depends(RoleChecker(allowed_roles=["admin"]))
):
    """
    Endpoint accessible ONLY by Admins.
    """
    return {"message": f"Access Granted, Admin! You accessed the system configuration settings."}
