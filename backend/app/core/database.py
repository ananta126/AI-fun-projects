"""
core/database.py — Database Connection Setup

Purpose:
    Creates the SQLAlchemy async engine and session factory.
    Provides a dependency function that API routes use to get a DB session.

Why it exists:
    Centralizes database connection logic. Without this, every route would
    create its own connection — messy and error-prone.

How Flutter uses this (indirectly):
    When Flutter calls POST /auth/register, the route gets a DB session
    from get_db(), saves the user to PostgreSQL, and returns the result.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


# Create the async engine — connects to PostgreSQL via asyncpg
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,  # Log SQL queries in debug mode
)

# Session factory — each request gets its own session
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session per request.
    Automatically closes the session when the request finishes.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
