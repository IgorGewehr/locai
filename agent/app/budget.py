"""Daily budget check — short-circuit runs when a tenant hits its cap."""

from __future__ import annotations

import json

import httpx

from .auth import sign_payload
from .config import get_settings
from .logging_config import get_logger

log = get_logger("budget")


async def check_budget(tenant_id: str) -> tuple[bool, float, float]:
    """Returns (allowed, usdToday, cap). Fails-open (allows) on error."""
    settings = get_settings()
    base = settings.next_public_api_base_url.rstrip("/")
    url = f"{base}/api/agent/budget"

    body = {"action": "check"}
    raw = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    sig, ts = sign_payload(tenant_id, raw)

    headers = {
        "Content-Type": "application/json",
        "x-agent-signature": sig,
        "x-agent-timestamp": ts,
        "x-tenant-id": tenant_id,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, content=raw.encode("utf-8"), headers=headers)
        if resp.status_code != 200:
            log.warning("budget.check_failed", status=resp.status_code)
            return True, 0.0, 0.0
        data = resp.json()
        if not data.get("ok"):
            return True, 0.0, 0.0
        d = data["data"]
        return bool(d.get("allowed", True)), float(d.get("usdToday", 0.0)), float(d.get("cap", 0.0))
    except Exception as err:  # noqa: BLE001
        log.warning("budget.check_error", error=str(err))
        return True, 0.0, 0.0


async def record_budget(tenant_id: str, cost_usd: float, tokens: int) -> bool:
    """Report a finished run's consumption so the daily cap can fire.

    Best-effort: returns True on success, False (logged) on any failure so the
    caller never crashes a successful run just because telemetry of the spend
    didn't land.
    """
    settings = get_settings()
    base = settings.next_public_api_base_url.rstrip("/")
    url = f"{base}/api/agent/budget"

    body = {"action": "record", "params": {"cost_usd": cost_usd, "tokens": tokens}}
    raw = json.dumps(body, separators=(",", ":"), ensure_ascii=False)
    sig, ts = sign_payload(tenant_id, raw)

    headers = {
        "Content-Type": "application/json",
        "x-agent-signature": sig,
        "x-agent-timestamp": ts,
        "x-tenant-id": tenant_id,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, content=raw.encode("utf-8"), headers=headers)
        if resp.status_code != 200:
            log.warning("budget.record_failed", status=resp.status_code,
                        cost_usd=cost_usd, tokens=tokens)
            return False
        data = resp.json()
        if not data.get("ok"):
            log.warning("budget.record_rejected", cost_usd=cost_usd, tokens=tokens)
            return False
        return True
    except Exception as err:  # noqa: BLE001
        log.warning("budget.record_error", error=str(err),
                    cost_usd=cost_usd, tokens=tokens)
        return False
