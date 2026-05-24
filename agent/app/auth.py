"""HMAC request authentication — shared secret with locai Next.js."""

from __future__ import annotations

import hashlib
import hmac
import json
import time

from fastapi import HTTPException, Request

from .config import get_settings


def _sign(secret: str, timestamp: str, body: bytes) -> str:
    """Sign `timestamp.body` with HMAC-SHA256.

    Including the timestamp in the signed payload prevents replay attacks:
    a captured (sig, body) pair is only valid with its original timestamp,
    which expires after 60 s.
    """
    payload = timestamp.encode() + b"." + body
    return hmac.new(secret.encode(), payload, digestmod=hashlib.sha256).hexdigest()


async def verify_request(request: Request) -> tuple[str, bytes]:
    """Verify HMAC signature or API-key bearer token.

    Returns (tenant_id, raw_body) on success, raises HTTPException on failure.
    """
    s = get_settings()
    raw_body = await request.body()

    # --- API key bearer (simple path for dev/testing) ---
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        # Timing-safe comparison — prevents timing attacks on the secret
        if hmac.compare_digest(token, s.agent_shared_secret):
            body_json = json.loads(raw_body) if raw_body else {}
            tenant_id = body_json.get("tenant_id", "")
            return tenant_id, raw_body

    # --- HMAC signature ---
    sig_header = request.headers.get("X-Agent-Signature", "")
    ts_header = request.headers.get("X-Agent-Timestamp", "")

    if not sig_header or not ts_header:
        raise HTTPException(status_code=401, detail="Missing auth headers")

    # Reject stale requests (>60 s)
    try:
        ts = int(ts_header)
        if abs(time.time() * 1000 - ts) > 60_000:
            raise HTTPException(status_code=401, detail="Request timestamp expired")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid timestamp")

    expected = _sign(s.agent_shared_secret, ts_header, raw_body)
    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(status_code=401, detail="Invalid signature")

    body_json = json.loads(raw_body) if raw_body else {}
    tenant_id = body_json.get("tenant_id", "")
    return tenant_id, raw_body
