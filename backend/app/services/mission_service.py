from typing import List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.enums import MissionStatus, TaskStatus, EventType
from app.models.mission import Mission
from app.models.task import Task
from app.core.dag_engine import DAGEngine
from app.core.state_machine import StateMachine
from app.core.exceptions import EntityNotFoundError, AgenticOSError
from app.schemas.mission import MissionCreate, MissionUpdate, MissionResponse
from app.services.dag_service import DAGService
from app.services.event_service import EventService


class MissionService:
    @staticmethod
    async def create_mission(
        data: MissionCreate,
        session: AsyncSession
    ) -> Mission:
        mission = Mission(
            title=data.title,
            description=data.description,
            priority=data.priority,
            deadline=data.deadline,
            status=MissionStatus.PLANNING,
            progress=0.0,
        )
        session.add(mission)
        await session.flush()

        # Emit MISSION_CREATED event
        await EventService.record_event(
            event_type=EventType.MISSION_CREATED,
            correlation_id=mission.id,
            mission_id=mission.id,
            source="mission_service",
            payload={"title": mission.title, "description": mission.description, "priority": mission.priority},
            session=session,
        )

        return mission

    @staticmethod
    async def get_mission(
        mission_id: str,
        session: AsyncSession
    ) -> Mission:
        stmt = select(Mission).where(Mission.id == mission_id)
        res = await session.execute(stmt)
        mission = res.scalar_one_or_none()
        if not mission:
            raise EntityNotFoundError("Mission", mission_id)
        return mission

    @staticmethod
    async def list_missions(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        status_filter: Optional[MissionStatus] = None
    ) -> Tuple[List[Mission], int]:
        stmt = select(Mission)
        if status_filter:
            stmt = stmt.where(Mission.status == status_filter)
        
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(Mission.created_at.desc()).offset(skip).limit(limit)
        res = await session.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    @staticmethod
    async def update_mission(
        mission_id: str,
        data: MissionUpdate,
        session: AsyncSession
    ) -> Mission:
        mission = await MissionService.get_mission(mission_id, session)

        if data.title is not None:
            mission.title = data.title
        if data.description is not None:
            mission.description = data.description
        if data.priority is not None:
            mission.priority = data.priority
        if data.deadline is not None:
            mission.deadline = data.deadline

        await session.flush()
        return mission

    @staticmethod
    async def start_mission(
        mission_id: str,
        session: AsyncSession
    ) -> Mission:
        mission = await MissionService.get_mission(mission_id, session)

        if mission.status == MissionStatus.PLANNING:
            tasks, _ = await DAGService.get_mission_tasks_and_dependencies(mission_id, session)
            if not tasks:
                raise AgenticOSError("Cannot start a mission in PLANNING status without any tasks. Create tasks first.")
            # PLANNING -> READY -> RUNNING
            StateMachine.transition_mission(mission, MissionStatus.READY)
            StateMachine.transition_mission(mission, MissionStatus.RUNNING)
        elif mission.status in (MissionStatus.READY, MissionStatus.PAUSED, MissionStatus.WAITING_APPROVAL):
            StateMachine.transition_mission(mission, MissionStatus.RUNNING)

        # Unlock any root ready tasks in the DAG
        await DAGService.unlock_dependent_tasks(mission, session)
        await session.flush()

        # Emit MISSION_STARTED event
        await EventService.record_event(
            event_type=EventType.MISSION_STARTED,
            correlation_id=mission.id,
            mission_id=mission.id,
            source="mission_service",
            payload={"status": mission.status.value, "progress": mission.progress},
            session=session,
        )

        return mission

    @staticmethod
    async def pause_mission(
        mission_id: str,
        session: AsyncSession
    ) -> Mission:
        mission = await MissionService.get_mission(mission_id, session)
        StateMachine.transition_mission(mission, MissionStatus.PAUSED)
        await session.flush()

        # Emit MISSION_PAUSED event
        await EventService.record_event(
            event_type=EventType.MISSION_PAUSED,
            correlation_id=mission.id,
            mission_id=mission.id,
            source="mission_service",
            payload={"status": mission.status.value},
            session=session,
        )

        return mission

    @staticmethod
    async def cancel_mission(
        mission_id: str,
        session: AsyncSession
    ) -> Mission:
        mission = await MissionService.get_mission(mission_id, session)
        StateMachine.transition_mission(mission, MissionStatus.CANCELLED)

        # Cancel all active tasks
        tasks, _ = await DAGService.get_mission_tasks_and_dependencies(mission_id, session)
        for t in tasks:
            if t.status in (TaskStatus.PENDING, TaskStatus.READY, TaskStatus.RUNNING, TaskStatus.WAITING_APPROVAL):
                StateMachine.transition_task(t, TaskStatus.CANCELLED)

        mission.progress = DAGEngine.calculate_progress(tasks)
        await session.flush()

        # Emit MISSION_CANCELLED event
        await EventService.record_event(
            event_type=EventType.MISSION_CANCELLED,
            correlation_id=mission.id,
            mission_id=mission.id,
            source="mission_service",
            payload={"status": mission.status.value, "progress": mission.progress},
            session=session,
        )

        return mission
