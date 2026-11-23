"""Load and register plugins (stub for Phase 3+)."""

from __future__ import annotations

from engine.action_registry import ActionRegistry
from plugins.plugin_interface import ClicklessPlugin


class PluginManager:
    def __init__(self) -> None:
        self._plugins: list[ClicklessPlugin] = []

    def register_plugin(self, plugin: ClicklessPlugin, registry: ActionRegistry) -> None:
        plugin.register_actions(registry)
        self._plugins.append(plugin)

    def list_plugins(self) -> list[ClicklessPlugin]:
        return list(self._plugins)