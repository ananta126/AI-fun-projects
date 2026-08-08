"""
core/security.py — Password Hashing & JWT Helpers

Purpose:
    Two security utilities used by the auth flow:
    1. Hash and verify passwords (bcrypt)
    2. Create and decode JWT tokens

Why it exists:
  - Passwords must NEVER be stored in plain text. bcrypt converts
    "mypassword123" into an irreversible hash like "$2b$12$..."
  - JWT tokens prove a user is logged in without server-side sessions.
    Flutter stores the token and sends it on every request.

How Flutter uses this (indirectly):
    1. User registers → password is hashed here before saving to DB
    2. User logs in → password verified here → JWT created here
    3. Flutter receives the JWT and stores it
    4. On next request, Flutter sends "Authorization: Bearer <token>"
       → decode_access_token() validates it in api/deps.py
"""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt context for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Convert a plain-text password into a bcrypt hash."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if a plain-text password matches a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: UUID, email: str) -> str:
    """
    Create a JWT access token containing the user's id and email.
    The token expires after jwt_access_token_expire_minutes.
    """
    expire = datetime.now(UTC) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),  # subject = user id
        "email": email,
        "exp": expire,
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.
    Raises JWTError if the token is invalid or expired.
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
