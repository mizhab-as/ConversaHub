from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Abstract base repository providing common CRUD operations.
    Conforms to the Repository Pattern to decouple data access from business logic.
    """
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: Any) -> Optional[ModelType]:
        """
        Retrieves a single record by its primary key ID.
        """
        return await self.db.get(self.model, id)

    async def get_multi(self, *, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """
        Retrieves multiple records with optional pagination offsets.
        """
        query = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, *, obj_in: Dict[str, Any]) -> ModelType:
        """
        Creates a new record and commits it to the database.
        """
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, *, db_obj: ModelType, obj_in: Dict[str, Any]) -> ModelType:
        """
        Updates an existing record with new values.
        """
        for field in obj_in:
            if hasattr(db_obj, field):
                setattr(db_obj, field, obj_in[field])
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def remove(self, *, id: int) -> Optional[ModelType]:
        """
        Removes a record from the database by its ID.
        """
        obj = await self.db.get(self.model, id)
        if obj:
            await self.db.delete(obj)
            await self.db.commit()
        return obj
