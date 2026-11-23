"""Models for workflow run state (runtime, not ORM)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from models.action_result import StepStatus


class WorkflowRunState(BaseModel):
    """In-memory / persisted workflow run summary."""

    run_id: str = Field(default_factory=lambda: str(uuid4()))
    workflow_id: str
    workflow_name: str
    workflow_version: str = "1.0"
    status: StepStatus = StepStatus.PENDING
    dry_run: bool = False
    started_at: datetime | None = None
    finished_at: datetime | None = None
    current_step_id: str | None = None
    step_results: list[dict[str, Any]] = Field(default_factory=list)
    context_snapshot: dict[str, Any] = Field(default_factory=dict)
    error_message: str | None = None

    def mark_started(self) -> None:
        self.started_at = datetime.now(timezone.utc)
        self.status = StepStatus.RUNNING

    def mark_finished(self, status: StepStatus, error: str | None = None) -> None:
        self.finished_at = datetime.now(timezone.utc)
        self.status = status
        self.error_message = error