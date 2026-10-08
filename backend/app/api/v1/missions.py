from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.database import get_db
from app.models.enums import MissionStatus
from app.schemas.mission import (
    MissionCreate,
    MissionUpdate,
    MissionResponse,
    MissionListResponse,
)
from app.schemas.task import TaskCreate, TaskResponse
from app.schemas.agent import PlanMissionResponse
from app.schemas.replanning import PlanRevisionResponse
from app.services.mission_service import MissionService
from app.services.task_service import TaskService
from app.runtime.agent_runtime import AgentRuntime

router = APIRouter(prefix="/missions", tags=["Missions"])


@router.post("", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
async def create_mission(
    payload: MissionCreate,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        mission = await MissionService.create_mission(payload, db)
    return mission


@router.get("", response_model=MissionListResponse)
async def list_missions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[MissionStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    items, total = await MissionService.list_missions(db, skip=skip, limit=limit, status_filter=status)
    return MissionListResponse(total=total, items=items)


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    mission = await MissionService.get_mission(mission_id, db)
    return mission


@router.patch("/{mission_id}", response_model=MissionResponse)
async def update_mission(
    mission_id: str,
    payload: MissionUpdate,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        mission = await MissionService.update_mission(mission_id, payload, db)
    return mission


@router.post("/{mission_id}/plan", response_model=PlanMissionResponse)
async def plan_mission(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        result = await AgentRuntime.plan_mission(mission_id, db)
    return PlanMissionResponse(**result)


@router.post("/{mission_id}/start", response_model=MissionResponse)
async def start_mission(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        mission = await MissionService.start_mission(mission_id, db)
    return mission


@router.post("/{mission_id}/pause", response_model=MissionResponse)
async def pause_mission(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        mission = await MissionService.pause_mission(mission_id, db)
    return mission


@router.post("/{mission_id}/cancel", response_model=MissionResponse)
async def cancel_mission(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        mission = await MissionService.cancel_mission(mission_id, db)
    return mission


@router.get("/{mission_id}/tasks", response_model=list[TaskResponse])
async def list_mission_tasks(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await TaskService.list_mission_tasks(mission_id, db)


@router.post("/{mission_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_mission_task(
    mission_id: str,
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        task = await TaskService.create_task(mission_id, payload, db)
    return await TaskService.get_task(task.id, db)


@router.get("/{mission_id}/events", response_model=list)
async def get_mission_events(
    mission_id: str,
    after_sequence: Optional[int] = Query(None, description="Retrieve events with sequence number greater than this value"),
    limit: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ordered mission events for replay / reconnection synchronization.
    """
    await MissionService.get_mission(mission_id, db)
    from app.services.event_service import EventService
    from app.schemas.event import EventResponse
    events = await EventService.get_mission_events(
        mission_id=mission_id,
        session=db,
        after_sequence=after_sequence,
        limit=limit,
    )
    return [EventResponse.model_validate(e) for e in events]


@router.get("/{mission_id}/memory", response_model=list)
async def get_mission_memories(
    mission_id: str,
    user_id: str = Query("default_operator"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all memories associated with this mission.
    """
    await MissionService.get_mission(mission_id, db)
    from app.services.memory_service import MemoryService
    from app.schemas.memory import MemoryResponse
    items, _ = await MemoryService.list_memories(
        session=db,
        user_id=user_id,
        mission_id=mission_id,
        limit=100,
    )
    return [MemoryResponse.model_validate(m) for m in items]


@router.get("/{mission_id}/replans", response_model=List[PlanRevisionResponse])
async def get_mission_replans(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get plan revision history for audit trail and plan evolution visualization.
    """
    await MissionService.get_mission(mission_id, db)
    from app.models.plan_revision import PlanRevision
    stmt = select(PlanRevision).where(PlanRevision.mission_id == mission_id).order_by(PlanRevision.version.asc())
    res = await db.execute(stmt)
    revisions = res.scalars().all()
    return [PlanRevisionResponse.model_validate(r) for r in revisions]


@router.post("/{mission_id}/replan")
async def trigger_mission_replan(
    mission_id: str,
    task_id: Optional[str] = Query(None, description="Optional specific task ID that failed"),
    reason: str = Query("Manual operator triggered replan"),
    user_id: str = Query("default_operator"),
    db: AsyncSession = Depends(get_db)
):
    """
    Explicitly triggers mission replanning and recovery task generation.
    """
    from app.runtime.failure_analyzer import FailureAnalyzer
    from app.runtime.replanning_engine import ReplanningEngine
    from app.models.task import Task
    from fastapi import HTTPException

    async with db.begin():
        mission = await MissionService.get_mission(mission_id, db)
        
        # If task_id not provided, find the last failed or active task
        target_task = None
        if task_id:
            target_task = await TaskService.get_task(task_id, db)
        else:
            tasks = await TaskService.list_mission_tasks(mission_id, db)
            failed_tasks = [t for t in tasks if t.status == TaskStatus.FAILED]
            target_task = failed_tasks[0] if failed_tasks else (tasks[0] if tasks else None)

        if not target_task:
            raise HTTPException(status_code=400, detail="No tasks found to replan.")

        analysis = await FailureAnalyzer.analyze(
            task=target_task,
            error_message=reason,
            session=db,
            mission_id=mission.id,
        )
        decision = await ReplanningEngine.replan(
            mission_id=mission.id,
            failed_task_id=target_task.id,
            failure_analysis=analysis,
            session=db,
            user_id=user_id,
        )

    return decision.model_dump()
