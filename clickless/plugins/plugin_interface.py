"""Plugin contract for future workflow modules (e.g. Invoice Sorter)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from engine.action_registry import ActionRegistry


class ClicklessPlugin(ABC):
    """Plugins register actions and optional UI without modifying the engine."""

    plugin_id: str = ""
    name: str = ""
    version: str = "0.0.0"

    @abstractmethod
    def register_actions(self, registry: ActionRegistry) -> None:
        ...