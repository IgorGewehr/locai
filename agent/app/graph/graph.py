"""LangGraph assembly and run_agent entrypoint."""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

import json

import structlog
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from ..config import get_settings
from .nodes import executor_node, make_operator_planner_node, planner_node, router_node
from .state import AgentRunResult, AgentState

log = structlog.get_logger()


def _has_tool_calls(state: AgentState) -> str:
    messages = state.get("messages", [])
    last = messages[-1] if messages else None
    if last and getattr(last, "tool_calls", None):
        return "executor"
    return "end"


def _should_continue(state: AgentState) -> str:
    if state.get("deferred"):  # task diferida via defer_and_work — turno acabou
        return "end"
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
    ai_config: dict[str, Any] | None = None,
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
        # AI-CONFIG → AGENTE: overrides do tenant lidos pelo planner_node para
        # personalizar o system prompt sem quebrar as regras-mãe.
        "ai_config": ai_config or {},
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

        deferred = bool(final_state.get("deferred"))
        final_response = final_state.get("final_response")
        # Turno diferido: a frase humana já saiu pelo defer-task; NÃO há 2ª resposta.
        if deferred:
            final_response = None
        # Fallback: extract last AI message if planner never produced a plain response
        elif not final_response:
            for m in reversed(final_state.get("messages", [])):
                content = getattr(m, "content", None)
                if isinstance(content, str) and content.strip() and not getattr(m, "tool_calls", None):
                    final_response = content
                    break

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
            total_tokens_in=final_state.get("total_tokens_in", 0),
            total_tokens_out=final_state.get("total_tokens_out", 0),
            total_latency_ms=int((time.time() - t0) * 1000),
            deferred=deferred,
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
        final_state = await asyncio.wait_for(
            graph.ainvoke(
                initial_state,
                config={"run_name": f"locai.operator.{norm_mode}", "tags": [f"tenant:{tenant_id}"]},
            ),
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


async def run_resume(
    *,
    tenant_id: str,
    conversation_id: str,
    task_id: str,
    task_type: str,
    task_result: dict,
    resume_hint: str | None,
    history: list[dict[str, str]],
) -> AgentRunResult:
    """Re-engajamento proativo após uma task diferida concluir.

    Diferente do run_agent: NÃO há mensagem nova do cliente. O turno é iniciado por
    um bloco de SISTEMA que injeta o `task_result` e instrui a Sofia a retomar a
    conversa no seu tom (ver docs/blueprint/01 §5.2). O trabalho pesado já foi feito
    pelo worker — aqui é só diálogo (tier MAIN, mesmo timeout do /process).
    """
    s = get_settings()
    run_id = str(uuid.uuid4())
    t0 = time.time()

    lc_messages: list[Any] = []
    for h in history[-20:]:
        role = h.get("role", "")
        content = h.get("content", "")
        if role == "assistant":
            lc_messages.append(AIMessage(content=content))
        else:
            lc_messages.append(HumanMessage(content=content))

    resume_directive = (
        f"[TASK CONCLUÍDA: {task_type}] Você pediu um instante ao cliente e agora tem "
        f"o resultado abaixo. Volte a falar com ele de forma natural e calorosa, como "
        f"quem prometeu retorno e está cumprindo. NÃO comece com 'oi' do zero — retome "
        f"o fio da conversa.\n"
        f"DICA DE APRESENTAÇÃO: {resume_hint or '—'}\n"
        f"RESULTADO (use só o que for verdade; nunca invente): "
        f"{json.dumps(task_result, ensure_ascii=False)}"
    )
    lc_messages.append(SystemMessage(content=resume_directive))

    initial_state: AgentState = {
        "run_id": run_id,
        "tenant_id": tenant_id,
        "conversation_id": conversation_id,
        "message_id": task_id,
        "contact": {},
        "messages": lc_messages,
        "intent": "resume",
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
        final_state = await asyncio.wait_for(
            _GRAPH.ainvoke(
                initial_state,
                config={"run_name": f"locai.resume.{conversation_id}", "tags": [f"tenant:{tenant_id}"]},
            ),
            timeout=float(s.agent_request_timeout_s),
        )

        final_response = final_state.get("final_response")
        if not final_response:
            for m in reversed(final_state.get("messages", [])):
                content = getattr(m, "content", None)
                if isinstance(content, str) and content.strip() and not getattr(m, "tool_calls", None):
                    final_response = content
                    break

        # Sugestão de transição: se a Sofia escalou pra humano no resume, aguarda humano.
        tool_names = {entry.get("name") for entry in final_state.get("tool_calls_log", [])}
        next_state = "AGUARDANDO_HUMANO" if "notify_owner" in tool_names else "ATIVA"

        return AgentRunResult(
            run_id=run_id,
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            message_id=task_id,
            user_message="",
            final_response=final_response,
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
            next_state=next_state,
        )

    except asyncio.TimeoutError:
        log.error("resume.timeout", run_id=run_id, timeout_s=s.agent_request_timeout_s)
        return AgentRunResult(
            run_id=run_id, tenant_id=tenant_id, conversation_id=conversation_id,
            message_id=task_id, user_message="", final_response=None, media_urls=[],
            intent="resume", iterations=0, status="error",
            error=f"Resume timed out after {s.agent_request_timeout_s}s",
            total_latency_ms=int((time.time() - t0) * 1000), next_state="ATIVA",
        )
    except Exception as exc:
        log.error("resume.run_error", run_id=run_id, error=str(exc))
        return AgentRunResult(
            run_id=run_id, tenant_id=tenant_id, conversation_id=conversation_id,
            message_id=task_id, user_message="", final_response=None, media_urls=[],
            intent="resume", iterations=0, status="error", error=str(exc),
            total_latency_ms=int((time.time() - t0) * 1000), next_state="ATIVA",
        )
