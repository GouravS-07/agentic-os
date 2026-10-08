from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.enums import MissionStatus, TaskStatus, EventType
from app.models.mission import Mission
from app.models.task import Task, TaskDependency
from app.core.dag_engine import DAGEngine
from app.core.state_machine import StateMachine
from app.core.exceptions import EntityNotFoundError, AgenticOSError
from app.schemas.task import TaskCreate, TaskUpdate, TaskResultSubmission, TaskFailureSubmission, TaskResponse
from app.services.dag_service import DAGService
from app.services.event_service import EventService


class TaskService:
    @staticmethod
    async def create_task(
        mission_id: str,
        data: TaskCreate,
        session: AsyncSession
    ) -> Task:
        stmt = select(Mission).where(Mission.id == mission_id)
        res = await session.execute(stmt)
        mission = res.scalar_one_or_none()
        if not mission:
            raise EntityNotFoundError("Mission", mission_id)

        if mission.status in (MissionStatus.COMPLETED, MissionStatus.CANCELLED):
            raise AgenticOSError(f"Cannot add tasks to a mission in '{mission.status.value}' state.")

        # Determine initial status
        initial_status = TaskStatus.PENDING
        if not data.dependencies and mission.status == MissionStatus.RUNNING:
            initial_status = TaskStatus.READY

        task = Task(
            mission_id=mission_id,
            title=data.title,
            description=data.description,
            priority=data.priority,
            assigned_agent_id=data.assigned_agent_id,
            input_data=data.input_data,
            max_retries=data.max_retries,
            status=initial_status,
        )
        session.add(task)
        await session.flush()

        # Add dependencies if provided
        if data.dependencies:
            for dep_id in data.dependencies:
                await DAGService.add_dependency(mission_id, task.id, dep_id, session)

        # Update mission progress
        tasks, _ = await DAGService.get_mission_tasks_and_dependencies(mission_id, session)
        mission.progress = DAGEngine.calculate_progress(tasks)

        await session.flush()

        # Emit TASK_CREATED event
        await EventService.record_event(
            event_type=EventType.TASK_CREATED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=task.id,
            source="task_service",
            payload={"title": task.title, "priority": task.priority, "status": task.status.value},
            session=session,
        )

        if initial_status == TaskStatus.READY:
            await EventService.record_event(
                event_type=EventType.TASK_READY,
                correlation_id=mission.id,
                mission_id=mission.id,
                task_id=task.id,
                source="task_service",
                payload={"title": task.title, "priority": task.priority},
                session=session,
            )

        return task

    @staticmethod
    async def get_task(task_id: str, session: AsyncSession) -> TaskResponse:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        if not task:
            raise EntityNotFoundError("Task", task_id)

        # Get dependency IDs
        stmt_deps = select(TaskDependency.depends_on_task_id).where(TaskDependency.task_id == task_id)
        res_deps = await session.execute(stmt_deps)
        dep_ids = list(res_deps.scalars().all())

        return TaskResponse(
            id=task.id,
            mission_id=task.mission_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            assigned_agent_id=task.assigned_agent_id,
            input_data=task.input_data,
            output_data=task.output_data,
            error_message=task.error_message,
            retry_count=task.retry_count,
            max_retries=task.max_retries,
            dependencies=dep_ids,
            started_at=task.started_at,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    @staticmethod
    async def list_mission_tasks(mission_id: str, session: AsyncSession) -> List[TaskResponse]:
        tasks, dependencies = await DAGService.get_mission_tasks_and_dependencies(mission_id, session)
        deps_map = DAGEngine.get_task_dependencies_map(dependencies)

        return [
            TaskResponse(
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
            for t in tasks
        ]

    @staticmethod
    async def list_all_tasks(
        session: AsyncSession,
        status: Optional[TaskStatus] = None,
        mission_id: Optional[str] = None,
        limit: int = 100
    ) -> List[TaskResponse]:
        stmt = select(Task)
        if status:
            stmt = stmt.where(Task.status == status)
        if mission_id:
            stmt = stmt.where(Task.mission_id == mission_id)
        stmt = stmt.order_by(Task.created_at.desc()).limit(limit)
        res = await session.execute(stmt)
        tasks = list(res.scalars().all())

        task_ids = [t.id for t in tasks]
        deps_map = {t.id: [] for t in tasks}
        if task_ids:
            stmt_deps = select(TaskDependency).where(TaskDependency.task_id.in_(task_ids))
            res_deps = await session.execute(stmt_deps)
            for dep in res_deps.scalars().all():
                if dep.task_id in deps_map:
                    deps_map[dep.task_id].append(dep.depends_on_task_id)

        return [
            TaskResponse(
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
                dependencies=deps_map.get(t.id, []),
                started_at=t.started_at,
                completed_at=t.completed_at,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in tasks
        ]

    @staticmethod
    async def start_task(task_id: str, session: AsyncSession) -> Task:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        if not task:
            raise EntityNotFoundError("Task", task_id)

        # Transition task to RUNNING
        StateMachine.transition_task(task, TaskStatus.RUNNING)

        # Link mission current task
        stmt_m = select(Mission).where(Mission.id == task.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        if mission.status == MissionStatus.READY:
            StateMachine.transition_mission(mission, MissionStatus.RUNNING)
        mission.current_task_id = task.id

        await session.flush()

        # Emit TASK_STARTED event
        await EventService.record_event(
            event_type=EventType.TASK_STARTED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=task.id,
            source="task_service",
            payload={"task_id": task.id, "title": task.title, "assigned_agent": task.assigned_agent_id},
            session=session,
        )

        return task

    @staticmethod
    async def complete_task(
        task_id: str,
        data: Optional[TaskResultSubmission],
        session: AsyncSession
    ) -> Task:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        if not task:
            raise EntityNotFoundError("Task", task_id)

        # If currently READY or WAITING_APPROVAL, jump to RUNNING -> COMPLETED
        if task.status in (TaskStatus.READY, TaskStatus.WAITING_APPROVAL):
            StateMachine.transition_task(task, TaskStatus.RUNNING)

        StateMachine.transition_task(task, TaskStatus.COMPLETED)
        if data and data.output_data is not None:
            task.output_data = data.output_data

        # Get parent mission
        stmt_m = select(Mission).where(Mission.id == task.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        if mission.current_task_id == task.id:
            mission.current_task_id = None

        # Unlock dependent tasks in DAG
        await DAGService.unlock_dependent_tasks(mission, session)

        # Emit TASK_COMPLETED event
        await EventService.record_event(
            event_type=EventType.TASK_COMPLETED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=task.id,
            source="task_service",
            payload={"task_id": task.id, "title": task.title, "output_data": task.output_data},
            session=session,
        )

        # Check if all tasks in mission are completed
        tasks, _ = await DAGService.get_mission_tasks_and_dependencies(mission.id, session)
        active_tasks = [t for t in tasks if t.status != TaskStatus.CANCELLED]
        if active_tasks and all(t.status == TaskStatus.COMPLETED for t in active_tasks):
            if mission.status == MissionStatus.RUNNING:
                StateMachine.transition_mission(mission, MissionStatus.COMPLETED)
                await EventService.record_event(
                    event_type=EventType.MISSION_COMPLETED,
                    correlation_id=mission.id,
                    mission_id=mission.id,
                    source="task_service",
                    payload={"mission_id": mission.id, "progress": 100.0, "status": "COMPLETED"},
                    session=session,
                )

        await session.flush()
        return task

    @staticmethod
    async def fail_task(
        task_id: str,
        data: TaskFailureSubmission,
        session: AsyncSession
    ) -> Task:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        if not task:
            raise EntityNotFoundError("Task", task_id)

        if task.status in (TaskStatus.READY, TaskStatus.WAITING_APPROVAL):
            StateMachine.transition_task(task, TaskStatus.RUNNING)

        StateMachine.transition_task(task, TaskStatus.FAILED)
        task.error_message = data.error_message
        task.retry_count += 1

        # Emit TASK_FAILED event
        stmt_m = select(Mission).where(Mission.id == task.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        await EventService.record_event(
            event_type=EventType.TASK_FAILED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=task.id,
            source="task_service",
            payload={"task_id": task.id, "error": task.error_message, "retry_count": task.retry_count},
            session=session,
        )

        # Check retry request
        if data.retry and task.retry_count <= task.max_retries:
            StateMachine.transition_task(task, TaskStatus.READY)
            await EventService.record_event(
                event_type=EventType.TASK_READY,
                correlation_id=mission.id,
                mission_id=mission.id,
                task_id=task.id,
                source="task_service",
                payload={"task_id": task.id, "retry_attempt": task.retry_count},
                session=session,
            )

        # Update mission progress
        tasks, _ = await DAGService.get_mission_tasks_and_dependencies(mission.id, session)
        mission.progress = DAGEngine.calculate_progress(tasks)

        await session.flush()
        return task

    @staticmethod
    async def cancel_task(task_id: str, session: AsyncSession) -> Task:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        if not task:
            raise EntityNotFoundError("Task", task_id)

        StateMachine.transition_task(task, TaskStatus.CANCELLED)

        # Recalculate mission progress
        stmt_m = select(Mission).where(Mission.id == task.mission_id)
        res_m = await session.execute(stmt_m)
        mission = res_m.scalar_one()

        tasks, _ = await DAGService.get_mission_tasks_and_dependencies(mission.id, session)
        mission.progress = DAGEngine.calculate_progress(tasks)

        await session.flush()

        # Emit TASK_CANCELLED event
        await EventService.record_event(
            event_type=EventType.TASK_CANCELLED,
            correlation_id=mission.id,
            mission_id=mission.id,
            task_id=task.id,
            source="task_service",
            payload={"task_id": task.id, "title": task.title},
            session=session,
        )

        return task
