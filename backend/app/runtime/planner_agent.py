from typing import Optional, Dict, Any
from app.models.enums import AgentType
from app.runtime.base_agent import BaseAgent
from app.runtime.llm.base import LLMProvider
from app.runtime.llm.factory import get_llm_provider
from app.schemas.agent_decision import PlanOutput, AgentDecision


PLANNER_SYSTEM_PROMPT = """You are the Lead Planner Agent for Agentic OS.
Your objective is to decompose high-level user directives into an ordered, acyclic Directed Acyclic Graph (DAG) of discrete tasks.

Rules:
1. Break the goal into logical, manageable tasks (typically 3 to 6 tasks).
2. Assign each task an appropriate specialized agent type: RESEARCHER, CODER, REVIEWER, or EXECUTOR.
3. Explicitly define prerequisite dependencies using 0-indexed task integers.
4. Ensure the dependency graph has no circular references.
5. Provide a clear, actionable description for each task.
"""


class PlannerAgent(BaseAgent):
    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        super().__init__(
            agent_id="agent_planner",
            name="Planner Agent",
            agent_type=AgentType.PLANNER,
            description="Decomposes user objectives into structured, dependency-aware task execution plans.",
            system_prompt=PLANNER_SYSTEM_PROMPT,
            capabilities=[
                "Goal analysis",
                "Task decomposition",
                "DAG dependency mapping",
                "Agent assignment",
            ],
            allowed_tools=[],  # The Planner does NOT execute tools
            llm_provider=llm_provider,
            is_implemented=True,
        )

    async def plan(
        self,
        goal: str,
        provider: Optional[LLMProvider] = None
    ) -> PlanOutput:
        active_provider = provider or self.llm_provider or get_llm_provider()
        prompt = f"Decompose the following user goal into an executable task graph:\n\nGOAL: {goal}"
        
        plan_output, _ = await active_provider.generate_structured(
            prompt=prompt,
            schema=PlanOutput,
            system_prompt=self.system_prompt,
        )
        return plan_output

    async def process(
        self,
        input_context: Dict[str, Any],
        provider: Optional[LLMProvider] = None
    ) -> AgentDecision:
        goal = input_context.get("goal", "")
        plan = await self.plan(goal, provider=provider)
        return AgentDecision(
            action="complete",
            result=plan.model_dump(),
            reason="Mission planning completed successfully."
        )
