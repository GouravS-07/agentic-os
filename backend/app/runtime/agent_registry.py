from typing import Dict, List, Optional
from app.models.enums import AgentType
from app.runtime.base_agent import BaseAgent
from app.runtime.planner_agent import PlannerAgent
from app.core.exceptions import EntityNotFoundError


class GenericStubAgent(BaseAgent):
    """Stub agent for registered definitions that will have full behaviors added in later phases."""

    async def process(self, input_context: Dict, provider=None):
        return {
            "action": "complete",
            "result": {"message": f"{self.name} interface processed context."},
        }


class AgentRegistry:
    _registry: Dict[str, BaseAgent] = {}

    @classmethod
    def initialize(cls):
        cls._registry = {}

        # 1. Planner Agent (Implemented - Planning Only, No Tools)
        planner = PlannerAgent()
        cls.register(planner)

        # 2. Researcher Agent (Registered definition)
        researcher = GenericStubAgent(
            agent_id="agent_researcher",
            name="Research Agent",
            agent_type=AgentType.RESEARCHER,
            description="Searches documents, inspects external resources, and summarizes project findings.",
            system_prompt="You are the Research Agent. You gather and analyze information for the mission.",
            capabilities=["Information retrieval", "Repository inspection", "Documentation summary"],
            allowed_tools=["filesystem.read", "search.web", "github.mock"],
            is_implemented=False,
        )
        cls.register(researcher)

        # 3. Coder Agent (Registered definition)
        coder = GenericStubAgent(
            agent_id="agent_coder",
            name="Coding Agent",
            agent_type=AgentType.CODER,
            description="Inspects source trees, writes code modules, and applies bug fixes.",
            system_prompt="You are the Coding Agent. You generate, inspect, and modify source code.",
            capabilities=["Code generation", "Refactoring", "Syntax debugging"],
            allowed_tools=[
                "filesystem.read",
                "filesystem.write",
                "terminal.execute",
                "git.status",
                "git.diff",
                "git.log",
                "git.commit",
            ],
            is_implemented=False,
        )
        cls.register(coder)

        # 4. Reviewer Agent (Registered definition)
        reviewer = GenericStubAgent(
            agent_id="agent_reviewer",
            name="Reviewer Agent",
            agent_type=AgentType.REVIEWER,
            description="Evaluates agent outputs, verifies task completion criteria, and identifies errors.",
            system_prompt="You are the Reviewer Agent. You validate quality and verify acceptance criteria.",
            capabilities=["Quality inspection", "Acceptance verification", "Rework detection"],
            allowed_tools=["filesystem.read", "git.diff"],
            is_implemented=False,
        )
        cls.register(reviewer)

        # 5. Executor Agent (Registered definition)
        executor = GenericStubAgent(
            agent_id="agent_executor",
            name="Execution Agent",
            agent_type=AgentType.EXECUTOR,
            description="Performs safe tool operations and executes approved action payloads.",
            system_prompt="You are the Execution Agent. You execute safe tool actions and report outcomes.",
            capabilities=["Tool dispatch", "Action execution", "Output formatting"],
            allowed_tools=[
                "filesystem.read",
                "filesystem.write",
                "terminal.execute",
                "git.status",
                "git.diff",
                "git.log",
                "git.commit",
                "search.web",
                "github.mock",
            ],
            is_implemented=False,
        )
        cls.register(executor)

    @classmethod
    def register(cls, agent: BaseAgent):
        cls._registry[agent.agent_id] = agent
        cls._registry[agent.agent_type.value] = agent

    @classmethod
    def get(cls, key: str) -> BaseAgent:
        if not cls._registry:
            cls.initialize()
        if key in cls._registry:
            return cls._registry[key]
        raise EntityNotFoundError("Agent", key)

    @classmethod
    def get_by_type(cls, agent_type: AgentType) -> BaseAgent:
        return cls.get(agent_type.value)

    @classmethod
    def list_all(cls) -> List[BaseAgent]:
        if not cls._registry:
            cls.initialize()
        seen = set()
        unique = []
        for agent in cls._registry.values():
            if agent.agent_id not in seen:
                seen.add(agent.agent_id)
                unique.append(agent)
        return unique


# Initialize on import
AgentRegistry.initialize()
