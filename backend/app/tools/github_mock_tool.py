from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from app.tools.base import BaseTool, ToolResult
from app.models.enums import RiskLevel


class GitHubMockInput(BaseModel):
    action: str = Field(..., description="Action: list_repos, inspect_repo, read_file, list_issues, list_prs")
    repo: Optional[str] = Field(None, description="Target repository name (owner/repo)")
    path: Optional[str] = Field(None, description="File path for read_file action")


class MockGitHubTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="github.mock",
            version="1.0.0",
            description="Mock GitHub API tool for repository inspection, issues, and PR management in development.",
            capabilities=["list_repos", "inspect_repo", "read_file", "list_issues", "list_prs"],
            default_risk=RiskLevel.LOW,
            required_permissions=["github:read"],
            input_schema=GitHubMockInput,
        )

    async def execute(self, args: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> ToolResult:
        action = args.get("action", "list_repos")
        repo = args.get("repo", "user/demo-portfolio")
        path = args.get("path", "README.md")

        if action == "list_repos":
            return ToolResult(
                success=True,
                data={
                    "is_mock": True,
                    "repositories": [
                        {"name": "agentic-os", "stars": 1420, "language": "TypeScript / Python", "description": "Autonomous Agent OS"},
                        {"name": "portfolio-engine", "stars": 320, "language": "Next.js", "description": "Dynamic developer portfolio builder"},
                        {"name": "distributed-kv", "stars": 890, "language": "Rust", "description": "Raft-based key value store"},
                    ]
                }
            )

        if action == "inspect_repo":
            return ToolResult(
                success=True,
                data={
                    "is_mock": True,
                    "repo": repo,
                    "default_branch": "main",
                    "tree": ["src/index.ts", "package.json", "README.md", "tsconfig.json"],
                    "stars": 420,
                    "open_issues": 3,
                }
            )

        if action == "read_file":
            return ToolResult(
                success=True,
                data={
                    "is_mock": True,
                    "repo": repo,
                    "path": path,
                    "content": f"# Sample content for {path} in repository {repo}\n\nExported project spec.",
                }
            )

        if action in ("list_issues", "list_prs"):
            return ToolResult(
                success=True,
                data={
                    "is_mock": True,
                    "repo": repo,
                    "items": [
                        {"number": 1, "title": "Improve CI pipeline caching", "state": "open"},
                        {"number": 2, "title": "Add dark mode toggle", "state": "closed"},
                    ]
                }
            )

        return ToolResult(success=False, error=f"Unknown GitHub mock action: '{action}'")
