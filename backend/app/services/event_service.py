from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import re
import logging

from app.models.enums import EventType
from app.models.event import Event
from app.events.bus import get_event_bus
from app.core.exceptions import EntityNotFoundError

logger = logging.getLogger("agentic_os.events")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


SENSITIVE_KEY_PATTERNS = [
    re.compile(r"api[_-]?key", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"password", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"authorization", re.IGNORECASE),
    re.compile(r"credential", re.IGNORECASE),
    re.compile(r"private[_-]?key", re.IGNORECASE),
]


def sanitize_payload(obj: Any) -> Any:
    """
    Recursively scrubs sensitive keys and values from event payloads.
    """
    if isinstance(obj, dict):
        sanitized = {}
        for k, v in obj.items():
            k_str = str(k)
            if any(pattern.search(k_str) for pattern in SENSITIVE_KEY_PATTERNS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_payload(v)
        return sanitized
    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    elif isinstance(obj, str):
        # Quick token check
        if len(obj) > 30 and (obj.startswith("sk-") or obj.startswith("anthropic-") or obj.startswith("ghp_")):
            return "[REDACTED_SECRET]"
        return obj
    return obj


class EventService:
    @staticmethod
    async def record_event(
        event_type: EventType,
        correlation_id: str,
        session: AsyncSession,
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        agent_run_id: Optional[str] = None,
        tool_run_id: Optional[str] = None,
        approval_id: Optional[str] = None,
        source: str = "system",
        payload: Optional[Dict[str, Any]] = None,
        publish_immediately: bool = True,
    ) -> Event:
        """
        Atomically calculates the next monotonic sequence number, scrubs sensitive data,
        persists the Event record in the database session, and broadcasts it over the EventBus.
        """
        # 1. Monotonic sequence calculation per mission
        if mission_id:
            seq_stmt = select(func.coalesce(func.max(Event.sequence_number), 0)).where(
                Event.mission_id == mission_id
            )
        else:
            seq_stmt = select(func.coalesce(func.max(Event.sequence_number), 0)).where(
                Event.mission_id.is_(None)
            )

        res = await session.execute(seq_stmt)
        max_seq = res.scalar() or 0
        next_seq = max_seq + 1

        # 2. Sanitize payload
        clean_payload = sanitize_payload(payload or {})

        # 3. Create Event record
        event = Event(
            event_type=event_type,
            mission_id=mission_id,
            task_id=task_id,
            agent_id=agent_id,
            agent_run_id=agent_run_id,
            tool_run_id=tool_run_id,
            approval_id=approval_id,
            correlation_id=correlation_id,
            sequence_number=next_seq,
            timestamp=utc_now(),
            source=source,
            payload=clean_payload,
        )
        session.add(event)
        await session.flush()

        # 4. Broadcast on EventBus
        if publish_immediately:
            event_dict = {
                "id": event.id,
                "event_type": event.event_type.value,
                "mission_id": event.mission_id,
                "task_id": event.task_id,
                "agent_id": event.agent_id,
                "agent_run_id": event.agent_run_id,
                "tool_run_id": event.tool_run_id,
                "approval_id": event.approval_id,
                "correlation_id": event.correlation_id,
                "sequence_number": event.sequence_number,
                "timestamp": event.timestamp.isoformat(),
                "source": event.source,
                "payload": event.payload,
                "created_at": event.created_at.isoformat(),
            }

            channel = f"mission:{mission_id}" if mission_id else "system"
            bus = get_event_bus()
            await bus.publish(channel, event_dict)

        return event

    @staticmethod
    async def get_event(event_id: str, session: AsyncSession) -> Event:
        stmt = select(Event).where(Event.id == event_id)
        res = await session.execute(stmt)
        event = res.scalar_one_or_none()
        if not event:
            raise EntityNotFoundError("Event", event_id)
        return event

    @staticmethod
    async def list_events(
        session: AsyncSession,
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        event_type: Optional[EventType] = None,
        correlation_id: Optional[str] = None,
        after_sequence: Optional[int] = None,
        from_timestamp: Optional[datetime] = None,
        to_timestamp: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Event], int]:
        stmt = select(Event)
        filters = []

        if mission_id:
            filters.append(Event.mission_id == mission_id)
        if task_id:
            filters.append(Event.task_id == task_id)
        if agent_id:
            filters.append(Event.agent_id == agent_id)
        if event_type:
            filters.append(Event.event_type == event_type)
        if correlation_id:
            filters.append(Event.correlation_id == correlation_id)
        if after_sequence is not None:
            filters.append(Event.sequence_number > after_sequence)
        if from_timestamp:
            filters.append(Event.timestamp >= from_timestamp)
        if to_timestamp:
            filters.append(Event.timestamp <= to_timestamp)

        if filters:
            stmt = stmt.where(and_(*filters))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(Event.timestamp.desc(), Event.sequence_number.desc()).offset(skip).limit(limit)
        res = await session.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    @staticmethod
    async def get_mission_events(
        mission_id: str,
        session: AsyncSession,
        after_sequence: Optional[int] = None,
        limit: int = 200,
    ) -> List[Event]:
        """
        Retrieves ordered mission events for WebSocket missed-event replay upon reconnection.
        """
        stmt = select(Event).where(Event.mission_id == mission_id)
        if after_sequence is not None:
            stmt = stmt.where(Event.sequence_number > after_sequence)

        stmt = stmt.order_by(Event.sequence_number.asc()).limit(limit)
        res = await session.execute(stmt)
        return list(res.scalars().all())
