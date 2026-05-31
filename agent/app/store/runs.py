"""Best-effort persistence of agent runs to Firestore via Next.js."""

from __future__ import annotations

import json
from typing import Any

import httpx

from ..auth import sign_payload
from ..config import get_settings
from ..logging_config import get_logger

log = get_logger("store.runs")


async def persist_run(tenant_id: str, run: dict[str, Any]) -> None:
    settings = get_settings()
    base = settings.next_public_api_base_url.rstrip("/")
    url = f"{base}/api/agent/runs"

    # The dispatcher requires an `action`; wrap the run as the dispatch
    # contract expects ({action, params}) or every POST 400s and telemetry
    # silently zeroes out.
    body = {"action": "persist", "params": run}
    raw = json.dumps(body, separators=(",", ":"), ensure_ascii=False, default=str)
    sig, ts = sign_payload(tenant_id, raw)
    headers = {
        "Content-Type": "application/json",
        "x-agent-signature": sig,
        "x-agent-timestamp": ts,
        "x-tenant-id": tenant_id,
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, content=raw.encode("utf-8"), headers=headers)
        if resp.status_code >= 400:
            log.warning("store.runs.bad_status", status=resp.status_code)
    except Exception as err:
        log.warning("store.runs.error", error=str(err))
