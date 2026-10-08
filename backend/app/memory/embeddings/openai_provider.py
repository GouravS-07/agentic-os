from typing import List
import httpx
from app.memory.embeddings.base import BaseEmbeddingProvider
from app.core.exceptions import AgenticOSError
from app.config import settings


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """Production OpenAI embedding provider using text-embedding-3-small or custom model."""

    def __init__(
        self,
        api_key: str = "",
        model: str = "text-embedding-3-small",
        dimension: int = 1536,
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.EMBEDDING_MODEL
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        if not self.api_key:
            raise AgenticOSError(
                "OPENAI_API_KEY is required when using OpenAIEmbeddingProvider in production."
            )

    async def embed_text(self, text: str) -> List[float]:
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": text,
            "model": self.model,
            "dimensions": self.dimension,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise AgenticOSError(f"OpenAI Embedding API error ({res.status_code}): {res.text}")
            data = res.json()
            return data["data"][0]["embedding"]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        url = "https://api.openai.com/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": texts,
            "model": self.model,
            "dimensions": self.dimension,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise AgenticOSError(f"OpenAI Embedding API error ({res.status_code}): {res.text}")
            data = res.json()
            return [item["embedding"] for item in sorted(data["data"], key=lambda x: x["index"])]
