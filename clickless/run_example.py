"""Run the sample workflow without starting the GUI (useful for CI and quick checks)."""

from __future__ import annotations

from pathlib import Path

from app.bootstrap import bootstrap
from models.action_result import StepStatus


def main() -> int:
    root = Path(__file__).resolve().parent
    ctx = bootstrap(root)
    path = root / "workflows" / "examples" / "hello_clickless.json"
    state = ctx.execution_manager.run_workflow_file(path)
    print(f"Run {state.run_id}: {state.status.value}, steps={len(state.step_results)}")
    return 0 if state.status == StepStatus.COMPLETED else 1


if __name__ == "__main__":
    raise SystemExit(main())