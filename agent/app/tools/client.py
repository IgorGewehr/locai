"""HTTP client for calling locai tool endpoints."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

import httpx

from ..config import get_settings


def _sign(secret: str, timestamp: str, body: bytes) -> str:
    """Must match auth.py: signs `timestamp.body`."""
    payload = timestamp.encode() + b"." + body
    return hmac.new(secret.encode(), payload, digestmod=hashlib.sha256).hexdigest()


# Maps LLM tool name -> locai endpoint path segment when they differ.
# read_system is a single generic READ endpoint at /api/agent/tools/read.
_TOOL_PATHS: dict[str, str] = {
    "read_system": "read",
}


async def call_tool(name: str, args: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    """POST to locai /api/agent/tools/{path} with HMAC auth."""
    s = get_settings()
    path = _TOOL_PATHS.get(name, name)
    url = f"{s.locai_api_url}/api/agent/tools/{path}"

    payload = {"tenant_id": tenant_id, **args}
    body = json.dumps(payload, ensure_ascii=False).encode()
    ts = str(int(time.time() * 1000))
    sig = _sign(s.agent_shared_secret, ts, body)

    headers = {
        "Content-Type": "application/json",
        "X-Agent-Signature": sig,
        "X-Agent-Timestamp": ts,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, content=body, headers=headers)
        resp.raise_for_status()
        return resp.json()
