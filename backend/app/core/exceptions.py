class AgenticOSError(Exception):
    """Base exception for Agentic OS domain errors."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class EntityNotFoundError(AgenticOSError):
    def __init__(self, entity_type: str, entity_id: str):
        super().__init__(f"{entity_type} with ID '{entity_id}' not found.", code="ENTITY_NOT_FOUND")
        self.entity_type = entity_type
        self.entity_id = entity_id


class InvalidStateTransitionError(AgenticOSError):
    def __init__(self, entity_type: str, current_state: str, requested_state: str, allowed_states: list[str]):
        super().__init__(
            f"Cannot transition {entity_type} from {current_state} to {requested_state}. "
            f"Allowed transitions: {allowed_states}",
            code="INVALID_STATE_TRANSITION"
        )
        self.entity_type = entity_type
        self.current_state = current_state
        self.requested_state = requested_state
        self.allowed_states = allowed_states


class DependencyCycleError(AgenticOSError):
    def __init__(self, message: str = "Dependency cycle detected in task graph."):
        super().__init__(message, code="CYCLE_DETECTED")


class SelfDependencyError(AgenticOSError):
    def __init__(self, task_id: str):
        super().__init__(f"Task '{task_id}' cannot depend on itself.", code="SELF_DEPENDENCY")
        self.task_id = task_id


class InvalidDependencyError(AgenticOSError):
    def __init__(self, message: str):
        super().__init__(message, code="INVALID_DEPENDENCY")
