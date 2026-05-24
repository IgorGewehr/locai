"""Agent state shared across all LangGraph nodes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    """Running state — nodes produce partial updates merged by LangGraph.

    `messages` uses the `add_messages` reducer so nodes return only the new
    messages they produce; LangGraph handles the append automatically.
    This is the idiomatic LangGraph pattern and safe for parallel nodes.
    """

    # Identity
    run_id: str
    tenant_id: str
    conversation_id: str
    message_id: str
    contact: dict[str, Any]  # {name, phone}

    # Conversation — reducer handles append
    messages: Annotated[list[BaseMessage], add_messages]

    # Control flow
    intent: str | None
    iterations: int
    final_response: str | None
    media_urls: list[str]
    error: str | None

    # Observability
    node_traces: list[dict[str, Any]]
    tool_calls_log: list[dict[str, Any]]
    total_tokens_in: int
    total_tokens_out: int


@dataclass
class AgentRunResult:
    run_id: str
    tenant_id: str
    conversation_id: str
    message_id: str
    user_message: str
    final_response: str | None
    media_urls: list[str]
    intent: str | None
    iterations: int
    status: Literal["success", "error"]
    error: str | None
    node_traces: list[dict[str, Any]] = field(default_factory=list)
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    total_tokens_in: int = 0
    total_tokens_out: int = 0
    total_latency_ms: int = 0
    cost_usd: float = 0.0
