"""LangGraph assembly and run_agent entrypoint."""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

import structlog
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, StateGraph

from ..config import get_settings
from ..observability import get_langsmith_callbacks
from .nodes import executor_node, make_operator_planner_node, planner_node, router_node
from .state import AgentRunResult, AgentState

log = structlog.get_logger()

# Cost per 1M tokens (USD) — update when models change
_COST_TABLE: dict[str, tuple[float, float]] = {  # (input, output) per 1M tokens
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1-nano": (0.10, 0.40),
    "claude-sonnet-4-5-20251022": (3.00, 15.00),
    "claude-haiku-3-5-20241022": (0.80, 4.00),
}


def _estimate_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    rates = _COST_TABLE.get(model, (0.15, 0.60))  # default to gpt-4o-mini
    return (tokens_in * rates[0] + tokens_out * rates[1]) / 1_000_000


def _has_tool_calls(state: AgentState) -> str:
    messages = state.get("messages", [])
    last = messages[-1] if messages else None
    if last and getattr(last, "tool_calls", None):
        return "executor"
    return "end"


def _should_continue(state: AgentState) -> str:
    if state.get("iterations", 0) >= get_settings().agent_max_iterations:
        return "end"
    if state.get("final_response"):
        return "end"
    return "planner"


def build_graph() -> Any:
    g = StateGraph(AgentState)
    g.add_node("router", router_node)
    g.add_node("planner", planner_node)
    g.add_node("executor", executor_node)
    g.set_entry_point("router")
    g.add_edge("router", "planner")
    g.add_conditional_edges("planner", _has_tool_calls, {"executor": "executor", "end": END})
    g.add_conditional_edges("executor", _should_continue, {"planner": "planner", "end": END})
    return g.compile()


def build_operator_graph(system_prompt: str, read_only: bool) -> Any:
    """Operator-console graph: planner <-> executor loop (no client router).

    The planner uses an operator system prompt and, in read-only ("analista")
    mode, is bound only to read tools so it physically cannot mutate.
    """
    g = StateGraph(AgentState)
    g.add_node("planner", make_operator_planner_node(system_prompt, read_only))
    g.add_node("executor", executor_node)
    g.set_entry_point("planner")
    g.add_conditional_edges("planner", _has_tool_calls, {"executor": "executor", "end": END})
    g.add_conditional_edges("executor", _should_continue, {"planner": "planner", "end": END})
    return g.compile()


# One compiled graph per worker process — thread-safe (uvicorn forks workers)
_GRAPH = build_graph()

# Operator console graphs (one per mode), compiled once per worker.
from .prompts import OPERATOR_ANALISTA_SYSTEM, OPERATOR_OPERADOR_SYSTEM  # noqa: E402

_OPERATOR_GRAPHS: dict[str, Any] = {
    "analista": build_operator_graph(OPERATOR_ANALISTA_SYSTEM, read_only=True),
    "operador": build_operator_graph(OPERATOR_OPERADOR_SYSTEM, read_only=False),
}


async def run_agent(
    *,
    tenant_id: str,
    conversation_id: str,
    message_id: str,
    message: str,
    history: list[dict[str, str]],
    contact: dict[str, str],
) -> AgentRunResult:
    s = get_settings()
    run_id = str(uuid.uuid4())
    t0 = time.time()

    lc_messages = []
    for h in history[-20:]:
        role = h.get("role", "")
        content = h.get("content", "")
        if role == "assistant":
            lc_messages.append(AIMessage(content=content))
        else:
            lc_messages.append(HumanMessage(content=content))

    lc_messages.append(HumanMessage(content=message))

    initial_state: AgentState = {
        "run_id": run_id,
        "tenant_id": tenant_id,
        "conversation_id": conversation_id,
        "message_id": message_id,
        "contact": contact,
        "messages": lc_messages,
        "intent": None,
        "iterations": 0,
        "final_response": None,
        "media_urls": [],
        "error": None,
        "node_traces": [],
        "tool_calls_log": [],
        "total_tokens_in": 0,
        "total_tokens_out": 0,
    }

    try:
        # Hard timeout — prevents workers from hanging on slow LLM calls
        config: dict = {
            "run_name": f"locai.{conversation_id}",
            "tags": [f"tenant:{tenant_id}"],
        }
        ls_callbacks = get_langsmith_callbacks()
        if ls_callbacks:
            config["callbacks"] = ls_callbacks

        final_state = await asyncio.wait_for(
            _GRAPH.ainvoke(initial_state, config=config),
            timeout=float(s.agent_request_timeout_s),
        )

        final_response = final_state.get("final_response")
        # Fallback: extract last AI message if planner never produced a plain response
        if not final_response:
            for m in reversed(final_state.get("messages", [])):
                content = getattr(m, "content", None)
                if isinstance(content, str) and content.strip() and not getattr(m, "tool_calls", None):
                    final_response = content
                    break

        tok_in = final_state.get("total_tokens_in", 0)
        tok_out = final_state.get("total_tokens_out", 0)

        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            message_id=message_id,
            user_message=message,
            final_response=final_response,
            media_urls=final_state.get("media_urls", []),
            intent=final_state.get("intent"),
            iterations=final_state.get("iterations", 0),
            status="success",
            error=None,
            node_traces=final_state.get("node_traces", []),
            tool_calls=final_state.get("tool_calls_log", []),
            total_tokens_in=tok_in,
            total_tokens_out=tok_out,
            total_latency_ms=int((time.time() - t0) * 1000),
            cost_usd=_estimate_cost(s.model_main, tok_in, tok_out),
        )

    except asyncio.TimeoutError:
        log.error("agent.timeout", run_id=run_id, timeout_s=s.agent_request_timeout_s)
        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            message_id=message_id,
            user_message=message,
            final_response=None,
            media_urls=[],
            intent=None,
            iterations=0,
            status="error",
            error=f"Agent timed out after {s.agent_request_timeout_s}s",
            total_latency_ms=int((time.time() - t0) * 1000),
        )

    except Exception as exc:
        log.error("agent.run_error", run_id=run_id, error=str(exc))
        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            message_id=message_id,
            user_message=message,
            final_response=None,
            media_urls=[],
            intent=None,
            iterations=0,
            status="error",
            error=str(exc),
            total_latency_ms=int((time.time() - t0) * 1000),
        )


async def run_operator(*, tenant_id: str, message: str, mode: str) -> str:
    """Operator-console flow. Returns a plain-text reply.

    mode="analista" -> read-only (cannot mutate).
    mode="operador" -> may use write tools (cautiously).
    """
    s = get_settings()
    norm_mode = mode if mode in _OPERATOR_GRAPHS else "analista"
    graph = _OPERATOR_GRAPHS[norm_mode]
    run_id = str(uuid.uuid4())

    initial_state: AgentState = {
        "run_id": run_id,
        "tenant_id": tenant_id,
        "conversation_id": f"operator:{run_id}",
        "message_id": run_id,
        "contact": {},
        "messages": [HumanMessage(content=message)],
        "intent": "operator",
        "iterations": 0,
        "final_response": None,
        "media_urls": [],
        "error": None,
        "node_traces": [],
        "tool_calls_log": [],
        "total_tokens_in": 0,
        "total_tokens_out": 0,
    }

    try:
        op_config: dict = {
            "run_name": f"locai.operator.{norm_mode}",
            "tags": [f"tenant:{tenant_id}"],
        }
        ls_cbs = get_langsmith_callbacks()
        if ls_cbs:
            op_config["callbacks"] = ls_cbs

        final_state = await asyncio.wait_for(
            graph.ainvoke(initial_state, config=op_config),
            timeout=float(s.agent_request_timeout_s),
        )
        reply = final_state.get("final_response")
        if reply:
            return reply
        # Fall back to the last AI message content if the loop ended without a plain reply.
        for m in reversed(final_state.get("messages", [])):
            content = getattr(m, "content", None)
            if isinstance(content, str) and content.strip() and not getattr(m, "tool_calls", None):
                return content
        return "Não consegui produzir uma resposta. Tente reformular a solicitação."

    except asyncio.TimeoutError:
        log.error("operator.timeout", run_id=run_id, timeout_s=s.agent_request_timeout_s)
        return "A solicitação demorou demais para ser processada. Tente novamente."
    except Exception as exc:
        log.error("operator.run_error", run_id=run_id, error=str(exc))
        return "Ocorreu um erro ao processar a solicitação."
