from typing import List
import httpx
from app.memory.embeddings.base import BaseEmbeddingProvider
from app.core.exceptions import AgenticOSError
from app.config import settings


class OllamaEmbeddingProvider(BaseEmbeddingProvider):
    """Local Ollama embedding provider (e.g. nomic-embed-text, all-minilm)."""

    def __init__(
        self,
        base_url: str = "",
        model: str = "nomic-embed-text",
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model

    async def embed_text(self, text: str) -> List[float]:
        url = f"{self.base_url}/api/embeddings"
        payload = {"model": self.model, "prompt": text}

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise AgenticOSError(f"Ollama Embedding API error ({res.status_code}): {res.text}")
            data = res.json()
            return data["embedding"]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        results = []
        for t in texts:
            emb = await self.embed_text(t)
            results.append(emb)
        return results
