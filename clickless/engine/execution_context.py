"""Mutable context passed through workflow steps."""

from __future__ import annotations

import logging
from typing import Any, Callable

from models.workflow import WorkflowDefinition


class ExecutionContext:
    """Holds variables, services, and cancellation state for one run."""

    def __init__(
        self,
        *,
        workflow: WorkflowDefinition,
        run_id: str,
        dry_run: bool,
        logger: logging.Logger,
        cancel_check: Callable[[], bool] | None = None,
    ) -> None:
        self.workflow = workflow
        self.run_id = run_id
        self.dry_run = dry_run
        self.logger = logger
        self._variables: dict[str, Any] = {}
        self._step_outputs: dict[str, dict[str, Any]] = {}
        self.current_step_id: str | None = None
        self._cancel_check = cancel_check or (lambda: False)

    def set(self, key: str, value: Any) -> None:
        self._variables[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self._variables.get(key, default)

    @property
    def variables(self) -> dict[str, Any]:
        return dict(self._variables)

    def record_step_output(self, step_id: str, data: dict[str, Any]) -> None:
        self._step_outputs[step_id] = data

    def get_step_output(self, step_id: str) -> dict[str, Any] | None:
        return self._step_outputs.get(step_id)

    def is_cancelled(self) -> bool:
        return self._cancel_check()

    def snapshot(self) -> dict[str, Any]:
        return {
            "variables": self._variables,
            "step_outputs": self._step_outputs,
            "dry_run": self.dry_run,
        }