"""
domain/repositories/user_repository.py — User Repository Interface

Purpose:
    Defines WHAT data operations we need for users, without saying HOW.
    This is an abstract contract (Python ABC).

Why it exists:
    Dependency Inversion Principle (SOLID):
    - application/ depends on this interface
    - infrastructure/ provides the concrete SQLAlchemy implementation
    If we switch databases, only infrastructure/ changes.

How Flutter uses this (indirectly):
    When Flutter registers a user, the flow is:
    API route → AuthService.register() → UserRepository.create() → PostgreSQL
"""

from abc import ABC, abstractmethod
from uuid import UUID

from app.domain.entities.user import User


class UserRepository(ABC):
    """Abstract contract for user data access."""

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None:
        """Find a user by their unique ID."""
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Find a user by email address."""
        ...

    @abstractmethod
    async def create(self, email: str, hashed_password: str, name: str) -> User:
        """Create a new user and return the entity."""
        ...

    @abstractmethod
    async def get_hashed_password(self, email: str) -> str | None:
        """Get the stored password hash for login verification."""
        ...
