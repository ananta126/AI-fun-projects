"""
domain/entities/user.py — User Business Entity

Purpose:
    A plain Python class representing a User in the business domain.
    This is NOT a database model — it has no SQLAlchemy imports.

Why it exists:
    Clean Architecture rule: business objects should not depend on frameworks.
    The application layer works with User entities, not database rows.

How Flutter uses this (indirectly):
    When Flutter calls GET /auth/me, the backend converts a User entity
    into JSON like {"id": "...", "email": "...", "name": "..."} and sends it.
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class User:
  """Represents a registered user in the system."""

  id: UUID
  email: str
  name: str
  created_at: datetime

  # Note: hashed_password is intentionally NOT included here.
  # Domain entities represent what the business cares about,
  # not what the database stores internally.
