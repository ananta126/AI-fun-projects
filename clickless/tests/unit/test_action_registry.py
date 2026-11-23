"""Unit tests for action registry."""

from __future__ import annotations

from actions.builtin_actions import LogMessageAction
from engine.action_registry import ActionRegistry


def test_register_and_lookup():
    reg = ActionRegistry()
    action = LogMessageAction()
    reg.register(action)
    assert reg.has_action("log_message")
    assert reg.get("log_message") is action