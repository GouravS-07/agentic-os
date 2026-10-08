import asyncio
import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.tools.base import BaseTool, ToolResult
from app.models.enums import RiskLevel
from app.config import settings


class GitStatusTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="git.status",
            version="1.0.0",
            description="Returns repository working tree status and untracked/modified files.",
            capabilities=["git_status"],
            default_risk=RiskLevel.LOW,
            required_permissions=["git:read"],
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        cwd = os.path.abspath((context or {}).get("workspace_root", settings.WORKSPACE_ROOT))
        os.makedirs(cwd, exist_ok=True)
        try:
            proc = await asyncio.create_subprocess_shell(
                "git status --porcelain",
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                if "not a git repository" in err_msg.lower():
                    return ToolResult(
                        success=True,
                        data={"status": "not_a_git_repository", "clean": True, "notice": "Workspace is not a git repository yet."}
                    )
                return ToolResult(success=False, error=err_msg)

            output_str = stdout.decode("utf-8", errors="replace")
            return ToolResult(
                success=True,
                data={"status": output_str, "clean": len(output_str.strip()) == 0}
            )
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))


class GitDiffTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="git.diff",
            version="1.0.0",
            description="Returns unstaged/staged git diffs in the project workspace.",
            capabilities=["git_diff"],
            default_risk=RiskLevel.LOW,
            required_permissions=["git:read"],
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        cwd = os.path.abspath((context or {}).get("workspace_root", settings.WORKSPACE_ROOT))
        os.makedirs(cwd, exist_ok=True)
        try:
            proc = await asyncio.create_subprocess_shell(
                "git diff",
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                if "not a git repository" in err_msg.lower():
                    return ToolResult(
                        success=True,
                        data={"diff": "", "notice": "Workspace is not a git repository yet."}
                    )
                return ToolResult(success=False, error=err_msg)

            return ToolResult(
                success=True,
                data={"diff": stdout.decode("utf-8", errors="replace")}
            )
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))


class GitLogTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="git.log",
            version="1.0.0",
            description="Returns recent commit history on current branch.",
            capabilities=["git_log"],
            default_risk=RiskLevel.LOW,
            required_permissions=["git:read"],
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        cwd = os.path.abspath((context or {}).get("workspace_root", settings.WORKSPACE_ROOT))
        os.makedirs(cwd, exist_ok=True)
        try:
            proc = await asyncio.create_subprocess_shell(
                "git log -n 10 --oneline",
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                if "not a git repository" in err_msg.lower() or "does not have any commits" in err_msg.lower():
                    return ToolResult(
                        success=True,
                        data={"log": "", "notice": "No commits or not a git repository."}
                    )
                return ToolResult(success=False, error=err_msg)

            return ToolResult(
                success=True,
                data={"log": stdout.decode("utf-8", errors="replace")}
            )
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))


class GitCommitInput(BaseModel):
    message: str = Field(..., min_length=1, description="Commit message")


class GitCommitTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="git.commit",
            version="1.0.0",
            description="Stages modified files and creates a local git commit.",
            capabilities=["git_commit"],
            default_risk=RiskLevel.MEDIUM,
            required_permissions=["git:write"],
            input_schema=GitCommitInput,
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        cwd = os.path.abspath((context or {}).get("workspace_root", settings.WORKSPACE_ROOT))
        os.makedirs(cwd, exist_ok=True)
        msg = args.get("message", "Auto-commit by Agentic OS")
        try:
            proc = await asyncio.create_subprocess_shell(
                f'git add -A && git commit -m "{msg}"',
                cwd=cwd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            return ToolResult(
                success=(proc.returncode == 0),
                data={"output": stdout.decode("utf-8", errors="replace"), "message": msg},
                error=stderr.decode("utf-8", errors="replace") if proc.returncode != 0 else None
            )
        except Exception as exc:
            return ToolResult(success=False, error=str(exc))
