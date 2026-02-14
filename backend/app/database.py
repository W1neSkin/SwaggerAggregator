"""
Database connection setup.
Uses async SQLAlchemy with asyncpg driver for PostgreSQL.
"""

import ssl as ssl_module
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _prepare_db_url(raw_url: str) -> tuple[str, dict]:
    """
    Clean the DATABASE_URL for asyncpg compatibility.
    Neon and other cloud providers add query params (sslmode, channel_binding)
    that asyncpg doesn't understand. We strip them and pass SSL via connect_args.
    """
    parsed = urlparse(raw_url)
    params = parse_qs(parsed.query)

    # Detect if SSL is needed (sslmode=require or ssl=require)
    needs_ssl = "sslmode" in params or "ssl" in params

    # Remove ALL query params — asyncpg only needs host/port/user/pass/db
    clean_url = urlunparse(parsed._replace(query=""))

    # Build connect_args for SSL if needed
    connect_args = {}
    if needs_ssl:
        # Create a permissive SSL context (Neon uses self-managed certs)
        ctx = ssl_module.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl_module.CERT_NONE
        connect_args["ssl"] = ctx

    return clean_url, connect_args


db_url, connect_args = _prepare_db_url(settings.DATABASE_URL)

# Create async engine
# echo=True for development SQL logging (set to False in production)
engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,  # Verify connections before using them
    connect_args=connect_args,
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
