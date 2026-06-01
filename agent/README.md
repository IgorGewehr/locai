# Locai Agent

LangGraph-powered concierge for Locai (real-estate). Replaces the legacy
Sofia/N8N stack.

## What this agent does

- Sends property info, descriptions and **photos** over WhatsApp / Messenger / IG.
- **Live-checks availability** by fetching the property's Airbnb iCal feed
  on demand (read-only — nothing is stored in Locai).
- Schedules appointments in Locai's agenda **only** for: `visit`, `key_pickup`,
  `support`. **Never property reservations** — those happen on Airbnb.
- When a customer wants to book, calls `share_airbnb_link` to deliver the
  property's Airbnb URL so they close the deal there.

## What this agent does NOT do

- Does not create / modify / cancel property reservations.
- Does not import or export iCal calendars (the system no longer manages
  availability — only the agent reads Airbnb on demand for "is it free?"
  questions).
- Does not handle payments, financing, or anything off-script — escalates
  via `notify_human`.

## Architecture

```
┌─────────────────┐    HMAC     ┌──────────────────┐
│  Next.js (web)  │────────────►│  Python agent    │
│  - webhooks     │◄────────────│  - FastAPI       │
│  - REST tools   │             │  - LangGraph     │
│  - UI           │             │  - OpenAI        │
└─────────────────┘             └──────────────────┘
```

HMAC-SHA256 in both directions using `AGENT_SHARED_SECRET`. The Python service
never touches Firestore directly — every read/write goes through Next.js REST
endpoints under `/api/agent/tools/*`, which enforce tenant isolation.

## Graph topology

```
    START
      ↓
   router        — GPT classifies intent
      ↓
   planner ←─┐   — GPT with bound tools; emits tool_calls or draft
      ↓      │
   executor ─┤
      ↓      │
   reflection─┘  — operator-mode only; fires after destructive writes
      ↓
   responder    — polishes for customer; SKIPPED when conversations_send_media
      ↓        or share_airbnb_link already delivered content
     END
```

## Key tools (tools/registry.py)

| Tool | Purpose |
|------|---------|
| `properties_list` / `_search` / `_get_details` / `_get_photos` | Read-only catalog |
| `ical_check_availability` | Live Airbnb iCal fetch — read-only, never stored |
| `appointments_check_slots` / `_create` / `_cancel` / ... | Visit / key pickup / support scheduling |
| `clients_lookup_by_phone` / `_create` / ... | Minimal CRM surface |
| `conversations_send_media` | Send photos / videos to the contact |
| `share_airbnb_link` | Hand off the booking to Airbnb (the ONLY way to close) |
| `notify_human` | Escalate to human agent |

The `appointments_create` guardrail rejects any `appointmentType` other than
`visit`, `key_pickup`, `support` — even if the LLM tries.

## Running locally

```bash
cd locai/agent
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env  # then fill in real values
python main.py        # listens on :8090
```

## Testing

```bash
pytest
```

## Adding a tool

1. Implement the action in `locai/app/api/agent/tools/<domain>/route.ts`.
2. Add the JSON schema in `app/tools/registry.py`.
3. Add the route mapping in `app/tools/client.py` (`TOOL_ENDPOINTS`).

That's it — the planner sees the new tool automatically.

## Observability

- Structured JSON logs (stdout) keyed by `run_id`.
- Optional LangSmith tracing (`LANGCHAIN_API_KEY` in `.env`).
- Best-effort persistence to `agentRuns` Firestore via `/api/agent/runs`.
