import pytest
import os
from httpx import AsyncClient
from app.models.enums import TaskStatus, MissionStatus, AgentRunStatus, ToolRunStatus, PermissionAction
from app.runtime.llm.mock_provider import MockLLMProvider
from app.runtime.agent_runtime import AgentRuntime
from app.schemas.agent_decision import AgentDecision
from app.config import settings
from tests.conftest import TestAsyncSessionLocal


@pytest.mark.asyncio
async def test_agent_tool_execution_allowed_pipeline(client: AsyncClient):
    """
    Test: Agent -> ToolRequest (filesystem.read on existing file) -> Permission Guard (ALLOW) ->
          Tool executed -> ToolRun COMPLETED -> Task COMPLETED
    """
    # Create test file in workspace
    os.makedirs(settings.WORKSPACE_ROOT, exist_ok=True)
    test_file_path = os.path.join(settings.WORKSPACE_ROOT, "README.md")
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write("# Agentic OS Test README")

    # 1. Create Mission & Task
    m_res = await client.post("/api/v1/missions", json={
        "title": "Read Code Mission",
        "description": "Inspect project files"
    })
    m_id = m_res.json()["id"]

    t_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Read Readme Task",
        "description": "Read README.md",
        "assigned_agent_id": "agent_coder"
    })
    t_id = t_res.json()["id"]
    await client.post(f"/api/v1/missions/{m_id}/start")

    # 2. Mock Agent requesting filesystem.read
    read_decision = AgentDecision(
        action="tool_request",
        tool="filesystem.read",
        arguments={"path": "README.md"},
        reason="Read file documentation",
    )
    mock_provider = MockLLMProvider(custom_structured_response=read_decision)

    # 3. Execute Task through AgentRuntime
    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            agent_run = await AgentRuntime.execute_task(t_id, session, provider=mock_provider)
            assert agent_run.status == AgentRunStatus.COMPLETED

    # 4. Verify Task state
    task_res = await client.get(f"/api/v1/tasks/{t_id}")
    assert task_res.json()["status"] == "COMPLETED"

    # 5. Verify Tool Run History API
    tool_runs_res = await client.get(f"/api/v1/tools/runs/history?mission_id={m_id}")
    assert tool_runs_res.status_code == 200
    runs = tool_runs_res.json()
    assert len(runs) >= 1
    assert runs[0]["tool_name"] == "filesystem.read"
    assert runs[0]["status"] == "COMPLETED"
    assert runs[0]["permission_result"] == "ALLOW"


@pytest.mark.asyncio
async def test_agent_tool_execution_require_approval_pipeline(client: AsyncClient):
    """
    Test: Agent -> ToolRequest (terminal.execute) -> Permission Guard (REQUIRE_APPROVAL) ->
          ToolRun WAITING_APPROVAL -> Task & Mission WAITING_APPROVAL -> execution stopped
    """
    m_res = await client.post("/api/v1/missions", json={
        "title": "Build Command Mission",
        "description": "Run build script"
    })
    m_id = m_res.json()["id"]

    t_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Compile Task",
        "description": "Run compile command",
        "assigned_agent_id": "agent_coder"
    })
    t_id = t_res.json()["id"]
    await client.post(f"/api/v1/missions/{m_id}/start")

    term_decision = AgentDecision(
        action="tool_request",
        tool="terminal.execute",
        arguments={"command": "npm run build"},
        reason="Compile project packages",
    )
    mock_provider = MockLLMProvider(custom_structured_response=term_decision)

    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            agent_run = await AgentRuntime.execute_task(t_id, session, provider=mock_provider)
            assert agent_run.status == AgentRunStatus.WAITING_APPROVAL

    # Verify Task & Mission are paused in WAITING_APPROVAL
    t_check = await client.get(f"/api/v1/tasks/{t_id}")
    assert t_check.json()["status"] == "WAITING_APPROVAL"

    m_check = await client.get(f"/api/v1/missions/{m_id}")
    assert m_check.json()["status"] == "WAITING_APPROVAL"

    # Verify ToolRun is in WAITING_APPROVAL
    runs_res = await client.get(f"/api/v1/tools/runs/history?mission_id={m_id}")
    assert runs_res.json()[0]["status"] == "WAITING_APPROVAL"
    assert runs_res.json()[0]["permission_result"] == "REQUIRE_APPROVAL"


@pytest.mark.asyncio
async def test_agent_tool_execution_denied_pipeline(client: AsyncClient):
    """
    Test: Agent -> ToolRequest (terminal.execute with destructive command) ->
          Permission Guard (DENY) -> ToolRun DENIED -> Task receives denial.
    """
    m_res = await client.post("/api/v1/missions", json={
        "title": "Destructive Attempt Mission",
        "description": "Attempt dangerous action"
    })
    m_id = m_res.json()["id"]

    t_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Purge Task",
        "description": "Delete all files",
        "assigned_agent_id": "agent_coder"
    })
    t_id = t_res.json()["id"]
    await client.post(f"/api/v1/missions/{m_id}/start")

    destroy_decision = AgentDecision(
        action="tool_request",
        tool="terminal.execute",
        arguments={"command": "rm -rf /"},
        reason="Attempt root deletion",
    )
    mock_provider = MockLLMProvider(custom_structured_response=destroy_decision)

    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            agent_run = await AgentRuntime.execute_task(t_id, session, provider=mock_provider)
            assert agent_run.status == AgentRunStatus.COMPLETED
            assert agent_run.output["action"] == "tool_denied"

    t_check = await client.get(f"/api/v1/tasks/{t_id}")
    assert t_check.json()["status"] == "READY"
    assert "last_tool_denial" in (t_check.json().get("input_data") or {})

    runs_res = await client.get(f"/api/v1/tools/runs/history?mission_id={m_id}")
    assert runs_res.json()[0]["status"] == "DENIED"
    assert runs_res.json()[0]["permission_result"] == "DENY"
