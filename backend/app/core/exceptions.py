"""
core/exceptions.py — Custom Application Exceptions

Purpose:
    Defines domain-specific errors that the application layer raises.
    The API layer catches these and converts them to proper HTTP responses.

Why it exists:
    Application services should not know about HTTP status codes.
    They raise AppException → API routes translate to 400/401/404/etc.

How Flutter uses this (indirectly):
    When Flutter gets a 400 response with {"detail": "Email already registered"},
    it shows that message to the user. These exceptions generate those messages.
"""


class AppException(Exception):
    """Base exception for all application errors."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class AuthenticationError(AppException):
    """Raised when login credentials are invalid or token is bad."""

    def __init__(self, message: str = "Invalid credentials"):
        super().__init__(message, status_code=401)


class ConflictError(AppException):
    """Raised when creating a resource that already exists."""

    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message, status_code=409)
