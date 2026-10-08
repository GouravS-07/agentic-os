from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.schemas.task import TaskResponse


class DependencyCreate(BaseModel):
    task_id: str = Field(..., description="Target task ID")
    depends_on_task_id: str = Field(..., description="Prerequisite task ID")


class DependencyEdge(BaseModel):
    task_id: str
    depends_on_task_id: str


class DAGGraphResponse(BaseModel):
    mission_id: str
    nodes: List[TaskResponse]
    edges: List[DependencyEdge]
    ready_task_ids: List[str]
    blocked_task_ids: List[str]
    execution_order: List[str]
