from typing import List, Tuple, Set, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.enums import MissionStatus, TaskStatus
from app.models.mission import Mission
from app.models.task import Task, TaskDependency
from app.core.dag_engine import DAGEngine
from app.core.state_machine import StateMachine
from app.core.exceptions import EntityNotFoundError, InvalidDependencyError
from app.schemas.dag import DAGGraphResponse, DependencyEdge
from app.schemas.task import TaskResponse


class DAGService:
    @staticmethod
    async def get_mission_tasks_and_dependencies(
        mission_id: str,
        session: AsyncSession
    ) -> Tuple[List[Task], List[Tuple[str, str]]]:
        """
        Loads all tasks and dependency tuples (task_id, depends_on_task_id) for a mission.
        """
        # Fetch tasks
        stmt_tasks = select(Task).where(Task.mission_id == mission_id)
        result_tasks = await session.execute(stmt_tasks)
        tasks = list(result_tasks.scalars().all())

        if not tasks:
            return [], []

        task_ids = {t.id for t in tasks}

        # Fetch dependencies
        stmt_deps = select(TaskDependency).where(TaskDependency.task_id.in_(task_ids))
        result_deps = await session.execute(stmt_deps)
        deps_records = result_deps.scalars().all()

        dependencies = [(d.task_id, d.depends_on_task_id) for d in deps_records]
        return tasks, dependencies

    @staticmethod
    async def get_mission_dag(
        mission_id: str,
        session: AsyncSession
    ) -> DAGGraphResponse:
        """
        Constructs the full DAG graph representation for the mission.
        """
        stmt_mission = select(Mission).where(Mission.id == mission_id)
        res_mission = await session.execute(stmt_mission)
        mission = res_mission.scalar_one_or_none()
        if not mission:
            raise EntityNotFoundError("Mission", mission_id)

        tasks, dependencies = await DAGService.get_mission_tasks_and_dependencies(mission_id, session)

        task_ids = {t.id for t in tasks}
        deps_map = DAGEngine.get_task_dependencies_map(dependencies)

        # Build response nodes with dependency IDs
        nodes: List[TaskResponse] = []
        for t in tasks:
            node_resp = TaskResponse(
                id=t.id,
                mission_id=t.mission_id,
                title=t.title,
                description=t.description,
                status=t.status,
                priority=t.priority,
                assigned_agent_id=t.assigned_agent_id,
                input_data=t.input_data,
                output_data=t.output_data,
                error_message=t.error_message,
                retry_count=t.retry_count,
                max_retries=t.max_retries,
                dependencies=list(deps_map.get(t.id, set())),
                started_at=t.started_at,
                completed_at=t.completed_at,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            nodes.append(node_resp)

        edges = [DependencyEdge(task_id=u, depends_on_task_id=v) for u, v in dependencies]

        # Readiness
        newly_ready, blocked = DAGEngine.evaluate_task_readiness(tasks, dependencies)
        ready_ids = [t.id for t in tasks if t.status == TaskStatus.READY] + [t.id for t in newly_ready]
        blocked_ids = [t.id for t in blocked]

        # Execution order
        try:
            order = DAGEngine.topological_sort(task_ids, dependencies)
        except Exception:
            order = list(task_ids)

        return DAGGraphResponse(
            mission_id=mission_id,
            nodes=nodes,
            edges=edges,
            ready_task_ids=list(set(ready_ids)),
            blocked_task_ids=blocked_ids,
            execution_order=order,
        )

    @staticmethod
    async def add_dependency(
        mission_id: str,
        task_id: str,
        depends_on_task_id: str,
        session: AsyncSession
    ) -> TaskDependency:
        """
        Adds a dependency edge between two tasks in the same mission after cycle and validity checks.
        """
        tasks, dependencies = await DAGService.get_mission_tasks_and_dependencies(mission_id, session)
        task_ids = {t.id for t in tasks}

        DAGEngine.validate_dependency(
            task_id=task_id,
            depends_on_task_id=depends_on_task_id,
            task_ids=task_ids,
            existing_dependencies=dependencies
        )

        # Check if edge already exists
        stmt_exist = select(TaskDependency).where(
            and_(
                TaskDependency.task_id == task_id,
                TaskDependency.depends_on_task_id == depends_on_task_id
            )
        )
        res_exist = await session.execute(stmt_exist)
        existing_dep = res_exist.scalar_one_or_none()
        if existing_dep:
            return existing_dep

        new_dep = TaskDependency(task_id=task_id, depends_on_task_id=depends_on_task_id)
        session.add(new_dep)
        await session.flush()

        return new_dep

    @staticmethod
    async def unlock_dependent_tasks(
        mission: Mission,
        session: AsyncSession
    ) -> List[Task]:
        """
        Evaluates task readiness and automatically transitions eligible PENDING tasks to READY if the mission is RUNNING.
        """
        tasks, dependencies = await DAGService.get_mission_tasks_and_dependencies(mission.id, session)
        unlocked: List[Task] = []

        if mission.status == MissionStatus.RUNNING:
            newly_ready, _ = DAGEngine.evaluate_task_readiness(tasks, dependencies)
            for t in newly_ready:
                StateMachine.transition_task(t, TaskStatus.READY)
                unlocked.append(t)

        # Recalculate progress
        mission.progress = DAGEngine.calculate_progress(tasks)
        await session.flush()

        # Emit DAG_TASK_UNLOCKED and TASK_READY events for each unlocked task
        if unlocked:
            from app.services.event_service import EventService
            from app.models.enums import EventType
            for t in unlocked:
                await EventService.record_event(
                    event_type=EventType.DAG_TASK_UNLOCKED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=t.id,
                    source="dag_service",
                    payload={"task_id": t.id, "title": t.title, "priority": t.priority},
                    session=session,
                )
                await EventService.record_event(
                    event_type=EventType.TASK_READY,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    task_id=t.id,
                    source="dag_service",
                    payload={"task_id": t.id, "title": t.title, "priority": t.priority},
                    session=session,
                )

        return unlocked
