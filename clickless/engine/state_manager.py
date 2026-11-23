"""In-memory cancellation flags for workflow runs."""

from __future__ import annotations

import threading


class StateManager:
    """Tracks which runs should be cancelled."""

    def __init__(self) -> None:
        self._cancelled: set[str] = set()
        self._lock = threading.Lock()

    def request_cancel(self, run_id: str) -> None:
        with self._lock:
            self._cancelled.add(run_id)

    def is_cancelled(self, run_id: str) -> bool:
        with self._lock:
            return run_id in self._cancelled

    def clear(self, run_id: str) -> None:
        with self._lock:
            self._cancelled.discard(run_id)