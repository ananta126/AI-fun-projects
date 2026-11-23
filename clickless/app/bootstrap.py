"""Application bootstrap: paths, logging, database, engine, and services."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

from actions.builtin_actions import register_builtin_actions
from app.config import ApplicationConfig, load_application_config
from app.constants import APP_NAME, LOGS_DIR, PROJECT_ROOT
from database.db import create_db_engine
from engine.action_registry import ActionRegistry
from engine.execution_manager import ExecutionManager
from engine.state_manager import StateManager
from engine.workflow_engine import WorkflowEngine
from services.database_service import DatabaseService
from services.logging_service import setup_logging


@dataclass
class ApplicationContext:
    """Holds initialized services for UI and CLI."""

    config: ApplicationConfig
    registry: ActionRegistry
    engine: WorkflowEngine
    execution_manager: ExecutionManager
    database: DatabaseService
    project_root: Path


def _resolve_path(base: Path, raw: Path) -> Path:
    if raw.is_absolute():
        return raw
    return (base / raw).resolve()


def bootstrap(project_root: Path | None = None) -> ApplicationContext:
    """Initialize Clickless application services."""
    root = project_root or PROJECT_ROOT
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    config = load_application_config()
    db_path = _resolve_path(root, Path(config.database_path))
    log_path = _resolve_path(root, Path(config.log_file_path))

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logger = setup_logging(config.log_level, log_path)
    logger.info("Starting %s", APP_NAME)

    _, session_factory = create_db_engine(db_path)
    database = DatabaseService(session_factory)

    registry = ActionRegistry()
    register_builtin_actions(registry)

    state_manager = StateManager()
    engine = WorkflowEngine(registry, state_manager, logger)
    execution_manager = ExecutionManager(engine, database, registry, logger)

    return ApplicationContext(
        config=config,
        registry=registry,
        engine=engine,
        execution_manager=execution_manager,
        database=database,
        project_root=root,
    )