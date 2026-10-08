from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.schemas.event import EventResponse, EventListResponse
from app.models.enums import EventType
from app.services.event_service import EventService
from app.services.mission_service import MissionService

router = APIRouter(prefix="/events", tags=["Event Stream & Observability"])


@router.get("", response_model=EventListResponse)
async def list_events(
    mission_id: Optional[str] = Query(None, description="Filter by mission ID"),
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    event_type: Optional[EventType] = Query(None, description="Filter by event type"),
    correlation_id: Optional[str] = Query(None, description="Filter by correlation ID"),
    after_sequence: Optional[int] = Query(None, description="Return events with sequence number greater than this value"),
    from_timestamp: Optional[datetime] = Query(None, description="Filter from timestamp"),
    to_timestamp: Optional[datetime] = Query(None, description="Filter to timestamp"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    List events with filtering, pagination, and monotonic sequence tracking.
    """
    items, total = await EventService.list_events(
        session=db,
        mission_id=mission_id,
        task_id=task_id,
        agent_id=agent_id,
        event_type=event_type,
        correlation_id=correlation_id,
        after_sequence=after_sequence,
        from_timestamp=from_timestamp,
        to_timestamp=to_timestamp,
        skip=skip,
        limit=limit,
    )
    return EventListResponse(
        total=total,
        items=[EventResponse.model_validate(item) for item in items],
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str = Path(..., description="Event ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve details for a single persisted domain event.
    """
    event = await EventService.get_event(event_id, db)
    return EventResponse.model_validate(event)
