"""Validate workflow definitions against the action registry."""

from __future__ import annotations

from engine.action_registry import ActionRegistry
from models.workflow import WorkflowDefinition


class WorkflowValidationError(Exception):
    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_workflow(definition: WorkflowDefinition, registry: ActionRegistry) -> list[str]:
    """Return all validation errors for a workflow definition."""
    errors: list[str] = []

    if not definition.steps:
        errors.append("Workflow must contain at least one step")

    step_ids: set[str] = set()
    for step in definition.steps:
        if step.id in step_ids:
            errors.append(f"Duplicate step id: {step.id}")
        step_ids.add(step.id)

        if not registry.has_action(step.action):
            errors.append(f"Unknown action '{step.action}' in step {step.id}")
            continue

        action = registry.get(step.action)
        assert action is not None
        param_errors = action.validate_parameters(step.parameters)
        for pe in param_errors:
            errors.append(f"Step {step.id}: {pe}")

    return errors


def assert_workflow_valid(definition: WorkflowDefinition, registry: ActionRegistry) -> None:
    errors = validate_workflow(definition, registry)
    if errors:
        raise WorkflowValidationError(errors)