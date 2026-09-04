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
    try:
        from ui.desktop import main

        main()
    except Exception:
        import traceback

        details = traceback.format_exc()
        try:
            log_path = Path(sys.executable).resolve().parent / "invoice_sorter.log"
            with open(log_path, "a", encoding="utf-8") as log:
                log.write(details + "\n")
        except OSError:
            pass
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(
                0,
                "Invoice Sorter failed to start.\n\n" + details[:1500],
                "Invoice Sorter",
                0x10,
            )
        except Exception:
            pass
        raise
