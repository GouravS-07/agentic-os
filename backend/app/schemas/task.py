from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import TaskStatus


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    priority: int = Field(default=2, ge=1, le=4)
    assigned_agent_id: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    max_retries: int = Field(default=3, ge=0, le=10)


class TaskCreate(TaskBase):
    dependencies: List[str] = Field(default_factory=list, description="List of prerequisite task IDs")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    priority: Optional[int] = Field(None, ge=1, le=4)
    assigned_agent_id: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None


class TaskResponse(TaskBase):
    id: str
    mission_id: str
    status: TaskStatus
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    retry_count: int
    dependencies: List[str] = Field(default_factory=list)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskResultSubmission(BaseModel):
    output_data: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None


class TaskFailureSubmission(BaseModel):
    error_message: str = Field(..., min_length=1)
    retry: bool = False
