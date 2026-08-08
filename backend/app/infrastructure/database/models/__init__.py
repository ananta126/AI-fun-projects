# infrastructure/database/models/__init__.py
# Purpose: Marks database models as a Python package.

from app.infrastructure.database.models.user_model import UserModel

__all__ = ["UserModel"]
