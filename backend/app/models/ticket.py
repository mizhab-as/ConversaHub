from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Ticket(Base):
    """
    SQLAlchemy model representing a customer support Ticket.
    Enables tracking issue status, priority, assignments, and resolution.
    """
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_agent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False)  # open, assigned, resolved
    priority: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)  # low, medium, high
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), server_default=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])
