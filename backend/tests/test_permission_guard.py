import pytest
from app.models.enums import RiskLevel, PermissionAction
from app.runtime.agent_registry import AgentRegistry
from app.tools.registry import ToolRegistry
from app.safety.permission_guard import PermissionGuard


def test_permission_guard_unauthorized_agent_tool_call():
    planner = AgentRegistry.get("agent_planner")
    fs_tool = ToolRegistry.get("filesystem.read")

    # Planner has allowed_tools = []
    decision = PermissionGuard.evaluate(planner, fs_tool, {"path": "test.txt"})
    assert decision.action == PermissionAction.DENY
    assert "not authorized" in decision.reason


def test_permission_guard_low_risk_auto_approved():
    coder = AgentRegistry.get("agent_coder")
    fs_read_tool = ToolRegistry.get("filesystem.read")

    decision = PermissionGuard.evaluate(coder, fs_read_tool, {"path": "main.py"})
    assert decision.action == PermissionAction.ALLOW
    assert decision.risk_level == RiskLevel.LOW


def test_permission_guard_terminal_destructive_command_blocked():
    coder = AgentRegistry.get("agent_coder")
    terminal_tool = ToolRegistry.get("terminal.execute")

    # Destructive rm -rf command
    decision = PermissionGuard.evaluate(coder, terminal_tool, {"command": "rm -rf /"})
    assert decision.action == PermissionAction.DENY
    assert decision.risk_level == RiskLevel.CRITICAL
    assert "destructive" in decision.reason.lower()

    # Windows recursive delete
    decision_win = PermissionGuard.evaluate(coder, terminal_tool, {"command": "del /f /s /q C:\\*"})
    assert decision_win.action == PermissionAction.DENY


def test_permission_guard_terminal_safe_command_requires_approval():
    coder = AgentRegistry.get("agent_coder")
    terminal_tool = ToolRegistry.get("terminal.execute")

    # Safe high-risk command
    decision = PermissionGuard.evaluate(coder, terminal_tool, {"command": "npm run build"})
    assert decision.action == PermissionAction.REQUIRE_APPROVAL
    assert decision.risk_level == RiskLevel.HIGH


def test_permission_guard_path_traversal_blocked():
    coder = AgentRegistry.get("agent_coder")
    fs_read_tool = ToolRegistry.get("filesystem.read")

    decision = PermissionGuard.evaluate(coder, fs_read_tool, {"path": "../../../etc/shadow"})
    assert decision.action == PermissionAction.DENY
    assert "traversal" in decision.reason.lower()
