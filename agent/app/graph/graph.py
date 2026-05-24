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
from .nodes import executor_node, planner_node, router_node
from .state import AgentRunResult, AgentState

log = structlog.get_logger()


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


# One compiled graph per worker process — thread-safe (uvicorn forks workers)
_GRAPH = build_graph()


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
        final_state = await asyncio.wait_for(
            _GRAPH.ainvoke(
                initial_state,
                config={
                    "run_name": f"locai.{conversation_id}",
                    "tags": [f"tenant:{tenant_id}"],
                },
            ),
            timeout=float(s.agent_request_timeout_s),
        )

        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            message_id=message_id,
            user_message=message,
            final_response=final_state.get("final_response"),
            media_urls=final_state.get("media_urls", []),
            intent=final_state.get("intent"),
            iterations=final_state.get("iterations", 0),
            status="success",
            error=None,
            node_traces=final_state.get("node_traces", []),
            tool_calls=final_state.get("tool_calls_log", []),
            total_tokens_in=final_state.get("total_tokens_in", 0),
            total_tokens_out=final_state.get("total_tokens_out", 0),
            total_latency_ms=int((time.time() - t0) * 1000),
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
