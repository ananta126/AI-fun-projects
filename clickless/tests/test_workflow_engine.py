"""Integration tests for workflow load, validate, and execute."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.bootstrap import bootstrap
from engine.workflow_loader import WorkflowLoadError, load_workflow_from_path
from engine.workflow_validator import WorkflowValidationError, assert_workflow_valid
from models.action_result import StepStatus


@pytest.fixture
def app_ctx(tmp_path, monkeypatch):
    """Bootstrap with isolated database in tmp_path."""
    root = Path(__file__).resolve().parent.parent
    monkeypatch.chdir(root)
    ctx = bootstrap(root)
    return ctx


def test_load_example_workflow():
    root = Path(__file__).resolve().parent.parent
    path = root / "workflows" / "examples" / "hello_clickless.json"
    wf = load_workflow_from_path(path)
    assert wf.workflow_id == "hello_clickless_v1"
    assert len(wf.steps) == 4


def test_validate_unknown_action(app_ctx):
    from models.workflow import WorkflowDefinition, WorkflowStep

    bad = WorkflowDefinition(
        workflow_id="bad",
        name="Bad",
        steps=[WorkflowStep(id="s1", action="nonexistent_action", parameters={})],
    )
    with pytest.raises(WorkflowValidationError):
        assert_workflow_valid(bad, app_ctx.registry)


def test_execute_hello_workflow(app_ctx):
    root = Path(__file__).resolve().parent.parent
    path = root / "workflows" / "examples" / "hello_clickless.json"
    state = app_ctx.execution_manager.run_workflow_file(path)
    assert state.status == StepStatus.COMPLETED
    assert len(state.step_results) == 4
    assert state.context_snapshot.get("variables", {}).get("greeting") == "Hello, Clickless!"


def test_dry_run_skips_delay_sleep(app_ctx, monkeypatch):
    import time

    sleeps: list[float] = []
    monkeypatch.setattr(time, "sleep", lambda s: sleeps.append(s))

    from models.workflow import WorkflowDefinition, WorkflowStep

    wf = WorkflowDefinition(
        workflow_id="dry_test",
        name="Dry",
        steps=[WorkflowStep(id="d1", action="delay", parameters={"milliseconds": 5000})],
    )
    state = app_ctx.execution_manager.run_workflow(wf, dry_run=True)
    assert state.status == StepStatus.COMPLETED
    assert sleeps == []


def test_missing_workflow_file():
    with pytest.raises(WorkflowLoadError):
        load_workflow_from_path(Path("/nonexistent/workflow.json"))