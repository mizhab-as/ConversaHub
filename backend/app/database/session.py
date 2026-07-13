from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Create the async engine.
# echo=True prints SQL queries to standard out (great for development, disable in production)
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
)

# Async session factory
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency generator for obtaining an async database session.
    Automatically closes the session after request lifecycle is complete.
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables() -> None:
    """
    Creates all database tables.
    Convenient for zero-dependency SQLite local development.
    """
    from app.database.base import Base
    import app.models  # Ensure models are loaded into Base metadata
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_demo_users() -> None:
    """
    Seeds default demo users if they do not exist.
    Ensures that the demo credentials displayed on the login screen are fully functional.
    """
    from app.repositories.user import UserRepository
    from app.core.security import get_password_hash
    
    demo_users = [
        {"email": "admin@demo.com", "role": "admin", "password": "password123"},
        {"email": "agent@demo.com", "role": "agent", "password": "password123"},
        {"email": "customer@demo.com", "role": "customer", "password": "password123"},
    ]
    
    async with async_session_maker() as db:
        user_repo = UserRepository(db)
        for user_info in demo_users:
            existing = await user_repo.get_by_email(user_info["email"])
            if not existing:
                hashed = get_password_hash(user_info["password"])
                await user_repo.create(obj_in={
                    "email": user_info["email"],
                    "hashed_password": hashed,
                    "role": user_info["role"],
                    "is_active": True,
                })
