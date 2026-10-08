import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.enums import (
    MissionStatus,
    TaskStatus,
    MemoryType,
    MemorySource,
    FailureCategory,
    ReplanStrategy,
    EventType,
)
from app.models.mission import Mission
from app.models.task import Task
from app.models.plan_revision import PlanRevision
from app.models.event import Event
from app.schemas.mission import MissionCreate
from app.schemas.task import TaskCreate, TaskResultSubmission, TaskFailureSubmission
from app.schemas.memory import MemoryCreate
from app.services.mission_service import MissionService
from app.services.task_service import TaskService
from app.services.dag_service import DAGService
from app.services.memory_service import MemoryService
from app.runtime.agent_runtime import AgentRuntime
from app.runtime.failure_analyzer import FailureAnalyzer
from app.runtime.replanning_engine import ReplanningEngine


@pytest.mark.asyncio
async def test_complete_phase8_end_to_end_intelligence_loop(db_session: AsyncSession):
    """
    Comprehensive End-to-End Phase 8 Integration Test:
    GOAL -> MISSION -> PLANNER -> DAG -> TOOL EXECUTION -> FAILURE ->
    MEMORY RETRIEVAL -> FAILURE ANALYSIS -> AUTONOMOUS REPLAN -> RECOVERY TASK ->
    RETRY -> MISSION COMPLETION
    """
    user_id = "test_operator"

    # Step 1: Ingest prior domain solution into Semantic/Episodic Memory
    await MemoryService.create_memory(
        data=MemoryCreate(
            user_id=user_id,
            memory_type=MemoryType.SEMANTIC,
            source=MemorySource.MANUAL,
            content="When encountering 'missing module sharp', install prebuilt sharp binaries with npm install --arch=x64 sharp",
            importance=5,
        ),
        session=db_session,
    )

    # Step 2: User assigns high-level Goal -> Mission Created
    goal_text = "Build and deploy Next.js documentation site from source code"
    mission = await MissionService.create_mission(
        data=MissionCreate(
            title="Deploy Docs Site",
            description=goal_text,
            priority=3,
        ),
        session=db_session,
    )
    assert mission.status == MissionStatus.PLANNING
    assert mission.plan_version == 1
    assert mission.replan_count == 0

    # Step 3: Planner Agent automatically generates Structured DAG
    plan_res = await AgentRuntime.plan_mission(
        mission_id=mission.id,
        session=db_session,
    )
    assert plan_res["tasks_created"] >= 2
    assert mission.status == MissionStatus.READY

    # Load tasks and dependencies from DB
    tasks = await TaskService.list_mission_tasks(mission.id, db_session)
    assert len(tasks) >= 2
    task_a = tasks[0]
    task_b = tasks[1]

    # Step 4: Operator Starts Mission Execution
    await MissionService.start_mission(mission.id, db_session)
    assert mission.status == MissionStatus.RUNNING

    # Step 5: Execute Task A (Scaffold/Analyze) -> Success
    await TaskService.start_task(task_a.id, db_session)
    await TaskService.complete_task(
        task_a.id,
        TaskResultSubmission(output_data={"status": "scaffolded", "framework": "Next.js 14"}),
        session=db_session,
    )
    ta_final = await TaskService.get_task(task_a.id, db_session)
    assert ta_final.status == TaskStatus.COMPLETED

    # Step 6: Task B is unlocked to READY -> Starts and Encounters Dependency Failure
    tb_ready = await TaskService.get_task(task_b.id, db_session)
    assert tb_ready.status == TaskStatus.READY

    await TaskService.start_task(task_b.id, db_session)
    error_msg = "Error: Cannot find module 'sharp' or native image optimization binding"
    await TaskService.fail_task(
        task_b.id,
        TaskFailureSubmission(error_message=error_msg, retry=False),
        session=db_session,
    )
    tb_failed = await TaskService.get_task(task_b.id, db_session)
    assert tb_failed.status == TaskStatus.FAILED

    # Step 7: FailureAnalyzer categorizes failure and queries memory
    analysis = await FailureAnalyzer.analyze(
        task=tb_failed,
        error_message=error_msg,
        session=db_session,
        mission_id=mission.id,
    )
    assert analysis.category == FailureCategory.DEPENDENCY_FAILURE
    assert analysis.suggested_action == ReplanStrategy.CREATE_RECOVERY_TASK

    # Step 8: ReplanningEngine restructures DAG and records Plan Revision v2
    decision = await ReplanningEngine.replan(
        mission_id=mission.id,
        failed_task_id=task_b.id,
        failure_analysis=analysis,
        session=db_session,
        user_id=user_id,
    )
    assert decision.action == "create_recovery_task"
    assert mission.plan_version == 2
    assert mission.replan_count == 1

    # Verify PlanRevision model snapshot
    revs_stmt = select(PlanRevision).where(PlanRevision.mission_id == mission.id)
    revs_res = await db_session.execute(revs_stmt)
    revisions = list(revs_res.scalars().all())
    assert len(revisions) == 1
    assert revisions[0].version == 2
    assert revisions[0].strategy == ReplanStrategy.CREATE_RECOVERY_TASK

    # Step 9: Verify dynamic DAG restructuring
    updated_tasks = await TaskService.list_mission_tasks(mission.id, db_session)
    recovery_task = [t for t in updated_tasks if "Fix & Recover" in t.title][0]
    assert recovery_task.status == TaskStatus.READY

    # Original failed Task B should now be set to PENDING, depending on Recovery Task
    tb_reloaded = await TaskService.get_task(task_b.id, db_session)
    assert tb_reloaded.status == TaskStatus.PENDING
    assert recovery_task.id in tb_reloaded.dependencies

    # Step 10: Execute and Complete Recovery Task
    await TaskService.start_task(recovery_task.id, db_session)
    await TaskService.complete_task(
        recovery_task.id,
        TaskResultSubmission(output_data={"installed": "sharp@0.33.2"}),
        session=db_session,
    )
    rec_final = await TaskService.get_task(recovery_task.id, db_session)
    assert rec_final.status == TaskStatus.COMPLETED

    # Step 11: Task B is automatically unlocked to READY -> Retry and Complete
    tb_unlocked = await TaskService.get_task(task_b.id, db_session)
    assert tb_unlocked.status == TaskStatus.READY

    await TaskService.start_task(task_b.id, db_session)
    await TaskService.complete_task(
        task_b.id,
        TaskResultSubmission(output_data={"build": "success", "pages": 12}),
        session=db_session,
    )

    # Step 12: Complete any remaining tasks in DAG
    all_final_tasks = await TaskService.list_mission_tasks(mission.id, db_session)
    for t in all_final_tasks:
        cur = await TaskService.get_task(t.id, db_session)
        if cur.status == TaskStatus.READY:
            await TaskService.start_task(cur.id, db_session)
            await TaskService.complete_task(
                cur.id,
                TaskResultSubmission(output_data={"result": "done"}),
                session=db_session,
            )

    # Step 13: Final Mission State & Event Audit
    final_mission = await MissionService.get_mission(mission.id, db_session)
    assert final_mission.status == MissionStatus.COMPLETED
    assert final_mission.progress == 100.0

    # Verify event audit trail contains required domain events
    events_stmt = select(Event).where(Event.mission_id == mission.id).order_by(Event.sequence_number.asc())
    events_res = await db_session.execute(events_stmt)
    mission_events = list(events_res.scalars().all())
    event_types = [e.event_type for e in mission_events]

    assert "MISSION_CREATED" in event_types
    assert "MISSION_STARTED" in event_types
    assert "TASK_STARTED" in event_types
    assert "TASK_COMPLETED" in event_types
    assert "TASK_FAILED" in event_types
    assert "FAILURE_ANALYZED" in event_types
    assert "RECOVERY_TASK_CREATED" in event_types
    assert "REPLAN_COMPLETED" in event_types
    assert "MISSION_COMPLETED" in event_types


@pytest.mark.asyncio
async def test_demo_api_endpoints(client: AsyncClient):
    """Test demo scenario runner and seeding endpoints."""
    # 1. Complete Loop Scenario Endpoint
    resp = await client.post("/api/v1/demo/scenarios/complete-loop")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["mission"]["status"] == "COMPLETED"
    assert data["mission"]["progress"] == 100.0
    assert data["mission"]["plan_version"] >= 2
    assert data["replan_strategy"] == "CREATE_RECOVERY_TASK"

    # 2. Seed endpoint
    seed_resp = await client.post("/api/v1/demo/seed")
    assert seed_resp.status_code == 200
    assert seed_resp.json()["status"] in ["seeded", "already_seeded"]
