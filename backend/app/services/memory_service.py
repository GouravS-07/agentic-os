from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.enums import MemoryType, MemorySource, EventType
from app.models.memory import Memory
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemorySearchResult,
)
from app.memory.embeddings.factory import get_embedding_provider
from app.memory.embeddings.mock_provider import cosine_similarity
from app.services.event_service import EventService
from app.core.exceptions import EntityNotFoundError, AgenticOSError


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def compute_recency_score(created_at: datetime, half_life_days: float = 7.0) -> float:
    """Computes exponential time-decay score between 0.0 and 1.0."""
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_seconds = max(0.0, (utc_now() - created_at).total_seconds())
    age_days = age_seconds / 86400.0
    return math.exp(-0.693 * age_days / half_life_days)


class MemoryService:
    @staticmethod
    async def create_memory(
        data: MemoryCreate,
        session: AsyncSession,
        provider=None,
    ) -> Memory:
        """
        Creates and stores a memory entity with embedding generation and event broadcasting.
        """
        embedder = provider or get_embedding_provider()
        
        # Generate embedding for semantic and episodic memories
        embedding = None
        if data.memory_type in (MemoryType.SEMANTIC, MemoryType.EPISODIC):
            embedding = await embedder.embed_text(data.content)

        memory = Memory(
            user_id=data.user_id,
            memory_type=data.memory_type,
            source=data.source,
            content=data.content,
            embedding=embedding,
            importance=data.importance,
            metadata_payload=data.metadata_payload,
            mission_id=data.mission_id,
            task_id=data.task_id,
        )
        session.add(memory)
        await session.flush()

        # Emit MEMORY_CREATED event
        await EventService.record_event(
            event_type=EventType.MEMORY_CREATED,
            correlation_id=data.mission_id or memory.id,
            mission_id=data.mission_id,
            task_id=data.task_id,
            source="memory_service",
            payload={
                "memory_id": memory.id,
                "memory_type": data.memory_type.value,
                "source": data.source.value,
                "importance": data.importance,
                "user_id": data.user_id,
                "content_preview": data.content[:100],
            },
            session=session,
        )

        return memory

    @staticmethod
    async def get_memory(
        memory_id: str,
        session: AsyncSession,
        user_id: Optional[str] = None,
    ) -> Memory:
        stmt = select(Memory).where(Memory.id == memory_id)
        if user_id:
            stmt = stmt.where(Memory.user_id == user_id)
        res = await session.execute(stmt)
        mem = res.scalar_one_or_none()
        if not mem:
            raise EntityNotFoundError("Memory", memory_id)
        return mem

    @staticmethod
    async def list_memories(
        session: AsyncSession,
        user_id: str = "default_operator",
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        memory_type: Optional[MemoryType] = None,
        source: Optional[MemorySource] = None,
        min_importance: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Memory], int]:
        stmt = select(Memory).where(Memory.user_id == user_id)
        if mission_id:
            stmt = stmt.where(Memory.mission_id == mission_id)
        if task_id:
            stmt = stmt.where(Memory.task_id == task_id)
        if memory_type:
            stmt = stmt.where(Memory.memory_type == memory_type)
        if source:
            stmt = stmt.where(Memory.source == source)
        if min_importance:
            stmt = stmt.where(Memory.importance >= min_importance)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await session.execute(count_stmt)
        total = total_res.scalar() or 0

        stmt = stmt.order_by(Memory.created_at.desc()).offset(skip).limit(limit)
        res = await session.execute(stmt)
        items = list(res.scalars().all())

        return items, total

    @staticmethod
    async def retrieve_relevant(
        query: str,
        user_id: str,
        session: AsyncSession,
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        memory_type: Optional[MemoryType] = None,
        limit: int = 5,
        min_relevance: float = 0.1,
        provider=None,
    ) -> List[MemorySearchResult]:
        """
        Hybrid multi-factor relevance retrieval:
        Relevance = 0.50 * VectorSimilarity + 0.20 * Recency + 0.15 * Importance + 0.15 * MissionMatch
        Strictly enforces user_id privacy boundaries.
        """
        embedder = provider or get_embedding_provider()
        query_vec = await embedder.embed_text(query)

        # Query candidates for this user
        stmt = select(Memory).where(Memory.user_id == user_id)
        if memory_type:
            stmt = stmt.where(Memory.memory_type == memory_type)

        res = await session.execute(stmt)
        candidates = list(res.scalars().all())

        results: List[MemorySearchResult] = []
        for mem in candidates:
            # 1. Similarity
            sim_score = 0.0
            if mem.embedding:
                sim_score = cosine_similarity(query_vec, mem.embedding)
            else:
                # Text match heuristic for un-embedded working memory
                words = set(query.lower().split())
                content_words = set(mem.content.lower().split())
                overlap = len(words.intersection(content_words))
                sim_score = min(1.0, overlap / max(1, len(words)))

            # 2. Recency
            recency_score = compute_recency_score(mem.created_at)

            # 3. Importance (1..5 -> 0.2..1.0)
            importance_score = (mem.importance or 3) / 5.0

            # 4. Mission match bonus
            mission_match_score = 1.0 if (mission_id and mem.mission_id == mission_id) else 0.0

            # Weighted combined score
            relevance = (
                0.50 * sim_score
                + 0.20 * recency_score
                + 0.15 * importance_score
                + 0.15 * mission_match_score
            )

            if relevance >= min_relevance:
                results.append(
                    MemorySearchResult(
                        memory=MemoryResponse.model_validate(mem),
                        relevance_score=round(relevance, 4),
                        similarity_score=round(sim_score, 4),
                        recency_score=round(recency_score, 4),
                        importance_score=round(importance_score, 4),
                    )
                )

        # Sort by relevance descending
        results.sort(key=lambda r: r.relevance_score, reverse=True)
        top_results = results[:limit]

        # Emit MEMORY_RETRIEVED event
        if top_results and mission_id:
            previews = [
                {
                    "id": r.memory.id,
                    "memory_type": r.memory.memory_type.value if hasattr(r.memory.memory_type, "value") else str(r.memory.memory_type),
                    "source": r.memory.source.value if hasattr(r.memory.source, "value") else str(r.memory.source),
                    "content_preview": (r.memory.content or "")[:140],
                    "relevance_score": r.relevance_score,
                    "importance": r.memory.importance,
                }
                for r in top_results[:3]
            ]
            await EventService.record_event(
                event_type=EventType.MEMORY_RETRIEVED,
                correlation_id=mission_id,
                mission_id=mission_id,
                task_id=task_id,
                source="memory_service",
                payload={
                    "query": query,
                    "retrieved_count": len(top_results),
                    "top_relevance": top_results[0].relevance_score if top_results else 0.0,
                    "memory_ids": [r.memory.id for r in top_results],
                    "previews": previews,
                },
                session=session,
            )

        return top_results

    @staticmethod
    async def update_memory(
        memory_id: str,
        data: MemoryUpdate,
        session: AsyncSession,
        provider=None,
    ) -> Memory:
        memory = await MemoryService.get_memory(memory_id, session)
        if data.content is not None:
            memory.content = data.content
            if memory.memory_type in (MemoryType.SEMANTIC, MemoryType.EPISODIC):
                embedder = provider or get_embedding_provider()
                memory.embedding = await embedder.embed_text(data.content)
        if data.importance is not None:
            memory.importance = data.importance
        if data.metadata_payload is not None:
            memory.metadata_payload = data.metadata_payload

        await session.flush()
        return memory

    @staticmethod
    async def delete_memory(
        memory_id: str,
        session: AsyncSession,
        user_id: Optional[str] = None,
    ) -> None:
        memory = await MemoryService.get_memory(memory_id, session, user_id=user_id)
        await session.delete(memory)
        await session.flush()

    @staticmethod
    async def extract_and_ingest_meaningful(
        source: MemorySource,
        content: str,
        user_id: str,
        session: AsyncSession,
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        importance: int = 3,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Memory]:
        """
        Controlled memory extraction: ensures only meaningful experiences (failures, solutions, verdicts)
        are promoted to long-term episodic/semantic storage, avoiding noisy telemetry spam.
        """
        # Exclude trivial telemetry
        noise_indicators = ["heartbeat", "agent idle", "ping", "pong", "polling", "token check"]
        if any(ind in content.lower() for ind in noise_indicators):
            return None

        # Determine target memory type
        target_type = MemoryType.EPISODIC
        if source in (MemorySource.TASK_FAILURE, MemorySource.REVIEW_RESULT, MemorySource.USER_INPUT):
            target_type = MemoryType.EPISODIC
        elif source in (MemorySource.TASK_RESULT, MemorySource.MISSION_SUMMARY):
            target_type = MemoryType.SEMANTIC

        return await MemoryService.create_memory(
            MemoryCreate(
                user_id=user_id,
                memory_type=target_type,
                source=source,
                content=content,
                importance=importance,
                metadata_payload=metadata,
                mission_id=mission_id,
                task_id=task_id,
            ),
            session=session,
        )
