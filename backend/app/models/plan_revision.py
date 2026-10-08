from datetime import datetime
from sqlalchemy import Column, String, Text, Enum as SQLEnum, Integer, JSON, DateTime
from app.models.base import BaseModel
from app.models.enums import ReplanStrategy


class PlanRevision(BaseModel):
    __tablename__ = "plan_revisions"

    mission_id = Column(String(36), nullable=False, index=True)
    version = Column(Integer, nullable=False, index=True)
    parent_version = Column(Integer, nullable=True)
    strategy = Column(SQLEnum(ReplanStrategy, name="replan_strategy_enum"), nullable=False, default=ReplanStrategy.MODIFY_PLAN)
    reason = Column(Text, nullable=False)
    plan_snapshot = Column(JSON, nullable=False)  # Snapshot of all tasks, dependencies, and statuses
    created_by = Column(String(255), nullable=False, default="replanning_engine")
