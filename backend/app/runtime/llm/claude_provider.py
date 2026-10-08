from typing import TypeVar, Type, Optional, Dict, Any, Tuple
import json
import httpx
from pydantic import BaseModel
from app.runtime.llm.base import LLMProvider, LLMResponse
from app.config import settings

T = TypeVar("T", bound=BaseModel)


class ClaudeProvider(LLMProvider):
    """
    Anthropic Claude LLM Provider using direct async HTTP calls or Anthropic SDK.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.base_url = "https://api.anthropic.com/v1/messages"
        self.default_model = settings.DEFAULT_MODEL

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> LLMResponse:
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured.")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": model or self.default_model,
            "max_tokens": 4096,
            "temperature": temperature,
            "system": system_prompt or "You are an autonomous AI operating agent.",
            "messages": [{"role": "user", "content": prompt}],
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(self.base_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["content"][0]["text"]
            usage = {
                "input_tokens": data.get("usage", {}).get("input_tokens", 0),
                "output_tokens": data.get("usage", {}).get("output_tokens", 0),
            }
            return LLMResponse(
                content=content,
                model=data.get("model", model or self.default_model),
                usage=usage,
                raw_response=data,
            )

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[T],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0,
    ) -> Tuple[T, LLMResponse]:
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured.")

        # Structured output prompt wrapping
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        augmented_prompt = (
            f"{prompt}\n\n"
            f"You MUST respond ONLY with valid JSON strictly conforming to this JSON Schema:\n"
            f"```json\n{schema_json}\n```\n"
            f"Do not include any conversational preamble, explanations, or markdown code fences other than the raw JSON."
        )

        llm_resp = await self.generate_text(
            prompt=augmented_prompt,
            system_prompt=system_prompt,
            model=model,
            temperature=temperature,
        )

        cleaned_text = llm_resp.content.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        parsed_dict = json.loads(cleaned_text)
        validated_obj = schema.model_validate(parsed_dict)
        llm_resp.structured_data = validated_obj.model_dump()

        return validated_obj, llm_resp
