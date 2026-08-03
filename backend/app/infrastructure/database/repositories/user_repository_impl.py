"""
infrastructure/database/repositories/user_repository_impl.py — User Repository Implementation

Purpose:
    Concrete implementation of UserRepository using SQLAlchemy + PostgreSQL.
    This is where actual SQL queries happen.

Why it exists:
    Implements the abstract contract from domain/repositories/user_repository.py.
    The application layer calls create(), get_by_email(), etc. without knowing
    that SQLAlchemy is underneath.

How Flutter uses this (indirectly):
    Flutter POST /auth/register → AuthService → this class → INSERT INTO users
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.database.models.user_model import UserModel


class SqlAlchemyUserRepository(UserRepository):
    """PostgreSQL-backed implementation of UserRepository."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return model.to_entity() if model else None

    async def create(self, email: str, hashed_password: str, name: str) -> User:
        model = UserModel(
            email=email,
            hashed_password=hashed_password,
            name=name,
        )
        self._session.add(model)
        await self._session.flush()  # Get the generated id before commit
        return model.to_entity()

    async def get_hashed_password(self, email: str) -> str | None:
        result = await self._session.execute(
            select(UserModel.hashed_password).where(UserModel.email == email)
        )
        return result.scalar_one_or_none()
