"""Load workflow definitions from JSON files."""

from __future__ import annotations

import json
from pathlib import Path

from models.workflow import WorkflowDefinition


class WorkflowLoadError(Exception):
    pass


def load_workflow_from_path(path: Path) -> WorkflowDefinition:
    """Load and parse a workflow JSON file."""
    if not path.is_file():
        raise WorkflowLoadError(f"Workflow file not found: {path}")
    try:
        with path.open(encoding="utf-8") as f:
            raw = json.load(f)
    except json.JSONDecodeError as exc:
        raise WorkflowLoadError(f"Invalid JSON in {path}: {exc}") from exc
    try:
        return WorkflowDefinition.model_validate(raw)
    except Exception as exc:
        raise WorkflowLoadError(f"Workflow validation failed for {path}: {exc}") from exc


def load_workflow_from_string(content: str) -> WorkflowDefinition:
    raw = json.loads(content)
    return WorkflowDefinition.model_validate(raw)