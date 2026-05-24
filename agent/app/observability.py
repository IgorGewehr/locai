"""LangSmith setup and structlog configuration."""

from __future__ import annotations

import os
import re

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
    s = get_settings()
    enabled = s.langchain_tracing_v2 or bool(s.langchain_api_key)
    if not enabled:
        return False
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    if s.langchain_api_key:
        os.environ["LANGCHAIN_API_KEY"] = s.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = langsmith_project_name(s)
    return True
