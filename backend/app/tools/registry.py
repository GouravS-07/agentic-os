from typing import Dict, List, Optional
from app.tools.base import BaseTool
from app.tools.filesystem_tool import FilesystemReadTool, FilesystemWriteTool
from app.tools.terminal_tool import TerminalTool
from app.tools.git_tool import GitStatusTool, GitDiffTool, GitLogTool, GitCommitTool
from app.tools.search_tool import SearchTool
from app.tools.github_mock_tool import MockGitHubTool
from app.core.exceptions import EntityNotFoundError, AgenticOSError


class ToolRegistry:
    _tools: Dict[str, BaseTool] = {}

    @classmethod
    def initialize(cls):
        cls._tools = {}
        cls.register(FilesystemReadTool())
        cls.register(FilesystemWriteTool())
        cls.register(TerminalTool())
        cls.register(GitStatusTool())
        cls.register(GitDiffTool())
        cls.register(GitLogTool())
        cls.register(GitCommitTool())
        cls.register(SearchTool())
        cls.register(MockGitHubTool())

    @classmethod
    def register(cls, tool: BaseTool):
        if tool.name in cls._tools:
            raise AgenticOSError(f"Tool '{tool.name}' is already registered in ToolRegistry.")
        cls._tools[tool.name] = tool

    @classmethod
    def get(cls, name: str) -> BaseTool:
        if not cls._tools:
            cls.initialize()
        if name in cls._tools:
            return cls._tools[name]
        raise EntityNotFoundError("Tool", name)

    @classmethod
    def has(cls, name: str) -> bool:
        if not cls._tools:
            cls.initialize()
        return name in cls._tools

    @classmethod
    def list_all(cls) -> List[BaseTool]:
        if not cls._tools:
            cls.initialize()
        return list(cls._tools.values())


# Auto-initialize
ToolRegistry.initialize()
