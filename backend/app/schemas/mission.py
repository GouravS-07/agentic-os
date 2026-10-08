from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import MissionStatus


class MissionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Mission title")
    description: str = Field(..., min_length=1, description="Mission goal or objective")
    priority: int = Field(default=2, ge=1, le=4, description="1=Low, 2=Normal, 3=High, 4=Critical")
    deadline: Optional[datetime] = None


class MissionCreate(MissionBase):
    pass


class MissionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    priority: Optional[int] = Field(None, ge=1, le=4)
    deadline: Optional[datetime] = None


class MissionResponse(MissionBase):
    id: str
    status: MissionStatus
    progress: float
    current_task_id: Optional[str] = None
    plan_version: int = 1
    replan_count: int = 0
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MissionListResponse(BaseModel):
    total: int
    items: List[MissionResponse]
