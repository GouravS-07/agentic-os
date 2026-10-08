from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.enums import (
    MissionStatus,
    TaskStatus,
    MemoryType,
    MemorySource,
    AgentType,
    EventType,
)
from app.models.mission import Mission
from app.models.task import Task
from app.schemas.mission import MissionCreate
from app.schemas.task import TaskCreate, TaskResultSubmission, TaskFailureSubmission
from app.schemas.memory import MemoryCreate
from app.services.mission_service import MissionService
from app.services.task_service import TaskService
from app.services.dag_service import DAGService
from app.services.memory_service import MemoryService
from app.services.event_service import EventService
from app.runtime.agent_runtime import AgentRuntime
from app.runtime.failure_analyzer import FailureAnalyzer
from app.runtime.replanning_engine import ReplanningEngine

router = APIRouter(prefix="/demo", tags=["Demo & Scenarios"])


@router.post("/scenarios/complete-loop")
async def run_complete_demo_loop(
    user_id: str = "default_operator",
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Executes the deterministic end-to-end Agentic OS intelligence loop:
    Goal -> Mission -> Planner -> DAG -> Tool Execution -> Failure -> Memory Retrieval
    -> Failure Analysis -> Autonomous Replan -> Recovery Task -> Retry -> Completion
    """
    async with db.begin():
        # 0. Seed a relevant prior memory if not exists
        await MemoryService.create_memory(
            data=MemoryCreate(
                user_id=user_id,
                memory_type=MemoryType.SEMANTIC,
                source=MemorySource.MANUAL,
                content="Dependency failure resolution: When build fails on sharp module, execute 'npm install --platform=linux --arch=x64 sharp' to install native bindings.",
                importance=5,
            ),
            session=db,
        )

        # 1. Goal -> Mission
        mission = await MissionService.create_mission(
            data=MissionCreate(
                title="Portfolio Build Remediate & Deploy",
                description="Analyze portfolio repository, build Next.js application, resolve native dependencies, and deploy.",
                priority=3,
            ),
            session=db,
        )

        # 2. Planner Agent Decomposes Goal into DAG
        await AgentRuntime.plan_mission(
            mission_id=mission.id,
            session=db,
        )

        tasks = await TaskService.list_mission_tasks(mission.id, db)
        task_map = {t.title: t for t in tasks}

        # 3. Start Mission
        await MissionService.start_mission(mission.id, db)

        # Find first ready task
        ready_tasks = [t for t in tasks if t.status == TaskStatus.READY]
        first_task = ready_tasks[0] if ready_tasks else tasks[0]

        # 4. Execute and Complete First Task (Scaffold / Research)
        await TaskService.start_task(first_task.id, db)
        await TaskService.complete_task(
            first_task.id,
            TaskResultSubmission(output_data={"scaffolded_files": ["package.json", "src/app/page.tsx"], "status": "verified"}),
            session=db,
        )

        # Reload tasks to find newly unlocked task (Build task)
        tasks_after_first = await TaskService.list_mission_tasks(mission.id, db)
        unlocked_build_task = [t for t in tasks_after_first if t.id != first_task.id and t.status == TaskStatus.READY][0]

        # 5. Start and Simulate Failure on Build Task
        await TaskService.start_task(unlocked_build_task.id, db)
        error_msg = "npm ERR! Cannot find module 'sharp' or its native binary for platform win32-x64"
        await TaskService.fail_task(
            unlocked_build_task.id,
            TaskFailureSubmission(error_message=error_msg, retry=False),
            session=db,
        )

        # 6. Failure Analysis
        analysis = await FailureAnalyzer.analyze(
            task=await TaskService.get_task(unlocked_build_task.id, db),
            error_message=error_msg,
            session=db,
            mission_id=mission.id,
        )

        # 7. Autonomous Replanning & DAG Rewiring
        replan_decision = await ReplanningEngine.replan(
            mission_id=mission.id,
            failed_task_id=unlocked_build_task.id,
            failure_analysis=analysis,
            session=db,
            user_id=user_id,
        )

        # 8. Execute Newly Injected Recovery Task
        tasks_after_replan = await TaskService.list_mission_tasks(mission.id, db)
        recovery_task = [t for t in tasks_after_replan if "Fix & Recover" in t.title][0]
        
        await TaskService.start_task(recovery_task.id, db)
        await TaskService.complete_task(
            recovery_task.id,
            TaskResultSubmission(output_data={"installed_packages": ["sharp@0.33.2"], "status": "resolved"}),
            session=db,
        )

        # 9. Retry and Complete the Original Build Task (now unlocked to READY)
        await TaskService.start_task(unlocked_build_task.id, db)
        await TaskService.complete_task(
            unlocked_build_task.id,
            TaskResultSubmission(output_data={"bundle_size": "142 kB", "build_status": "success"}),
            session=db,
        )

        # 10. Execute and Complete Remaining Tasks (e.g. Deploy)
        final_tasks = await TaskService.list_mission_tasks(mission.id, db)
        for t in final_tasks:
            if t.status in (TaskStatus.READY, TaskStatus.PENDING):
                # Reload task in case it became ready
                current_t = await TaskService.get_task(t.id, db)
                if current_t.status == TaskStatus.READY:
                    await TaskService.start_task(current_t.id, db)
                    await TaskService.complete_task(
                        current_t.id,
                        TaskResultSubmission(output_data={"deployment_url": "https://portfolio.demo.agentic-os.local", "status": "live"}),
                        session=db,
                    )

        # Mission is completed
        final_mission = await MissionService.get_mission(mission.id, db)
        final_tasks_list = await TaskService.list_mission_tasks(mission.id, db)

        return {
            "status": "success",
            "mission": {
                "id": final_mission.id,
                "title": final_mission.title,
                "status": final_mission.status.value,
                "progress": final_mission.progress,
                "plan_version": final_mission.plan_version,
                "replan_count": final_mission.replan_count,
            },
            "tasks_count": len(final_tasks_list),
            "replan_strategy": replan_decision.strategy.value,
            "recovery_task_id": recovery_task.id,
            "message": "Full autonomous intelligence loop completed successfully.",
        }


@router.post("/seed")
async def seed_demo_data(
    user_id: str = "default_operator",
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Seeds rich sample missions, tasks, and memory entries for dashboard exploration.
    """
    async with db.begin():
        # Check if already seeded
        res = await db.execute(select(Mission))
        existing = res.scalars().first()
        if existing:
            return {"status": "already_seeded", "message": "Demo data already exists in database."}

        # 1. Mission 1: Completed Web App Build
        m1 = await MissionService.create_mission(
            MissionCreate(
                title="Distributed Microservice Observability Agent",
                description="Deploy OpenTelemetry collector sidecars and configure Prometheus metrics pipelines.",
                priority=2,
            ),
            session=db,
        )
        t1 = await TaskService.create_task(
            mission_id=m1.id,
            data=TaskCreate(title="Inspect Kubernetes cluster state", description="Verify node exporter daemonsets", priority=2),
            session=db,
        )
        t2 = await TaskService.create_task(
            mission_id=m1.id,
            data=TaskCreate(title="Configure OpenTelemetry collector", description="Apply OTel config map", priority=2, dependencies=[t1.id]),
            session=db,
        )
        await MissionService.start_mission(m1.id, db)
        await TaskService.start_task(t1.id, db)
        await TaskService.complete_task(t1.id, TaskResultSubmission(output_data={"cluster": "healthy"}), session=db)
        await TaskService.start_task(t2.id, db)
        await TaskService.complete_task(t2.id, TaskResultSubmission(output_data={"otel": "configured"}), session=db)

        # 2. Mission 2: Active / Running Mission
        m2 = await MissionService.create_mission(
            MissionCreate(
                title="AI Code Review & Security Analysis",
                description="Scan source code repositories for CVEs, credential leaks, and OWASP Top 10 vulnerabilities.",
                priority=3,
            ),
            session=db,
        )
        t3 = await TaskService.create_task(
            mission_id=m2.id,
            data=TaskCreate(title="Static analysis AST parser", description="Parse AST and identify taint paths", priority=3),
            session=db,
        )
        t4 = await TaskService.create_task(
            mission_id=m2.id,
            data=TaskCreate(title="Dependency vulnerability scan", description="Cross-reference with OSV/NVD database", priority=3, dependencies=[t3.id]),
            session=db,
        )
        await MissionService.start_mission(m2.id, db)
        await TaskService.start_task(t3.id, db)
        await TaskService.complete_task(t3.id, TaskResultSubmission(output_data={"taint_paths_found": 0}), session=db)

        # 3. Seed Semantic and Episodic Memories
        await MemoryService.create_memory(
            MemoryCreate(
                user_id=user_id,
                memory_type=MemoryType.SEMANTIC,
                source=MemorySource.MANUAL,
                content="PostgreSQL pgvector uses HNSW indexes with vector_cosine_ops for sub-millisecond similarity search.",
                importance=5,
            ),
            session=db,
        )
        await MemoryService.create_memory(
            MemoryCreate(
                user_id=user_id,
                memory_type=MemoryType.EPISODIC,
                source=MemorySource.TASK_FAILURE,
                content="Next.js static export fails if Server Actions are invoked without configuring a custom server runtime.",
                importance=4,
            ),
            session=db,
        )
        await MemoryService.create_memory(
            MemoryCreate(
                user_id=user_id,
                memory_type=MemoryType.WORKING,
                source=MemorySource.AGENT_REFLECTION,
                content="Agentic OS runtime enforces deterministic state transitions across Mission and Task lifecycles.",
                importance=3,
            ),
            session=db,
        )

        return {
            "status": "seeded",
            "message": "Sample missions, tasks, and memory entries seeded successfully.",
        }
