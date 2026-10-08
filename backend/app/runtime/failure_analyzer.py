from typing import Optional, Dict, Any
import re
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import FailureCategory, Recoverability, ReplanStrategy, EventType
from app.models.task import Task
from app.schemas.replanning import FailureAnalysisResult
from app.services.event_service import EventService


class FailureAnalyzer:
    """
    Structured failure analysis engine. Classifies errors into deterministic failure categories,
    computes recoverability, and recommends remediation strategies.
    """

    @staticmethod
    async def analyze(
        task: Task,
        error_message: str,
        session: AsyncSession,
        mission_id: Optional[str] = None,
    ) -> FailureAnalysisResult:
        m_id = mission_id or (task.mission_id if task else None)
        if m_id:
            await EventService.record_event(
                event_type=EventType.FAILURE_ANALYSIS_STARTED,
                correlation_id=m_id,
                mission_id=m_id,
                task_id=task.id if task else None,
                source="failure_analyzer",
                payload={
                    "error_preview": (error_message or "")[:120],
                    "task_id": task.id if task else None,
                },
                session=session,
            )

        err_lower = (error_message or "").lower()

        # 1. Classification rules
        if any(term in err_lower for term in ["cannot find module", "module not found", "package not found", "no such file or directory", "npm err", "pip install", "missing dependency", "command not found"]):
            category = FailureCategory.DEPENDENCY_FAILURE
            likely_cause = f"Required dependency or environment prerequisite is missing: {error_message[:120]}"
            recoverability = Recoverability.RECOVERABLE
            suggested_action = ReplanStrategy.CREATE_RECOVERY_TASK

        elif any(term in err_lower for term in ["permission denied", "eacces", "policy prohibited", "denied by policy", "unauthorized", "prohibits this operation"]):
            category = FailureCategory.PERMISSION_DENIED
            likely_cause = f"Action blocked by security policy or lack of system permissions: {error_message[:120]}"
            recoverability = Recoverability.RECOVERABLE
            suggested_action = ReplanStrategy.MODIFY_PLAN

        elif any(term in err_lower for term in ["timed out", "timeout", "deadline exceeded"]):
            category = FailureCategory.TIMEOUT
            likely_cause = f"Operation execution timed out: {error_message[:120]}"
            recoverability = Recoverability.RETRIABLE
            suggested_action = ReplanStrategy.RETRY

        elif any(term in err_lower for term in ["invalid arguments", "validation error", "schema mismatch", "value_error"]):
            category = FailureCategory.VALIDATION_FAILURE
            likely_cause = f"Tool arguments or schema input invalid: {error_message[:120]}"
            recoverability = Recoverability.RECOVERABLE
            suggested_action = ReplanStrategy.MODIFY_PLAN

        elif any(term in err_lower for term in ["tool execution failed", "exit code", "failed with code"]):
            category = FailureCategory.TOOL_FAILURE
            likely_cause = f"Tool process execution exited with error: {error_message[:120]}"
            recoverability = Recoverability.RECOVERABLE
            suggested_action = ReplanStrategy.CREATE_RECOVERY_TASK

        elif any(term in err_lower for term in ["llm", "model error", "rate limit", "token limit"]):
            category = FailureCategory.MODEL_FAILURE
            likely_cause = f"LLM generation or provider error: {error_message[:120]}"
            recoverability = Recoverability.RETRIABLE
            suggested_action = ReplanStrategy.RETRY

        elif any(term in err_lower for term in ["connection refused", "502 bad gateway", "503 service unavailable", "network error"]):
            category = FailureCategory.EXTERNAL_SERVICE_FAILURE
            likely_cause = f"External service or network connectivity issue: {error_message[:120]}"
            recoverability = Recoverability.RETRIABLE
            suggested_action = ReplanStrategy.RETRY

        else:
            category = FailureCategory.UNKNOWN
            likely_cause = f"Unclassified execution failure: {error_message[:120]}"
            recoverability = Recoverability.RECOVERABLE
            suggested_action = ReplanStrategy.MODIFY_PLAN

        # If task has exceeded max retries, adjust recoverability
        if task.retry_count >= task.max_retries and suggested_action == ReplanStrategy.RETRY:
            recoverability = Recoverability.RECOVERABLE
            suggested_action = ReplanStrategy.CREATE_RECOVERY_TASK

        result = FailureAnalysisResult(
            category=category,
            likely_cause=likely_cause,
            confidence=0.92,
            affected_task_id=task.id,
            recoverability=recoverability,
            suggested_action=suggested_action,
            details={"raw_error": error_message, "retry_count": task.retry_count},
        )

        # Emit FAILURE_ANALYZED event
        if mission_id or task.mission_id:
            m_id = mission_id or task.mission_id
            await EventService.record_event(
                event_type=EventType.FAILURE_ANALYZED,
                correlation_id=m_id,
                mission_id=m_id,
                task_id=task.id,
                source="failure_analyzer",
                payload={
                    "category": category.value,
                    "likely_cause": likely_cause,
                    "recoverability": recoverability.value,
                    "suggested_action": suggested_action.value,
                    "affected_task_id": task.id,
                },
                session=session,
            )

        return result
