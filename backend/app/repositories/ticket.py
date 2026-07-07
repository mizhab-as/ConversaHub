from typing import List, Optional
from sqlalchemy import select

from app.models.ticket import Ticket
from app.repositories.base import BaseRepository


class TicketRepository(BaseRepository[Ticket]):
    """
    Repository class executing database transactions for Support Tickets.
    """
    def __init__(self, db):
        super().__init__(model=Ticket, db=db)

    async def get_all_by_user(self, user_id: int) -> List[Ticket]:
        """
        Retrieves all tickets opened by a specific customer.
        """
        query = select(Ticket).where(Ticket.user_id == user_id).order_by(Ticket.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_unassigned(self) -> List[Ticket]:
        """
        Retrieves all open/unassigned tickets in the support queue.
        """
        query = (
            select(Ticket)
            .where(Ticket.assigned_agent_id == None, Ticket.status != "resolved")
            .order_by(Ticket.created_at.asc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_all_active(self) -> List[Ticket]:
        """
        Retrieves all tickets that are not yet marked as resolved.
        """
        query = select(Ticket).where(Ticket.status != "resolved").order_by(Ticket.created_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()
