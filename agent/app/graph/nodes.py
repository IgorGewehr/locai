"""LangGraph node implementations."""

from __future__ import annotations

import asyncio
import json
import time
from functools import lru_cache
from typing import Any

import structlog
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from ..config import get_settings
from ..tools.client import call_tool
from ..tools.registry import READ_ONLY_TOOL_NAMES, TOOLS
from .prompts import PLANNER_SYSTEM, ROUTER_SYSTEM
from .state import AgentState

log = structlog.get_logger()


@lru_cache(maxsize=8)
def _get_llm(provider: str, model: str, api_key: str | None, fast: bool):
    """Cached LLM factory — avoids creating a new httpx client on every request."""
    s = get_settings()
    timeout = float(s.agent_request_timeout_s)

    if provider == "anthropic" and api_key:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=api_key,
            temperature=0.7,
            max_tokens=1024,
            timeout=timeout,
        )

    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=model,
        api_key=api_key,
        temperature=0.7,
        max_tokens=1024,
        request_timeout=timeout,
    )


def _llm(fast: bool = False):
    s = get_settings()
    model = s.model_fast if fast else s.model_main
    return _get_llm(s.llm_provider, model, s.openai_api_key or s.anthropic_api_key, fast)


async def router_node(state: AgentState) -> dict:
    """Classify user intent quickly (fast model, ~15 tokens)."""
    t0 = time.time()
    messages = state.get("messages", [])
    last_human = next(
        (m.content for m in reversed(messages) if isinstance(m, HumanMessage)), ""
    )

    llm = _llm(fast=True)
    resp = await llm.ainvoke([
        SystemMessage(content=ROUTER_SYSTEM),
        HumanMessage(content=str(last_human)[:500]),
    ])
    intent = resp.content.strip().lower().split()[0] if resp.content.strip() else "property_inquiry"

    trace = {"node": "router", "intent": intent, "latency_ms": int((time.time() - t0) * 1000)}
    usage = getattr(resp, "usage_metadata", None) or {}
    return {
        "intent": intent,
        "node_traces": state.get("node_traces", []) + [trace],
        "total_tokens_in": state.get("total_tokens_in", 0) + usage.get("input_tokens", 0),
        "total_tokens_out": state.get("total_tokens_out", 0) + usage.get("output_tokens", 0),
    }


async def planner_node(state: AgentState) -> dict:
    """Main LLM: generates response or decides which tools to call."""
    t0 = time.time()

    llm = _llm(fast=False)
    llm_with_tools = llm.bind_tools(TOOLS)

    system_msg = SystemMessage(content=PLANNER_SYSTEM)
    history = state.get("messages", [])
    resp = await llm_with_tools.ainvoke([system_msg] + history)

    trace = {
        "node": "planner",
        "has_tool_calls": bool(getattr(resp, "tool_calls", None)),
        "latency_ms": int((time.time() - t0) * 1000),
    }
    usage = getattr(resp, "usage_metadata", None) or {}

    final_response = None
    if not getattr(resp, "tool_calls", None):
        final_response = resp.content if isinstance(resp.content, str) else ""

    return {
        "messages": [resp],  # add_messages reducer appends automatically
        "final_response": final_response,
        "node_traces": state.get("node_traces", []) + [trace],
        "total_tokens_in": state.get("total_tokens_in", 0) + usage.get("input_tokens", 0),
        "total_tokens_out": state.get("total_tokens_out", 0) + usage.get("output_tokens", 0),
        "iterations": state.get("iterations", 0) + 1,
    }


def make_operator_planner_node(system_prompt: str, read_only: bool):
    """Build a planner node for the operator console.

    Uses an operator system prompt. In read-only mode the LLM is bound only to
    read tools (READ_ONLY_TOOL_NAMES) so it cannot mutate the system.
    """
    if read_only:
        tools = [t for t in TOOLS if t.get("function", {}).get("name") in READ_ONLY_TOOL_NAMES]
    else:
        tools = TOOLS

    async def operator_planner_node(state: AgentState) -> dict:
        t0 = time.time()

        llm = _llm(fast=False)
        llm_with_tools = llm.bind_tools(tools)

        system_msg = SystemMessage(content=system_prompt)
        history = state.get("messages", [])
        resp = await llm_with_tools.ainvoke([system_msg] + history)

        trace = {
            "node": "operator_planner",
            "has_tool_calls": bool(getattr(resp, "tool_calls", None)),
            "read_only": read_only,
            "latency_ms": int((time.time() - t0) * 1000),
        }
        usage = getattr(resp, "usage_metadata", None) or {}

        final_response = None
        if not getattr(resp, "tool_calls", None):
            final_response = resp.content if isinstance(resp.content, str) else ""

        return {
            "messages": [resp],
            "final_response": final_response,
            "node_traces": state.get("node_traces", []) + [trace],
            "total_tokens_in": state.get("total_tokens_in", 0) + usage.get("input_tokens", 0),
            "total_tokens_out": state.get("total_tokens_out", 0) + usage.get("output_tokens", 0),
            "iterations": state.get("iterations", 0) + 1,
        }

    return operator_planner_node


async def executor_node(state: AgentState) -> dict:
    """Execute tool calls in parallel and return ToolMessages."""
    messages = state.get("messages", [])
    last_ai = messages[-1] if messages else None

    if not last_ai or not getattr(last_ai, "tool_calls", None):
        return {}

    tool_calls = last_ai.tool_calls
    tenant_id: str = state.get("tenant_id", "")
    conversation_id: str = state.get("conversation_id", "")
    contact: dict = state.get("contact", {})

    async def _run_one(tc: dict) -> tuple[ToolMessage, dict, list[str]]:
        name: str = tc["name"]
        args: dict = tc["args"]
        tc_id: str = tc["id"]
        t0 = time.time()
        media: list[str] = []
        try:
            result = await call_tool(
                name,
                {**args, "conversation_id": conversation_id, "contact": contact},
                tenant_id,
            )
            content = json.dumps(result, ensure_ascii=False)
            success = True
            if isinstance(result, dict):
                urls = result.get("media_urls") or result.get("photos") or result.get("videos") or []
                if isinstance(urls, list):
                    media = urls
        except Exception as exc:
            content = json.dumps({"error": str(exc)})
            success = False

        tool_msg = ToolMessage(content=content, tool_call_id=tc_id)
        log_entry = {
            "name": name,
            "args": args,
            "success": success,
            "latency_ms": int((time.time() - t0) * 1000),
        }
        return tool_msg, log_entry, media

    # All tool calls run concurrently
    results = await asyncio.gather(*[_run_one(tc) for tc in tool_calls])

    tool_msgs, log_entries, media_lists = zip(*results) if results else ([], [], [])
    all_media: list[str] = [url for urls in media_lists for url in urls]

    return {
        "messages": list(tool_msgs),  # add_messages reducer appends
        "tool_calls_log": state.get("tool_calls_log", []) + list(log_entries),
        "media_urls": state.get("media_urls", []) + all_media,
    }
