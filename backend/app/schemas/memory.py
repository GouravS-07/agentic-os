from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import MemoryType, MemorySource


class MemoryCreate(BaseModel):
    user_id: str = Field(default="default_operator", description="Owner user ID")
    memory_type: MemoryType = Field(..., description="WORKING, EPISODIC, or SEMANTIC")
    source: MemorySource = Field(..., description="Origin of memory")
    content: str = Field(..., min_length=1, description="Memory content / experience")
    importance: int = Field(default=3, ge=1, le=5, description="1 to 5 importance scale")
    metadata_payload: Optional[Dict[str, Any]] = Field(default=None, description="Context metadata")
    mission_id: Optional[str] = Field(default=None, description="Associated mission ID")
    task_id: Optional[str] = Field(default=None, description="Associated task ID")


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    importance: Optional[int] = Field(None, ge=1, le=5)
    metadata_payload: Optional[Dict[str, Any]] = None


class MemoryResponse(BaseModel):
    id: str
    user_id: str
    memory_type: MemoryType
    source: MemorySource
    content: str
    importance: int
    metadata_payload: Optional[Dict[str, Any]] = None
    mission_id: Optional[str] = None
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemoryListResponse(BaseModel):
    items: List[MemoryResponse]
    total: int = Field(default=0, description="Total count")
    skip: int = 0
    limit: int = 50


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Semantic / natural language search query")
    user_id: str = Field(default="default_operator", description="Scoping user ID")
    memory_type: Optional[MemoryType] = None
    mission_id: Optional[str] = None
    min_importance: Optional[int] = Field(None, ge=1, le=5)
    limit: int = Field(default=5, ge=1, le=20)


class MemorySearchResult(BaseModel):
    memory: MemoryResponse
    relevance_score: float = Field(..., description="Combined relevance score 0.0 to 1.0")
    similarity_score: float = Field(..., description="Raw vector cosine similarity")
    recency_score: float = Field(..., description="Time decay factor")
    importance_score: float = Field(..., description="Normalized importance factor")
