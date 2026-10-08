from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import json


class Settings(BaseSettings):
    APP_NAME: str = "Agentic OS"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./agentic_os.db"
    DB_ECHO: bool = False

    # LLM Providers
    LLM_PROVIDER: str = "mock"  # "mock" | "claude" | "openai" | "gemini"
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    DEFAULT_MODEL: str = "claude-3-5-sonnet-20241022"

    # Embedding Providers & pgvector
    EMBEDDING_PROVIDER: str = "mock"  # "mock" | "openai" | "gemini" | "ollama"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536  # 1536 (OpenAI), 768 (Gemini), 64 (Mock)
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Redis (optional, defaults to in-process async event bus)
    REDIS_URL: str = ""

    # Safety Policies
    DEFAULT_PERMISSION_POLICY: str = "strict"
    AUTO_APPROVE_LOW_RISK: bool = True
    REQUIRE_APPROVAL_MEDIUM_RISK: bool = True
    REQUIRE_APPROVAL_HIGH_RISK: bool = True
    BLOCK_CRITICAL_RISK: bool = True

    # Workspaces & Tool Sandboxing
    WORKSPACE_ROOT: str = "./workspaces"
    MAX_EXECUTION_TIMEOUT_SECONDS: int = 60
    MAX_OUTPUT_BYTES: int = 524288  # 512 KB

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
