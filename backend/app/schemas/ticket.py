from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TicketBase(BaseModel):
    subject: str = Field(..., min_length=2, max_length=255, description="Brief summary of the issue.")
    description: str = Field(..., min_length=10, description="Detailed explanation of the support request.")
    priority: str = Field("medium", description="Priority level: low, medium, or high.")


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Ticket status: open, assigned, or resolved.")
    priority: Optional[str] = Field(None, description="Priority level: low, medium, or high.")
    assigned_agent_id: Optional[int] = Field(None, description="User ID of the assigned support staff member.")


class TicketResponse(TicketBase):
    id: int
    user_id: int
    assigned_agent_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
