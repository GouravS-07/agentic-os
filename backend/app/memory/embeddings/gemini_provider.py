from typing import List
import httpx
from app.memory.embeddings.base import BaseEmbeddingProvider
from app.core.exceptions import AgenticOSError
from app.config import settings


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """Production Google Gemini embedding provider using text-embedding-004."""

    def __init__(
        self,
        api_key: str = "",
        model: str = "text-embedding-004",
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or "text-embedding-004"
        if not self.api_key:
            raise AgenticOSError(
                "GEMINI_API_KEY is required when using GeminiEmbeddingProvider in production."
            )

    async def embed_text(self, text: str) -> List[float]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "model": f"models/{self.model}",
            "content": {"parts": [{"text": text}]},
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise AgenticOSError(f"Gemini Embedding API error ({res.status_code}): {res.text}")
            data = res.json()
            return data["embedding"]["values"]

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        # Gemini batchEmbedContents
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:batchEmbedContents?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        requests = [
            {
                "model": f"models/{self.model}",
                "content": {"parts": [{"text": t}]},
            }
            for t in texts
        ]
        payload = {"requests": requests}

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise AgenticOSError(f"Gemini Batch Embedding API error ({res.status_code}): {res.text}")
            data = res.json()
            return [e["values"] for e in data["embeddings"]]
