import pytest
from httpx import AsyncClient
from app.models.enums import TaskStatus, MissionStatus, AgentRunStatus
from app.runtime.llm.mock_provider import MockLLMProvider
from app.runtime.agent_runtime import AgentRuntime
from app.schemas.agent_decision import AgentDecision
from tests.conftest import TestAsyncSessionLocal


@pytest.mark.asyncio
async def test_agent_runtime_tool_request_safety_pause(client: AsyncClient):
    """
    Verifies that when an Agent requests a high-risk Tool, the runtime STOPS before executing,
    marks the AgentRun as WAITING_TOOL, and transitions the Task & Mission to WAITING_APPROVAL.
    """
    # 1. Create Mission & Task
    m_res = await client.post("/api/v1/missions", json={
        "title": "Safety Test Mission",
        "description": "Verify tool safety boundary"
    })
    m_id = m_res.json()["id"]

    t_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Command Task",
        "description": "Run shell script",
        "assigned_agent_id": "agent_coder"
    })
    t_id = t_res.json()["id"]

    # Start Mission -> Task becomes READY
    await client.post(f"/api/v1/missions/{m_id}/start")

    # 2. Inject Mock Provider returning a TOOL_REQUEST decision for terminal.execute (HIGH risk)
    tool_decision = AgentDecision(
        action="tool_request",
        tool="terminal.execute",
        arguments={"command": "npm install package"},
        reason="Needs package installation",
    )
    mock_provider = MockLLMProvider(custom_structured_response=tool_decision)

    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            agent_run = await AgentRuntime.execute_task(t_id, session, provider=mock_provider)
            assert agent_run.status == AgentRunStatus.WAITING_APPROVAL

    # 3. Verify Task and Mission state via API
    task_res = await client.get(f"/api/v1/tasks/{t_id}")
    assert task_res.json()["status"] == "WAITING_APPROVAL"

    mission_res = await client.get(f"/api/v1/missions/{m_id}")
    assert mission_res.json()["status"] == "WAITING_APPROVAL"


@pytest.mark.asyncio
async def test_agent_runtime_task_failure_handling(client: AsyncClient):
    """
    Verifies that when an Agent outputs a 'fail' action, the task transitions to FAILED
    and error details are preserved.
    """
    m_res = await client.post("/api/v1/missions", json={
        "title": "Failure Test Mission",
        "description": "Test failure propagation"
    })
    m_id = m_res.json()["id"]

    t_res = await client.post(f"/api/v1/missions/{m_id}/tasks", json={
        "title": "Broken Code Task",
        "description": "Compile invalid syntax",
        "assigned_agent_id": "agent_coder"
    })
    t_id = t_res.json()["id"]
    await client.post(f"/api/v1/missions/{m_id}/start")

    fail_decision = AgentDecision(
        action="fail",
        reason="Syntax error on line 42: invalid token",
    )
    mock_provider = MockLLMProvider(custom_structured_response=fail_decision)

    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            agent_run = await AgentRuntime.execute_task(t_id, session, provider=mock_provider)
            assert agent_run.status == AgentRunStatus.FAILED
            assert agent_run.error == "Syntax error on line 42: invalid token"

    task_res = await client.get(f"/api/v1/tasks/{t_id}")
    assert task_res.json()["status"] in ["FAILED", "PENDING"]
    assert "Syntax error" in task_res.json()["error_message"]
