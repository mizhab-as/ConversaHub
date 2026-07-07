from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="The user's unique email address.")
    is_active: Optional[bool] = Field(True, description="Indicates if the user account is active.")
    role: Optional[str] = Field("customer", description="The role assigned to the user (customer, agent, admin).")


class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="Valid email address.")
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters).")
    role: Optional[str] = Field("customer", description="Role (defaults to customer).")


class UserUpdate(BaseModel):
    password: Optional[str] = Field(None, min_length=8, description="Update password.")
    role: Optional[str] = Field(None, description="Update user role.")
    is_active: Optional[bool] = Field(None, description="Set account status.")


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    role: str
    created_at: datetime
    updated_at: datetime

    class ConfigDict:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
