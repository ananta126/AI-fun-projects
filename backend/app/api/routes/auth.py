"""
api/routes/auth.py — Authentication HTTP Routes

Purpose:
    Thin HTTP handlers for register, login, logout, and get-current-user.
    Each route validates input, calls AuthService, and returns JSON.

Why it exists:
    This is the "front door" of the backend — the only layer Flutter talks to.
    Routes should contain ZERO business logic (that's in application/).

How Flutter communicates with these endpoints:

    REGISTER:
        Flutter → POST /auth/register  {"email","password","name"}
        ← 201 {"access_token", "token_type", "user"}

    LOGIN:
        Flutter → POST /auth/login  {"email","password"}
        ← 200 {"access_token", "token_type", "user"}

    LOGOUT:
        Flutter → POST /auth/logout  (with Authorization header)
        ← 200 {"message": "Logged out successfully"}
        (Flutter also deletes the token from secure storage)

    GET ME:
        Flutter → GET /auth/me  (with Authorization header)
        ← 200 {"id", "email", "name", "created_at"}
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_auth_service, get_current_user_id
from app.api.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    UserResponse,
)
from app.application.auth_service import AuthService
from app.core.exceptions import AppException

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    body: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Create a new user account and return a JWT token."""
    try:
        user, token = await auth_service.register(
            email=body.email,
            password=body.password,
            name=body.name,
        )
        return AuthResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )
    except AppException as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Authenticate with email/password and return a JWT token."""
    try:
        user, token = await auth_service.login(
            email=body.email,
            password=body.password,
        )
        return AuthResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )
    except AppException as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    user_id: UUID = Depends(get_current_user_id),
):
    """
    Logout the current user.
    For JWT-based auth, logout is primarily client-side (delete the token).
    This endpoint confirms the token was valid before the client discards it.
    """
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: UUID = Depends(get_current_user_id),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Return the currently authenticated user's profile."""
    try:
        user = await auth_service.get_current_user(user_id)
        return UserResponse.model_validate(user)
    except AppException as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=e.status_code, detail=e.message)
