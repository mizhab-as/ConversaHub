from typing import Optional
from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="The user's query or message to send to the support agent.")
    conversation_id: Optional[str] = Field(None, description="Optional conversation UUID to track persistent memory.")


class ChatMessageResponse(BaseModel):
    response: str = Field(..., description="The AI support agent's output response (Markdown formatted).")
    routing_target: str = Field(..., description="The computed routing classification (rag, escalate, or general).")
    routing_reason: str = Field(..., description="The triaging reasoning explaining the classification.")
