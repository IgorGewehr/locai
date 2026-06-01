"""Public HTTP endpoints.

GET  /health                — liveness probe
POST /process               — main agent entrypoint (HMAC-authed)
"""

from __future__ import annotations

import json
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..auth import verify_inbound
from ..graph.graph import run_agent
from ..logging_config import get_logger
from ..schemas import ProcessRequest, ProcessResponse
from ..store.runs import persist_run
from ..tools.client import send_final_message

router = APIRouter()
log = get_logger("api")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "locai-agent"}


# ─── Operator console (/operate) ─────────────────────────────────────────────

class OperateBody(BaseModel):
    tenant_id: str
    message: str
    mode: str = "analista"


@router.post("/operate")
async def operate(request: Request, auth: tuple[str, str] = Depends(verify_inbound)):
    """Operator/analyst console — reuses run_agent with use_case='operator'."""
    tenant_id, raw_body = auth

    try:
        body = OperateBody.model_validate(json.loads(raw_body))
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid body") from e

    use_case = "analyst" if body.mode == "analista" else "operator"
    run_id = str(uuid.uuid4())

    req = ProcessRequest(
        message_id=run_id,
        conversation_id=f"console:{run_id}",
        message=body.message,
        contact_name="Operador",
        recipient_id="dashboard",
        channel="dashboard",
        use_case=use_case,
    )

    log.info("operate.start", run_id=run_id, tenant_id=tenant_id, mode=body.mode)

    try:
        result = await run_agent(run_id=run_id, tenant_id=tenant_id, req=req)
        return {"reply": result.final_response or "Não consegui produzir uma resposta."}
    except Exception as e:
        log.error("operate.error", run_id=run_id, error=str(e))
        return {"reply": "Ocorreu um erro ao processar. Tente novamente."}


@router.post("/process", response_model=ProcessResponse)
async def process(request: Request, auth: tuple[str, str] = Depends(verify_inbound)) -> ProcessResponse:
    tenant_id, raw_body = auth

    try:
        req = ProcessRequest.model_validate(json.loads(raw_body))
    except Exception as e:
        log.error("process.bad_body", error=str(e))
        raise HTTPException(status_code=400, detail="Invalid body") from e

    run_id = str(uuid.uuid4())
    start = time.time()
    log.info(
        "process.start",
        run_id=run_id,
        tenant_id=tenant_id,
        conversation_id=req.conversation_id,
        channel=req.channel,
        message_preview=req.message[:80],
    )

    try:
        result = await run_agent(run_id=run_id, tenant_id=tenant_id, req=req)

        # Best-effort persist
        try:
            await persist_run(tenant_id, result.to_log())
        except Exception as err:
            log.warning("process.persist_failed", run_id=run_id, error=str(err))

        # Dispatch final message (if any) — direct_send tools may have already done it
        if result.final_response:
            try:
                await send_final_message(
                    tenant_id=tenant_id,
                    conversation_id=req.conversation_id,
                    channel=req.channel,
                    recipient_id=req.recipient_id,
                    content=result.final_response,
                )
            except Exception as err:
                log.error("process.send_failed", run_id=run_id, error=str(err))

        latency = int((time.time() - start) * 1000)
        log.info(
            "process.done",
            run_id=run_id,
            iterations=result.iterations,
            intent=result.intent,
            latency_ms=latency,
        )
        return ProcessResponse(
            run_id=run_id,
            final_response=result.final_response,
            intent=result.intent,
            iterations=result.iterations,
            status="success" if not result.error else "error",
            error=result.error,
        )
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        log.error("process.fatal", run_id=run_id, error=str(e), latency_ms=latency)
        return ProcessResponse(
            run_id=run_id,
            final_response=None,
            intent=None,
            iterations=0,
            status="error",
            error=str(e),
        )
