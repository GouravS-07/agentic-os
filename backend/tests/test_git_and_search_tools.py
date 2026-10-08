import pytest
from app.tools.git_tool import GitStatusTool, GitDiffTool, GitLogTool
from app.tools.search_tool import SearchTool
from app.tools.github_mock_tool import MockGitHubTool


@pytest.mark.asyncio
async def test_search_web_tool():
    tool = SearchTool()
    res = await tool.execute({"query": "FastAPI async database"})
    assert res.success is True
    assert len(res.data["results"]) >= 1
    assert res.data["is_mock"] is True


@pytest.mark.asyncio
async def test_github_mock_tool():
    tool = MockGitHubTool()

    # List repos
    list_res = await tool.execute({"action": "list_repos"})
    assert list_res.success is True
    assert len(list_res.data["repositories"]) >= 3

    # Inspect repo
    inspect_res = await tool.execute({"action": "inspect_repo", "repo": "user/agentic-os"})
    assert inspect_res.success is True
    assert "tree" in inspect_res.data

    # Read file
    read_res = await tool.execute({"action": "read_file", "repo": "user/agentic-os", "path": "package.json"})
    assert read_res.success is True
    assert "package.json" in read_res.data["content"]


@pytest.mark.asyncio
async def test_git_tools():
    status_tool = GitStatusTool()
    diff_tool = GitDiffTool()
    log_tool = GitLogTool()

    s_res = await status_tool.execute({})
    assert s_res.success is True

    d_res = await diff_tool.execute({})
    assert d_res.success is True

    l_res = await log_tool.execute({})
    assert l_res.success is True
