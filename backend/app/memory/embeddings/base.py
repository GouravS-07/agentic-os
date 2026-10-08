from abc import ABC, abstractmethod
from typing import List


class BaseEmbeddingProvider(ABC):
    """
    Abstract interface for text embedding providers.
    """

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generates a normalized embedding vector for a given text."""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates embedding vectors for a batch of texts."""
        pass
