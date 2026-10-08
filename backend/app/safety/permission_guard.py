import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.enums import RiskLevel, PermissionAction
from app.runtime.base_agent import BaseAgent
from app.tools.base import BaseTool
from app.tools.terminal_tool import TerminalTool
from app.config import settings


class PolicyDecision(BaseModel):
    action: PermissionAction
    risk_level: RiskLevel
    reason: str
    requires_human_approval: bool = False


class PermissionGuard:
    """
    Dedicated Policy Engine evaluating tool execution authorization and risk profiles.
    """

    @staticmethod
    def evaluate(
        agent: BaseAgent,
        tool: BaseTool,
        args: Dict[str, Any],
        custom_policy: Optional[Dict[str, Any]] = None
    ) -> PolicyDecision:
        # 1. Check Agent capability / tool whitelist
        if tool.name not in agent.allowed_tools:
            return PolicyDecision(
                action=PermissionAction.DENY,
                risk_level=RiskLevel.CRITICAL,
                reason=f"Agent '{agent.name}' ({agent.agent_type.value}) is not authorized to use tool '{tool.name}'."
            )

        # 2. Inspect tool arguments for critical danger patterns
        # Terminal command inspection
        if tool.name == "terminal.execute":
            command = str(args.get("command", "")).strip()
            if TerminalTool.is_destructive(command):
                return PolicyDecision(
                    action=PermissionAction.DENY,
                    risk_level=RiskLevel.CRITICAL,
                    reason=f"Terminal command '{command}' contains destructive/blacklisted patterns."
                )

        # Filesystem path traversal inspection
        if tool.name in ("filesystem.read", "filesystem.write"):
            path_str = str(args.get("path", ""))
            if ".." in path_str or path_str.startswith("/") or (len(path_str) > 2 and path_str[1] == ":"):
                # Normalize and verify it doesn't escape
                root = os.path.abspath(settings.WORKSPACE_ROOT)
                target = os.path.abspath(os.path.join(root, path_str))
                try:
                    if os.path.commonpath([root, target]) != root:
                        return PolicyDecision(
                            action=PermissionAction.DENY,
                            risk_level=RiskLevel.CRITICAL,
                            reason=f"Path '{path_str}' attempts traversal outside the allowed workspace sandbox."
                        )
                except Exception:
                    return PolicyDecision(
                        action=PermissionAction.DENY,
                        risk_level=RiskLevel.CRITICAL,
                        reason="Invalid path argument."
                    )

        # 3. Determine Risk Classification
        risk = tool.default_risk

        # 4. Apply System Governance Policy
        if risk == RiskLevel.CRITICAL and settings.BLOCK_CRITICAL_RISK:
            return PolicyDecision(
                action=PermissionAction.DENY,
                risk_level=RiskLevel.CRITICAL,
                reason="Action classified as CRITICAL and blocked by default system policy."
            )

        if risk == RiskLevel.HIGH and settings.REQUIRE_APPROVAL_HIGH_RISK:
            return PolicyDecision(
                action=PermissionAction.REQUIRE_APPROVAL,
                risk_level=RiskLevel.HIGH,
                reason="High-risk tool execution requires explicit human approval.",
                requires_human_approval=True,
            )

        if risk == RiskLevel.MEDIUM and settings.REQUIRE_APPROVAL_MEDIUM_RISK:
            return PolicyDecision(
                action=PermissionAction.REQUIRE_APPROVAL,
                risk_level=RiskLevel.MEDIUM,
                reason="Medium-risk tool execution requires explicit human approval.",
                requires_human_approval=True,
            )

        # Low risk or auto-approved
        return PolicyDecision(
            action=PermissionAction.ALLOW,
            risk_level=risk,
            reason="Action authorized by policy.",
            requires_human_approval=False,
        )
