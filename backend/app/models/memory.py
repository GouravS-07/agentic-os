from datetime import datetime
from typing import Optional, List, Any
import json
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.types import TypeDecorator

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

from app.models.base import BaseModel
from app.models.enums import MemoryType, MemorySource
from app.config import settings


class VectorType(TypeDecorator):
    """
    Dialect-aware vector column type:
    - On PostgreSQL: compiles to pgvector Vector(dim)
    - On SQLite/other: compiles to JSON array of floats
    """
    impl = JSON
    cache_ok = True

    def __init__(self, dim: Optional[int] = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim or settings.EMBEDDING_DIMENSION

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return list(value) if hasattr(value, "__iter__") and not isinstance(value, (dict, str)) else value


class Memory(BaseModel):
    __tablename__ = "memories"

    user_id = Column(String(255), nullable=False, index=True, default="default_operator")
    memory_type = Column(SQLEnum(MemoryType, name="memory_type_enum"), nullable=False, index=True)
    source = Column(SQLEnum(MemorySource, name="memory_source_enum"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(VectorType(dim=1536), nullable=True)  # Compatible with pgvector & SQLite
    importance = Column(Integer, default=3, nullable=False)  # 1 to 5 scale
    metadata_payload = Column(JSON, nullable=True)
    
    # Scoping references
    mission_id = Column(String(36), nullable=True, index=True)
    task_id = Column(String(36), nullable=True, index=True)
