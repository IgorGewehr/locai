"""Runtime configuration — loaded once from env, validated by pydantic."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_APP_ENV = os.getenv("APP_ENV", "development")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", f".env.{_APP_ENV}"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Core ---
    agent_shared_secret: str = Field(..., alias="AGENT_SHARED_SECRET")
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    next_public_api_base_url: str = Field(..., alias="NEXT_PUBLIC_API_BASE_URL")

    # --- Environment ---
    app_env: str = Field(_APP_ENV, alias="APP_ENV")

    # --- Models (3-tier) ---
    openai_model_router: str = Field("gpt-4o-mini", alias="OPENAI_MODEL_ROUTER")
    openai_model_default: str = Field("gpt-4o-mini", alias="OPENAI_MODEL_DEFAULT")
    openai_model_fallback: str = Field("gpt-4o", alias="OPENAI_MODEL_FALLBACK")

    # --- Server ---
    host: str = Field("0.0.0.0", alias="HOST")
    # 8090 (vs saas-erp/agent's 8080) so both can coexist on a dev box.
    port: int = Field(8090, alias="PORT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    # --- Safety ---
    agent_max_iterations: int = Field(8, alias="AGENT_MAX_ITERATIONS")
    agent_request_timeout_s: int = Field(30, alias="AGENT_REQUEST_TIMEOUT_S")

    # --- LangSmith ---
    langchain_tracing_v2: bool = Field(False, alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: str | None = Field(None, alias="LANGCHAIN_API_KEY")
    langchain_project: str | None = Field(None, alias="LANGCHAIN_PROJECT")

    # --- Privacy ---
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
    return f"locai-{env_map.get(env, env)}"
