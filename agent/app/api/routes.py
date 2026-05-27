"""FastAPI routes: /process and /health."""

from __future__ import annotations

import json
from typing import Any

import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..auth import verify_request
from ..graph.graph import run_agent, run_operator

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
    total_tokens_in: int = 0
    total_tokens_out: int = 0
    tool_calls: list[dict[str, Any]] = []
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
        tenant_id=tenant_id,  # Use authenticated tenant_id, not request body
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
        total_tokens_in=result.total_tokens_in,
        total_tokens_out=result.total_tokens_out,
        tool_calls=result.tool_calls,
        error=result.error,
    )


class OperateRequest(BaseModel):
    tenant_id: str
    message: str
    mode: str = "analista"  # "operador" | "analista"


class OperateResponse(BaseModel):
    reply: str


@router.post("/operate", response_model=OperateResponse)
async def operate(request: Request) -> OperateResponse:
    """Operator console: the dashboard sends an operator message; Sofia reads
    across the whole system (and, in operador mode, may act) and replies in
    plain text.
    """
    tenant_id, raw_body = await verify_request(request)

    if not tenant_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="tenant_id is required")

    req = OperateRequest.model_validate(json.loads(raw_body))

    mode = req.mode if req.mode in ("operador", "analista") else "analista"

    log.info(
        "agent.operate",
        tenant_id=tenant_id[:8] + "***",
        mode=mode,
    )

    reply = await run_operator(
        tenant_id=tenant_id,  # Use authenticated tenant_id, not request body
        message=req.message,
        mode=mode,
    )

    return OperateResponse(reply=reply)


@router.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "service": "locai-agent"}
