"""Tool schemas for OpenAI function-calling — Locai domain.

Domain rules baked into the registry:
  - The agent does NOT book apartments — there is no `properties_reserve` tool.
  - The agent does NOT manage availability internally. To check whether a
    property is free for given dates it calls `ical_check_availability`,
    which fetches the property's Airbnb iCal feed live (read-only, no writes).
  - When a customer wants to book, the agent calls `share_airbnb_link` to
    deliver the property's Airbnb URL — the customer closes the deal there.
  - Appointments scheduled in the system are restricted to: visit,
    key_pickup, support. Never `reservation`.
"""

from __future__ import annotations

from typing import Any, Literal

UseCase = Literal["imobiliario", "operator", "analyst"]


def _tool(name: str, description: str, /, required: list[str] | None = None, **props: Any) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": props,
                **({"required": required} if required else {}),
            },
        },
    }


# ─── Properties (read-only) ─────────────────────────────────────────────────

PROPERTIES_TOOLS: list[dict[str, Any]] = [
    _tool(
        "properties_list",
        (
            "List active properties offered by the agency. Use to answer 'what do "
            "you have?' or to filter by neighborhood, bedrooms, max guests, price range. "
            "Returns lightweight summaries (id, title, neighborhood, bedrooms, bathrooms, "
            "maxGuests, basePrice, photo[0]). For full info use properties_get_details."
        ),
        neighborhood={"type": "string"},
        city={"type": "string"},
        minBedrooms={"type": "integer", "minimum": 1},
        minBathrooms={"type": "integer", "minimum": 1},
        minGuests={"type": "integer", "minimum": 1},
        maxPricePerNight={"type": "number", "minimum": 0},
        category={
            "type": "string",
            "enum": ["apartment", "house", "studio", "villa", "condo"],
        },
        amenities={
            "type": "array",
            "items": {"type": "string"},
            "description": "Filter to properties that have ALL the listed amenities.",
        },
        limit={"type": "integer", "default": 10, "description": "1-30"},
    ),
    _tool(
        "properties_get_details",
        (
            "Fetch a single property's full record: title, description, address, all "
            "amenities, bedrooms/bathrooms, price, base photos and videos. Use BEFORE "
            "describing a property in detail to a customer. Returns airbnbUrl too — "
            "do NOT mention or share it from this output; use share_airbnb_link "
            "explicitly when the customer wants to book."
        ),
        required=["id"],
        id={"type": "string"},
    ),
    _tool(
        "properties_get_photos",
        (
            "Returns the ordered photo URLs of a property — pass them to "
            "conversations_send_media to dispatch as image messages on WhatsApp / FB / IG. "
            "Default returns the first 5 (good for an overview). Use limit=20 when the "
            "customer explicitly asks for 'more photos' or 'tudo'."
        ),
        required=["id"],
        id={"type": "string"},
        limit={"type": "integer", "default": 5, "description": "1-20"},
    ),
    _tool(
        "properties_search",
        (
            "Fuzzy text search across title/description/neighborhood. Use when the "
            "customer mentions a name or area imprecisely ('o apto na praia', 'aquele "
            "duplex de Itacolomi')."
        ),
        required=["query"],
        query={"type": "string"},
        limit={"type": "integer", "default": 10},
    ),
]


# ─── iCal availability (read-only, on-demand) ───────────────────────────────

ICAL_TOOLS: list[dict[str, Any]] = [
    _tool(
        "ical_check_availability",
        (
            "Live-checks whether a property is free between checkIn and checkOut by "
            "fetching the property's Airbnb iCal feed RIGHT NOW. The result is a snapshot — "
            "do not store it. The agent NEVER books based on this; it only answers the "
            "customer's question 'tem disponível em X?' so they can decide whether to "
            "open the Airbnb listing.\n\n"
            "Returns: {available: bool, conflicts: [{start, end, summary?}], source: 'airbnb'|'none'}.\n"
            "If the property has no airbnbUrl configured, returns {available: null, "
            "reason: 'no_calendar'} — pass that back to the customer as 'não consigo "
            "confirmar agora, posso te chamar de volta'."
        ),
        required=["propertyId", "checkIn", "checkOut"],
        propertyId={"type": "string"},
        checkIn={"type": "string", "description": "YYYY-MM-DD (inclusive)"},
        checkOut={"type": "string", "description": "YYYY-MM-DD (exclusive — Airbnb checkout day)"},
    ),
]


# ─── Appointments (visit / key pickup / support — NEVER reservations) ───────

APPOINTMENTS_TOOLS: list[dict[str, Any]] = [
    _tool(
        "appointments_check_slots",
        (
            "Return free slots for an appointment on a given date, considering the "
            "agency's working hours, blocked dates and existing visits. Always call "
            "before suggesting times. Resolve relative dates ('amanhã', 'sexta que vem') "
            "to YYYY-MM-DD first."
        ),
        required=["date"],
        date={"type": "string", "description": "YYYY-MM-DD"},
        appointmentType={
            "type": "string",
            "enum": ["visit", "key_pickup", "support"],
            "default": "visit",
        },
        durationMinutes={"type": "integer", "default": 60},
        agentId={"type": "string", "description": "Optional — restrict to a specific agent"},
    ),
    _tool(
        "appointments_get_next_available",
        (
            "Find the FIRST day in the next `daysAhead` days with at least one free slot. "
            "Use when the customer asks for the earliest possible time without a date."
        ),
        appointmentType={
            "type": "string",
            "enum": ["visit", "key_pickup", "support"],
            "default": "visit",
        },
        durationMinutes={"type": "integer", "default": 60},
        daysAhead={"type": "integer", "default": 7, "description": "1-30"},
        fromDate={"type": "string", "description": "YYYY-MM-DD (default today)"},
        agentId={"type": "string"},
    ),
    _tool(
        "appointments_create",
        (
            "Schedule an appointment. The ONLY allowed appointmentType values are: "
            "'visit' (cliente quer conhecer o apto presencialmente), 'key_pickup' "
            "(retirada de chave para um período já reservado no Airbnb), 'support' "
            "(reparo / vistoria / atendimento dentro do apto). The agent MUST NOT "
            "schedule property reservations — for booking, call share_airbnb_link.\n\n"
            "ALWAYS confirm slot + property + client name with the customer before calling."
        ),
        required=["clientName", "propertyId", "scheduledDate", "scheduledTime", "appointmentType"],
        appointmentType={
            "type": "string",
            "enum": ["visit", "key_pickup", "support"],
        },
        clientId={"type": "string"},
        clientName={"type": "string"},
        clientPhone={"type": "string"},
        propertyId={"type": "string"},
        scheduledDate={"type": "string", "description": "YYYY-MM-DD"},
        scheduledTime={"type": "string", "description": "HH:MM (24h)"},
        duration={"type": "integer", "default": 60, "description": "minutes, 15-240"},
        notes={"type": "string", "description": "context: special requests, what to inspect, etc."},
        agentId={"type": "string", "description": "Specific agent to accompany — optional"},
    ),
    _tool(
        "appointments_list_by_client",
        "List a client's existing appointments (by id or phone).",
        clientId={"type": "string"},
        phone={"type": "string"},
        limit={"type": "integer", "default": 5},
    ),
    _tool(
        "appointments_list_today",
        "Operator: list today's appointments sorted by time.",
        agentId={"type": "string"},
    ),
    _tool(
        "appointments_list_upcoming",
        "Operator: upcoming appointments (today onwards, exclude cancelled).",
        limit={"type": "integer", "default": 20},
        daysAhead={"type": "integer", "default": 7},
        agentId={"type": "string"},
        appointmentType={
            "type": "string",
            "enum": ["visit", "key_pickup", "support"],
        },
    ),
    _tool(
        "appointments_update",
        "Edit an appointment — change date, time, status or notes.",
        required=["id", "patch"],
        id={"type": "string"},
        patch={
            "type": "object",
            "properties": {
                "scheduledDate": {"type": "string"},
                "scheduledTime": {"type": "string"},
                "duration": {"type": "integer"},
                "status": {
                    "type": "string",
                    "enum": [
                        "scheduled", "confirmed", "in_progress", "completed",
                        "cancelled_by_client", "cancelled_by_agent",
                        "no_show", "rescheduled",
                    ],
                },
                "notes": {"type": "string"},
            },
        },
    ),
    _tool(
        "appointments_cancel",
        "Cancel an appointment. Provide a short reason.",
        required=["id"],
        id={"type": "string"},
        reason={"type": "string"},
        cancelledBy={"type": "string", "enum": ["client", "agent"], "default": "client"},
    ),
]


# ─── Clients (lookup + create — minimal CRM surface) ────────────────────────

CLIENTS_TOOLS: list[dict[str, Any]] = [
    _tool(
        "clients_lookup_by_phone",
        "Find a client by phone or WhatsApp. Returns null when none exists.",
        required=["phone"],
        phone={"type": "string"},
    ),
    _tool(
        "clients_create",
        (
            "Create a new client record. Called when lookup returns null. Pass channel "
            "+ externalId so future inbound messages from the same contact auto-link."
        ),
        required=["name"],
        name={"type": "string"},
        phone={"type": "string"},
        whatsapp={"type": "string"},
        email={"type": "string"},
        source={
            "type": "string",
            "enum": ["whatsapp", "instagram", "facebook", "site", "indicacao",
                     "google_ads", "evento", "telefone", "outro"],
        },
        channel={"type": "string", "enum": ["whatsapp", "facebook", "instagram", "web"]},
        externalId={"type": "string"},
        notes={"type": "string"},
    ),
    _tool(
        "clients_update",
        "Patch a client (name, email, tags, lifecycleStage, notes).",
        required=["id", "patch"],
        id={"type": "string"},
        patch={"type": "object"},
    ),
    _tool(
        "clients_get_full_history",
        "Fetch a client's profile + recent appointments + notes in one call.",
        required=["id"],
        id={"type": "string"},
    ),
]


# ─── Conversations (send messages + media + escalate) ───────────────────────

CONVERSATIONS_TOOLS: list[dict[str, Any]] = [
    _tool(
        "conversations_send_media",
        (
            "Dispatch one or more image/video URLs to the current conversation as a media "
            "carousel. Use after properties_get_photos to actually send the photos. "
            "On WhatsApp this becomes a sequence of image bubbles with optional captions."
        ),
        required=["mediaUrls"],
        mediaUrls={
            "type": "array",
            "items": {"type": "string"},
            "description": "1-10 absolute URLs (https). Order is preserved.",
        },
        caption={"type": "string", "description": "Optional caption shown on the FIRST media."},
        mediaType={"type": "string", "enum": ["image", "video"], "default": "image"},
    ),
    _tool(
        "share_airbnb_link",
        (
            "When the customer wants to BOOK / RESERVE a property, the agent does NOT "
            "create a reservation. Instead it calls this to send the property's Airbnb "
            "URL so the customer closes the deal on Airbnb directly. Always include a "
            "short personalized message — e.g. 'Pra fechar é direto pelo link abaixo, "
            "valores e disponibilidade ficam todos atualizados lá'."
        ),
        required=["propertyId"],
        propertyId={"type": "string"},
        message={
            "type": "string",
            "description": "Optional 1-2 sentence intro to send before the link.",
        },
    ),
    _tool(
        "notify_human",
        (
            "Escalate the conversation to a human agent. Use when: customer is upset, "
            "asking something off-script the agent can't safely answer, asking for "
            "negotiation/discount the agent isn't authorized to give, or explicitly asks "
            "for a person. Notifies the agency operator and sets a flag on the conversation."
        ),
        required=["reason"],
        reason={"type": "string", "description": "1 line: why this needs a human."},
        priority={"type": "string", "enum": ["low", "medium", "high", "urgent"], "default": "medium"},
    ),
]


# ─── Memory (lightweight client memory — same shape as saas-erp/agent) ──────

MEMORY_TOOLS: list[dict[str, Any]] = [
    _tool(
        "memory_recall",
        "Recall persistent facts about a client (preferences, prior interest, etc).",
        required=["clientId"],
        clientId={"type": "string"},
    ),
    _tool(
        "memory_remember",
        (
            "Store a NEW persistent fact about a client (e.g. 'gosta de aptos com varanda', "
            "'já fechou em fev/2026', 'sempre vem em casal'). Skip ephemeral things."
        ),
        required=["clientId", "text"],
        clientId={"type": "string"},
        text={"type": "string", "description": "1-sentence pt-BR fact"},
        confidence={"type": "number"},
        tags={"type": "array", "items": {"type": "string"}},
    ),
]


# ─── CRM (operator-only — list/move deals through pipeline) ────────────────

CRM_TOOLS: list[dict[str, Any]] = [
    _tool(
        "crm_list_leads",
        "List CRM leads with filters.",
        stage={
            "type": "string",
            "enum": ["new", "contacted", "qualified", "presentation", "proposal",
                     "negotiation", "closing", "handed_off", "lost"],
        },
        assignedTo={"type": "string"},
        limit={"type": "integer", "default": 50},
    ),
    _tool(
        "crm_search_leads",
        "Fuzzy search leads by name/phone/email.",
        required=["query"],
        query={"type": "string"},
        limit={"type": "integer", "default": 10},
    ),
    _tool(
        "crm_update_lead_stage",
        (
            "Move a lead to a new pipeline stage. The terminal 'won' stage in this "
            "system is 'handed_off' — call when the agent has shared the Airbnb link "
            "and the customer confirmed intent to close there."
        ),
        required=["id", "stage"],
        id={"type": "string"},
        stage={
            "type": "string",
            "enum": ["new", "contacted", "qualified", "presentation", "proposal",
                     "negotiation", "closing", "handed_off", "lost"],
        },
        notes={"type": "string"},
    ),
]


# ─── Knowledge / FAQ search ────────────────────────────────────────────────

KNOWLEDGE_TOOLS: list[dict[str, Any]] = [
    _tool(
        "knowledge_search",
        (
            "Semantic search over the agency's knowledge base: policies, FAQ, the "
            "tenant's company description. Use for open questions like 'qual a política "
            "se chover?', 'aceita pet?', 'me fala da imobiliária'."
        ),
        required=["query"],
        query={"type": "string"},
        k={"type": "integer", "default": 5},
    ),
]


# ─── Use-case dispatch ─────────────────────────────────────────────────────


def tools_for_use_case(use_case: UseCase) -> list[dict[str, Any]]:
    """Return the subset of tools the LLM should see, given the chat mode.

    Customer-facing (`imobiliario`) is intentionally lean — fewer tools means
    sharper decisions and lower token cost per planner turn.
    """
    base_customer = (
        PROPERTIES_TOOLS
        + ICAL_TOOLS
        + APPOINTMENTS_TOOLS  # all 7 — needed for visit/keypickup/support flow
        + CLIENTS_TOOLS
        + CONVERSATIONS_TOOLS
        + MEMORY_TOOLS
        + KNOWLEDGE_TOOLS
    )
    if use_case == "imobiliario":
        return base_customer

    if use_case == "operator":
        return base_customer + CRM_TOOLS

    if use_case == "analyst":
        # Read-only subset
        read_only_substrings = (
            "_list", "_get", "_search", "_check", "_recall", "_summary",
            "_next_available", "_full_history",
        )
        full = base_customer + CRM_TOOLS
        return [
            t for t in full
            if any(sub in t["function"]["name"] for sub in read_only_substrings)
        ]
    return base_customer


# ─── Backwards-compatible single index ──────────────────────────────────────

ALL_TOOLS: list[dict[str, Any]] = (
    PROPERTIES_TOOLS + ICAL_TOOLS + APPOINTMENTS_TOOLS + CLIENTS_TOOLS
    + CONVERSATIONS_TOOLS + MEMORY_TOOLS + CRM_TOOLS + KNOWLEDGE_TOOLS
)
TOOL_SCHEMAS: dict[str, dict[str, Any]] = {
    t["function"]["name"]: t for t in ALL_TOOLS
}


def get_tool(name: str) -> dict[str, Any] | None:
    return TOOL_SCHEMAS.get(name)
