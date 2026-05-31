"""LangGraph node implementations — Locai.

Mirrors the saas-erp/agent shape (router → planner ↔ executor → reflection →
responder) but tuned for the locai domain:

  - No 'pedidos' or 'agenda' use_cases. We have 'imobiliario' (customer),
    'operator' (dashboard), 'analyst' (read-only).
  - The destructive-tool list is much shorter — only appointments writes,
    client writes, lead-stage moves and memory writes count.
  - The responder skips ANY follow-up when conversations_send_media or
    share_airbnb_link succeeded (they already delivered to the customer).
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from langchain_core.messages import (
    AIMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_openai import ChatOpenAI

from ..config import get_settings
from ..logging_config import get_logger
from ..observability import redact_if_enabled
from ..tools.client import ToolError, call_tool
from ..tools.guardrails import check_tool_call
from ..tools.registry import get_tool, tools_for_use_case
from ..tools.validator import validate as validate_tool_args
from . import prompts
from .state import AgentState

try:
    from langsmith import traceable  # type: ignore
except Exception:  # pragma: no cover
    def traceable(*dargs, **dkwargs):  # type: ignore[misc]
        def _wrap(fn):
            return fn
        return _wrap if dargs or dkwargs else dargs[0]

log = get_logger("nodes")


# Token cost lookup (USD per 1M tokens). Audit-only.
PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o":         (2.50, 10.00),
    "gpt-4o-mini":    (0.15,  0.60),
    "gpt-4-turbo":    (10.00, 30.00),
    # Forward-compatible — fill in if you upgrade.
    "gpt-5.4":        (2.50, 10.00),
    "gpt-5.4-mini":   (0.40,  1.60),
    "gpt-5.4-nano":   (0.10,  0.40),
}


# ─── Destructive tools — gate reflection in operator mode ───────────────────
_DESTRUCTIVE_PREFIXES = (
    "appointments_create", "appointments_update", "appointments_cancel",
    "clients_create", "clients_update",
    "crm_update_lead_stage",
    "memory_remember",
    "share_airbnb_link",  # informational hand-off, but observable side-effect
    "notify_human",       # creates a notification
)


def _is_destructive_tool(name: str) -> bool:
    return any(name.startswith(p) for p in _DESTRUCTIVE_PREFIXES)


# Tools that DELIVER content directly to the customer — when one of these
# succeeds, we suppress the responder's text bubble (avoids a redundant
# follow-up like "aqui estão as fotos: ..." after we already sent them).
_DIRECT_SEND_TOOLS = {"conversations_send_media", "share_airbnb_link"}


# Tools that DELIVER a message/media/link to the customer through the
# conversations endpoint. The LLM never fills the delivery context
# (conversationId / recipientId / channel) — we inject it from the state
# right before the call, otherwise the reply would go to an empty recipient.
DELIVERY_TOOLS = {"conversations_send_media", "share_airbnb_link", "notify_human"}


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _push_trace(state: AgentState, trace: dict[str, Any]) -> list[dict[str, Any]]:
    return (state.get("node_traces") or []) + [trace]


def _push_tool_log(state: AgentState, entry: dict[str, Any]) -> list[dict[str, Any]]:
    return (state.get("tool_calls_log") or []) + [entry]


# ─── Retry wrapper for transient LLM errors ─────────────────────────────────


async def _invoke_with_retry(llm: Any, messages: list[Any], max_attempts: int = 3) -> Any:
    last_err: Exception | None = None
    for attempt in range(max_attempts):
        try:
            return await llm.ainvoke(messages)
        except Exception as err:
            last_err = err
            msg = str(err).lower()
            retryable = any(k in msg for k in [
                "rate limit", "timeout", "timed out", "connection",
                "server error", "503", "502", "500",
            ])
            if not retryable or attempt == max_attempts - 1:
                raise
            backoff = 0.5 * (2 ** attempt)
            log.warning("llm.retry", attempt=attempt + 1, backoff_s=backoff,
                        error=str(err)[:120])
            await asyncio.sleep(backoff)
    raise last_err or RuntimeError("LLM invoke failed")


# ─── Message windowing ──────────────────────────────────────────────────────

_MESSAGE_WINDOW = 20
_HEAD_KEEP = 2


def _window_messages(messages: list[Any]) -> list[Any]:
    if len(messages) <= _MESSAGE_WINDOW:
        return messages
    head = messages[:_HEAD_KEEP]
    tail_size = _MESSAGE_WINDOW - _HEAD_KEEP
    tail = messages[-tail_size:]

    from langchain_core.messages import ToolMessage as _TM
    while tail and isinstance(tail[0], _TM):
        tail = tail[1:]
    return head + tail


# ─── 1. Router — intent classification ──────────────────────────────────────

@traceable(run_type="chain", name="agent.router")
async def router_node(state: AgentState) -> dict[str, Any]:
    settings = get_settings()
    model_name = settings.openai_model_router
    llm = ChatOpenAI(
        model=model_name,
        api_key=settings.openai_api_key,
        temperature=0.0,
        max_tokens=15,
    )
    user_message = ""
    for m in reversed(state.get("messages", [])):
        if isinstance(m, HumanMessage):
            user_message = m.content if isinstance(m.content, str) else str(m.content)
            break

    last_assistant = ""
    for m in reversed(state.get("messages", [])):
        if isinstance(m, AIMessage) and not getattr(m, "tool_calls", None):
            last_assistant = (m.content if isinstance(m.content, str) else str(m.content))[:200]
            break

    context_input = (
        f"[Assistente disse]: {last_assistant}\n[Cliente responde]: {user_message}"
        if last_assistant
        else user_message
    )

    t0 = time.time()
    result = await _invoke_with_retry(llm, [
        SystemMessage(content=prompts.ROUTER_SYSTEM),
        HumanMessage(content=context_input),
    ])
    latency = int((time.time() - t0) * 1000)

    raw = (result.content or "").strip().lower() if isinstance(result.content, str) else ""
    valid = {
        "info_imovel", "buscar_imovel", "disponibilidade", "agendar_visita",
        "agendar_chave", "agendar_suporte", "fechar", "confirmacao",
        "saudacao", "humano", "outro",
    }
    intent = next((w for w in raw.split() if w in valid), "outro")

    usage = getattr(result, "response_metadata", {}).get("token_usage", {}) or {}
    tokens_in = int(usage.get("prompt_tokens") or 0)
    tokens_out = int(usage.get("completion_tokens") or 0)

    log.info("node.router", run_id=state.get("run_id"), intent=intent, latency_ms=latency)

    return {
        "intent": intent,
        "total_tokens_in": state.get("total_tokens_in", 0) + tokens_in,
        "total_tokens_out": state.get("total_tokens_out", 0) + tokens_out,
        "node_traces": _push_trace(state, {
            "node": "router",
            "input": redact_if_enabled(user_message[:240]),
            "output": intent,
            "tokensIn": tokens_in,
            "tokensOut": tokens_out,
            "latencyMs": latency,
            "startedAt": _now_iso(),
        }),
    }


# ─── 2. Planner — main LLM with tools ───────────────────────────────────────

def _planner_llm(model: str, tools: list[dict[str, Any]]) -> ChatOpenAI:
    settings = get_settings()
    llm = ChatOpenAI(
        model=model,
        api_key=settings.openai_api_key,
        temperature=0.2,
        max_tokens=800,
    )
    return llm.bind_tools(tools) if tools else llm  # type: ignore[return-value]


@traceable(run_type="chain", name="agent.planner")
async def planner_node(state: AgentState) -> dict[str, Any]:
    settings = get_settings()
    use_case = state.get("use_case") or "imobiliario"
    tenant_ctx = state.get("tenant_context") or {}
    model = tenant_ctx.get("model") or settings.openai_model_default

    if state.get("iterations", 0) > 3:
        model = settings.openai_model_fallback

    tools = tools_for_use_case(use_case)  # type: ignore[arg-type]
    llm = _planner_llm(model, tools)

    system = prompts.planner_system_for(use_case, tenant_ctx)
    contact = state.get("contact") or {}
    system += (
        f"\n\nDADOS DO CONTATO: nome='{contact.get('name','?')}', "
        f"telefone='{contact.get('phone','?')}', canal='{contact.get('channel','?')}', "
        f"conversation_id='{state.get('conversation_id','?')}'."
    )

    conv_messages = _window_messages(state.get("messages") or [])
    t0 = time.time()
    ai_msg = await _invoke_with_retry(llm, [SystemMessage(content=system), *conv_messages])
    latency = int((time.time() - t0) * 1000)

    usage = getattr(ai_msg, "response_metadata", {}).get("token_usage", {}) or {}
    tokens_in = int(usage.get("prompt_tokens") or 0)
    tokens_out = int(usage.get("completion_tokens") or 0)

    log.info(
        "node.planner",
        run_id=state.get("run_id"),
        tool_calls=len(getattr(ai_msg, "tool_calls", None) or []),
        latency_ms=latency,
    )

    has_tools = bool(getattr(ai_msg, "tool_calls", None))
    return {
        "messages": [ai_msg],
        "iterations": state.get("iterations", 0) + 1,
        "total_tokens_in": state.get("total_tokens_in", 0) + tokens_in,
        "total_tokens_out": state.get("total_tokens_out", 0) + tokens_out,
        "node_traces": _push_trace(state, {
            "node": "planner",
            "output": redact_if_enabled(
                [{"name": tc["name"], "args": tc.get("args")} for tc in (ai_msg.tool_calls or [])]
                if has_tools
                else (ai_msg.content if isinstance(ai_msg.content, str) else str(ai_msg.content))[:300]
            ),
            "tokensIn": tokens_in,
            "tokensOut": tokens_out,
            "latencyMs": latency,
            "startedAt": _now_iso(),
        }),
    }


# ─── 3. Executor — run tool_calls in parallel ───────────────────────────────


@traceable(run_type="chain", name="agent.executor")
async def executor_node(state: AgentState) -> dict[str, Any]:
    tenant_id = state["tenant_id"]
    msgs = state.get("messages") or []
    last = msgs[-1] if msgs else None
    tool_calls = getattr(last, "tool_calls", None) or []

    async def _run_one(tc: dict[str, Any]) -> tuple[ToolMessage, dict[str, Any]]:
        name = tc["name"]
        args = tc.get("args") or {}
        call_id = tc.get("id") or f"tool_{int(time.time()*1000)}"
        started = _now_iso()
        t0 = time.time()

        schema = get_tool(name)
        if schema is None:
            err = f"Unknown tool: {name}"
            log.warning("node.executor.unknown_tool", tool=name)
            return (
                ToolMessage(content=json.dumps({"error": err}), tool_call_id=call_id, name=name),
                {"name": name, "arguments": args, "error": err, "latencyMs": 0, "startedAt": started},
            )

        schema_errors = validate_tool_args(schema["function"]["parameters"], args)
        if schema_errors:
            err = "Invalid arguments: " + "; ".join(schema_errors[:5])
            log.warning("node.executor.schema_invalid", tool=name, errors=schema_errors)
            return (
                ToolMessage(
                    content=json.dumps({"error": err, "validation": schema_errors}),
                    tool_call_id=call_id, name=name,
                ),
                {"name": name, "arguments": args, "error": err, "validation": schema_errors,
                 "latencyMs": 0, "startedAt": started},
            )

        op_ctx = state.get("tenant_context", {}).get("operator") or {}
        operator_role = op_ctx.get("user_role") if state.get("use_case") == "operator" else None
        guardrail_errors = check_tool_call(name, args, operator_role=operator_role)
        if guardrail_errors:
            err = "Guardrail: " + "; ".join(guardrail_errors[:3])
            log.warning("node.executor.guardrail", tool=name, errors=guardrail_errors)
            return (
                ToolMessage(
                    content=json.dumps({"error": err, "guardrails": guardrail_errors}),
                    tool_call_id=call_id, name=name,
                ),
                {"name": name, "arguments": args, "error": err, "guardrails": guardrail_errors,
                 "latencyMs": 0, "startedAt": started},
            )

        # Inject delivery context the LLM never fills. Without this the message
        # would be dispatched to an empty recipient/conversation/channel.
        if name in DELIVERY_TOOLS:
            contact = state.get("contact") or {}
            args = {
                **args,
                "conversationId": state.get("conversation_id"),
                "recipientId": contact.get("recipient_id"),
                "channel": contact.get("channel"),
            }

        try:
            result = await call_tool(tenant_id, name, args)
            latency = int((time.time() - t0) * 1000)
            entry = {
                "name": name, "arguments": args, "result": result,
                "latencyMs": latency, "startedAt": started,
            }
            return (
                ToolMessage(content=json.dumps(result, ensure_ascii=False),
                            tool_call_id=call_id, name=name),
                entry,
            )
        except ToolError as e:
            latency = int((time.time() - t0) * 1000)
            err = str(e)
            entry = {"name": name, "arguments": args, "error": err,
                     "latencyMs": latency, "startedAt": started}
            log.warning("node.executor.tool_error", tool=name, error=err)
            return (
                ToolMessage(content=json.dumps({"error": err}),
                            tool_call_id=call_id, name=name),
                entry,
            )

    results = await asyncio.gather(*[_run_one(tc) for tc in tool_calls])
    new_messages = [tm for tm, _ in results]
    log_entries = [entry for _, entry in results]
    trace_latency = sum(e["latencyMs"] for e in log_entries)

    direct_send = any(
        e["name"] in _DIRECT_SEND_TOOLS and "error" not in e
        for e in log_entries
    )

    destructive_entries = [e for e in log_entries if _is_destructive_tool(e.get("name", ""))]
    needs_reflection = (
        len(destructive_entries) > 0 and state.get("use_case") == "operator"
    )

    log.info(
        "node.executor",
        run_id=state.get("run_id"),
        count=len(results),
        destructive=len(destructive_entries),
        latency_ms=trace_latency,
    )

    update: dict[str, Any] = {
        "messages": new_messages,
        "tool_calls_log": (state.get("tool_calls_log") or []) + log_entries,
        "node_traces": _push_trace(state, {
            "node": "executor",
            "output": [e["name"] for e in log_entries],
            "destructive": [e["name"] for e in destructive_entries],
            "latencyMs": trace_latency,
            "startedAt": _now_iso(),
        }),
    }
    if direct_send:
        update["direct_send_done"] = True
    if needs_reflection:
        update["needs_reflection"] = True
    return update


# ─── 4. Reflection — verify destructive operator-mode actions ───────────────


@traceable(run_type="chain", name="agent.reflection")
async def reflection_node(state: AgentState) -> dict[str, Any]:
    settings = get_settings()
    tenant_ctx = state.get("tenant_context") or {}
    model = tenant_ctx.get("model") or settings.openai_model_default

    tool_log = state.get("tool_calls_log") or []
    dest = [t for t in tool_log[-8:] if _is_destructive_tool(t.get("name", ""))]
    if not dest:
        return {"needs_reflection": False}

    log.info("node.reflection.start", run_id=state.get("run_id"), count=len(dest))

    llm = ChatOpenAI(
        model=model,
        api_key=settings.openai_api_key,
        temperature=0.0,
        max_tokens=250,
    )

    msgs = state.get("messages") or []
    last_user = ""
    for m in reversed(msgs):
        if isinstance(m, HumanMessage):
            last_user = m.content if isinstance(m.content, str) else str(m.content)
            break

    tool_summary = json.dumps(
        [
            {"name": t.get("name"), "args": t.get("arguments"),
             "result": t.get("result"), "error": t.get("error")}
            for t in dest
        ],
        ensure_ascii=False, default=str,
    )[:3500]

    system = (
        "Você é um verificador de ações em sistema imobiliário. Recebe o pedido "
        "do operador + ações destrutivas executadas. Responda SOMENTE em JSON:\n"
        '{"ok": bool, "summary": "frase em pt-BR", "warnings": ["..."]}\n\n'
        "Considere ok=false quando: tool retornou error, "
        "appointmentType inválido (não pode ser 'reservation'), data no passado, "
        "ou resultado contradiz o pedido original."
    )

    human = f"PEDIDO DO OPERADOR:\n{last_user[:400]}\n\nAÇÕES EXECUTADAS:\n{tool_summary}"

    t0 = time.time()
    try:
        result = await _invoke_with_retry(
            llm,
            [SystemMessage(content=system), HumanMessage(content=human)],
        )
    except Exception as err:
        log.warning("node.reflection.error", error=str(err))
        return {"needs_reflection": False}

    latency = int((time.time() - t0) * 1000)

    raw = result.content if isinstance(result.content, str) else str(result.content)
    verdict: dict[str, Any] = {"ok": True, "summary": "", "warnings": []}
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean
            if clean.endswith("```"):
                clean = clean.rsplit("```", 1)[0]
            if clean.startswith("json"):
                clean = clean[4:].strip()
        verdict = json.loads(clean)
    except Exception:
        log.warning("node.reflection.parse_failed", raw=raw[:100])

    usage = getattr(result, "response_metadata", {}).get("token_usage", {}) or {}
    tokens_in = int(usage.get("prompt_tokens") or 0)
    tokens_out = int(usage.get("completion_tokens") or 0)

    new_messages: list[Any] = []
    reasoning_entry = {
        "node": "reflection",
        "thought": verdict.get("summary", ""),
        "ok": bool(verdict.get("ok", True)),
        "warnings": list(verdict.get("warnings", []))[:5],
        "at": _now_iso(),
    }

    if not verdict.get("ok", True):
        issue = verdict.get("summary") or "Verificação detectou problema."
        warns = "; ".join(verdict.get("warnings", []) or [])
        note = f"[reflection] {issue}"
        if warns:
            note += f" | Avisos: {warns}"
        new_messages.append(SystemMessage(content=note))
        log.warning("node.reflection.flagged", run_id=state.get("run_id"), issue=issue)

    log.info("node.reflection.done", run_id=state.get("run_id"),
             ok=verdict.get("ok"), latency_ms=latency)

    return {
        "messages": new_messages,
        "needs_reflection": False,
        "total_tokens_in": state.get("total_tokens_in", 0) + tokens_in,
        "total_tokens_out": state.get("total_tokens_out", 0) + tokens_out,
        "reasoning": (state.get("reasoning") or []) + [reasoning_entry],
        "node_traces": _push_trace(state, {
            "node": "reflection",
            "output": redact_if_enabled(verdict),
            "tokensIn": tokens_in,
            "tokensOut": tokens_out,
            "latencyMs": latency,
            "startedAt": _now_iso(),
        }),
    }


# ─── 5. Responder — polish final message for the customer ───────────────────


@traceable(run_type="chain", name="agent.responder")
async def responder_node(state: AgentState) -> dict[str, Any]:
    if state.get("direct_send_done"):
        log.info("node.responder.skip_direct_send", run_id=state.get("run_id"))
        return {"final_response": None}

    settings = get_settings()
    msgs = state.get("messages") or []
    draft: str | None = None
    for m in reversed(msgs):
        if isinstance(m, AIMessage) and not getattr(m, "tool_calls", None):
            draft = m.content if isinstance(m.content, str) else str(m.content)
            break

    if not draft:
        draft = "Estou com dificuldade para processar. Pode tentar de novo?"

    tenant_ctx = state.get("tenant_context") or {}
    model = tenant_ctx.get("model") or settings.openai_model_default
    llm = ChatOpenAI(
        model=model,
        api_key=settings.openai_api_key,
        temperature=0.4,
        max_tokens=300,
    )

    t0 = time.time()
    result = await _invoke_with_retry(llm, [
        SystemMessage(content=prompts.responder_system(tenant_ctx)),
        HumanMessage(content=(
            "Rascunho gerado pelo planejamento (pode ter linguagem técnica):\n\n"
            f"{draft}\n\n"
            "Reescreva como mensagem direta para o cliente seguindo as regras."
        )),
    ])
    latency = int((time.time() - t0) * 1000)

    usage = getattr(result, "response_metadata", {}).get("token_usage", {}) or {}
    tokens_in = int(usage.get("prompt_tokens") or 0)
    tokens_out = int(usage.get("completion_tokens") or 0)
    final = result.content if isinstance(result.content, str) else str(result.content)

    log.info("node.responder", run_id=state.get("run_id"), latency_ms=latency)

    return {
        "final_response": final.strip(),
        "total_tokens_in": state.get("total_tokens_in", 0) + tokens_in,
        "total_tokens_out": state.get("total_tokens_out", 0) + tokens_out,
        "node_traces": _push_trace(state, {
            "node": "responder",
            "input": redact_if_enabled(draft[:300]),
            "output": redact_if_enabled(final[:300]),
            "tokensIn": tokens_in,
            "tokensOut": tokens_out,
            "latencyMs": latency,
            "startedAt": _now_iso(),
        }),
    }


# ─── Routing predicates ─────────────────────────────────────────────────────


def planner_routes_to(state: AgentState) -> str:
    max_iter = get_settings().agent_max_iterations
    dashboard_mode = state.get("use_case") in ("operator", "analyst")
    if state.get("iterations", 0) >= max_iter:
        log.warning("loop.max_iter", run_id=state.get("run_id"))
        return "skip_responder" if dashboard_mode else "responder"
    msgs = state.get("messages") or []
    last = msgs[-1] if msgs else None
    if last and getattr(last, "tool_calls", None):
        return "executor"
    if dashboard_mode:
        return "skip_responder"
    return "responder"


def executor_routes_to(state: AgentState) -> str:
    if state.get("needs_reflection") and state.get("use_case") == "operator":
        return "reflection"
    return "planner"


def skip_responder_to_end(state: AgentState) -> dict[str, Any]:
    msgs = state.get("messages") or []
    draft: str | None = None
    for m in reversed(msgs):
        if isinstance(m, AIMessage) and not getattr(m, "tool_calls", None):
            draft = m.content if isinstance(m.content, str) else str(m.content)
            break
    if not draft:
        draft = "Não consegui processar o comando. Pode reformular?"

    log.info("node.skip_responder", run_id=state.get("run_id"), length=len(draft))

    return {
        "final_response": draft.strip(),
        "node_traces": _push_trace(state, {
            "node": "skip_responder",
            "output": redact_if_enabled(draft[:300]),
            "latencyMs": 0,
            "startedAt": _now_iso(),
        }),
    }
