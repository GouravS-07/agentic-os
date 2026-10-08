from typing import List
import math
import hashlib
import re
from app.memory.embeddings.base import BaseEmbeddingProvider


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm1 * norm2)))


class MockEmbeddingProvider(BaseEmbeddingProvider):
    """
    Deterministic embedding provider for testing and local environments.
    Produces 64-dimensional normalized vectors based on word tokens and character hashes.
    """

    def __init__(self, dimension: int = 64):
        self.dimension = dimension

    def _embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dimension
        if not text:
            return vec

        # Tokenize words
        words = re.findall(r"\w+", text.lower())
        if not words:
            words = [text.lower()]

        for word in words:
            # Hash word into bucket
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            weight = 1.0 + (len(word) / 10.0)
            vec[idx] += weight

            # Also secondary hash for distributed signal
            idx2 = (h >> 4) % self.dimension
            vec[idx2] += 0.5 * weight

        # Normalize vector to unit length
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]

        return vec

    async def embed_text(self, text: str) -> List[float]:
        return self._embed(text)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(t) for t in texts]
