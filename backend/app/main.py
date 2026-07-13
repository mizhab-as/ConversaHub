from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.core.config import settings
from app.database.session import get_db

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis global client holder
redis_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifecycle events context manager.
    Initializes and cleans up connections.
    """
    global redis_client
    logger.info("Initializing application connections...")
    
    # 1. Initialize Redis connection
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("Successfully connected to Redis.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        redis_client = None

    # 2. Automatically create database tables for SQLite in local development
    if settings.DATABASE_PROVIDER == "sqlite":
        logger.info("Local SQLite detected. Creating database tables...")
        from app.database.session import create_tables, seed_demo_users
        try:
            await create_tables()
            logger.info("Database tables initialized successfully.")
            await seed_demo_users()
            logger.info("Default demo users checked/seeded successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database tables or seed demo users: {e}")

    yield
    
    # 2. Cleanup resources
    if redis_client:
        logger.info("Closing Redis connection...")
        await redis_client.close()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from app.api.v1 import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Monitoring"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check endpoint to verify database and cache connectivity.
    Essential for Kubernetes or PaaS health check routines.
    """
    db_status = "unhealthy"
    redis_status = "unhealthy"
    
    # Check Database connection
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = "healthy"
    except Exception as e:
        logger.error(f"Health check: Database is down: {e}")
        
    # Check Redis connection
    if redis_client:
        try:
            if await redis_client.ping():
                redis_status = "healthy"
        except Exception as e:
            logger.error(f"Health check: Redis is down: {e}")

    # Overall health is determined by DB. Redis is optional in SQLite local development.
    if settings.DATABASE_PROVIDER == "sqlite":
        is_overall_healthy = db_status == "healthy"
    else:
        is_overall_healthy = db_status == "healthy" and redis_status == "healthy"
        
    status_code = 200 if is_overall_healthy else 503

    return {
        "status": "healthy" if is_overall_healthy else "unhealthy",
        "services": {
            "database": db_status,
            "redis": redis_status,
        }
    }


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API. Access API docs at {settings.API_V1_STR}/docs"
    }
