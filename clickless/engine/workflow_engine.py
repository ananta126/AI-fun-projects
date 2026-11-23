"""Sequential workflow execution engine."""

from __future__ import annotations

import logging
from typing import Callable

from engine.action_registry import ActionRegistry
from engine.condition_engine import evaluate_condition
from engine.execution_context import ExecutionContext
from engine.state_manager import StateManager
from engine.workflow_validator import assert_workflow_valid
from models.action_result import ActionResult, StepStatus
from models.workflow import WorkflowDefinition, WorkflowStep
from models.workflow_run import WorkflowRunState


class WorkflowEngine:
    """Executes validated workflows step by step."""

    def __init__(
        self,
        registry: ActionRegistry,
        state_manager: StateManager,
        logger: logging.Logger | None = None,
    ) -> None:
        self.registry = registry
        self.state_manager = state_manager
        self.logger = logger or logging.getLogger("clickless.engine")

    def execute(
        self,
        definition: WorkflowDefinition,
        *,
        dry_run: bool = False,
        run_id: str | None = None,
        on_step_complete: Callable[[ActionResult], None] | None = None,
    ) -> WorkflowRunState:
        assert_workflow_valid(definition, self.registry)

        run = WorkflowRunState(
            run_id=run_id or WorkflowRunState().run_id,
            workflow_id=definition.workflow_id,
            workflow_name=definition.name,
            workflow_version=definition.version,
            dry_run=dry_run,
        )
        run.mark_started()
        self.state_manager.clear(run.run_id)

        context = ExecutionContext(
            workflow=definition,
            run_id=run.run_id,
            dry_run=dry_run,
            logger=self.logger,
            cancel_check=lambda: self.state_manager.is_cancelled(run.run_id),
        )

        try:
            for step in definition.steps:
                if context.is_cancelled():
                    run.mark_finished(StepStatus.CANCELLED, "Cancelled by user")
                    break

                if not evaluate_condition(context, step.condition):
                    skipped = self._skipped_result(step)
                    run.step_results.append(skipped.serialize_result())
                    run.current_step_id = step.id
                    if on_step_complete:
                        on_step_complete(skipped)
                    continue

                result = self._execute_step(context, step)
                run.step_results.append(result.serialize_result())
                run.current_step_id = step.id
                context.record_step_output(step.id, result.data)

                if on_step_complete:
                    on_step_complete(result)

                if result.status == StepStatus.WAITING_REVIEW:
                    run.mark_finished(StepStatus.WAITING_REVIEW)
                    run.context_snapshot = context.snapshot()
                    return run

                if result.status == StepStatus.FAILED:
                    run.mark_finished(StepStatus.FAILED, result.error or result.message)
                    run.context_snapshot = context.snapshot()
                    return run

            else:
                run.mark_finished(StepStatus.COMPLETED)
                run.context_snapshot = context.snapshot()

        except Exception as exc:
            self.logger.exception("Workflow execution failed")
            run.mark_finished(StepStatus.FAILED, str(exc))

        return run

    def _execute_step(self, context: ExecutionContext, step: WorkflowStep) -> ActionResult:
        context.current_step_id = step.id
        action = self.registry.get(step.action)
        if action is None:
            result = ActionResult(
                step_id=step.id,
                action_name=step.action,
                status=StepStatus.FAILED,
                error=f"Action not registered: {step.action}",
            )
            result.mark_finished(StepStatus.FAILED)
            return result

        attempts = step.retry_count + 1
        last_error: ActionResult | None = None
        for attempt in range(attempts):
            try:
                result = action.execute(context, step.parameters)
                if result.status != StepStatus.FAILED:
                    return result
                last_error = result
                if attempt < attempts - 1:
                    self.logger.warning(
                        "Step %s failed (attempt %s/%s), retrying",
                        step.id,
                        attempt + 1,
                        attempts,
                    )
            except Exception as exc:
                self.logger.exception("Step %s raised", step.id)
                result = ActionResult(
                    step_id=step.id,
                    action_name=step.action,
                    status=StepStatus.FAILED,
                    error=str(exc),
                )
                result.mark_finished(StepStatus.FAILED)
                last_error = result
                if step.on_error == "skip":
                    result.status = StepStatus.SKIPPED
                    return result
                if attempt < attempts - 1:
                    continue
                return result

        return last_error or ActionResult(
            step_id=step.id,
            action_name=step.action,
            status=StepStatus.FAILED,
            error="Unknown failure",
        )

    @staticmethod
    def _skipped_result(step: WorkflowStep) -> ActionResult:
        result = ActionResult(
            step_id=step.id,
            action_name=step.action,
            status=StepStatus.SKIPPED,
            message="Condition not met",
        )
        result.mark_finished(StepStatus.SKIPPED)
        return result