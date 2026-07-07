from typing import Optional
from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str = Field(..., description="JWT access token.")
    refresh_token: str = Field(..., description="JWT refresh token.")
    token_type: str = Field("bearer", description="Token scheme.")


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="The rolling refresh token.")
