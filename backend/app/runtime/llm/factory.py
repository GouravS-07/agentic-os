from typing import Optional
from app.runtime.llm.base import LLMProvider
from app.runtime.llm.mock_provider import MockLLMProvider
from app.runtime.llm.claude_provider import ClaudeProvider
from app.config import settings


def get_llm_provider(provider_type: Optional[str] = None) -> LLMProvider:
    """
    Factory function returning the configured or requested LLMProvider.
    Defaults to MockLLMProvider if no API key is configured or if mock mode is requested.
    """
    target = (provider_type or settings.LLM_PROVIDER).lower()

    if target == "claude" and settings.ANTHROPIC_API_KEY:
        return ClaudeProvider()

    # Default to MockProvider for tests, offline mode, and zero-key local runs
    return MockLLMProvider()
