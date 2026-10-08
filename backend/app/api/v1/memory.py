from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.enums import MemoryType, MemorySource
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemoryListResponse,
    MemorySearchRequest,
    MemorySearchResult,
)
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["Memory & Intelligence"])


@router.get("", response_model=MemoryListResponse)
async def list_memories(
    user_id: str = Query("default_operator", description="User ID boundary"),
    mission_id: Optional[str] = Query(None, description="Filter by mission ID"),
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    memory_type: Optional[MemoryType] = Query(None, description="Filter by memory type"),
    source: Optional[MemorySource] = Query(None, description="Filter by memory source"),
    min_importance: Optional[int] = Query(None, ge=1, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    List memories with multi-factor filtering and strict user isolation.
    """
    items, total = await MemoryService.list_memories(
        session=db,
        user_id=user_id,
        mission_id=mission_id,
        task_id=task_id,
        memory_type=memory_type,
        source=source,
        min_importance=min_importance,
        skip=skip,
        limit=limit,
    )
    return MemoryListResponse(
        items=[MemoryResponse.model_validate(m) for m in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/search", response_model=List[MemorySearchResult])
async def search_memories(
    payload: MemorySearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic hybrid search over user memories using vector similarity, recency, and importance scoring.
    """
    return await MemoryService.retrieve_relevant(
        query=payload.query,
        user_id=payload.user_id,
        session=db,
        mission_id=payload.mission_id,
        memory_type=payload.memory_type,
        limit=payload.limit,
    )


@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    payload: MemoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new memory entry.
    """
    async with db.begin():
        memory = await MemoryService.create_memory(payload, db)
    return MemoryResponse.model_validate(memory)


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    memory_id: str,
    user_id: Optional[str] = Query(None, description="User ID boundary"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a specific memory by ID with tenant boundary validation.
    """
    memory = await MemoryService.get_memory(memory_id, db, user_id=user_id)
    return MemoryResponse.model_validate(memory)


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: str,
    user_id: Optional[str] = Query(None, description="User ID boundary"),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a specific memory entry.
    """
    async with db.begin():
        await MemoryService.delete_memory(memory_id, db, user_id=user_id)
