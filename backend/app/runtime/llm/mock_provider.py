from typing import TypeVar, Type, Optional, Dict, Any, Tuple
import json
from pydantic import BaseModel, ValidationError
from app.runtime.llm.base import LLMProvider, LLMResponse
from app.schemas.agent_decision import PlanOutput, PlannedTask, AgentDecision
from app.models.enums import AgentType

T = TypeVar("T", bound=BaseModel)


class MockLLMProvider(LLMProvider):
    """
    Deterministic Mock LLM Provider for testing and zero-key offline environments.
    """

    def __init__(
        self,
        custom_structured_response: Optional[Any] = None,
        should_fail: bool = False,
        malformed_json: bool = False,
    ):
        self.custom_structured_response = custom_structured_response
        self.should_fail = should_fail
        self.malformed_json = malformed_json

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        if self.should_fail:
            raise RuntimeError("Mock LLM Provider simulated failure.")

        return LLMResponse(
            content=f"Mock response to: {prompt[:50]}...",
            model=model or "mock-model-v1",
            usage={"input_tokens": 100, "output_tokens": 50},
        )

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> Tuple[T, LLMResponse]:
        if self.should_fail:
            raise RuntimeError("Mock LLM Provider simulated failure.")

        if self.malformed_json:
            raise ValueError("Malformed JSON received from LLM stream.")

        if self.custom_structured_response is not None:
            if isinstance(self.custom_structured_response, schema):
                parsed = self.custom_structured_response
            else:
                parsed = schema.model_validate(self.custom_structured_response)
            return parsed, LLMResponse(
                content=json.dumps(parsed.model_dump()),
                structured_data=parsed.model_dump(),
                model=model or "mock-model-v1",
                usage={"input_tokens": 150, "output_tokens": 80},
            )

        # Default smart mock generators based on requested schema
        if schema == PlanOutput:
            plan = PlanOutput(
                goal=prompt,
                summary=f"Automated strategic decomposition for goal: {prompt}",
                tasks=[
                    PlannedTask(
                        title="Analyze project context & requirements",
                        description=f"Inspect workspace and gather prerequisites for: {prompt}",
                        assigned_agent_type=AgentType.RESEARCHER,
                        priority=3,
                        dependencies=[],
                    ),
                    PlannedTask(
                        title="Design system architecture & specifications",
                        description="Produce technical design specification and component breakdown",
                        assigned_agent_type=AgentType.CODER,
                        priority=3,
                        dependencies=[0],
                    ),
                    PlannedTask(
                        title="Implement core functionality",
                        description="Generate code modules, configure dependencies and endpoints",
                        assigned_agent_type=AgentType.CODER,
                        priority=2,
                        dependencies=[1],
                    ),
                    PlannedTask(
                        title="Review and validate implementation",
                        description="Inspect generated artifacts, test execution results, verify goal acceptance",
                        assigned_agent_type=AgentType.REVIEWER,
                        priority=2,
                        dependencies=[2],
                    ),
                ],
            )
            return plan, LLMResponse(  # type: ignore
                content=json.dumps(plan.model_dump()),
                structured_data=plan.model_dump(),
                model=model or "mock-claude-3-5-sonnet",
                usage={"input_tokens": 200, "output_tokens": 120},
            )

        if schema == AgentDecision:
            decision = AgentDecision(
                action="complete",
                result={"status": "success", "summary": f"Executed task for prompt: {prompt[:60]}"},
                reason="Task objectives met successfully.",
            )
            return decision, LLMResponse(  # type: ignore
                content=json.dumps(decision.model_dump()),
                structured_data=decision.model_dump(),
                model=model or "mock-claude-3-5-sonnet",
                usage={"input_tokens": 120, "output_tokens": 40},
            )

        # Generic fallback using schema defaults
        instance = schema.model_construct()
        return instance, LLMResponse(
            content=json.dumps(instance.model_dump()),
            structured_data=instance.model_dump(),
            model=model or "mock-model-v1",
        )
