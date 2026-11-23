"""Application-wide constants."""

from pathlib import Path

APP_NAME = "Clickless"
APP_VERSION = "0.1.0"
APP_ORG = "Clickless"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = PROJECT_ROOT / "config"
DATA_DIR = PROJECT_ROOT / "data"
LOGS_DIR = PROJECT_ROOT / "logs"
WORKFLOWS_DIR = PROJECT_ROOT / "workflows"

DEFAULT_DB_PATH = DATA_DIR / "clickless.db"
DEFAULT_LOG_PATH = LOGS_DIR / "clickless.log"
DEFAULT_APP_CONFIG = CONFIG_DIR / "application.json"

# Execution statuses (aligned with product spec)
class ExecutionStatus:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    WAITING_REVIEW = "waiting_for_review"
    CANCELLED = "cancelled"