from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """
    User repository handling specific user operations.
    """
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Retrieves a user by their unique email address.
        Useful for login validation and signup checks.
        """
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self) -> List[User]:
        """
        Returns all registered users ordered by ID (oldest first).
        Used by the admin user management panel.
        """
        query = select(User).order_by(User.id)
        result = await self.db.execute(query)
        return list(result.scalars().all())
