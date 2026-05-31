"""HTTP client for Next.js REST tools — signs every request with HMAC."""

from __future__ import annotations

import asyncio
import json
import random
import re
import time
from typing import Any

import httpx

from ..auth import sign_payload
from ..config import get_settings
from ..logging_config import get_logger

log = get_logger("tools.client")


class ToolError(Exception):
    """Raised when the Next.js tool endpoint returns an error."""


async def _post(
    tenant_id: str,
    path: str,
    body: dict[str, Any],
    *,
    timeout: float | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    base = settings.next_public_api_base_url.rstrip("/")
    url = f"{base}{path}"
    raw_body = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    signature, timestamp = sign_payload(tenant_id, raw_body)

    headers = {
        "Content-Type": "application/json",
        "x-agent-signature": signature,
        "x-agent-timestamp": timestamp,
        "x-tenant-id": tenant_id,
    }

    t0 = time.time()
    async with httpx.AsyncClient(timeout=timeout or settings.agent_request_timeout_s) as client:
        try:
            resp = await client.post(url, content=raw_body.encode("utf-8"), headers=headers)
        except httpx.HTTPError as e:
            latency = int((time.time() - t0) * 1000)
            log.error("tools.http_error", path=path, error=str(e), latency_ms=latency)
            raise ToolError(f"HTTP error calling {path}: {e}") from e

    latency = int((time.time() - t0) * 1000)
    if resp.status_code >= 400:
        try:
            payload = resp.json()
        except Exception:
            payload = {"error": resp.text}
        log.error("tools.bad_response", path=path, status=resp.status_code,
                  payload=payload, latency_ms=latency)
        raise ToolError(payload.get("error") or f"HTTP {resp.status_code}")

    data = resp.json()
    log.info("tools.ok", path=path, latency_ms=latency)
    if not data.get("ok"):
        raise ToolError(data.get("error") or "Unknown tool error")
    return data.get("data", {})


# Tool name → endpoint path. Each endpoint is `action`-dispatched (the action
# is the part after the underscore, e.g. `properties_get_details` → action
# `get_details` to /api/agent/tools/properties).
TOOL_ENDPOINTS: dict[str, str] = {
    # properties
    "properties_list":         "/api/agent/tools/properties",
    "properties_get_details":  "/api/agent/tools/properties",
    "properties_get_photos":   "/api/agent/tools/properties",
    "properties_search":       "/api/agent/tools/properties",
    # ical
    "ical_check_availability": "/api/agent/tools/ical",
    # appointments
    "appointments_check_slots":         "/api/agent/tools/appointments",
    "appointments_get_next_available":  "/api/agent/tools/appointments",
    "appointments_create":              "/api/agent/tools/appointments",
    "appointments_list_by_client":      "/api/agent/tools/appointments",
    "appointments_list_today":          "/api/agent/tools/appointments",
    "appointments_list_upcoming":       "/api/agent/tools/appointments",
    "appointments_update":              "/api/agent/tools/appointments",
    "appointments_cancel":              "/api/agent/tools/appointments",
    # clients
    "clients_lookup_by_phone":  "/api/agent/tools/clients",
    "clients_create":           "/api/agent/tools/clients",
    "clients_update":           "/api/agent/tools/clients",
    "clients_get_full_history": "/api/agent/tools/clients",
    # conversations
    "conversations_send_media": "/api/agent/tools/conversations",
    "share_airbnb_link":        "/api/agent/tools/conversations",
    "notify_human":             "/api/agent/tools/conversations",
    # memory
    "memory_recall":   "/api/agent/tools/memory",
    "memory_remember": "/api/agent/tools/memory",
    # crm
    "crm_list_leads":         "/api/agent/tools/crm",
    "crm_search_leads":       "/api/agent/tools/crm",
    "crm_update_lead_stage":  "/api/agent/tools/crm",
    # knowledge
    "knowledge_search": "/api/agent/tools/knowledge",
}


# Tools that deliver a message/media/link to the customer. For these the
# executor injects the delivery context (conversationId / recipientId /
# channel) into params. We also lift those fields to the top level of the
# request body so the conversations endpoint can read them regardless of
# whether it looks in `params` or at the body root.
DELIVERY_TOOLS = {"conversations_send_media", "share_airbnb_link", "notify_human"}
_DELIVERY_CONTEXT_FIELDS = ("conversationId", "recipientId", "channel")


# Map tool_name → action token sent in the request body. The Next.js endpoint
# switches on `action` to dispatch the right handler. We compute it once at
# import time so the executor stays cheap.
def _action_for(tool_name: str) -> str:
    """`appointments_create` → `create`, `share_airbnb_link` → `share_airbnb_link`."""
    # Special bare-name tools that ARE the action (no namespace prefix to strip)
    bare = {"share_airbnb_link", "notify_human"}
    if tool_name in bare:
        return tool_name
    namespace, _, action = tool_name.partition("_")
    return action or tool_name


_ACTIONS: dict[str, str] = {name: _action_for(name) for name in TOOL_ENDPOINTS}


async def call_tool(tenant_id: str, tool_name: str, params: dict[str, Any]) -> dict[str, Any]:
    """Call a tool by name — returns the `data` field on success."""
    if tool_name not in TOOL_ENDPOINTS:
        raise ToolError(f"Unknown tool: {tool_name}")
    path = TOOL_ENDPOINTS[tool_name]
    action = _ACTIONS[tool_name]
    body: dict[str, Any] = {"action": action, "params": params}
    if tool_name in DELIVERY_TOOLS:
        # Surface the delivery context at the body root (camelCase) so the
        # conversations endpoint always has a recipient — the LLM never fills
        # these, the executor injects them into params before calling.
        body["tenantId"] = tenant_id
        for field in _DELIVERY_CONTEXT_FIELDS:
            if params.get(field) is not None:
                body[field] = params[field]
    return await _post(tenant_id, path, body)


# ─── Outbound messaging (agent → contact) ──────────────────────────────────

_CHUNK_MAX_CHARS = 1000
_CHUNK_MAX_COUNT = 3
_CHUNK_PAUSE_MIN_MS = 400
_CHUNK_PAUSE_MAX_MS = 900


def _split_for_humanization(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= _CHUNK_MAX_CHARS:
        return [text]

    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paragraphs:
        if len(buf) + len(p) + 2 <= _CHUNK_MAX_CHARS:
            buf = f"{buf}\n\n{p}" if buf else p
        else:
            if buf:
                chunks.append(buf)
                buf = ""
            if len(p) > _CHUNK_MAX_CHARS:
                chunks.extend(_split_by_sentence(p))
            else:
                buf = p
    if buf:
        chunks.append(buf)

    if len(chunks) > _CHUNK_MAX_COUNT:
        head = chunks[: _CHUNK_MAX_COUNT - 1]
        tail = "\n\n".join(chunks[_CHUNK_MAX_COUNT - 1 :])
        if len(tail) > _CHUNK_MAX_CHARS:
            tail = tail[: _CHUNK_MAX_CHARS - 3].rstrip() + "..."
        chunks = head + [tail]

    return chunks


def _split_by_sentence(paragraph: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", paragraph)
    chunks: list[str] = []
    buf = ""
    for s in parts:
        if len(buf) + len(s) + 1 <= _CHUNK_MAX_CHARS:
            buf = f"{buf} {s}" if buf else s
        else:
            if buf:
                chunks.append(buf)
            if len(s) > _CHUNK_MAX_CHARS:
                for i in range(0, len(s), _CHUNK_MAX_CHARS):
                    chunks.append(s[i : i + _CHUNK_MAX_CHARS])
                buf = ""
            else:
                buf = s
    if buf:
        chunks.append(buf)
    return chunks


async def send_final_message(
    tenant_id: str,
    conversation_id: str,
    channel: str,
    recipient_id: str,
    content: str,
) -> dict[str, Any]:
    """Dispatch the agent's final text message back to the contact."""
    if channel in ("web", "dashboard"):
        return {"ok": True, "skipped": f"{channel} channel — response returned via HTTP"}

    chunks = _split_for_humanization(content)
    if not chunks:
        return {"ok": True, "skipped": "empty content"}

    if len(chunks) == 1:
        return await _post(
            tenant_id,
            "/api/conversations/send",
            {
                "tenantId": tenant_id,
                "conversationId": conversation_id,
                "channel": channel,
                "recipientId": recipient_id,
                "content": chunks[0],
                "type": "text",
            },
        )

    log.info("humanize.chunked", count=len(chunks), lengths=[len(c) for c in chunks])
    last_result: dict[str, Any] = {}
    for i, chunk in enumerate(chunks):
        last_result = await _post(
            tenant_id,
            "/api/conversations/send",
            {
                "tenantId": tenant_id,
                "conversationId": conversation_id,
                "channel": channel,
                "recipientId": recipient_id,
                "content": chunk,
                "type": "text",
            },
        )
        if i < len(chunks) - 1:
            await asyncio.sleep(
                random.uniform(_CHUNK_PAUSE_MIN_MS, _CHUNK_PAUSE_MAX_MS) / 1000.0
            )

    return last_result
