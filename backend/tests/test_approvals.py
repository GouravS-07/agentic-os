import pytest
import os
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select

from app.models.mission import Mission
from app.models.task import Task
from app.models.tool import ToolRun
from app.models.agent import AgentRun
from app.models.approval import Approval, hash_arguments
from app.models.enums import (
    MissionStatus,
    TaskStatus,
    TaskPriority,
    AgentRunStatus,
    ToolRunStatus,
    ApprovalStatus,
    RiskLevel,
    PermissionAction,
)
from app.services.approval_service import ApprovalService
from app.services.task_service import TaskService
from app.runtime.agent_runtime import AgentRuntime
from app.runtime.llm.mock_provider import MockLLMProvider
from app.schemas.agent_decision import AgentDecision
from app.schemas.task import TaskCreate
from app.core.state_machine import StateMachine
from app.core.exceptions import AgenticOSError
from app.config import settings
from tests.conftest import TestAsyncSessionLocal


@pytest.mark.asyncio
async def test_approval_creation_and_integrity():
    """
    Test creating an approval request and verifying tamper detection.
    """
    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            mission = Mission(
                title="HITL Test Mission",
                description="Testing human approval workflow",
                status=MissionStatus.RUNNING,
            )
            session.add(mission)
            await session.flush()

            task = Task(
                mission_id=mission.id,
                title="Write configuration file",
                description="Writes a sensitive configuration file",
                status=TaskStatus.RUNNING,
                priority=TaskPriority.HIGH,
                assigned_agent_id="agent_coder",
            )
            session.add(task)
            await session.flush()

            agent_run = AgentRun(
                agent_id="agent_coder",
                mission_id=mission.id,
                task_id=task.id,
                status=AgentRunStatus.WAITING_APPROVAL,
                model="mock-llm",
                input_context={"goal": "test"},
            )
            session.add(agent_run)
            await session.flush()

            args = {"path": "config.json", "content": '{"db": "prod"}'}
            tool_run = ToolRun(
                tool_name="filesystem.write",
                agent_run_id=agent_run.id,
                task_id=task.id,
                mission_id=mission.id,
                input_params=args,
                status=ToolRunStatus.WAITING_APPROVAL,
                risk_level=RiskLevel.MEDIUM,
                permission_result=PermissionAction.REQUIRE_APPROVAL,
            )
            session.add(tool_run)
            await session.flush()

            # Create approval via service
            approval = await ApprovalService.create_approval(
                mission_id=mission.id,
                task_id=task.id,
                agent_id="agent_coder",
                agent_run_id=agent_run.id,
                tool_run_id=tool_run.id,
                tool_name="filesystem.write",
                arguments=args,
                risk_level=RiskLevel.MEDIUM,
                reason="Writing files requires operator confirmation.",
                session=session,
            )

            assert approval.id is not None
            assert approval.status == ApprovalStatus.PENDING
            assert approval.arguments_hash == hash_arguments(args)

            # Test Tamper Detection: If ToolRun arguments are tampered with, approve must fail
            tool_run.input_params = {"path": "tampered.json", "content": "malicious"}
            await session.flush()

            with pytest.raises(AgenticOSError, match="Approval integrity violation"):
                await ApprovalService.approve_request(
                    approval_id=approval.id,
                    decided_by="admin_sec",
                    session=session,
                )


@pytest.mark.asyncio
async def test_end_to_end_approval_and_execution_flow():
    """
    Test the complete autonomous pipeline:
    1. Agent decides to write a file (MEDIUM risk -> REQUIRE_APPROVAL).
    2. AgentRuntime pauses, creates ToolRun in WAITING_APPROVAL, Mission in WAITING_APPROVAL.
    3. Human approves via ApprovalService.
    4. Tool executes in sandbox, Task completes, Mission resumes.
    """
    rel_path = "app_config.env"
    full_path = os.path.join(settings.WORKSPACE_ROOT, rel_path)
    if os.path.exists(full_path):
        os.remove(full_path)

    test_args = {"path": rel_path, "content": "ENVIRONMENT=production\nPORT=8080"}

    mock_provider = MockLLMProvider(
        custom_structured_response=AgentDecision(
            action="tool_request",
            tool="filesystem.write",
            arguments=test_args,
            reason="Need to write app configuration.",
        )
    )

    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            mission = Mission(
                title="Deployment Config Mission",
                description="Generate deployment files",
                status=MissionStatus.RUNNING,
            )
            session.add(mission)
            await session.flush()

            task = await TaskService.create_task(
                mission_id=mission.id,
                data=TaskCreate(
                    title="Create env config",
                    description="Write app_config.env file",
                    priority=TaskPriority.HIGH,
                    assigned_agent_id="agent_coder",
                ),
                session=session,
            )
            StateMachine.transition_task(task, TaskStatus.READY)

            # Execute task: Agent decides tool_request -> Permission Guard flags MEDIUM risk -> WAITING_APPROVAL
            agent_run = await AgentRuntime.execute_task(
                task_id=task.id,
                session=session,
                provider=mock_provider,
            )

            assert agent_run.status == AgentRunStatus.WAITING_APPROVAL
            assert task.status == TaskStatus.WAITING_APPROVAL
            assert mission.status == MissionStatus.WAITING_APPROVAL

            # Find the created Approval record
            stmt_app = select(Approval).where(Approval.task_id == task.id)
            res_app = await session.execute(stmt_app)
            approval = res_app.scalar_one()

            assert approval.status == ApprovalStatus.PENDING
            assert approval.tool_name == "filesystem.write"
            assert approval.risk_level == RiskLevel.MEDIUM

            # File should NOT exist yet prior to human approval
            assert not os.path.exists(full_path)

            # Human grants approval
            result = await ApprovalService.approve_request(
                approval_id=approval.id,
                decided_by="lead_devops",
                session=session,
                decision_note="Verified config values are safe.",
            )

            assert result["status"] == ApprovalStatus.APPROVED.value
            assert result["tool_result"]["bytes_written"] > 0

            # File must now exist with the exact content
            assert os.path.exists(full_path)
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
            assert "ENVIRONMENT=production" in content

            # Task and Mission should now be completed / running
            assert task.status == TaskStatus.COMPLETED
            assert mission.status == MissionStatus.RUNNING

    if os.path.exists(full_path):
        os.remove(full_path)


@pytest.mark.asyncio
async def test_end_to_end_denial_flow():
    """
    Test human denying an approval request:
    1. Agent requests terminal command.
    2. Approval requested.
    3. Human denies.
    4. Tool never executes, Task fails gracefully.
    """
    mock_provider = MockLLMProvider(
        custom_structured_response=AgentDecision(
            action="tool_request",
            tool="terminal.execute",
            arguments={"command": "npm install suspicious-pkg"},
            reason="Installing dependencies",
        )
    )

    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            mission = Mission(
                title="Dependency Mission",
                description="Install dependencies",
                status=MissionStatus.RUNNING,
            )
            session.add(mission)
            await session.flush()

            task = await TaskService.create_task(
                mission_id=mission.id,
                data=TaskCreate(
                    title="Install suspicious pkg",
                    description="Run npm install",
                    priority=TaskPriority.HIGH,
                    assigned_agent_id="agent_executor",
                ),
                session=session,
            )
            StateMachine.transition_task(task, TaskStatus.READY)

            await AgentRuntime.execute_task(
                task_id=task.id,
                session=session,
                provider=mock_provider,
            )

            stmt_app = select(Approval).where(Approval.task_id == task.id)
            res_app = await session.execute(stmt_app)
            approval = res_app.scalar_one()

            # Human denies the request
            denied = await ApprovalService.deny_request(
                approval_id=approval.id,
                decided_by="sec_auditor",
                reason="Package failed internal vulnerability review.",
                session=session,
            )

            assert denied.status == ApprovalStatus.DENIED
            assert task.status == TaskStatus.READY
            assert task.input_data["last_tool_denial"]["tool"] == "terminal.execute"
            assert "vulnerability review" in task.input_data["last_tool_denial"]["reason"]
            assert mission.status == MissionStatus.RUNNING


@pytest.mark.asyncio
async def test_approval_cancellation():
    """
    Test operator cancelling a pending approval.
    """
    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            mission = Mission(title="Cancel Mission", description="test", status=MissionStatus.RUNNING)
            session.add(mission)
            await session.flush()

            task = Task(
                mission_id=mission.id,
                title="Task to cancel",
                description="test",
                status=TaskStatus.WAITING_APPROVAL,
            )
            session.add(task)
            await session.flush()

            agent_run = AgentRun(
                agent_id="agent_coder",
                mission_id=mission.id,
                task_id=task.id,
                status=AgentRunStatus.WAITING_APPROVAL,
                model="mock",
            )
            session.add(agent_run)
            await session.flush()

            tool_run = ToolRun(
                tool_name="git.commit",
                agent_run_id=agent_run.id,
                task_id=task.id,
                mission_id=mission.id,
                input_params={"message": "feat: test"},
                status=ToolRunStatus.WAITING_APPROVAL,
                risk_level=RiskLevel.HIGH,
            )
            session.add(tool_run)
            await session.flush()

            approval = await ApprovalService.create_approval(
                mission_id=mission.id,
                task_id=task.id,
                agent_id="agent_coder",
                agent_run_id=agent_run.id,
                tool_run_id=tool_run.id,
                tool_name="git.commit",
                arguments={"message": "feat: test"},
                risk_level=RiskLevel.HIGH,
                reason="Git commit requires approval",
                session=session,
            )

            cancelled = await ApprovalService.cancel_approval(approval.id, session)
            assert cancelled.status == ApprovalStatus.CANCELLED
            assert tool_run.status == ToolRunStatus.CANCELLED

            # Cannot cancel again
            with pytest.raises(AgenticOSError, match="cannot be cancelled"):
                await ApprovalService.cancel_approval(approval.id, session)


@pytest.mark.asyncio
async def test_approval_expiration():
    """
    Test that an expired approval request is rejected upon approval attempt.
    """
    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            mission = Mission(title="Expire Mission", description="test", status=MissionStatus.RUNNING)
            session.add(mission)
            await session.flush()

            task = Task(mission_id=mission.id, title="Expire Task", description="test", status=TaskStatus.WAITING_APPROVAL)
            session.add(task)
            await session.flush()

            agent_run = AgentRun(agent_id="agent_coder", mission_id=mission.id, task_id=task.id, status=AgentRunStatus.WAITING_APPROVAL, model="mock")
            session.add(agent_run)
            await session.flush()

            tool_run = ToolRun(
                tool_name="filesystem.write",
                agent_run_id=agent_run.id,
                task_id=task.id,
                mission_id=mission.id,
                input_params={"path": "a.txt", "content": "b"},
                status=ToolRunStatus.WAITING_APPROVAL,
                risk_level=RiskLevel.MEDIUM,
            )
            session.add(tool_run)
            await session.flush()

            approval = await ApprovalService.create_approval(
                mission_id=mission.id,
                task_id=task.id,
                agent_id="agent_coder",
                agent_run_id=agent_run.id,
                tool_run_id=tool_run.id,
                tool_name="filesystem.write",
                arguments={"path": "a.txt", "content": "b"},
                risk_level=RiskLevel.MEDIUM,
                reason="Write file",
                session=session,
                expires_in_minutes=-5,  # Already in the past
            )

            with pytest.raises(AgenticOSError, match="Approval request has expired"):
                await ApprovalService.approve_request(approval.id, "admin", session)

            assert approval.status == ApprovalStatus.EXPIRED


@pytest.mark.asyncio
async def test_approval_api_endpoints(client: AsyncClient):
    """
    Test REST API endpoints:
    - GET /api/v1/approvals
    - GET /api/v1/approvals/{id}
    - POST /api/v1/approvals/{id}/approve
    - POST /api/v1/approvals/{id}/deny
    """
    rel_path = "api_test.txt"
    full_path = os.path.join(settings.WORKSPACE_ROOT, rel_path)
    if os.path.exists(full_path):
        os.remove(full_path)

    args = {"path": rel_path, "content": "API verified content"}

    approval_id = None
    async with TestAsyncSessionLocal() as session:
        async with session.begin():
            mission = Mission(title="API Mission", description="Testing API", status=MissionStatus.RUNNING)
            session.add(mission)
            await session.flush()

            task = Task(mission_id=mission.id, title="API Task", description="test", status=TaskStatus.WAITING_APPROVAL)
            session.add(task)
            await session.flush()

            agent_run = AgentRun(agent_id="agent_coder", mission_id=mission.id, task_id=task.id, status=AgentRunStatus.WAITING_APPROVAL, model="mock")
            session.add(agent_run)
            await session.flush()

            tool_run = ToolRun(
                tool_name="filesystem.write",
                agent_run_id=agent_run.id,
                task_id=task.id,
                mission_id=mission.id,
                input_params=args,
                status=ToolRunStatus.WAITING_APPROVAL,
                risk_level=RiskLevel.MEDIUM,
            )
            session.add(tool_run)
            await session.flush()

            approval = await ApprovalService.create_approval(
                mission_id=mission.id,
                task_id=task.id,
                agent_id="agent_coder",
                agent_run_id=agent_run.id,
                tool_run_id=tool_run.id,
                tool_name="filesystem.write",
                arguments=args,
                risk_level=RiskLevel.MEDIUM,
                reason="API test approval",
                session=session,
            )
            approval_id = approval.id

    # 1. List approvals
    res_list = await client.get("/api/v1/approvals")
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert data_list["total"] >= 1
    assert any(item["id"] == approval_id for item in data_list["items"])

    # 2. Get single approval
    res_get = await client.get(f"/api/v1/approvals/{approval_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == approval_id
    assert res_get.json()["status"] == "PENDING"

    # 3. Approve via API
    res_approve = await client.post(
        f"/api/v1/approvals/{approval_id}/approve",
        json={"decided_by": "api_admin", "reason": "Approved via REST"}
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "APPROVED"
    assert os.path.exists(full_path)

    # 4. Duplicate approve attempt returns error
    res_dup = await client.post(
        f"/api/v1/approvals/{approval_id}/approve",
        json={"decided_by": "api_admin"}
    )
    assert res_dup.status_code == 400

    if os.path.exists(full_path):
        os.remove(full_path)
