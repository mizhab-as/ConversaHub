from typing import Optional, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.token import RefreshToken
from app.repositories.base import BaseRepository


class TokenRepository(BaseRepository[RefreshToken]):
    """
    Token repository handling operations on refresh tokens.
    Implements security features like selective and bulk token revocation.
    """
    def __init__(self, db: AsyncSession):
        super().__init__(RefreshToken, db)

    async def get_by_token(self, token: str) -> Optional[RefreshToken]:
        """
        Retrieves a refresh token by its raw string.
        """
        query = select(RefreshToken).where(RefreshToken.token == token)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def revoke_token(self, token: str) -> None:
        """
        Marks a refresh token as revoked by modifying the object state.
        """
        db_token = await self.get_by_token(token)
        if db_token:
            db_token.is_revoked = True
            self.db.add(db_token)
            await self.db.commit()

    async def revoke_all_user_tokens(self, user_id: int) -> None:
        """
        Revokes all refresh tokens for a user by modifying object states.
        """
        query = select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)
        result = await self.db.execute(query)
        active_tokens = result.scalars().all()
        for t in active_tokens:
            t.is_revoked = True
            self.db.add(t)
        await self.db.commit()
