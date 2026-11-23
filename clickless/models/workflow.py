"""Pydantic models for workflow definitions."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class WorkflowStep(BaseModel):
    """A single step in a workflow definition."""

    id: str
    action: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    retry_count: int = Field(default=0, ge=0)
    on_error: str | None = Field(default=None, description="fail | skip | retry")
    condition: dict[str, Any] | None = None


class WorkflowDefinition(BaseModel):
    """Versionable JSON workflow definition."""

    workflow_id: str
    name: str
    version: str = "1.0"
    description: str = ""
    steps: list[WorkflowStep] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("workflow_id", "name")
    @classmethod
    def non_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        return v

    @property
    def step_ids(self) -> set[str]:
        return {s.id for s in self.steps}