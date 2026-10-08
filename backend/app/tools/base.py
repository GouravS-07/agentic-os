from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Type
from pydantic import BaseModel, Field
from app.models.enums import RiskLevel


class ToolResult(BaseModel):
    success: bool = True
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseTool(ABC):
    """
    Abstract Base Class for all sandboxed tools in Agentic OS.
    """

    def __init__(
        self,
        name: str,
        version: str,
        description: str,
        capabilities: List[str],
        default_risk: RiskLevel = RiskLevel.LOW,
        required_permissions: Optional[List[str]] = None,
        input_schema: Optional[Type[BaseModel]] = None,
        output_schema: Optional[Type[BaseModel]] = None,
    ):
        self.name = name
        self.version = version
        self.description = description
        self.capabilities = capabilities
        self.default_risk = default_risk
        self.required_permissions = required_permissions or []
        self.input_schema = input_schema
        self.output_schema = output_schema

    def validate_args(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates input arguments against schema if present.
        """
        if self.input_schema:
            validated = self.input_schema.model_validate(args)
            return validated.model_dump()
        return args

    @abstractmethod
    async def execute(
        self,
        args: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> ToolResult:
        """
        Executes the tool with validated arguments.
        """
        pass
