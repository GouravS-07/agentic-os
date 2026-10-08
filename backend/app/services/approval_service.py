from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.enums import (
    ApprovalStatus,
    ToolRunStatus,
    AgentRunStatus,
    TaskStatus,
    MissionStatus,
    RiskLevel,
    PermissionAction,
    EventType,
)
from app.models.approval import Approval, hash_arguments
from app.models.tool import ToolRun
from app.models.agent import AgentRun
from app.models.task import Task
from app.models.mission import Mission
from app.runtime.agent_registry import AgentRegistry
from app.tools.registry import ToolRegistry
from app.safety.permission_guard import PermissionGuard
from app.services.task_service import TaskService
from app.services.event_service import EventService
from app.schemas.task import TaskResultSubmission, TaskFailureSubmission
from app.core.state_machine import StateMachine
from app.core.exceptions import EntityNotFoundError, AgenticOSError
from app.config import settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class ApprovalService:
    @staticmethod
    async def create_approval(
        mission_id: str,
        task_id: str,
        agent_id: str,
        agent_run_id: str,
        tool_run_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
        risk_level: RiskLevel,
        reason: str,
        session: AsyncSession,
        expires_in_minutes: int = 15,
    ) -> Approval:
        args_hash = hash_arguments(arguments)
        expires_at = utc_now() + timedelta(minutes=expires_in_minutes)

        approval = Approval(
            mission_id=mission_id,
            task_id=task_id,
            agent_id=agent_id,
            agent_run_id=agent_run_id,
            tool_run_id=tool_run_id,
            tool_name=tool_name,
            arguments=arguments,
            arguments_hash=args_hash,
            risk_level=risk_level,
            reason=reason,
            status=ApprovalStatus.PENDING,
            requested_at=utc_now(),
            expires_at=expires_at,
        )
        session.add(approval)
        await session.flush()

        await EventService.record_event(
            event_type=EventType.APPROVAL_REQUESTED,
            correlation_id=mission_id,
            mission_id=mission_id,
            task_id=task_id,
            agent_id=agent_id,
            agent_run_id=agent_run_id,
            tool_run_id=tool_run_id,
            approval_id=approval.id,
            source="approval_service",
            payload={
                "tool_name": tool_name,
                "risk_level": risk_level.value,
                "reason": reason,
                "arguments": arguments,
                "expires_at": expires_at.isoformat(),
            },
            session=session,
        )

        return approval

    @staticmethod
    async def get_approval(
        approval_id: str,
        session: AsyncSession
    ) -> Approval:
        stmt = select(Approval).where(Approval.id == approval_id)
        res = await session.execute(stmt)
        approval = res.scalar_one_or_none()
        if not approval:
            raise EntityNotFoundError("Approval", approval_id)
        return approval

    @staticmethod
    async def list_approvals(
        session: AsyncSession,
        mission_id: Optional[str] = None,
        status_filter: Optional[ApprovalStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Approval], int]:
        stmt = select(Approval)
        if mission_id:
            stmt = stmt.where(Approval.mission_id == mission_id)
        if status_filter:
            stmt = stmt.where(Approval.status == status_filter)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(Approval.requested_at.desc()).offset(skip).limit(limit)
        res = await session.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    @staticmethod
    async def approve_request(
        approval_id: str,
        decided_by: str,
        session: AsyncSession,
        decision_note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validates approval integrity, re-evaluates PermissionGuard, executes the tool,
        and atomically resumes task/agent progression.
        """
        approval = await ApprovalService.get_approval(approval_id, session)

        # 1. State and Expiration Validations
        if approval.status != ApprovalStatus.PENDING:
            raise AgenticOSError(f"Approval is in '{approval.status.value}' state and cannot be approved again.")

        expires_at = ensure_utc(approval.expires_at)
        if expires_at and utc_now() > expires_at:
            approval.status = ApprovalStatus.EXPIRED
            await session.flush()
            raise AgenticOSError("Approval request has expired.")

        # 2. Integrity Validation: Verify ToolRun matches approval signature exactly
        stmt_tr = select(ToolRun).where(ToolRun.id == approval.tool_run_id)
        res_tr = await session.execute(stmt_tr)
        tool_run = res_tr.scalar_one_or_none()
        if not tool_run:
            raise EntityNotFoundError("ToolRun", approval.tool_run_id)

        if (
            tool_run.tool_name != approval.tool_name
            or tool_run.task_id != approval.task_id
            or tool_run.mission_id != approval.mission_id
            or tool_run.agent_run_id != approval.agent_run_id
        ):
            raise AgenticOSError("Approval integrity mismatch: Bound entity IDs do not match the ToolRun.")

        # Verify arguments hash has not changed
        current_hash = hash_arguments(tool_run.input_params or {})
        if current_hash != approval.arguments_hash:
            raise AgenticOSError("Approval integrity violation: Tool arguments were modified after approval was requested.")

        # 3. Load Agent & Tool for Policy Re-evaluation
        stmt_ar = select(AgentRun).where(AgentRun.id == approval.agent_run_id)
        res_ar = await session.execute(stmt_ar)
        agent_run = res_ar.scalar_one()

        agent = AgentRegistry.get(approval.agent_id)
        tool = ToolRegistry.get(approval.tool_name)

        # Re-run Permission Guard to ensure no policy violation / dangerous pattern
        policy_decision = PermissionGuard.evaluate(agent, tool, approval.arguments)
        if policy_decision.action == PermissionAction.DENY:
            approval.status = ApprovalStatus.DENIED
            approval.decided_at = utc_now()
            approval.decided_by = decided_by
            tool_run.status = ToolRunStatus.DENIED
            tool_run.error = f"Re-evaluation failed: {policy_decision.reason}"
            await session.flush()
            raise AgenticOSError(f"Action denied upon re-evaluation: {policy_decision.reason}")

        # 4. Mark Approval as APPROVED
        approval.status = ApprovalStatus.APPROVED
        approval.decided_at = utc_now()
        approval.decided_by = decided_by
        approval.decision_metadata = {
            "note": decision_note or "Human approval granted",
            "revalidated_at": utc_now().isoformat(),
        }

        await EventService.record_event(
            event_type=EventType.APPROVAL_APPROVED,
            correlation_id=approval.mission_id,
            mission_id=approval.mission_id,
            task_id=approval.task_id,
            agent_id=approval.agent_id,
            agent_run_id=approval.agent_run_id,
            tool_run_id=approval.tool_run_id,
            approval_id=approval.id,
            source="approval_service",
            payload={"decided_by": decided_by, "note": decision_note},
            session=session,
        )

        # 5. Execute the Tool in the Sandbox
        tool_run.status = ToolRunStatus.RUNNING
        tool_run.started_at = utc_now()
        await session.flush()

        await EventService.record_event(
            event_type=EventType.TOOL_STARTED,
            correlation_id=approval.mission_id,
            mission_id=approval.mission_id,
            task_id=approval.task_id,
            agent_id=approval.agent_id,
            agent_run_id=approval.agent_run_id,
            tool_run_id=tool_run.id,
            approval_id=approval.id,
            source="approval_service",
            payload={"tool_name": tool.name, "arguments": approval.arguments},
            session=session,
        )

        tool_result = await tool.execute(
            approval.arguments,
            context={"workspace_root": settings.WORKSPACE_ROOT}
        )

        tool_run.completed_at = utc_now()
        tool_run.duration_ms = int((tool_run.completed_at - tool_run.started_at).total_seconds() * 1000)

        # 6. Resolve Task and Agent State
        stmt_t = select(Task).where(Task.id == approval.task_id)
        res_t = await session.execute(stmt_t)
        task = res_t.scalar_one()

        stmt_m = select(Mission).where(Mission.id == approval.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        if tool_result.success:
            tool_run.status = ToolRunStatus.COMPLETED
            tool_run.output_data = tool_result.data
            agent_run.status = AgentRunStatus.COMPLETED
            agent_run.completed_at = utc_now()
            agent_run.output = {"approved_tool": approval.tool_name, "tool_result": tool_result.data}

            await EventService.record_event(
                event_type=EventType.TOOL_COMPLETED,
                correlation_id=approval.mission_id,
                mission_id=approval.mission_id,
                task_id=approval.task_id,
                agent_id=approval.agent_id,
                agent_run_id=approval.agent_run_id,
                tool_run_id=tool_run.id,
                approval_id=approval.id,
                source="approval_service",
                payload={"tool_name": tool.name, "output_data": tool_result.data, "duration_ms": tool_run.duration_ms},
                session=session,
            )

            # Complete task and resume mission
            await TaskService.complete_task(
                task_id=task.id,
                data=TaskResultSubmission(output_data=tool_result.data),
                session=session
            )
            if mission.status == MissionStatus.WAITING_APPROVAL:
                StateMachine.transition_mission(mission, MissionStatus.RUNNING)
        else:
            tool_run.status = ToolRunStatus.FAILED
            tool_run.error = tool_result.error
            agent_run.status = AgentRunStatus.FAILED
            agent_run.completed_at = utc_now()
            agent_run.error = tool_result.error

            await EventService.record_event(
                event_type=EventType.TOOL_FAILED,
                correlation_id=approval.mission_id,
                mission_id=approval.mission_id,
                task_id=approval.task_id,
                agent_id=approval.agent_id,
                agent_run_id=approval.agent_run_id,
                tool_run_id=tool_run.id,
                approval_id=approval.id,
                source="approval_service",
                payload={"tool_name": tool.name, "error": tool_result.error, "duration_ms": tool_run.duration_ms},
                session=session,
            )

            await TaskService.fail_task(
                task_id=task.id,
                data=TaskFailureSubmission(error_message=tool_result.error or "Approved tool execution failed", retry=False),
                session=session
            )
            if mission.status == MissionStatus.WAITING_APPROVAL:
                StateMachine.transition_mission(mission, MissionStatus.RUNNING)

        await session.flush()
        return {
            "approval_id": approval.id,
            "status": approval.status.value,
            "tool_result": tool_result.data if tool_result.success else None,
            "error": tool_result.error if not tool_result.success else None,
        }

    @staticmethod
    async def deny_request(
        approval_id: str,
        decided_by: str,
        reason: Optional[str],
        session: AsyncSession
    ) -> Approval:
        approval = await ApprovalService.get_approval(approval_id, session)

        if approval.status != ApprovalStatus.PENDING:
            raise AgenticOSError(f"Approval is in '{approval.status.value}' state and cannot be denied.")

        approval.status = ApprovalStatus.DENIED
        approval.decided_at = utc_now()
        approval.decided_by = decided_by
        approval.decision_metadata = {"denial_reason": reason or "Human operator rejected action."}

        # Update ToolRun
        stmt_tr = select(ToolRun).where(ToolRun.id == approval.tool_run_id)
        res_tr = await session.execute(stmt_tr)
        tool_run = res_tr.scalar_one_or_none()
        if tool_run:
            tool_run.status = ToolRunStatus.DENIED
            tool_run.error = f"Operator denied approval: {reason or 'No reason provided'}"

        # Update AgentRun
        stmt_ar = select(AgentRun).where(AgentRun.id == approval.agent_run_id)
        res_ar = await session.execute(stmt_ar)
        agent_run = res_ar.scalar_one_or_none()
        if agent_run:
            agent_run.status = AgentRunStatus.COMPLETED
            agent_run.completed_at = utc_now()
            agent_run.output = {
                "action": "tool_denied",
                "tool": approval.tool_name,
                "reason": reason or "Human operator rejected action.",
            }

        # Update Task & Mission: Preserve task in READY state with denial feedback for replanning
        stmt_t = select(Task).where(Task.id == approval.task_id)
        res_t = await session.execute(stmt_t)
        task = res_t.scalar_one()

        stmt_m = select(Mission).where(Mission.id == approval.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        task_inputs = dict(task.input_data or {})
        task_inputs["last_tool_denial"] = {
            "tool": approval.tool_name,
            "reason": reason or "Human operator rejected action.",
            "denied_at": utc_now().isoformat(),
        }
        task.input_data = task_inputs

        StateMachine.transition_task(task, TaskStatus.READY)

        if mission.status == MissionStatus.WAITING_APPROVAL:
            StateMachine.transition_mission(mission, MissionStatus.RUNNING)

        await EventService.record_event(
            event_type=EventType.APPROVAL_DENIED,
            correlation_id=approval.mission_id,
            mission_id=approval.mission_id,
            task_id=approval.task_id,
            agent_id=approval.agent_id,
            agent_run_id=approval.agent_run_id,
            tool_run_id=approval.tool_run_id,
            approval_id=approval.id,
            source="approval_service",
            payload={"decided_by": decided_by, "reason": reason},
            session=session,
        )

        await EventService.record_event(
            event_type=EventType.TOOL_DENIED,
            correlation_id=approval.mission_id,
            mission_id=approval.mission_id,
            task_id=approval.task_id,
            agent_id=approval.agent_id,
            agent_run_id=approval.agent_run_id,
            tool_run_id=approval.tool_run_id,
            approval_id=approval.id,
            source="approval_service",
            payload={"tool_name": approval.tool_name, "reason": reason},
            session=session,
        )

        await session.flush()
        return approval

    @staticmethod
    async def cancel_approval(
        approval_id: str,
        session: AsyncSession
    ) -> Approval:
        approval = await ApprovalService.get_approval(approval_id, session)
        if approval.status != ApprovalStatus.PENDING:
            raise AgenticOSError(f"Approval is in '{approval.status.value}' state and cannot be cancelled.")

        approval.status = ApprovalStatus.CANCELLED
        approval.decided_at = utc_now()

        stmt_tr = select(ToolRun).where(ToolRun.id == approval.tool_run_id)
        res_tr = await session.execute(stmt_tr)
        tool_run = res_tr.scalar_one_or_none()
        if tool_run:
            tool_run.status = ToolRunStatus.CANCELLED

        await EventService.record_event(
            event_type=EventType.APPROVAL_CANCELLED,
            correlation_id=approval.mission_id,
            mission_id=approval.mission_id,
            task_id=approval.task_id,
            agent_id=approval.agent_id,
            agent_run_id=approval.agent_run_id,
            tool_run_id=approval.tool_run_id,
            approval_id=approval.id,
            source="approval_service",
            payload={"approval_id": approval.id},
            session=session,
        )

        await session.flush()
        return approval
