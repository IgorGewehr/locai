"""Runtime configuration — loaded once from env, validated by pydantic."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_APP_ENV = os.getenv("APP_ENV", "development")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", f".env.{_APP_ENV}"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Auth ---
    agent_shared_secret: str = Field(..., alias="AGENT_SHARED_SECRET")

    @field_validator("agent_shared_secret")
    @classmethod
    def _secret_min_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("AGENT_SHARED_SECRET must be at least 32 characters")
        return v

    # --- LLM (supports OpenAI and Anthropic) ---
    openai_api_key: str | None = Field(None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(None, alias="ANTHROPIC_API_KEY")

    # 3-tier model selection
    llm_provider: str = Field("openai", alias="LLM_PROVIDER")  # openai | anthropic
    model_fast: str = Field("gpt-4o-mini", alias="MODEL_FAST")       # router + responder
    model_main: str = Field("gpt-4o-mini", alias="MODEL_MAIN")       # planner

    # --- Locai backend ---
    locai_api_url: str = Field("http://localhost:3000", alias="LOCAI_API_URL")

    # --- Server ---
    host: str = Field("0.0.0.0", alias="HOST")
    port: int = Field(8080, alias="PORT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    app_env: str = Field(_APP_ENV, alias="APP_ENV")

    # --- Safety ---
    agent_max_iterations: int = Field(8, alias="AGENT_MAX_ITERATIONS")
    agent_request_timeout_s: int = Field(30, alias="AGENT_REQUEST_TIMEOUT_S")

    # --- LangSmith (optional) ---
    langchain_tracing_v2: bool = Field(False, alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: str | None = Field(None, alias="LANGCHAIN_API_KEY")
    langchain_project: str | None = Field(None, alias="LANGCHAIN_PROJECT")
    redact_pii_in_traces: bool = Field(True, alias="REDACT_PII_IN_TRACES")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


def langsmith_project_name(settings: Settings | None = None) -> str:
    s = settings or get_settings()
    if s.langchain_project:
        return s.langchain_project
    env = (s.app_env or "development").lower()
    env_map = {"development": "dev", "production": "prod"}
    return f"locai-agent-{env_map.get(env, env)}"
