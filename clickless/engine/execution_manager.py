"""Coordinates engine execution with persistence and auditing."""

from __future__ import annotations

import logging
from pathlib import Path

from engine.action_registry import ActionRegistry
from engine.state_manager import StateManager
from engine.workflow_engine import WorkflowEngine
from engine.workflow_loader import load_workflow_from_path
from models.action_result import ActionResult, StepStatus
from models.workflow import WorkflowDefinition
from models.workflow_run import WorkflowRunState
from services.database_service import DatabaseService


class ExecutionManager:
    """High-level API for running workflows from definitions or files."""

    def __init__(
        self,
        engine: WorkflowEngine,
        db: DatabaseService,
        registry: ActionRegistry,
        logger: logging.Logger | None = None,
    ) -> None:
        self.engine = engine
        self.db = db
        self.registry = registry
        self.logger = logger or logging.getLogger("clickless.execution")
        self.state_manager = engine.state_manager

    def run_workflow(
        self,
        definition: WorkflowDefinition,
        *,
        dry_run: bool = False,
    ) -> WorkflowRunState:
        self.db.upsert_workflow_definition(definition)
        self.db.audit("workflow", f"Starting workflow {definition.workflow_id}", None)

        pending = WorkflowRunState(
            workflow_id=definition.workflow_id,
            workflow_name=definition.name,
            workflow_version=definition.version,
            dry_run=dry_run,
        )
        self.db.create_run_record(pending)

        def on_step(result: ActionResult) -> None:
            self.db.save_step_result(pending.run_id, result)
            self.db.audit(
                "step",
                f"{result.step_id} {result.action_name} -> {result.status.value}",
                pending.run_id,
            )

        # Re-use run id from pending record
        state = self.engine.execute(
            definition,
            dry_run=dry_run,
            run_id=pending.run_id,
            on_step_complete=on_step,
        )
        self.db.update_run_record(state)
        self.db.audit(
            "workflow",
            f"Workflow {definition.workflow_id} finished with {state.status.value}",
            state.run_id,
        )
        self.logger.info(
            "Run %s completed: %s (%s steps)",
            state.run_id,
            state.status.value,
            len(state.step_results),
        )
        return state

    def run_workflow_file(self, path: Path, *, dry_run: bool = False) -> WorkflowRunState:
        definition = load_workflow_from_path(path)
        return self.run_workflow(definition, dry_run=dry_run)

    def cancel_run(self, run_id: str) -> None:
        self.state_manager.request_cancel(run_id)
        self.db.audit("workflow", f"Cancellation requested for run {run_id}", run_id)