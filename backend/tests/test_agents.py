import pytest
from app.models.enums import AgentType
from app.runtime.agent_registry import AgentRegistry
from app.core.exceptions import EntityNotFoundError


def test_agent_registry_initialization():
    agents = AgentRegistry.list_all()
    assert len(agents) == 5

    types = [a.agent_type for a in agents]
    assert AgentType.PLANNER in types
    assert AgentType.RESEARCHER in types
    assert AgentType.CODER in types
    assert AgentType.REVIEWER in types
    assert AgentType.EXECUTOR in types


def test_agent_lookup():
    planner = AgentRegistry.get("agent_planner")
    assert planner.agent_type == AgentType.PLANNER
    assert planner.is_implemented is True
    assert len(planner.capabilities) > 0

    # Lookup by type string
    coder = AgentRegistry.get(AgentType.CODER.value)
    assert coder.agent_type == AgentType.CODER


def test_unknown_agent_lookup():
    with pytest.raises(EntityNotFoundError):
        AgentRegistry.get("non_existent_agent_id")
