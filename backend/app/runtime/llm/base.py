from abc import ABC, abstractmethod
from typing import TypeVar, Type, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel):
    content: str
    structured_data: Optional[Dict[str, Any]] = None
    model: str
    raw_response: Optional[Dict[str, Any]] = None
    usage: Dict[str, int] = Field(default_factory=dict)


class LLMProvider(ABC):
    """Abstract base class for all LLM model providers."""

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        """Generate unstructured text from the model."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> Tuple[T, LLMResponse]:
        """Generate and validate a structured Pydantic object from the model."""
        pass
