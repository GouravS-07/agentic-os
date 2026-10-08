from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.dag import DAGGraphResponse, DependencyCreate, DependencyEdge
from app.services.dag_service import DAGService

router = APIRouter(tags=["DAG & Dependencies"])


@router.get("/missions/{mission_id}/dag", response_model=DAGGraphResponse)
async def get_mission_dag(
    mission_id: str,
    db: AsyncSession = Depends(get_db)
):
    return await DAGService.get_mission_dag(mission_id, db)


@router.post("/missions/{mission_id}/dependencies", response_model=DependencyEdge, status_code=status.HTTP_201_CREATED)
async def add_mission_dependency(
    mission_id: str,
    payload: DependencyCreate,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        dep = await DAGService.add_dependency(
            mission_id=mission_id,
            task_id=payload.task_id,
            depends_on_task_id=payload.depends_on_task_id,
            session=db
        )
    return DependencyEdge(task_id=dep.task_id, depends_on_task_id=dep.depends_on_task_id)
