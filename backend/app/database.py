"""
Database connection and session management.
Uses SQLAlchemy async engine with PostgreSQL.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


import sys
from sqlalchemy.pool import NullPool

import sys
import multiprocessing

# Determine if running inside a Celery worker
process_name = multiprocessing.current_process().name.lower()
IS_CELERY = "celery" in sys.argv[0] or "worker" in process_name

engine_kwargs = {
    "echo": settings.APP_DEBUG,
    "pool_pre_ping": True,
}

if IS_CELERY:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

# Session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
