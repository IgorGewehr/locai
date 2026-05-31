"""Observability helpers — LangSmith metadata + PII redaction."""

from __future__ import annotations

import re
from importlib.metadata import PackageNotFoundError as _PNF
from importlib.metadata import version as _pkg_version
from typing import Any

from .config import Settings, get_settings, langsmith_project_name

try:
    _AGENT_VERSION = _pkg_version("locai-agent")
except _PNF:
    _AGENT_VERSION = "dev"


def build_run_config(
    *,
    run_id: str,
    tenant_id: str,
    conversation_id: str,
    message_id: str | None,
    use_case: str,
    channel: str,
    model: str,
    intent: str | None = None,
    extra_tags: list[str] | None = None,
) -> dict[str, Any]:
    s = get_settings()
    env = (s.app_env or "development").lower()

    metadata: dict[str, Any] = {
        "tenant_id": tenant_id,
        "conversation_id": conversation_id,
        "use_case": use_case,
        "channel": channel,
        "env": env,
        "model_default": model,
        "agent_version": _AGENT_VERSION,
    }
    if message_id:
        metadata["message_id"] = message_id
    if intent:
        metadata["intent"] = intent
    if run_id:
        metadata["run_id"] = run_id

    tags: list[str] = [
        f"tenant:{tenant_id}",
        f"channel:{channel}",
        f"use_case:{use_case}",
        f"env:{env}",
    ]
    if intent:
        tags.append(f"intent:{intent}")
    if extra_tags:
        tags.extend(extra_tags)

    # Derive recursion_limit from agent_max_iterations (default 8) so long
    # operator+reflection conversations don't blow a hard-coded ceiling and
    # raise GraphRecursionError (which leaves the client with no response).
    recursion_limit = s.agent_max_iterations * 4 + 5

    return {
        "recursion_limit": recursion_limit,
        "run_name": f"agent.{use_case}.{channel}",
        "tags": tags,
        "metadata": metadata,
        "configurable": {
            "thread_id": conversation_id,
            "tenant_id": tenant_id,
        },
    }


# ─── PII redaction ──────────────────────────────────────────────────────────

_PII_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(?:\d[ -]*?){13,19}\b"), "[CARD]"),
    (re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b"), "[CNPJ]"),
    (re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b"), "[CPF]"),
    (re.compile(r"\b\d{1,2}\.\d{3}\.\d{3}-[\dXx]\b"), "[RG]"),
    (re.compile(r"\b\d{5}-?\d{3}\b"), "[CEP]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[EMAIL]"),
    (re.compile(r"(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}"), "[PHONE]"),
    (re.compile(r"\b(?:Bearer\s+)?[A-Za-z0-9_\-]{24,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b"), "[TOKEN]"),
]

_SENSITIVE_KEYS = {
    "cpf", "cnpj", "cpfCnpj", "rg", "cep", "email", "phone", "whatsapp",
    "telefone", "password", "passwordHash", "apiKey", "secretKey",
    "accessToken", "refreshToken", "id_token", "idToken", "webhookSecret",
}


def redact_pii_text(value: str) -> str:
    out = value
    for pat, tag in _PII_PATTERNS:
        out = pat.sub(tag, out)
    return out


def redact_pii(data: Any, *, max_depth: int = 6) -> Any:
    if max_depth <= 0:
        return data
    if isinstance(data, str):
        return redact_pii_text(data)
    if isinstance(data, dict):
        out: dict[Any, Any] = {}
        for k, v in data.items():
            if isinstance(k, str) and k in _SENSITIVE_KEYS:
                if isinstance(v, str):
                    out[k] = f"[redacted:{k}:{len(v)}c]"
                else:
                    out[k] = f"[redacted:{k}]"
            else:
                out[k] = redact_pii(v, max_depth=max_depth - 1)
        return out
    if isinstance(data, list):
        return [redact_pii(v, max_depth=max_depth - 1) for v in data]
    return data


def redact_if_enabled(data: Any, settings: Settings | None = None) -> Any:
    s = settings or get_settings()
    if not s.redact_pii_in_traces:
        return data
    return redact_pii(data)


def enable_langsmith_if_configured(settings: Settings | None = None) -> bool:
    import os

    s = settings or get_settings()
    enabled = bool(s.langchain_tracing_v2) or bool(s.langchain_api_key)
    if not enabled:
        return False

    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    if s.langchain_api_key:
        os.environ["LANGCHAIN_API_KEY"] = s.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = langsmith_project_name(s)
    os.environ.setdefault("LANGCHAIN_HIDE_INPUTS", "false")
    os.environ.setdefault("LANGCHAIN_HIDE_OUTPUTS", "false")
    return True
