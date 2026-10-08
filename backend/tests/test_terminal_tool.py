import pytest
import os
import shutil
from app.tools.terminal_tool import TerminalTool

TEST_WORKSPACE = "./test_workspaces/terminal_test"


@pytest.fixture(autouse=True)
def setup_workspace():
    os.makedirs(TEST_WORKSPACE, exist_ok=True)
    yield
    shutil.rmtree(TEST_WORKSPACE, ignore_errors=True)


@pytest.mark.asyncio
async def test_terminal_safe_command_execution():
    tool = TerminalTool()
    ctx = {"workspace_root": TEST_WORKSPACE}

    # Safe python inline execution
    res = await tool.execute({"command": "python -c \"print('agentic os sandbox')\""}, context=ctx)
    assert res.success is True
    assert "agentic os sandbox" in res.data["stdout"]


@pytest.mark.asyncio
async def test_terminal_destructive_command_blocked():
    tool = TerminalTool()
    ctx = {"workspace_root": TEST_WORKSPACE}

    res = await tool.execute({"command": "rm -rf /"}, context=ctx)
    assert res.success is False
    assert "blocked" in res.error.lower()


@pytest.mark.asyncio
async def test_terminal_secret_stripping():
    tool = TerminalTool()
    ctx = {"workspace_root": TEST_WORKSPACE}

    os.environ["ANTHROPIC_API_KEY"] = "sk-super-secret-key-12345"
    res = await tool.execute({
        "command": "python -c \"import os; print('KEY=' + os.environ.get('ANTHROPIC_API_KEY', 'NOT_FOUND'))\""
    }, context=ctx)
    assert res.success is True
    assert "KEY=NOT_FOUND" in res.data["stdout"]
