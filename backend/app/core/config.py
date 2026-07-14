import os
from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl, BeforeValidator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True
    )

    # General API Configuration
    PROJECT_NAME: str = "ConversaHub"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Security & JWT Configuration
    # In a production environment, generate a strong random secret using `openssl rand -hex 32`
    SECRET_KEY: str = "super_secret_key_change_me_in_production_1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database Configuration
    DATABASE_PROVIDER: str = "sqlite"  # "sqlite" or "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "conversahub"
    POSTGRES_PASSWORD: str = "conversahub_password"
    POSTGRES_DB: str = "conversahub_db"
    
    # We construct the async database URI
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: Any) -> Any:
        if isinstance(v, str):
            return v
        
        values = info.data
        provider = values.get("DATABASE_PROVIDER", "sqlite")
        
        if provider == "sqlite":
            return "sqlite+aiosqlite:///./conversahub.db"
        
        return f"postgresql+asyncpg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}:{values.get('POSTGRES_PORT')}/{values.get('POSTGRES_DB')}"

    # Cache Configuration (Redis)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: Optional[str] = None

    # AI API Keys
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: Optional[str], info: Any) -> Any:
        if isinstance(v, str):
            return v
        
        values = info.data
        return f"redis://{values.get('REDIS_HOST')}:{values.get('REDIS_PORT')}/0"


settings = Settings()
