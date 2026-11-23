"""Minimal built-in actions for Phase 1 demonstration."""

from __future__ import annotations

import time
from typing import Any

from actions.base_action import BaseAction
from engine.execution_context import ExecutionContext
from models.action_result import ActionResult, StepStatus


class LogMessageAction(BaseAction):
    action_name = "log_message"
    description = "Write a message to the workflow log and context."

    def validate_parameters(self, parameters: dict[str, Any]) -> list[str]:
        errors: list[str] = []
        if not parameters.get("message"):
            errors.append("'message' is required")
        return errors

    def execute(self, context: ExecutionContext, parameters: dict[str, Any]) -> ActionResult:
        message = str(parameters["message"])
        context.logger.info("[workflow] %s", message)
        context.set("last_log_message", message)
        result = ActionResult(
            step_id=context.current_step_id or "",
            action_name=self.action_name,
            status=StepStatus.COMPLETED,
            message=message,
            data={"logged": True},
        )
        result.mark_finished()
        return result


class SetContextAction(BaseAction):
    action_name = "set_context"
    description = "Store a key-value pair in the execution context."

    def validate_parameters(self, parameters: dict[str, Any]) -> list[str]:
        errors: list[str] = []
        if "key" not in parameters:
            errors.append("'key' is required")
        if "value" not in parameters:
            errors.append("'value' is required")
        return errors

    def execute(self, context: ExecutionContext, parameters: dict[str, Any]) -> ActionResult:
        key = str(parameters["key"])
        value = parameters["value"]
        if context.dry_run:
            context.logger.info("Dry-run: would set context[%s]=%r", key, value)
        else:
            context.set(key, value)
        result = ActionResult(
            step_id=context.current_step_id or "",
            action_name=self.action_name,
            status=StepStatus.COMPLETED,
            data={"key": key, "value": value, "dry_run": context.dry_run},
        )
        result.mark_finished()
        return result


class PauseForReviewAction(BaseAction):
    action_name = "pause_for_review"
    description = "Pause workflow and mark step as waiting for human review (stub for Phase 4)."

    def validate_parameters(self, parameters: dict[str, Any]) -> list[str]:
        if not parameters.get("reason"):
            return ["'reason' is required"]
        return []

    def execute(self, context: ExecutionContext, parameters: dict[str, Any]) -> ActionResult:
        reason = str(parameters["reason"])
        result = ActionResult(
            step_id=context.current_step_id or "",
            action_name=self.action_name,
            status=StepStatus.WAITING_REVIEW,
            message=reason,
            data={"reason": reason},
        )
        result.mark_finished(StepStatus.WAITING_REVIEW)
        return result


class DelayAction(BaseAction):
    action_name = "delay"
    description = "Sleep for a number of milliseconds (capped for safety)."

    def validate_parameters(self, parameters: dict[str, Any]) -> list[str]:
        ms = parameters.get("milliseconds", 0)
        if not isinstance(ms, (int, float)) or ms < 0 or ms > 30_000:
            return "'milliseconds' must be a number between 0 and 30000"
        return []

    def execute(self, context: ExecutionContext, parameters: dict[str, Any]) -> ActionResult:
        ms = float(parameters.get("milliseconds", 0))
        if not context.dry_run and ms > 0:
            time.sleep(ms / 1000.0)
        result = ActionResult(
            step_id=context.current_step_id or "",
            action_name=self.action_name,
            status=StepStatus.COMPLETED,
            data={"milliseconds": ms, "skipped_sleep": context.dry_run},
        )
        result.mark_finished()
        return result


def register_builtin_actions(registry: Any) -> None:
    """Register Phase 1 built-in actions."""
    for action_cls in (LogMessageAction, SetContextAction, PauseForReviewAction, DelayAction):
        registry.register(action_cls())