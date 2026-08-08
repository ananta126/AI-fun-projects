"""
api/schemas/auth.py — Request & Response Schemas

Purpose:
    Pydantic models that define the JSON shape of auth API requests and responses.
    FastAPI uses these to validate incoming data and document the API.

Why it exists:
    - Validates that POST /auth/register has email, password, and name
    - Ensures the response always has the same JSON structure
    - Auto-generates API docs at http://localhost:8000/docs

How Flutter uses this:
    Flutter sends JSON matching RegisterRequest:
        {"email": "a@b.com", "password": "secret", "name": "Alice"}
    Flutter receives JSON matching AuthResponse:
        {"access_token": "eyJ...", "token_type": "bearer", "user": {...}}
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """JSON body for POST /auth/register"""

    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    """JSON body for POST /auth/login"""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User data returned to the client (no password!)."""

    id: UUID
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """Response after successful login or register."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Simple message response (used for logout)."""

    message: str
