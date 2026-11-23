"""Condition evaluation for workflow branching (foundation for Phase 2+)."""

from __future__ import annotations

from typing import Any

from engine.execution_context import ExecutionContext


def evaluate_condition(context: ExecutionContext, condition: dict[str, Any] | None) -> bool:
    """Evaluate a simple condition dict. None means always true."""
    if not condition:
        return True

    cond_type = condition.get("type", "equals")
    if cond_type == "equals":
        left = context.get(condition.get("key", ""))
        right = condition.get("value")
        return left == right
    if cond_type == "context_has":
        return condition.get("key") in context.variables
    return True