# Clickless

Modular desktop workflow automation platform for Windows (Phase 1 foundation).

Clickless runs JSON-defined workflows through a pluggable action registry, with SQLite persistence, structured logging, and a PySide6 desktop shell. This phase delivers a working engine and dashboard—not a UI mockup.

## Architecture (Phase 1)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  PySide6 UI │────▶│ ExecutionManager │────▶│  WorkflowEngine │
│  (dashboard)│     │  + DatabaseSvc   │     │  + ActionRegistry│
└─────────────┘     └────────┬─────────┘     └────────┬────────┘
                             │                        │
                             ▼                        ▼
                      ┌─────────────┐           ┌──────────────┐
                      │   SQLite    │           │ Builtin      │
                      │   (runs)    │           │ actions      │
                      └─────────────┘           └──────────────┘
```

| Layer | Responsibility |
| --- | --- |
| `ui/` | Desktop shell, dark dashboard, run sample workflow |
| `engine/` | Load/validate JSON workflows, execute steps, cancellation hooks |
| `actions/` | `BaseAction` interface and built-in demo actions |
| `services/` | Logging and database persistence |
| `plugins/` | Plugin interface stub for Invoice Sorter (Phase 3) |

Workflow definitions live under `workflows/` and are validated against the action registry—no arbitrary code execution from JSON.

## Requirements

- Python 3.11+
- Windows 10/11 (target platform; development may run on Linux/macOS for engine tests)

## Installation

```bash
cd clickless
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

## Run the desktop app

```bash
python main.py
```

Use **Run Hello Clickless** on the dashboard to execute the sample workflow and refresh stats.

## Run the sample workflow (no GUI)

```bash
python run_example.py
```

## Run tests

```bash
pytest tests/ -v
```

## Sample workflow

`workflows/examples/hello_clickless.json` runs four steps: log → set context → log → short delay. Results are stored in `data/clickless.db` with audit and step execution records.

## Built-in actions (Phase 1)

| Action | Purpose |
| --- | --- |
| `log_message` | Log and store last message in context |
| `set_context` | Set a context variable (honours dry-run) |
| `delay` | Sleep up to 30s (skipped in dry-run) |
| `pause_for_review` | Marks step waiting for review (Phase 4 hook) |

## Configuration

`config/application.json` — log level, database path, log file path, default dry-run, theme.

## Known limitations (Phase 1)

- No file/PDF/OCR actions yet (Phase 2–3)
- Invoice Sorter plugin not implemented
- Workflow builder, execution monitor, and review queue are navigation placeholders
- Sequential execution only; concurrency planned later
- PySide6 GUI is not validated in headless CI (engine tests run without display)

## Project layout

See the product spec for the full target tree. Phase 1 implements `app/`, `ui/` (dashboard + main window), `engine/`, `actions/`, `models/`, `database/`, `services/`, `plugins/` (stubs), `workflows/examples/`, and `tests/`.

## Roadmap

1. **Phase 1** (this release) — Foundation
2. **Phase 2** — Core file/data actions
3. **Phase 3** — Invoice Sorter plugin
4. **Phase 4+** — Review queue, monitor, builder