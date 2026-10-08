from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.models.enums import TaskStatus
from app.schemas.task import (
    TaskResponse,
    TaskResultSubmission,
    TaskFailureSubmission,
)
from app.schemas.agent import AgentRunResponse
from app.services.task_service import TaskService
from app.runtime.agent_runtime import AgentRuntime

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status: Optional[TaskStatus] = None,
    mission_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    return await TaskService.list_all_tasks(session=db, status=status, mission_id=mission_id, limit=limit)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await TaskService.get_task(task_id, db)


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        task = await TaskService.start_task(task_id, db)
    return await TaskService.get_task(task.id, db)


@router.post("/{task_id}/execute", response_model=AgentRunResponse)
async def execute_task_with_agent(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        agent_run = await AgentRuntime.execute_task(task_id, db)
    return AgentRunResponse.model_validate(agent_run)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    payload: Optional[TaskResultSubmission] = None,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        task = await TaskService.complete_task(task_id, payload, db)
    return await TaskService.get_task(task.id, db)


@router.post("/{task_id}/fail", response_model=TaskResponse)
async def fail_task(
    task_id: str,
    payload: TaskFailureSubmission,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        task = await TaskService.fail_task(task_id, payload, db)
    return await TaskService.get_task(task.id, db)


@router.post("/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        task = await TaskService.cancel_task(task_id, db)
    return await TaskService.get_task(task.id, db)
