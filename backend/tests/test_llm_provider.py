import pytest
from pydantic import ValidationError
from app.runtime.llm.mock_provider import MockLLMProvider
from app.schemas.agent_decision import PlanOutput, AgentDecision


@pytest.mark.asyncio
async def test_mock_llm_text_generation():
    provider = MockLLMProvider()
    resp = await provider.generate_text("Hello agent")
    assert resp.content.startswith("Mock response")
    assert resp.model == "mock-model-v1"


@pytest.mark.asyncio
async def test_mock_llm_structured_plan_generation():
    provider = MockLLMProvider()
    plan, resp = await provider.generate_structured(
        prompt="Build portfolio website",
        schema=PlanOutput,
    )
    assert isinstance(plan, PlanOutput)
    assert len(plan.tasks) >= 3
    assert plan.goal == "Build portfolio website"
    assert resp.structured_data is not None


@pytest.mark.asyncio
async def test_mock_llm_structured_decision_generation():
    provider = MockLLMProvider()
    decision, resp = await provider.generate_structured(
        prompt="Execute coding step",
        schema=AgentDecision,
    )
    assert isinstance(decision, AgentDecision)
    assert decision.action == "complete"
    assert decision.result is not None


@pytest.mark.asyncio
async def test_mock_llm_failure_simulation():
    provider = MockLLMProvider(should_fail=True)
    with pytest.raises(RuntimeError) as exc:
        await provider.generate_text("Prompt")
    assert "simulated failure" in str(exc.value)


@pytest.mark.asyncio
async def test_mock_llm_malformed_json():
    provider = MockLLMProvider(malformed_json=True)
    with pytest.raises(ValueError) as exc:
        await provider.generate_structured("Prompt", schema=AgentDecision)
    assert "Malformed JSON" in str(exc.value)
