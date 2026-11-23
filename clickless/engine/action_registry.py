"""Dynamic registry of workflow actions."""

from __future__ import annotations

from actions.base_action import BaseAction


class ActionRegistry:
    """Maps action names to action instances. Plugins register without engine changes."""

    def __init__(self) -> None:
        self._actions: dict[str, BaseAction] = {}

    def register(self, action: BaseAction) -> None:
        if not action.action_name:
            raise ValueError("action_name must be set")
        self._actions[action.action_name] = action

    def get(self, action_name: str) -> BaseAction | None:
        return self._actions.get(action_name)

    def list_actions(self) -> list[dict[str, str]]:
        return [
            {"name": a.action_name, "description": a.description}
            for a in self._actions.values()
        ]

    def has_action(self, action_name: str) -> bool:
        return action_name in self._actions