"""Base interface for workflow actions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from engine.execution_context import ExecutionContext
    from models.action_result import ActionResult


class BaseAction(ABC):
    """Every registered action implements this contract."""

    action_name: str = ""
    description: str = ""

    @abstractmethod
    def validate_parameters(self, parameters: dict[str, Any]) -> list[str]:
        """Return a list of validation error messages; empty if valid."""
        ...

    @abstractmethod
    def execute(self, context: ExecutionContext, parameters: dict[str, Any]) -> ActionResult:
        ...

    def rollback(self, context: ExecutionContext, parameters: dict[str, Any]) -> None:
        """Optional rollback when a later step fails."""
        return None

    def serialize_result(self, result: ActionResult) -> dict[str, Any]:
        return result.serialize_result()