import pytest
import os
import shutil
from app.tools.filesystem_tool import FilesystemReadTool, FilesystemWriteTool, get_safe_workspace_path
from app.core.exceptions import AgenticOSError

TEST_WORKSPACE = "./test_workspaces/fs_test"


@pytest.fixture(autouse=True)
def setup_workspace():
    os.makedirs(TEST_WORKSPACE, exist_ok=True)
    yield
    shutil.rmtree(TEST_WORKSPACE, ignore_errors=True)


@pytest.mark.asyncio
async def test_filesystem_read_and_write_inside_workspace():
    write_tool = FilesystemWriteTool()
    read_tool = FilesystemReadTool()
    ctx = {"workspace_root": TEST_WORKSPACE}

    # Write file
    w_res = await write_tool.execute({"path": "src/app.py", "content": "print('hello agent')"}, context=ctx)
    assert w_res.success is True
    assert w_res.data["bytes_written"] > 0

    # Read file
    r_res = await read_tool.execute({"path": "src/app.py"}, context=ctx)
    assert r_res.success is True
    assert r_res.data["content"] == "print('hello agent')"

    # List directory
    list_res = await read_tool.execute({"path": "src"}, context=ctx)
    assert list_res.success is True
    assert list_res.data["type"] == "directory"
    assert len(list_res.data["entries"]) >= 1


def test_path_traversal_rejection():
    with pytest.raises(AgenticOSError):
        get_safe_workspace_path("../../../etc/passwd", workspace_root=TEST_WORKSPACE)

    with pytest.raises(AgenticOSError):
        get_safe_workspace_path("C:\\Windows\\System32\\cmd.exe", workspace_root=TEST_WORKSPACE)
