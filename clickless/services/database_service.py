"""High-level database operations for workflows and runs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, sessionmaker

from database.models import (
    AuditLogRecord,
    StepExecutionRecord,
    WorkflowRecord,
    WorkflowRunRecord,
    WorkflowVersionRecord,
)
from models.action_result import ActionResult
from models.workflow import WorkflowDefinition
from models.workflow_run import WorkflowRunState


class DatabaseService:
    """Persists workflow metadata, runs, and audit entries."""

    def __init__(self, session_factory: sessionmaker) -> None:
        self._session_factory = session_factory

    def _session(self) -> Session:
        return self._session_factory()

    def upsert_workflow_definition(self, definition: WorkflowDefinition) -> None:
        with self._session() as session:
            wf = session.query(WorkflowRecord).filter_by(
                workflow_id=definition.workflow_id
            ).first()
            if wf is None:
                wf = WorkflowRecord(
                    workflow_id=definition.workflow_id,
                    name=definition.name,
                    description=definition.description,
                )
                session.add(wf)
            else:
                wf.name = definition.name
                wf.description = definition.description

            ver = (
                session.query(WorkflowVersionRecord)
                .filter_by(workflow_id=definition.workflow_id, version=definition.version)
                .first()
            )
            payload = definition.model_dump_json()
            if ver is None:
                session.add(
                    WorkflowVersionRecord(
                        workflow_id=definition.workflow_id,
                        version=definition.version,
                        definition_json=payload,
                    )
                )
            else:
                ver.definition_json = payload
            session.commit()

    def create_run_record(self, state: WorkflowRunState) -> None:
        with self._session() as session:
            session.add(
                WorkflowRunRecord(
                    run_id=state.run_id,
                    workflow_id=state.workflow_id,
                    workflow_version=state.workflow_version,
                    status=state.status.value,
                    dry_run=state.dry_run,
                    started_at=state.started_at,
                )
            )
            session.commit()

    def update_run_record(self, state: WorkflowRunState) -> None:
        with self._session() as session:
            run = session.query(WorkflowRunRecord).filter_by(run_id=state.run_id).first()
            if run is None:
                return
            run.status = state.status.value
            run.finished_at = state.finished_at
            run.error_message = state.error_message
            run.summary_json = json.dumps(
                {"step_count": len(state.step_results), "context_keys": list(state.context_snapshot.keys())}
            )
            session.commit()

    def save_step_result(self, run_id: str, result: ActionResult) -> None:
        with self._session() as session:
            session.add(
                StepExecutionRecord(
                    run_id=run_id,
                    step_id=result.step_id,
                    action_name=result.action_name,
                    status=result.status.value,
                    result_json=json.dumps(result.serialize_result()),
                    started_at=result.started_at,
                    finished_at=result.finished_at,
                    duration_ms=result.duration_ms,
                )
            )
            session.commit()

    def audit(self, category: str, message: str, run_id: str | None = None) -> None:
        with self._session() as session:
            session.add(
                AuditLogRecord(category=category, message=message, run_id=run_id)
            )
            session.commit()

    def count_workflow_runs_by_status(self) -> dict[str, int]:
        with self._session() as session:
            rows = session.query(WorkflowRunRecord.status).all()
        counts: dict[str, int] = {}
        for (status,) in rows:
            counts[status] = counts.get(status, 0) + 1
        return counts

    def list_recent_runs(self, limit: int = 10) -> list[dict[str, Any]]:
        with self._session() as session:
            rows = (
                session.query(WorkflowRunRecord)
                .order_by(WorkflowRunRecord.id.desc())
                .limit(limit)
                .all()
            )
        return [
            {
                "run_id": r.run_id,
                "workflow_id": r.workflow_id,
                "status": r.status,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "dry_run": r.dry_run,
            }
            for r in rows
        ]

    def count_workflows(self) -> int:
        with self._session() as session:
            return session.query(WorkflowRecord).count()