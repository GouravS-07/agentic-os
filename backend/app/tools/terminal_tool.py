import asyncio
import os
import re
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.tools.base import BaseTool, ToolResult
from app.models.enums import RiskLevel
from app.config import settings
from app.core.exceptions import AgenticOSError

# Blacklisted destructive command patterns
DESTRUCTIVE_PATTERNS = [
    r"\brm\s+-[rRfF]+",
    r"\bdel\s+/[fFsSqQ]+",
    r"\brmdir\s+/[sSqQ]+",
    r"\bformat\b",
    r"\bmkfs\b",
    r"\bdd\s+if=",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:",  # Fork bomb
    r"\bprintenv\b",
    r"\benv\b",
    r"\bexport\b",
    r"\bset\b",
    r"\bcat\s+.*\.env\b",
    r"\btype\s+.*\.env\b",
    r"\bshutdown\b",
    r"\breboot\b",
]


class TerminalExecuteInput(BaseModel):
    command: str = Field(..., min_length=1, description="Shell command to execute in the development sandbox")
    working_dir: Optional[str] = Field(None, description="Optional relative directory within workspace")


class TerminalTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="terminal.execute",
            version="1.0.0",
            description="Executes a shell command inside the controlled local development workspace sandbox.",
            capabilities=["execute_command"],
            default_risk=RiskLevel.HIGH,
            required_permissions=["terminal:execute"],
            input_schema=TerminalExecuteInput,
        )

    @staticmethod
    def is_destructive(command: str) -> bool:
        cmd_lower = command.lower().strip()
        for pattern in DESTRUCTIVE_PATTERNS:
            if re.search(pattern, cmd_lower):
                return True
        return False

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        command = args.get("command", "").strip()
        working_dir_arg = args.get("working_dir") or ""
        workspace_root = (context or {}).get("workspace_root", settings.WORKSPACE_ROOT)

        # 1. Safety check for destructive patterns
        if self.is_destructive(command):
            return ToolResult(
                success=False,
                error=f"Command '{command}' is classified as CRITICAL/DESTRUCTIVE and blocked by sandbox policy."
            )

        # 2. Resolve safe working directory
        root = os.path.abspath(workspace_root)
        os.makedirs(root, exist_ok=True)
        target_dir = os.path.abspath(os.path.join(root, working_dir_arg))

        try:
            if os.path.commonpath([root, target_dir]) != root:
                return ToolResult(
                    success=False,
                    error="Working directory is outside the allowed workspace sandbox."
                )
        except Exception:
            return ToolResult(success=False, error="Invalid working directory path.")

        # 3. Sanitize environment variables (remove sensitive keys)
        safe_env = os.environ.copy()
        for secret_key in ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "DATABASE_URL"]:
            safe_env.pop(secret_key, None)

        # 4. Execute subprocess asynchronously with timeout
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                cwd=target_dir,
                env=safe_env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout_b, stderr_b = await asyncio.wait_for(
                process.communicate(),
                timeout=float(settings.MAX_EXECUTION_TIMEOUT_SECONDS)
            )

            stdout = stdout_b.decode("utf-8", errors="replace")[: settings.MAX_OUTPUT_BYTES]
            stderr = stderr_b.decode("utf-8", errors="replace")[: settings.MAX_OUTPUT_BYTES]

            return ToolResult(
                success=(process.returncode == 0),
                data={
                    "command": command,
                    "exit_code": process.returncode,
                    "stdout": stdout,
                    "stderr": stderr,
                },
                error=stderr if process.returncode != 0 else None
            )

        except asyncio.TimeoutError:
            return ToolResult(
                success=False,
                error=f"Command timed out after {settings.MAX_EXECUTION_TIMEOUT_SECONDS} seconds."
            )
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))
