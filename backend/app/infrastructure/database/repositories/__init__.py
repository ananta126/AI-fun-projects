# infrastructure/database/repositories/__init__.py
# Purpose: Marks database repositories as a Python package.

from app.infrastructure.database.repositories.user_repository_impl import (
    SqlAlchemyUserRepository,
)

__all__ = ["SqlAlchemyUserRepository"]
