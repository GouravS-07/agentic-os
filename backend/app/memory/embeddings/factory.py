from typing import Optional
from app.memory.embeddings.base import BaseEmbeddingProvider
from app.memory.embeddings.mock_provider import MockEmbeddingProvider
from app.config import settings

_current_provider: Optional[BaseEmbeddingProvider] = None


def get_embedding_provider() -> BaseEmbeddingProvider:
    """
    Returns the configured embedding provider instance based on settings.EMBEDDING_PROVIDER.
    Supports 'mock', 'openai', 'gemini', 'ollama'.
    """
    global _current_provider
    if _current_provider is not None:
        return _current_provider

    provider_name = (settings.EMBEDDING_PROVIDER or "mock").lower()

    if provider_name == "openai":
        from app.memory.embeddings.openai_provider import OpenAIEmbeddingProvider
        _current_provider = OpenAIEmbeddingProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION,
        )
    elif provider_name == "gemini":
        from app.memory.embeddings.gemini_provider import GeminiEmbeddingProvider
        _current_provider = GeminiEmbeddingProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.EMBEDDING_MODEL or "text-embedding-004",
        )
    elif provider_name == "ollama":
        from app.memory.embeddings.ollama_provider import OllamaEmbeddingProvider
        _current_provider = OllamaEmbeddingProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.EMBEDDING_MODEL or "nomic-embed-text",
        )
    else:
        _current_provider = MockEmbeddingProvider()

    return _current_provider


def set_embedding_provider(provider: BaseEmbeddingProvider) -> None:
    """Sets the embedding provider instance (useful for testing or runtime swapping)."""
    global _current_provider
    _current_provider = provider


def reset_embedding_provider() -> None:
    """Resets the cached provider instance so config changes take effect."""
    global _current_provider
    _current_provider = None
