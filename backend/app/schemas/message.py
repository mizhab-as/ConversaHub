from pydantic import BaseModel, Field


class Message(BaseModel):
    """
    Generic message container for API notifications and errors.
    """
    message: str = Field(..., description="Details of the response status.")
