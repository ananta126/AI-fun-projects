"""
application/auth_service.py — Authentication Use Cases

Purpose:
    Orchestrates the register, login, and get-current-user flows.
    Contains business rules like "email must be unique" and "password must match".

Why it exists:
    Keeps business logic out of API routes (which should be thin) and out of
    the database layer (which should only do CRUD). This is the "middle" layer.

How Flutter communicates with this:
    Flutter never calls this directly. The flow is:
    Flutter → POST /auth/login → api/routes/auth.py → THIS service → repository → DB
"""

from uuid import UUID

from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository


class AuthService:
    """Handles user registration, login, and profile retrieval."""

    def __init__(self, user_repository: UserRepository):
        self._user_repo = user_repository

    async def register(self, email: str, password: str, name: str) -> tuple[User, str]:
        """
        Register a new user.
        Returns the created User and a JWT access token.
        """
        existing = await self._user_repo.get_by_email(email)
        if existing:
            raise ConflictError("Email already registered")

        hashed = hash_password(password)
        user = await self._user_repo.create(
            email=email,
            hashed_password=hashed,
            name=name,
        )
        token = create_access_token(user.id, user.email)
        return user, token

    async def login(self, email: str, password: str) -> tuple[User, str]:
        """
        Authenticate a user with email and password.
        Returns the User and a JWT access token.
        """
        hashed = await self._user_repo.get_hashed_password(email)
        if not hashed or not verify_password(password, hashed):
            raise AuthenticationError("Invalid email or password")

        user = await self._user_repo.get_by_email(email)
        if not user:
            raise AuthenticationError("Invalid email or password")

        token = create_access_token(user.id, user.email)
        return user, token

    async def get_current_user(self, user_id: UUID) -> User:
        """Get a user by ID (used by GET /auth/me)."""
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        return user
