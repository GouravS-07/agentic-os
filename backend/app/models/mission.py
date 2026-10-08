from datetime import datetime
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Integer, Float, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.models.enums import MissionStatus


class Mission(BaseModel):
    __tablename__ = "missions"

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)  # High-level goal / objective
    status = Column(
        SQLEnum(MissionStatus, name="mission_status_enum"),
        default=MissionStatus.PLANNING,
        nullable=False,
        index=True
    )
    priority = Column(Integer, default=2, nullable=False)
    progress = Column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    deadline = Column(DateTime(timezone=True), nullable=True)
    current_task_id = Column(String(36), nullable=True)
    plan_version = Column(Integer, default=1, nullable=False)
    replan_count = Column(Integer, default=0, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    tasks = relationship("Task", back_populates="mission", cascade="all, delete-orphan", lazy="selectin")
