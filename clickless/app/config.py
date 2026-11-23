"""Application configuration loaded from JSON and environment defaults."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from app.constants import DEFAULT_APP_CONFIG, DEFAULT_DB_PATH, DEFAULT_LOG_PATH


class ApplicationConfig(BaseModel):
    """Validated application settings."""

    app_name: str = Field(default="Clickless")
    log_level: str = Field(default="INFO")
    database_path: Path = Field(default=DEFAULT_DB_PATH)
    log_file_path: Path = Field(default=DEFAULT_LOG_PATH)
    dry_run_default: bool = Field(default=False)
    theme: str = Field(default="dark")


def load_application_config(path: Path | None = None) -> ApplicationConfig:
    """Load config from JSON file; merge with defaults if file is missing."""
    config_path = path or DEFAULT_APP_CONFIG
    if config_path.is_file():
        with config_path.open(encoding="utf-8") as f:
            raw: dict[str, Any] = json.load(f)
        return ApplicationConfig.model_validate(raw)
    return ApplicationConfig()