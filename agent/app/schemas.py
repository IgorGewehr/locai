"""Request/response contracts shared between Next.js and the agent."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ProcessRequest(BaseModel):
    """Sent by Next.js webhook handler when a new inbound message arrives.

    Differs from saas-erp/agent's schema in domain shape: tenant instead of
    business, no order/menu fields, but adds tenant agency context (company
    name, address, working hours, agent profile) and a property hint.
    """

    message_id: str
    conversation_id: str
    message: str
    contact_name: str
    contact_phone: str | None = None
    channel: Literal["whatsapp", "facebook", "instagram", "web", "dashboard"] = "whatsapp"
    recipient_id: str  # phone or social user-id for outbound send

    # Prior turns (most recent last)
    history: list[dict[str, Any]] = Field(default_factory=list)

    # ─── Use case (decides which prompt + tool subset is mounted) ───────────
    # imobiliario  — customer-facing concierge for property info / visits.
    # operator     — internal dashboard chat (agency staff). Full CRUD on
    #                appointments, properties (read), CRM, etc.
    # analyst      — read-only dashboard chat for reports.
    use_case: Literal["imobiliario", "operator", "analyst"] = "imobiliario"

    # ─── Tenant / agency context (passed by webhook so we don't re-fetch) ──
    tenant_name: str | None = None
    tenant_description: str | None = None
    tenant_phone: str | None = None
    tenant_email: str | None = None
    tone: Literal["formal", "casual", "friendly"] = "friendly"
    current_date: str | None = None  # YYYY-MM-DD, injected by dispatcher

    # Office address — used when client asks "onde fica a imobiliária"
    tenant_address: dict[str, Any] | None = None

    # Working hours (7-day list, 0=Mon..6=Sun) — for visit slot reasoning
    working_hours: list[dict[str, Any]] | None = None

    # Visit-scheduling settings (slot duration, buffer, max per day)
    visit_settings: dict[str, Any] | None = None

    # Pre-loaded property catalog snapshot (id, title, neighborhood, price,
    # bedrooms, bathrooms, maxGuests, photos[0], airbnbUrl, isActive). Lets
    # the agent answer "what do you have in X" without a tool round-trip.
    properties_summary: list[dict[str, Any]] | None = None

    # Memory of this client's prior interactions (1-line per past run).
    client_memory: str | None = None

    # Operator context (use_case='operator'/'analyst' only)
    operator_user_id: str | None = None
    operator_user_name: str | None = None
    operator_user_role: Literal["founder", "admin", "manager", "operator", "viewer"] | None = None
    operator_autonomous: bool = False

    # Optional: hand-off / human-fallback rules
    policies: dict[str, Any] | None = None  # {cancellation, refund, privacy, hours_offhours}


class ProcessResponse(BaseModel):
    run_id: str
    final_response: str | None
    intent: str | None
    iterations: int
    status: Literal["success", "error", "skipped"]
    error: str | None = None
