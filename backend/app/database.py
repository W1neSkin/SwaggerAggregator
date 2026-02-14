"""
Database connection setup.
Uses async SQLAlchemy with asyncpg driver for PostgreSQL.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Fix for Neon/cloud PostgreSQL: asyncpg uses "ssl" not "sslmode"
db_url = settings.DATABASE_URL.replace("sslmode=", "ssl=")

# Create async engine
# echo=True for development SQL logging (set to False in production)
engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,  # Verify connections before using them
)

# Session factory for creating async database sessions
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncSession:
    """
    Dependency that provides a database session.
    Used with FastAPI's Depends() for automatic session management.
    Session is automatically closed after the request completes.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
