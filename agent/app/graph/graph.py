"""LangGraph assembly + public `run_agent` entrypoint.

Topology (same shape as saas-erp/agent for parity):

      START
        │
        ▼
     router
        │
        ▼
     planner ◄──────────────────────────┐
        │                               │
        ├──(tool_calls)─▶ executor ─────┤
        │                  │            │
        │            (if operator+      │
        │             destructive)      │
        │                  ▼            │
        │             reflection ───────┘
        │
        ├──(customer-mode draft) ─▶ responder ─▶ END
        │
        └──(operator/analyst draft) ─▶ skip_responder ─▶ END
"""

from __future__ import annotations

import time
import uuid
from typing import Annotated

from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from ..config import get_settings
from ..logging_config import get_logger
from ..observability import build_run_config
from ..schemas import ProcessRequest
from .nodes import (
    executor_node,
    executor_routes_to,
    planner_node,
    planner_routes_to,
    reflection_node,
    responder_node,
    router_node,
    skip_responder_to_end,
)
from .state import AgentRunResult, AgentState

log = get_logger("graph")

_graph = None


def _build_graph():
    from typing import TypedDict

    class _State(TypedDict, total=False):
        run_id: str
        tenant_id: str
        conversation_id: str
        message_id: str
        use_case: str
        tenant_context: dict
        contact: dict
        messages: Annotated[list[BaseMessage], add_messages]
        intent: str | None
        iterations: int
        final_response: str | None
        error: str | None
        direct_send_done: bool
        needs_reflection: bool
        reasoning: list[dict]
        node_traces: list[dict]
        tool_calls_log: list[dict]
        total_tokens_in: int
        total_tokens_out: int

    g = StateGraph(_State)
    g.add_node("router", router_node)
    g.add_node("planner", planner_node)
    g.add_node("executor", executor_node)
    g.add_node("reflection", reflection_node)
    g.add_node("responder", responder_node)
    g.add_node("skip_responder", skip_responder_to_end)

    g.add_edge(START, "router")
    g.add_edge("router", "planner")
    g.add_conditional_edges(
        "planner",
        planner_routes_to,
        {
            "executor": "executor",
            "responder": "responder",
            "skip_responder": "skip_responder",
        },
    )
    g.add_conditional_edges(
        "executor",
        executor_routes_to,
        {"reflection": "reflection", "planner": "planner"},
    )
    g.add_edge("reflection", "planner")
    g.add_edge("responder", END)
    g.add_edge("skip_responder", END)

    return g.compile()


def get_graph():
    global _graph
    if _graph is None:
        _graph = _build_graph()
    return _graph


# ─── Public API ────────────────────────────────────────────────────────────


async def run_agent(*, run_id: str, tenant_id: str, req: ProcessRequest) -> AgentRunResult:
    settings = get_settings()
    model = settings.openai_model_default
    t0 = time.time()

    from ..budget import check_budget
    allowed, usd_today, cap = await check_budget(tenant_id)
    if not allowed:
        log.warning("budget.exceeded", run_id=run_id, tenant_id=tenant_id,
                    usd_today=usd_today, cap=cap)
        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=req.conversation_id,
            message_id=req.message_id,
            user_message=req.message,
            final_response=None,
            intent="budget_exceeded",
            iterations=0,
            status="skipped",
            error=f"Daily budget exceeded: ${usd_today:.2f} / ${cap:.2f}",
            total_latency_ms=0,
            model=model,
        )

    initial_messages: list[BaseMessage] = []
    for item in req.history[-10:]:
        role = item.get("role")
        content = item.get("content", "")
        if role == "user":
            initial_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            from langchain_core.messages import AIMessage
            initial_messages.append(AIMessage(content=content))
    initial_messages.append(HumanMessage(content=req.message))

    state: AgentState = {
        "run_id": run_id,
        "tenant_id": tenant_id,
        "conversation_id": req.conversation_id,
        "message_id": req.message_id,
        "use_case": req.use_case,
        "tenant_context": {
            "name": req.tenant_name,
            "description": req.tenant_description,
            "tone": req.tone,
            "model": model,
            "current_date": req.current_date or "",
            "address": req.tenant_address or {},
            "operating_city": req.operating_city or "",
            "working_hours": req.working_hours or [],
            "visit_settings": req.visit_settings or {},
            "properties_summary": req.properties_summary or [],
            "client_memory": req.client_memory or "",
            "policies": req.policies or {},
            "operator": {
                "user_id": req.operator_user_id,
                "user_name": req.operator_user_name,
                "user_role": req.operator_user_role,
                "autonomous": bool(req.operator_autonomous),
            } if req.use_case in ("operator", "analyst") else {},
        },
        "contact": {
            "name": req.contact_name,
            "phone": req.contact_phone,
            "channel": req.channel,
            "recipient_id": req.recipient_id,
        },
        "messages": initial_messages,
        "iterations": 0,
        "needs_reflection": False,
        "direct_send_done": False,
        "reasoning": [],
        "node_traces": [],
        "tool_calls_log": [],
        "total_tokens_in": 0,
        "total_tokens_out": 0,
    }

    graph = get_graph()
    run_config = build_run_config(
        run_id=run_id,
        tenant_id=tenant_id,
        conversation_id=req.conversation_id,
        message_id=req.message_id,
        use_case=req.use_case or "imobiliario",
        channel=req.channel or "whatsapp",
        model=model,
    )

    try:
        final = await graph.ainvoke(state, run_config)
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        log.error("graph.invoke_failed", run_id=run_id, error=str(e), latency_ms=latency)
        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=req.conversation_id,
            message_id=req.message_id,
            user_message=req.message,
            final_response=None,
            intent=None,
            iterations=0,
            status="error",
            error=str(e),
            total_latency_ms=latency,
            model=model,
        )

    latency = int((time.time() - t0) * 1000)
    tokens_in = final.get("total_tokens_in", 0)
    tokens_out = final.get("total_tokens_out", 0)
    from .nodes import PRICING
    cost = 0.0
    if model in PRICING:
        in_p, out_p = PRICING[model]
        cost = round((tokens_in * in_p + tokens_out * out_p) / 1_000_000, 6)

    # Report consumption so the daily cap can actually fire. Best-effort: a
    # failure here is logged inside record_budget and must not fail the run.
    from ..budget import record_budget
    recorded = await record_budget(tenant_id, cost_usd=cost, tokens=tokens_in + tokens_out)
    if not recorded:
        log.warning("budget.record_unconfirmed", run_id=run_id, tenant_id=tenant_id,
                    cost_usd=cost)

    return AgentRunResult(
        run_id=run_id,
        tenant_id=tenant_id,
        conversation_id=req.conversation_id,
        message_id=req.message_id,
        user_message=req.message,
        final_response=final.get("final_response"),
        intent=final.get("intent"),
        iterations=final.get("iterations", 0),
        status="success" if (final.get("final_response") or final.get("direct_send_done")) else "error",
        error=final.get("error"),
        node_traces=final.get("node_traces", []),
        tool_calls=final.get("tool_calls_log", []),
        total_tokens_in=tokens_in,
        total_tokens_out=tokens_out,
        total_latency_ms=latency,
        cost_usd=cost,
        model=model,
    )
