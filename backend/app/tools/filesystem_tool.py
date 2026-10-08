import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.tools.base import BaseTool, ToolResult
from app.models.enums import RiskLevel
from app.config import settings
from app.core.exceptions import AgenticOSError


def get_safe_workspace_path(relative_or_abs_path: str, workspace_root: Optional[str] = None) -> str:
    """
    Validates and resolves a file path within the allowed workspace sandbox.
    Rejects path traversal (e.g. '../', root escapes, etc.).
    """
    root = os.path.abspath(workspace_root or settings.WORKSPACE_ROOT)
    os.makedirs(root, exist_ok=True)

    # Normalize target path
    if os.path.isabs(relative_or_abs_path):
        target = os.path.abspath(relative_or_abs_path)
    else:
        target = os.path.abspath(os.path.join(root, relative_or_abs_path))

    # Check if target is inside root
    try:
        common = os.path.commonpath([root, target])
    except ValueError:
        raise AgenticOSError(f"Path traversal blocked: '{relative_or_abs_path}' is outside the workspace sandbox.")

    if common != root:
        raise AgenticOSError(f"Path traversal blocked: '{relative_or_abs_path}' resolves outside the allowed workspace.")

    return target


class FileReadInput(BaseModel):
    path: str = Field(..., description="Relative path to file within workspace")


class FileWriteInput(BaseModel):
    path: str = Field(..., description="Relative path to file within workspace")
    content: str = Field(..., description="Text content to write")


class ListDirInput(BaseModel):
    path: str = Field(default="", description="Relative folder path (empty for root)")


class FilesystemReadTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="filesystem.read",
            version="1.0.0",
            description="Reads file contents or lists directory entries inside the sandboxed project workspace.",
            capabilities=["read_file", "list_directory"],
            default_risk=RiskLevel.LOW,
            required_permissions=["workspace:read"],
            input_schema=FileReadInput,
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        path_arg = args.get("path", "")
        workspace_root = (context or {}).get("workspace_root", settings.WORKSPACE_ROOT)

        try:
            safe_path = get_safe_workspace_path(path_arg, workspace_root)

            if os.path.isdir(safe_path):
                entries = []
                for entry in os.listdir(safe_path):
                    full = os.path.join(safe_path, entry)
                    entries.append({
                        "name": entry,
                        "type": "directory" if os.path.isdir(full) else "file",
                        "size": os.path.getsize(full) if os.path.isfile(full) else 0,
                    })
                return ToolResult(
                    success=True,
                    data={"type": "directory", "path": path_arg, "entries": entries}
                )

            if not os.path.exists(safe_path):
                return ToolResult(
                    success=False,
                    error=f"File not found: '{path_arg}'"
                )

            with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            return ToolResult(
                success=True,
                data={"type": "file", "path": path_arg, "content": content, "size_bytes": len(content)}
            )

        except Exception as exc:
            return ToolResult(success=False, error=str(exc))


class FilesystemWriteTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="filesystem.write",
            version="1.0.0",
            description="Writes or overwrites file contents inside the sandboxed project workspace.",
            capabilities=["write_file"],
            default_risk=RiskLevel.MEDIUM,
            required_permissions=["workspace:write"],
            input_schema=FileWriteInput,
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        path_arg = args.get("path", "")
        content = args.get("content", "")
        workspace_root = (context or {}).get("workspace_root", settings.WORKSPACE_ROOT)

        try:
            safe_path = get_safe_workspace_path(path_arg, workspace_root)
            os.makedirs(os.path.dirname(safe_path), exist_ok=True)

            with open(safe_path, "w", encoding="utf-8") as f:
                f.write(content)

            return ToolResult(
                success=True,
                data={"path": path_arg, "bytes_written": len(content.encode("utf-8"))}
            )

        except Exception as exc:
            return ToolResult(success=False, error=str(exc))
