"""
infrastructure/database/models/user_model.py — User Database Model

Purpose:
    SQLAlchemy ORM model that maps to the "users" table in PostgreSQL.
    This is the infrastructure layer's view of a user (includes hashed_password).

Why it exists:
    Separates database concerns from business logic.
    - domain/entities/user.py → what the business cares about (no password)
    - This file → what the database stores (includes hashed_password)

How Flutter uses this (indirectly):
    When you register via Flutter, this model creates the actual row
    in the PostgreSQL "users" table.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.domain.entities.user import User


class UserModel(Base):
    """SQLAlchemy model for the users table."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def to_entity(self) -> User:
        """Convert this database model to a domain User entity."""
        return User(
            id=self.id,
            email=self.email,
            name=self.name,
            created_at=self.created_at,
        )
