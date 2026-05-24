"""FastAPI routes: /process and /health."""

from __future__ import annotations

import json
from typing import Any

import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..auth import verify_request
from ..graph.graph import run_agent

log = structlog.get_logger()
router = APIRouter()


class ProcessRequest(BaseModel):
    tenant_id: str
    conversation_id: str
    message_id: str
    message: str
    history: list[dict[str, str]] = []
    contact: dict[str, str] = {}


class ProcessResponse(BaseModel):
    run_id: str
    status: str
    final_response: str | None
    media_urls: list[str] = []
    intent: str | None
    iterations: int
    total_latency_ms: int
    error: str | None


@router.post("/process", response_model=ProcessResponse)
async def process(request: Request) -> ProcessResponse:
    tenant_id, raw_body = await verify_request(request)

    if not tenant_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="tenant_id is required")

    req = ProcessRequest.model_validate(json.loads(raw_body))

    log.info("agent.process", tenant_id=tenant_id[:8] + "***", conversation_id=req.conversation_id)

    result = await run_agent(
        tenant_id=req.tenant_id,
        conversation_id=req.conversation_id,
        message_id=req.message_id,
        message=req.message,
        history=req.history,
        contact=req.contact,
    )

    return ProcessResponse(
        run_id=result.run_id,
        status=result.status,
        final_response=result.final_response,
        media_urls=result.media_urls,
        intent=result.intent,
        iterations=result.iterations,
        total_latency_ms=result.total_latency_ms,
        error=result.error,
    )


@router.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "service": "locai-agent"}
