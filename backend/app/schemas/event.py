from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import EventType


class EventResponse(BaseModel):
    id: str
    event_type: EventType
    mission_id: Optional[str] = None
    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    agent_run_id: Optional[str] = None
    tool_run_id: Optional[str] = None
    approval_id: Optional[str] = None
    correlation_id: str
    sequence_number: int
    timestamp: datetime
    source: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventListResponse(BaseModel):
    total: int
    items: List[EventResponse]
