"""
Titan Supply Chain AI — Enterprise Platform
Backend Configuration Module
"""

import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Titan Supply Chain AI"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/demandforecaster"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "demandforecaster"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = ""  # defaults to REDIS_URL if empty

    # Observability
    SENTRY_DSN: str = ""  # Set in production
    SENTRY_TRACES_SAMPLE_RATE: float = 0.2
    LOG_JSON: bool = False  # True in production
    LOG_LEVEL: str = "INFO"

    # JWT
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ML
    ML_MODEL_PATH: str = "./ml/models"

    # Email
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL_TO: str = ""

    # LLM (pluggable interface — configured later)
    LLM_PROVIDER: str = "none"  # none | openai | gemini | ollama
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def sync_database_url(self) -> str:
        return self.DATABASE_URL.replace("+asyncpg", "")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
