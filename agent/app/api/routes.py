"""FastAPI routes: /process and /health."""

from __future__ import annotations

import json
from typing import Any

import structlog
from fastapi import APIRouter, Request
from pydantic import BaseModel

from ..auth import verify_request
from ..graph.graph import run_agent, run_operator, run_resume

log = structlog.get_logger()
router = APIRouter()


class ProcessRequest(BaseModel):
    tenant_id: str
    conversation_id: str
    message_id: str
    message: str
    history: list[dict[str, str]] = []
    contact: dict[str, str] = {}
    # AI-CONFIG → AGENTE: overrides do ai-config do tenant (assistantName, tone,
    # welcomeMessage, specialInstructions). Injetados no system prompt SEM quebrar
    # as regras-mãe (Sofia não fecha/negocia/cobra). Sem desconto.
    ai_config: dict[str, Any] | None = None


class ProcessResponse(BaseModel):
    run_id: str
    status: str
    final_response: str | None
    media_urls: list[str] = []
    intent: str | None
    iterations: int
    total_latency_ms: int
    error: str | None
    deferred: bool = False  # turno encerrou via defer_and_work (não enviar nada)


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
        ai_config=req.ai_config,
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
        deferred=result.deferred,
    )


class ResumeRequest(BaseModel):
    tenant_id: str
    conversation_id: str
    task_id: str
    task_type: str
    result: dict[str, Any] = {}
    resume_hint: str | None = None
    history: list[dict[str, str]] = []


class ResumeResponse(BaseModel):
    run_id: str
    status: str
    final_response: str | None
    media_urls: list[str] = []
    next_state: str | None
    error: str | None


@router.post("/resume", response_model=ResumeResponse)
async def resume(request: Request) -> ResumeResponse:
    """Re-engajamento proativo: chamado pelo worker (Functions) quando uma task
    diferida conclui. Mesma auth HMAC do /process. Ver docs/blueprint/01 §5."""
    tenant_id, raw_body = await verify_request(request)

    if not tenant_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="tenant_id is required")

    req = ResumeRequest.model_validate(json.loads(raw_body))

    log.info(
        "agent.resume",
        tenant_id=tenant_id[:8] + "***",
        conversation_id=req.conversation_id,
        task_type=req.task_type,
    )

    result = await run_resume(
        tenant_id=req.tenant_id,
        conversation_id=req.conversation_id,
        task_id=req.task_id,
        task_type=req.task_type,
        task_result=req.result,
        resume_hint=req.resume_hint,
        history=req.history,
    )

    return ResumeResponse(
        run_id=result.run_id,
        status=result.status,
        final_response=result.final_response,
        media_urls=result.media_urls,
        next_state=result.next_state,
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
        tenant_id=req.tenant_id,
        message=req.message,
        mode=mode,
    )

    return OperateResponse(reply=reply)


@router.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "service": "locai-agent"}
