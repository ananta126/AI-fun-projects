"""Invoice Sorter desktop entry point (PySide6). No Streamlit."""

import os
import sys
from pathlib import Path


def _prepare_frozen_env():
    if not getattr(sys, "frozen", False):
        return
    exe_dir = Path(sys.executable).resolve().parent
    os.chdir(exe_dir)
    log_path = exe_dir / "invoice_sorter.log"
    try:
        log = open(log_path, "a", encoding="utf-8")
        sys.stdout = log
        sys.stderr = log
    except OSError:
        pass


if __name__ == "__main__":
    _prepare_frozen_env()
    from ui.desktop import main

    main()
