from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.enums import (
    MissionStatus,
    TaskStatus,
    AgentType,
    AgentRunStatus,
    ToolRunStatus,
    PermissionAction,
    RiskLevel,
    EventType,
    MemorySource,
)
from app.models.mission import Mission
from app.models.task import Task
from app.models.agent import AgentRun
from app.models.tool import ToolRun
from app.runtime.agent_registry import AgentRegistry
from app.runtime.planner_agent import PlannerAgent
from app.runtime.llm.base import LLMProvider
from app.runtime.llm.factory import get_llm_provider
from app.tools.registry import ToolRegistry
from app.safety.permission_guard import PermissionGuard
from app.schemas.agent_decision import PlanOutput, AgentDecision
from app.schemas.task import TaskCreate, TaskResultSubmission, TaskFailureSubmission
from app.services.task_service import TaskService
from app.services.dag_service import DAGService
from app.services.approval_service import ApprovalService
from app.services.event_service import EventService
from app.services.memory_service import MemoryService
from app.runtime.context_builder import ContextBuilder
from app.runtime.failure_analyzer import FailureAnalyzer
from app.runtime.replanning_engine import ReplanningEngine
from app.core.state_machine import StateMachine
from app.core.dag_engine import DAGEngine
from app.core.exceptions import EntityNotFoundError, AgenticOSError
from app.config import settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AgentRuntime:
    """
    Central Agent Runtime managing agent lifecycles, permission verification, and tool dispatch.
    """

    @staticmethod
    async def plan_mission(
        mission_id: str,
        session: AsyncSession,
        provider: Optional[LLMProvider] = None,
    ) -> Dict[str, Any]:
        """
        Invokes the Planner Agent to decompose a mission's goal into a structured Task DAG.
        """
        stmt = select(Mission).where(Mission.id == mission_id)
        res = await session.execute(stmt)
        mission = res.scalar_one_or_none()
        if not mission:
            raise EntityNotFoundError("Mission", mission_id)

        if mission.status not in (MissionStatus.PLANNING, MissionStatus.FAILED):
            raise AgenticOSError(f"Cannot plan mission in '{mission.status.value}' state. Must be in PLANNING or FAILED.")

        planner = AgentRegistry.get("agent_planner")
        active_provider = provider or get_llm_provider()

        # 1. Create AgentRun record
        agent_run = AgentRun(
            agent_id=planner.agent_id,
            mission_id=mission.id,
            status=AgentRunStatus.RUNNING,
            model=getattr(active_provider, "default_model", "mock-model"),
            input_context={"goal": mission.description, "title": mission.title},
            started_at=utc_now(),
        )
        session.add(agent_run)
        await session.flush()

        # Emit AGENT_RUN_STARTED event
        await EventService.record_event(
            event_type=EventType.AGENT_RUN_STARTED,
            correlation_id=mission.id,
            mission_id=mission.id,
            agent_id=planner.agent_id,
            agent_run_id=agent_run.id,
            source="agent_runtime",
            payload={"agent_name": planner.name, "phase": "mission_planning"},
            session=session,
        )

        try:
            # 2. Invoke Planner Agent for structured plan
            if isinstance(planner, PlannerAgent):
                plan_output = await planner.plan(mission.description, provider=active_provider)
            else:
                decision = await planner.process({"goal": mission.description}, provider=active_provider)
                plan_output = PlanOutput.model_validate(decision.result)

            # 3. Create Tasks and wire DAG dependencies in order
            created_task_ids: List[str] = []
            for planned_task in plan_output.tasks:
                # Map integer dependency indices to actual created task IDs
                dep_ids = [created_task_ids[idx] for idx in planned_task.dependencies if idx < len(created_task_ids)]

                task = await TaskService.create_task(
                    mission_id=mission.id,
                    data=TaskCreate(
                        title=planned_task.title,
                        description=planned_task.description,
                        priority=planned_task.priority,
                        assigned_agent_id=planned_task.assigned_agent_type.value,
                        dependencies=dep_ids,
                    ),
                    session=session,
                )
                created_task_ids.append(task.id)

            # 4. Transition mission to READY
            StateMachine.transition_mission(mission, MissionStatus.READY)
            mission.progress = 0.0

            # 5. Record successful AgentRun
            agent_run.status = AgentRunStatus.COMPLETED
            agent_run.completed_at = utc_now()
            agent_run.output = plan_output.model_dump()
            await session.flush()

            # Emit AGENT_RUN_COMPLETED event
            await EventService.record_event(
                event_type=EventType.AGENT_RUN_COMPLETED,
                correlation_id=mission.id,
                mission_id=mission.id,
                agent_id=planner.agent_id,
                agent_run_id=agent_run.id,
                source="agent_runtime",
                payload={"tasks_created": len(created_task_ids), "plan_summary": plan_output.summary},
                session=session,
            )

            return {
                "mission_id": mission.id,
                "plan": plan_output.model_dump(),
                "tasks_created": len(created_task_ids),
            }

        except Exception as exc:
            agent_run.status = AgentRunStatus.FAILED
            agent_run.completed_at = utc_now()
            agent_run.error = str(exc)
            await session.flush()

            await EventService.record_event(
                event_type=EventType.AGENT_RUN_FAILED,
                correlation_id=mission.id,
                mission_id=mission.id,
                agent_id=planner.agent_id,
                agent_run_id=agent_run.id,
                source="agent_runtime",
                payload={"error": str(exc)},
                session=session,
            )
            raise

    @staticmethod
    async def execute_task(
        task_id: str,
        session: AsyncSession,
        provider: Optional[LLMProvider] = None,
    ) -> AgentRun:
        """
        Executes a READY task through the full Agent -> Decision -> Permission Guard -> Tool pipeline.
        """
        stmt_t = select(Task).where(Task.id == task_id)
        res_t = await session.execute(stmt_t)
        task = res_t.scalar_one_or_none()
        if not task:
            raise EntityNotFoundError("Task", task_id)

        if task.status != TaskStatus.READY:
            raise AgenticOSError(f"Task '{task_id}' is not in READY state (current: {task.status.value}).")

        # 1. Resolve assigned agent
        agent_key = task.assigned_agent_id or AgentType.EXECUTOR.value
        try:
            agent = AgentRegistry.get(agent_key)
        except EntityNotFoundError:
            agent = AgentRegistry.get("agent_executor")

        active_provider = provider or get_llm_provider()

        # 2. Gather context
        stmt_m = select(Mission).where(Mission.id == task.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        # Transition task and mission to RUNNING
        await TaskService.start_task(task_id, session)

        # 3. Create AgentRun
        agent_run = AgentRun(
            agent_id=agent.agent_id,
            mission_id=mission.id,
            task_id=task.id,
            status=AgentRunStatus.RUNNING,
            model=getattr(active_provider, "default_model", "mock-model"),
            input_context={
                "mission_goal": mission.description,
                "task_title": task.title,
                "task_description": task.description,
                "input_data": task.input_data,
            },
            started_at=utc_now(),
        )
        session.add(agent_run)
        await session.flush()

        # Emit AGENT_RUN_STARTED
        await EventService.record_event(
            event_type=EventType.AGENT_RUN_STARTED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=task.id,
            agent_id=agent.agent_id,
            agent_run_id=agent_run.id,
            source="agent_runtime",
            payload={"agent_name": agent.name, "task_title": task.title},
            session=session,
        )

        try:
            # 4. Synthesize multi-layered Context using ContextBuilder
            enriched_context = await ContextBuilder.build_context(
                task=task,
                mission=mission,
                user_id="default_operator",
                session=session,
            )

            memory_str = ""
            if enriched_context.get("episodic_memory"):
                memory_str += f"\nRELEVANT PAST EXPERIENCES: {[m['content'] for m in enriched_context['episodic_memory']]}"
            if enriched_context.get("semantic_memory"):
                memory_str += f"\nRELEVANT KNOWLEDGE: {[m['content'] for m in enriched_context['semantic_memory']]}"
            if enriched_context.get("recent_failures"):
                memory_str += f"\nRECENT FAILURES/DENIALS: {enriched_context['recent_failures']}"

            prompt = (
                f"You are executing the following mission task:\n"
                f"MISSION GOAL: {mission.description}\n"
                f"TASK: {task.title}\n"
                f"DETAILS: {task.description}\n"
                f"INPUT DATA: {task.input_data}\n"
                f"{memory_str}\n\n"
                f"Decide your next action (complete, tool_request, replan, or fail)."
            )

            decision, llm_resp = await active_provider.generate_structured(
                prompt=prompt,
                schema=AgentDecision,
                system_prompt=agent.system_prompt,
            )

            agent_run.output = decision.model_dump()
            agent_run.run_metadata = {"tokens": llm_resp.usage}

            # 5. Handle Decisions
            if decision.action == "complete":
                await TaskService.complete_task(
                    task_id=task.id,
                    data=TaskResultSubmission(output_data=decision.result or {}),
                    session=session,
                )
                agent_run.status = AgentRunStatus.COMPLETED
                agent_run.completed_at = utc_now()
                await session.flush()

                # Ingest meaningful completion semantic memory
                await MemoryService.extract_and_ingest_meaningful(
                    source=MemorySource.TASK_RESULT,
                    content=f"Completed task '{task.title}' for goal '{mission.description}'. Result: {str(decision.result)}",
                    user_id="default_operator",
                    session=session,
                    mission_id=mission.id,
                    task_id=task.id,
                    importance=3,
                )

                await EventService.record_event(
                    event_type=EventType.AGENT_RUN_COMPLETED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=task.id,
                    agent_id=agent.agent_id,
                    agent_run_id=agent_run.id,
                    source="agent_runtime",
                    payload={"action": "complete", "result": decision.result},
                    session=session,
                )
                return agent_run

            if decision.action == "fail":
                await TaskService.fail_task(
                    task_id=task.id,
                    data=TaskFailureSubmission(
                        error_message=decision.reason or "Agent reported execution failure.",
                        retry=False
                    ),
                    session=session,
                )
                agent_run.status = AgentRunStatus.FAILED
                agent_run.completed_at = utc_now()
                agent_run.error = decision.reason
                await session.flush()

                await EventService.record_event(
                    event_type=EventType.AGENT_RUN_FAILED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=task.id,
                    agent_id=agent.agent_id,
                    agent_run_id=agent_run.id,
                    source="agent_runtime",
                    payload={"action": "fail", "reason": decision.reason},
                    session=session,
                )

                # Autonomous Failure Analysis and Replanning
                analysis = await FailureAnalyzer.analyze(
                    task=task,
                    error_message=decision.reason or "Agent reported execution failure.",
                    session=session,
                    mission_id=mission.id,
                )
                await ReplanningEngine.replan(
                    mission_id=mission.id,
                    failed_task_id=task.id,
                    failure_analysis=analysis,
                    session=session,
                    user_id="default_operator",
                    provider=active_provider,
                )
                return agent_run

            if decision.action == "replan":
                agent_run.status = AgentRunStatus.COMPLETED
                agent_run.completed_at = utc_now()
                await session.flush()

                await EventService.record_event(
                    event_type=EventType.AGENT_RUN_COMPLETED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=task.id,
                    agent_id=agent.agent_id,
                    agent_run_id=agent_run.id,
                    source="agent_runtime",
                    payload={"action": "replan", "reason": decision.reason},
                    session=session,
                )

                analysis = await FailureAnalyzer.analyze(
                    task=task,
                    error_message=decision.reason or "Agent requested explicit replan.",
                    session=session,
                    mission_id=mission.id,
                )
                await ReplanningEngine.replan(
                    mission_id=mission.id,
                    failed_task_id=task.id,
                    failure_analysis=analysis,
                    session=session,
                    user_id="default_operator",
                    provider=active_provider,
                )
                return agent_run

            if decision.action == "tool_request":
                # --- PHASE 4 TOOL & PERMISSION GUARD PIPELINE ---
                tool_name = decision.tool or ""
                tool_args = decision.arguments or {}

                # a. Validate tool exists
                if not ToolRegistry.has(tool_name):
                    error_msg = f"Requested tool '{tool_name}' does not exist in ToolRegistry."
                    tool_run = ToolRun(
                        tool_name=tool_name or "unknown",
                        agent_run_id=agent_run.id,
                        task_id=task.id,
                        mission_id=mission.id,
                        input_params=tool_args,
                        status=ToolRunStatus.FAILED,
                        error=error_msg,
                    )
                    session.add(tool_run)
                    agent_run.status = AgentRunStatus.FAILED
                    agent_run.error = error_msg
                    await TaskService.fail_task(
                        task_id=task.id,
                        data=TaskFailureSubmission(error_message=error_msg, retry=False),
                        session=session,
                    )
                    await session.flush()

                    await EventService.record_event(
                        event_type=EventType.AGENT_RUN_FAILED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        source="agent_runtime",
                        payload={"error": error_msg},
                        session=session,
                    )
                    return agent_run

                tool = ToolRegistry.get(tool_name)

                # b. Validate arguments against schema
                try:
                    validated_args = tool.validate_args(tool_args)
                except Exception as val_exc:
                    error_msg = f"Invalid arguments for tool '{tool_name}': {str(val_exc)}"
                    tool_run = ToolRun(
                        tool_name=tool.name,
                        agent_run_id=agent_run.id,
                        task_id=task.id,
                        mission_id=mission.id,
                        input_params=tool_args,
                        status=ToolRunStatus.FAILED,
                        error=error_msg,
                    )
                    session.add(tool_run)
                    agent_run.status = AgentRunStatus.FAILED
                    agent_run.error = error_msg
                    await TaskService.fail_task(
                        task_id=task.id,
                        data=TaskFailureSubmission(error_message=error_msg, retry=False),
                        session=session,
                    )
                    await session.flush()

                    await EventService.record_event(
                        event_type=EventType.AGENT_RUN_FAILED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        source="agent_runtime",
                        payload={"error": error_msg},
                        session=session,
                    )
                    return agent_run

                # c. Create ToolRun in REQUESTED status
                tool_run = ToolRun(
                    tool_name=tool.name,
                    agent_run_id=agent_run.id,
                    task_id=task.id,
                    mission_id=mission.id,
                    input_params=validated_args,
                    status=ToolRunStatus.REQUESTED,
                    risk_level=tool.default_risk,
                )
                session.add(tool_run)
                await session.flush()

                # Emit TOOL_REQUESTED
                await EventService.record_event(
                    event_type=EventType.TOOL_REQUESTED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=task.id,
                    agent_id=agent.agent_id,
                    agent_run_id=agent_run.id,
                    tool_run_id=tool_run.id,
                    source="agent_runtime",
                    payload={"tool_name": tool.name, "arguments": validated_args},
                    session=session,
                )

                # d. Evaluate Permission Guard
                policy_decision = PermissionGuard.evaluate(agent, tool, validated_args)
                tool_run.permission_result = policy_decision.action
                tool_run.risk_level = policy_decision.risk_level

                # e. Decision = DENY
                if policy_decision.action == PermissionAction.DENY:
                    tool_run.status = ToolRunStatus.DENIED
                    tool_run.error = policy_decision.reason
                    agent_run.status = AgentRunStatus.COMPLETED
                    agent_run.completed_at = utc_now()
                    agent_run.output = {
                        "action": "tool_denied",
                        "tool": tool_name,
                        "reason": policy_decision.reason,
                    }

                    # Preserve task in READY state with denial context for next agent decision / replanning
                    task_inputs = dict(task.input_data or {})
                    task_inputs["last_tool_denial"] = {
                        "tool": tool_name,
                        "reason": policy_decision.reason,
                        "denied_at": utc_now().isoformat(),
                    }
                    task.input_data = task_inputs
                    StateMachine.transition_task(task, TaskStatus.READY)

                    await session.flush()

                    await EventService.record_event(
                        event_type=EventType.TOOL_DENIED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        tool_run_id=tool_run.id,
                        source="agent_runtime",
                        payload={"tool_name": tool.name, "reason": policy_decision.reason},
                        session=session,
                    )

                    await EventService.record_event(
                        event_type=EventType.AGENT_RUN_COMPLETED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        source="agent_runtime",
                        payload={"action": "tool_denied", "reason": policy_decision.reason},
                        session=session,
                    )
                    return agent_run

                # f. Decision = REQUIRE_APPROVAL
                if policy_decision.action == PermissionAction.REQUIRE_APPROVAL:
                    tool_run.status = ToolRunStatus.WAITING_APPROVAL
                    agent_run.status = AgentRunStatus.WAITING_APPROVAL
                    StateMachine.transition_task(task, TaskStatus.WAITING_APPROVAL)
                    StateMachine.transition_mission(mission, MissionStatus.WAITING_APPROVAL)
                    
                    await EventService.record_event(
                        event_type=EventType.MISSION_WAITING_APPROVAL,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        tool_run_id=tool_run.id,
                        source="agent_runtime",
                        payload={"tool_name": tool.name, "risk_level": policy_decision.risk_level.value, "reason": policy_decision.reason},
                        session=session,
                    )

                    await ApprovalService.create_approval(
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        tool_run_id=tool_run.id,
                        tool_name=tool.name,
                        arguments=validated_args,
                        risk_level=policy_decision.risk_level,
                        reason=policy_decision.reason,
                        session=session,
                    )
                    await session.flush()
                    return agent_run

                # g. Decision = ALLOW -> Execute Tool in Sandbox
                await EventService.record_event(
                    event_type=EventType.TOOL_AUTHORIZED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=task.id,
                    agent_id=agent.agent_id,
                    agent_run_id=agent_run.id,
                    tool_run_id=tool_run.id,
                    source="agent_runtime",
                    payload={"tool_name": tool.name, "risk_level": policy_decision.risk_level.value},
                    session=session,
                )

                tool_run.status = ToolRunStatus.RUNNING
                tool_run.started_at = utc_now()
                await session.flush()

                await EventService.record_event(
                    event_type=EventType.TOOL_STARTED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=task.id,
                    agent_id=agent.agent_id,
                    agent_run_id=agent_run.id,
                    tool_run_id=tool_run.id,
                    source="agent_runtime",
                    payload={"tool_name": tool.name, "arguments": validated_args},
                    session=session,
                )

                tool_result = await tool.execute(
                    validated_args,
                    context={"workspace_root": settings.WORKSPACE_ROOT}
                )

                tool_run.completed_at = utc_now()
                tool_run.duration_ms = int((tool_run.completed_at - tool_run.started_at).total_seconds() * 1000)

                if tool_result.success:
                    tool_run.status = ToolRunStatus.COMPLETED
                    tool_run.output_data = tool_result.data
                    agent_run.status = AgentRunStatus.COMPLETED
                    agent_run.completed_at = utc_now()
                    agent_run.output = {
                        "decision": decision.model_dump(),
                        "tool_result": tool_result.data,
                    }

                    await EventService.record_event(
                        event_type=EventType.TOOL_COMPLETED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        tool_run_id=tool_run.id,
                        source="agent_runtime",
                        payload={"tool_name": tool.name, "output_data": tool_result.data, "duration_ms": tool_run.duration_ms},
                        session=session,
                    )

                    await TaskService.complete_task(
                        task_id=task.id,
                        data=TaskResultSubmission(output_data=tool_result.data),
                        session=session,
                    )

                    await EventService.record_event(
                        event_type=EventType.AGENT_RUN_COMPLETED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        source="agent_runtime",
                        payload={"action": "tool_completed", "tool": tool.name},
                        session=session,
                    )
                else:
                    tool_run.status = ToolRunStatus.FAILED
                    tool_run.error = tool_result.error
                    agent_run.status = AgentRunStatus.FAILED
                    agent_run.completed_at = utc_now()
                    agent_run.error = tool_result.error

                    await EventService.record_event(
                        event_type=EventType.TOOL_FAILED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        tool_run_id=tool_run.id,
                        source="agent_runtime",
                        payload={"tool_name": tool.name, "error": tool_result.error, "duration_ms": tool_run.duration_ms},
                        session=session,
                    )

                    await TaskService.fail_task(
                        task_id=task.id,
                        data=TaskFailureSubmission(
                            error_message=tool_result.error or "Tool execution failed",
                            retry=False
                        ),
                        session=session,
                    )

                    await EventService.record_event(
                        event_type=EventType.AGENT_RUN_FAILED,
                        correlation_id=mission.id,
                        mission_id=mission.id,
                        task_id=task.id,
                        agent_id=agent.agent_id,
                        agent_run_id=agent_run.id,
                        source="agent_runtime",
                        payload={"action": "tool_failed", "error": tool_result.error},
                        session=session,
                    )

                    # Trigger Failure Analysis and Replanning on tool failure
                    analysis = await FailureAnalyzer.analyze(
                        task=task,
                        error_message=tool_result.error or "Tool execution failed",
                        session=session,
                        mission_id=mission.id,
                    )
                    await ReplanningEngine.replan(
                        mission_id=mission.id,
                        failed_task_id=task.id,
                        failure_analysis=analysis,
                        session=session,
                        user_id="default_operator",
                        provider=active_provider,
                    )

                await session.flush()
                return agent_run

            return agent_run

        except Exception as exc:
            agent_run.status = AgentRunStatus.FAILED
            agent_run.completed_at = utc_now()
            agent_run.error = str(exc)
            await TaskService.fail_task(
                task_id=task.id,
                data=TaskFailureSubmission(error_message=str(exc), retry=False),
                session=session,
            )
            await session.flush()

            await EventService.record_event(
                event_type=EventType.AGENT_RUN_FAILED,
                correlation_id=mission.id,
                mission_id=mission.id,
                task_id=task.id,
                agent_id=agent.agent_id,
                agent_run_id=agent_run.id,
                source="agent_runtime",
                payload={"error": str(exc)},
                session=session,
            )
            raise
