import pytest
from app.tools.registry import ToolRegistry
from app.tools.filesystem_tool import FilesystemReadTool
from app.core.exceptions import EntityNotFoundError, AgenticOSError


def test_tool_registry_initialization():
    tools = ToolRegistry.list_all()
    assert len(tools) >= 7

    tool_names = [t.name for t in tools]
    assert "filesystem.read" in tool_names
    assert "filesystem.write" in tool_names
    assert "terminal.execute" in tool_names
    assert "git.status" in tool_names
    assert "search.web" in tool_names
    assert "github.mock" in tool_names


def test_tool_lookup():
    fs_tool = ToolRegistry.get("filesystem.read")
    assert fs_tool.name == "filesystem.read"
    assert "read_file" in fs_tool.capabilities


def test_unknown_tool_lookup():
    with pytest.raises(EntityNotFoundError):
        ToolRegistry.get("non_existent_tool")


def test_duplicate_registration_prevention():
    with pytest.raises(AgenticOSError) as exc:
        ToolRegistry.register(FilesystemReadTool())
    assert "already registered" in str(exc.value)
