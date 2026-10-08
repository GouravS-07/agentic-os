from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.task import Task
from app.models.mission import Mission
from app.models.enums import MemoryType
from app.services.memory_service import MemoryService


class ContextBuilder:
    """
    Constructs bounded, multi-layered context for agent prompt generation.
    Combines Task state + Mission goal + Working Memory + Episodic Experiences + Semantic Knowledge.
    """

    @staticmethod
    async def build_context(
        task: Task,
        mission: Mission,
        user_id: str,
        session: AsyncSession,
        max_memories: int = 5,
        max_context_chars: int = 6000,
    ) -> Dict[str, Any]:
        # 1. Base Task and Mission Context
        context: Dict[str, Any] = {
            "mission": {
                "id": mission.id,
                "title": mission.title,
                "goal": mission.description,
                "priority": mission.priority,
                "plan_version": getattr(mission, "plan_version", 1),
            },
            "task": {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "retry_count": getattr(task, "retry_count", 0),
                "max_retries": getattr(task, "max_retries", 3),
                "input_data": task.input_data or {},
            },
            "working_memory": [],
            "episodic_memory": [],
            "semantic_memory": [],
            "recent_failures": [],
        }

        # 2. Extract recent failures or denials from task input data
        if task.input_data and "last_tool_denial" in task.input_data:
            context["recent_failures"].append({
                "type": "tool_denied",
                "details": task.input_data["last_tool_denial"]
            })
        if task.error_message:
            context["recent_failures"].append({
                "type": "task_error",
                "error": task.error_message
            })

        # 3. Retrieve relevant memories
        query = f"{task.title} {task.description} {mission.description}"
        
        # Working Memory (scoped to this mission)
        working_res = await MemoryService.list_memories(
            session=session,
            user_id=user_id,
            mission_id=mission.id,
            memory_type=MemoryType.WORKING,
            limit=5,
        )
        context["working_memory"] = [m.content for m in working_res[0]]

        # Episodic & Semantic Memories (hybrid relevance)
        relevant_memories = await MemoryService.retrieve_relevant(
            query=query,
            user_id=user_id,
            session=session,
            mission_id=mission.id,
            task_id=task.id,
            limit=max_memories,
        )

        for rm in relevant_memories:
            item = {
                "content": rm.memory.content,
                "type": rm.memory.memory_type.value,
                "source": rm.memory.source.value,
                "relevance": rm.relevance_score,
            }
            if rm.memory.memory_type == MemoryType.EPISODIC:
                context["episodic_memory"].append(item)
            elif rm.memory.memory_type == MemoryType.SEMANTIC:
                context["semantic_memory"].append(item)

        # 4. Context Budget Enforcement (Bounded window)
        text_repr = str(context)
        if len(text_repr) > max_context_chars:
            # Trim semantic/episodic lists if needed
            context["semantic_memory"] = context["semantic_memory"][:2]
            context["episodic_memory"] = context["episodic_memory"][:2]

        return context
