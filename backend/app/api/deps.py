"""
api/deps.py — FastAPI Dependencies

Purpose:
    Reusable dependency functions injected into API routes.
    The most important one: get_current_user_id() — extracts the user
    from the JWT token in the Authorization header.

Why it exists:
    Instead of repeating "decode JWT, get user id" in every protected route,
    we define it once here and use Depends(get_current_user_id) everywhere.

How Flutter uses this:
    After login, Flutter stores the JWT and sends it on every request:
        Authorization: Bearer eyJhbGciOi...
    This dependency reads that header, decodes the token, and returns the user id.
    If the token is missing or expired → 401 Unauthorized.
"""

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.auth_service import AuthService
from app.core.database import get_db
from app.core.security import decode_access_token
from app.infrastructure.database.repositories.user_repository_impl import (
    SqlAlchemyUserRepository,
)

# Tells FastAPI to look for "Authorization: Bearer <token>" header
security = HTTPBearer()


async def get_user_repository(
    db: AsyncSession = Depends(get_db),
) -> SqlAlchemyUserRepository:
    """Provide a UserRepository backed by the current DB session."""
    return SqlAlchemyUserRepository(db)


async def get_auth_service(
    user_repo: SqlAlchemyUserRepository = Depends(get_user_repository),
) -> AuthService:
    """Provide an AuthService with its repository injected."""
    return AuthService(user_repo)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UUID:
    """
    Extract and validate the user id from the JWT token.
    Used by protected routes like GET /auth/me and POST /auth/logout.
    """
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
        return user_id
    except (JWTError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
