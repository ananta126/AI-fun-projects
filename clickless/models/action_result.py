"""Standardized action execution results."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class StepStatus(str, Enum):
  PENDING = "pending"
  RUNNING = "running"
  COMPLETED = "completed"
  FAILED = "failed"
  SKIPPED = "skipped"
  WAITING_REVIEW = "waiting_for_review"
  CANCELLED = "cancelled"


class ActionResult(BaseModel):
    """Result returned by every workflow action."""

    step_id: str
    action_name: str
    status: StepStatus = StepStatus.COMPLETED
    message: str = ""
    data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: datetime | None = None
    duration_ms: float | None = None

    def serialize_result(self) -> dict[str, Any]:
        """JSON-serializable representation for persistence."""
        return self.model_dump(mode="json")

    def mark_finished(self, status: StepStatus | None = None) -> None:
        now = datetime.now(timezone.utc)
        self.finished_at = now
        if self.started_at:
            delta = now - self.started_at
            self.duration_ms = delta.total_seconds() * 1000
        if status is not None:
            self.status = status