"""LangSmith setup and structlog configuration."""

from __future__ import annotations

import os
import re
from typing import Any

import structlog

from .config import get_settings, langsmith_project_name

# PII patterns to redact from LangSmith traces
_PII_PATTERNS = [
    (re.compile(r"\b\d{11}\b"), "***CPF***"),
    (re.compile(r"\b\d{14}\b"), "***CNPJ***"),
    (re.compile(r"\b[0-9]{5}-[0-9]{3}\b"), "***CEP***"),
    (re.compile(r"\+?55\s?\d{2}\s?\d{4,5}-?\d{4}"), "***PHONE***"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "***EMAIL***"),
    (re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*"), "***JWT***"),
]


def redact_pii(text: str) -> str:
    for pattern, replacement in _PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def _deep_redact(data: Any) -> Any:
    """Recursively apply PII redaction to any data structure."""
    if isinstance(data, str):
        return redact_pii(data)
    if isinstance(data, dict):
        return {k: _deep_redact(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_deep_redact(item) for item in data]
    return data


# Module-level tracer — set by enable_langsmith_if_configured when PII
# redaction is active. When set, graph invocations should pass it in
# config["callbacks"] instead of relying on env-var auto-tracing.
_tracer: Any = None


def get_langsmith_callbacks() -> list[Any]:
    """Return the LangSmith callback list for graph config.

    If a PII-redacting tracer was set up, returns it so the graph uses
    the anonymised client.  Otherwise returns [] and lets the env-var
    based auto-tracing handle it.
    """
    return [_tracer] if _tracer is not None else []


def configure_logging() -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer() if os.getenv("APP_ENV") != "production"
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(__import__("logging"), (os.getenv("LOG_LEVEL") or "INFO").upper(), 20)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )


def enable_langsmith_if_configured() -> bool:
    global _tracer
    s = get_settings()
    enabled = s.langchain_tracing_v2 or bool(s.langchain_api_key)
    if not enabled:
        return False

    project = langsmith_project_name(s)

    # Try explicit tracer with PII anonymiser (langsmith >= 0.1.75).
    # If the installed version does not support `anonymizer`, fall back
    # to env-var based tracing without PII redaction.
    if s.redact_pii_in_traces:
        try:
            from langsmith import Client  # type: ignore[import-untyped]
            from langchain_core.tracers.langchain import LangChainTracer

            client_kwargs: dict[str, Any] = {}
            if s.langchain_api_key:
                client_kwargs["api_key"] = s.langchain_api_key
            client_kwargs["anonymizer"] = _deep_redact

            client = Client(**client_kwargs)
            _tracer = LangChainTracer(project_name=project, client=client)
            # Do NOT set LANGCHAIN_TRACING_V2 — we use the explicit tracer
            # to avoid duplicate runs.
            return True
        except (ImportError, TypeError):
            # langsmith too old for anonymizer — fall through to env approach
            pass

    # Fallback: env-var auto-tracing (no PII redaction)
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    if s.langchain_api_key:
        os.environ["LANGCHAIN_API_KEY"] = s.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = project
    return True
