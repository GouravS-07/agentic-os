from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enums import (
    MissionStatus,
    TaskStatus,
    ReplanStrategy,
    FailureCategory,
    Recoverability,
    MemorySource,
    EventType,
    AgentType,
)
from app.models.mission import Mission
from app.models.task import Task
from app.models.plan_revision import PlanRevision
from app.schemas.replanning import (
    FailureAnalysisResult,
    ReplanDecision,
    RecoveryTaskSpec,
)
from app.schemas.task import TaskCreate
from app.services.task_service import TaskService
from app.services.dag_service import DAGService
from app.services.memory_service import MemoryService
from app.services.event_service import EventService
from app.core.state_machine import StateMachine
from app.core.dag_engine import DAGEngine
from app.core.exceptions import EntityNotFoundError, AgenticOSError

MAX_TASK_ATTEMPTS = 3
MAX_REPLANS_PER_MISSION = 5
MAX_IDENTICAL_TOOL_REQUESTS = 3


class ReplanningEngine:
    """
    Autonomous replanning and recovery subsystem.
    Enforces anti-loop boundaries, memory-guided remediation, plan versioning, and dynamic DAG restructuring.
    """

    @staticmethod
    async def replan(
        mission_id: str,
        failed_task_id: str,
        failure_analysis: FailureAnalysisResult,
        session: AsyncSession,
        user_id: str = "default_operator",
        provider=None,
    ) -> ReplanDecision:
        stmt_m = select(Mission).where(Mission.id == mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one_or_none()
        if not mission:
            raise EntityNotFoundError("Mission", mission_id)

        stmt_t = select(Task).where(Task.id == failed_task_id)
        res_t = await session.execute(stmt_t)
        failed_task = res_t.scalar_one_or_none()
        if not failed_task:
            raise EntityNotFoundError("Task", failed_task_id)

        # Emit REPLAN_REQUESTED event
        await EventService.record_event(
            event_type=EventType.REPLAN_REQUESTED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=failed_task.id,
            source="replanning_engine",
            payload={
                "failed_task_title": failed_task.title,
                "failure_category": failure_analysis.category.value,
                "replan_count": mission.replan_count,
            },
            session=session,
        )

        # 1. ANTI-LOOP PROTECTION
        if mission.replan_count >= MAX_REPLANS_PER_MISSION:
            # Replan threshold exceeded -> Request human operator assistance
            await EventService.record_event(
                event_type=EventType.RETRY_EXHAUSTED,
                correlation_id=mission.id,
                mission_id=mission.id,
                task_id=failed_task.id,
                source="replanning_engine",
                payload={"reason": f"Maximum replans ({MAX_REPLANS_PER_MISSION}) exceeded for mission."},
                session=session,
            )
            await EventService.record_event(
                event_type=EventType.HUMAN_INTERVENTION_REQUIRED,
                correlation_id=mission.id,
                mission_id=mission.id,
                task_id=failed_task.id,
                source="replanning_engine",
                payload={"reason": "Autonomous replanning limits reached. Manual operator intervention required."},
                session=session,
            )

            StateMachine.transition_mission(mission, MissionStatus.WAITING_APPROVAL)
            await session.flush()

            return ReplanDecision(
                action="request_human",
                strategy=ReplanStrategy.REQUEST_HUMAN,
                reason=f"Mission exceeded maximum autonomous replan threshold ({MAX_REPLANS_PER_MISSION}).",
                tasks=[],
            )

        # 2. Ingest failure experience into Episodic Memory
        await MemoryService.extract_and_ingest_meaningful(
            source=MemorySource.TASK_FAILURE,
            content=f"Task '{failed_task.title}' failed with error: {failure_analysis.likely_cause}",
            user_id=user_id,
            session=session,
            mission_id=mission.id,
            task_id=failed_task.id,
            importance=4,
            metadata={"category": failure_analysis.category.value},
        )

        # 3. Retrieve relevant historical memories to inform replanning
        past_solutions = await MemoryService.retrieve_relevant(
            query=f"Resolution for {failure_analysis.category.value} {failure_analysis.likely_cause}",
            user_id=user_id,
            session=session,
            mission_id=mission.id,
            limit=3,
        )

        strategy = failure_analysis.suggested_action

        # 4. Handle RETRY strategy
        if strategy == ReplanStrategy.RETRY and failed_task.retry_count < failed_task.max_retries:
            failed_task.retry_count += 1
            StateMachine.transition_task(failed_task, TaskStatus.READY)
            
            await EventService.record_event(
                event_type=EventType.RETRY_STARTED,
                correlation_id=mission.id,
                mission_id=mission.id,
                task_id=failed_task.id,
                source="replanning_engine",
                payload={"retry_count": failed_task.retry_count, "max_retries": failed_task.max_retries},
                session=session,
            )
            await session.flush()

            return ReplanDecision(
                action="retry",
                strategy=ReplanStrategy.RETRY,
                reason=f"Retrying task (attempt {failed_task.retry_count} of {failed_task.max_retries}).",
                tasks=[],
            )

        # 5. Handle CREATE_RECOVERY_TASK strategy
        recovery_title = f"Fix & Recover: {failed_task.title}"
        recovery_desc = (
            f"Recovery prerequisite for failed task '{failed_task.title}'. "
            f"Remediate issue: {failure_analysis.likely_cause}"
        )
        if past_solutions:
            recovery_desc += f" (Prior experience: {past_solutions[0].memory.content})"

        recovery_spec = RecoveryTaskSpec(
            title=recovery_title,
            description=recovery_desc,
            assigned_agent_type=AgentType.EXECUTOR,
            priority=failed_task.priority,
            dependencies=[],
        )

        # Capture parent plan state before any DAG restructuring or recovery injection
        parent_tasks = await TaskService.list_mission_tasks(mission.id, session)
        previous_plan = {
            "version": mission.plan_version,
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status.value,
                    "retry_count": t.retry_count,
                    "dependencies": list(t.dependencies),
                }
                for t in parent_tasks
            ],
        }

        # Create the recovery task in the DB
        recovery_task = await TaskService.create_task(
            mission_id=mission.id,
            data=TaskCreate(
                title=recovery_spec.title,
                description=recovery_spec.description,
                priority=recovery_spec.priority,
                assigned_agent_id=recovery_spec.assigned_agent_type.value,
                dependencies=[],
            ),
            session=session,
        )

        # Emit RECOVERY_TASK_CREATED event
        await EventService.record_event(
            event_type=EventType.RECOVERY_TASK_CREATED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=recovery_task.id,
            source="replanning_engine",
            payload={
                "recovery_task_id": recovery_task.id,
                "recovery_task_title": recovery_task.title,
                "failed_task_id": failed_task.id,
            },
            session=session,
        )

        # 6. DYNAMIC DAG RESTRUCTURING:
        # Rewire dependencies: Recovery Task -> Retried Failed Task
        await DAGService.add_dependency(
            mission_id=mission.id,
            task_id=failed_task.id,
            depends_on_task_id=recovery_task.id,
            session=session,
        )

        # Failed task is reset to PENDING (blocked until recovery task completes)
        # Note: in state machine, transition failed_task from FAILED/READY -> PENDING
        failed_task.status = TaskStatus.PENDING
        failed_task.retry_count += 1
        
        # Recovery task is READY to execute immediately
        recovery_task.status = TaskStatus.READY

        # 7. PLAN VERSIONING & AUDIT TRAIL
        parent_ver = mission.plan_version
        mission.plan_version += 1
        mission.replan_count += 1

        # Build snapshot of the updated task graph
        all_tasks_res = await TaskService.list_mission_tasks(mission.id, session)
        snapshot = {
            "version": mission.plan_version,
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status.value,
                    "retry_count": t.retry_count,
                    "dependencies": list(t.dependencies),
                }
                for t in all_tasks_res
            ],
            "previous_plan": previous_plan,
        }

        revision = PlanRevision(
            mission_id=mission.id,
            version=mission.plan_version,
            parent_version=parent_ver,
            strategy=ReplanStrategy.CREATE_RECOVERY_TASK,
            reason=f"Injected recovery task '{recovery_task.title}' to resolve {failure_analysis.category.value} ({failure_analysis.likely_cause})",
            plan_snapshot=snapshot,
            created_by="replanning_engine",
        )
        session.add(revision)

        # Emit REPLAN_COMPLETED event
        await EventService.record_event(
            event_type=EventType.REPLAN_COMPLETED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=recovery_task.id,
            source="replanning_engine",
            payload={
                "new_plan_version": mission.plan_version,
                "recovery_task_id": recovery_task.id,
                "strategy": ReplanStrategy.CREATE_RECOVERY_TASK.value,
            },
            session=session,
        )

        # Transition mission back to RUNNING if it was paused/waiting
        if mission.status in (MissionStatus.WAITING_APPROVAL, MissionStatus.FAILED, MissionStatus.READY):
            StateMachine.transition_mission(mission, MissionStatus.RUNNING)

        await session.flush()

        return ReplanDecision(
            action="create_recovery_task",
            strategy=ReplanStrategy.CREATE_RECOVERY_TASK,
            reason=revision.reason,
            tasks=[recovery_spec],
            metadata={"plan_version": mission.plan_version, "recovery_task_id": recovery_task.id},
        )
