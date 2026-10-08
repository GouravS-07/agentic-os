from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, TypeVar, Type
from pydantic import BaseModel
from app.models.enums import AgentType
from app.runtime.llm.base import LLMProvider
from app.schemas.agent_decision import AgentDecision

T = TypeVar("T", bound=BaseModel)


class BaseAgent(ABC):
    """
    Abstract Base Class for specialized AI agents in Agentic OS.
    """

    def __init__(
        self,
        agent_id: str,
        name: str,
        agent_type: AgentType,
        description: str,
        system_prompt: str,
        capabilities: list[str],
        allowed_tools: list[str],
        llm_provider: Optional[LLMProvider] = None,
        is_implemented: bool = False,
    ):
        self.agent_id = agent_id
        self.name = name
        self.agent_type = agent_type
        self.description = description
        self.system_prompt = system_prompt
        self.capabilities = capabilities
        self.allowed_tools = allowed_tools
        self.llm_provider = llm_provider
        self.is_implemented = is_implemented

    @abstractmethod
    async def process(
        self,
        input_context: Dict[str, Any],
        provider: Optional[LLMProvider] = None
    ) -> AgentDecision:
        """
        Processes input context and produces a structured AgentDecision.
        """
        pass
