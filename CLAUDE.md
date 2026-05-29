# CLAUDE.md

**Development guide for Claude Code when working with this repository.**

## Quick Start

```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 8080)
npm run build              # Production build
npm run type-check         # TypeScript validation
```

> The AI agent runs as a **separate service** (`locai/agent/`, Python + LangGraph).
> See `agent/README.md` to run it. This Next.js app and the agent talk over HTTP
> with a shared HMAC secret (`AGENT_SHARED_SECRET`).

**Access Points (local dev):**
- Dashboard: `http://localhost:8080/dashboard`
- CRM: `http://localhost:8080/dashboard/crm`
- Conversas: `http://localhost:8080/dashboard/conversas`
- Admin: `http://localhost:8080/dashboard/lkjhg` (ultra-secure)

> Production runs in Docker behind a Cloudflare Tunnel (`alugazap.tensorroot.com`);
> the container listens on `7070`, published on host port `8084`.

---

## Project Overview

**Locai** - Enterprise-grade real estate AI system with Sofia AI Agent integration.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5.2 + TypeScript 5.3 |
| **UI** | Material-UI v5.15 + Emotion |
| **Database** | Firebase Firestore v10.7 |
| **Auth** | Firebase Auth + Multi-tenant JWT |
| **AI Agent** | Sofia — Python + LangGraph + FastAPI service (`locai/agent/`), OpenAI/Anthropic, default `gpt-4o-mini` |
| **Messaging** | Baileys WhatsApp microservice (`whatsapp_microservice/`) + Facebook/Instagram (in development) |
| **Validation** | Zod schemas + input sanitization |
| **Calendar Sync** | iCal bidirectional (Airbnb/Booking) |

> **Note on AI:** the AI brain is the **LangGraph agent** in `locai/agent/`. It
> **replaced the former N8N + Sofia workflow engine.** The legacy
> `/api/ai/functions/*` endpoints (the "60 functions") still exist for
> compatibility but are **no longer the path the agent uses** — the agent calls a
> small set of tool endpoints under `/api/agent/tools/*` (see "AI Agent
> Architecture" below).

### Core Features

- **Sofia AI**: LangGraph agent (router → planner ⇄ executor) with a focused tool set
- **Multi-tenant**: Complete isolation (`tenants/{tenantId}/collections`)
- **CRM**: Pipeline automation, lead scoring, advanced analytics
- **WhatsApp**: Dedicated Baileys microservice
- **Facebook/Instagram**: Direct Messages integration (in development)
- **iCal Sync**: Bidirectional sync with Airbnb/Booking (import/export)
- **Revolutionary Onboarding**: Guided 2-step property + WhatsApp setup
- **Security**: Zod validation + sanitization + rate limiting + HMAC agent auth

---

## Architecture Overview

### Multi-Tenant Firestore Structure

```typescript
// Complete tenant isolation
tenants/
  {tenantId}/
    properties/           // Real estate listings
    clients/             // Customer information
    reservations/        // Booking management
    transactions/        // Financial records
    leads/               // CRM pipeline
    conversations/       // Chat history (WhatsApp/Facebook/Instagram)
    messages/            // Individual messages
    amenities/           // Property features
    goals/               // Business goals
    calendar_sync_configurations/  // iCal sync settings
    settings/            // Tenant configuration
      company/           // Company info
      negotiation/       // Discount settings
      policies/          // Business policies
      ai-config/         // Sofia AI settings

users/
  {userId}/
    onboarding/          // Revolutionary onboarding progress
      {tenantId}/        // Per-tenant onboarding state
```

### TenantServiceFactory Pattern

**Always use tenant-scoped services:**

```typescript
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

// Correct pattern - tenant isolation guaranteed
const services = new TenantServiceFactory(tenantId);

// Access services
const properties = await services.properties.getAll();
const clients = await services.clients.getAll();
const reservations = await services.reservations.getAll();
const transactions = await services.transactions.getAll();
const leads = await services.leads.getAll();

// Specialized services
const availability = await services.availability.check(propertyId, dates);
const accounts = await services.accounts.getBalance();
```

### MultiTenantFirestoreService Features

```typescript
class MultiTenantFirestoreService<T> {
  // CRUD Operations
  async create(data): Promise<string>
  async get(id): Promise<T | null>
  async getAll(limit = 1000): Promise<T[]>
  async update(id, data): Promise<void>
  async delete(id): Promise<void>

  // Advanced Queries
  async getWhere(field, operator, value): Promise<T[]>
  async getMany(filters, options): Promise<T[]>
  async getManyOptimized(filters, options): Promise<T[]>  // Query optimizer
  async count(filters): Promise<number>

  // Real-time Subscriptions
  onSnapshot(callback): () => void
  subscribeToDocument(id, callback): () => void

  // Batch Operations
  async batchCreate(items): Promise<void>
}
```

---

## AI Agent Architecture (LangGraph) — CURRENT

The active AI brain is **"Sofia"**, a standalone Python service in `locai/agent/`
(FastAPI + LangGraph). It replaced the old N8N workflow engine. This Next.js app
**orchestrates** it: it receives WhatsApp messages, dispatches them to the agent,
then sends the agent's reply back through the WhatsApp microservice.

### Round-trip message flow

```
Client (WhatsApp)
   │
   ▼
whatsapp_microservice (Baileys)  ── webhook ──▶  POST /api/webhook/whatsapp-microservice
   │                                                  │ (auth: Bearer API key OR HMAC)
   │                                                  ├─ persist incoming msg (Firestore + Redis)
   │                                                  └─ dispatchToAgent()  [fire-and-forget]
   │                                                          │ HMAC sign "{ts}.{body}"
   │                                                          ▼
   │                                              agent  POST /process
   │                                                  │ run_agent(): router → planner ⇄ executor
   │                                                  │ executor calls tools back into THIS app:
   │                                                  ▼
   │                                              POST /api/agent/tools/{search-properties,…}
   │                                                  │ (auth: validateAgentRequest — HMAC)
   │                                              ◀─ { final_response, media_urls, intent }
   │                                                  │
   │   ◀── POST /api/v1/messages/{tenantId}/send ─────┤ persist Sofia reply to Firestore,
   ▼                                                  └─ send text + up to 5 media
Client receives reply
```

Key files: `app/api/webhook/whatsapp-microservice/route.ts` (orchestration),
`lib/middleware/agent-auth.ts` (`validateAgentRequest`), `app/api/agent/tools/*`,
`app/api/agent/console/route.ts` (operator console).

### Agent tools (9) → locai endpoints

The LLM planner is bound to these tools (snake_case names map to kebab-case
routes under `/api/agent/tools/`). Defined in `agent/app/tools/registry.py`,
routed in `agent/app/tools/client.py`:

| Tool (LLM) | locai endpoint | Purpose |
|---|---|---|
| `search_available_properties` | `search-properties` | Search listings by dates/criteria (read) |
| `get_property_media` | `property-media` | Photos/videos of a property (read) |
| `get_property_map` | `property-map` | Google Maps image (read) |
| `get_airbnb_link` | `airbnb-link` | Airbnb booking link (read) |
| `read_system` | `read` | Read-only query: leads, conversations, properties, reservations, etc. |
| `notify_owner` | `notify-owner` | Escalate to human / owner |
| `schedule_visit` | `schedule-visit` | Book an in-person visit |
| `create_client` | `create-client` | Register/update a contact |
| `report_issue` | `report-issue` | Open a support/maintenance ticket |

The first 5 are read-only (`READ_ONLY_TOOL_NAMES`); the rest mutate state.

### Operator console

`POST /api/agent/console` (locai) → agent `POST /operate`. Two modes:
- **`analista`** — read-only; the LLM is bound *only* to read tools, so it
  physically cannot mutate.
- **`operador`** — may use write tools.

### Agent ⇄ locai auth (HMAC)

Both directions share `AGENT_SHARED_SECRET` and sign the payload as
`HMAC-SHA256("{timestamp}.{body}")`, with a 60-second replay window. A
`Bearer <secret>` header is also accepted as a simpler dev path. Implemented in
`lib/middleware/agent-auth.ts` (locai) and `agent/app/auth.py` (agent) — keep
the two signing schemes identical when changing either.

### Relevant env vars (locai side)

```bash
AGENT_SERVICE_URL=http://agent:8080        # agent base URL (tunnel URL in prod)
AGENT_SHARED_SECRET=<hex32+>               # MUST match agent's AGENT_SHARED_SECRET
WHATSAPP_MICROSERVICE_URL=http://whatsapp:3000
WHATSAPP_MICROSERVICE_API_KEY=<key>        # Bearer used to send replies back
WHATSAPP_WEBHOOK_SECRET=<hex32+>           # HMAC for inbound microservice webhooks
```

---

## Legacy AI Functions (`/api/ai/functions/*`) — N8N era

> **Status: legacy.** These ~60 endpoints date from the N8N + Sofia era. They
> still exist and some are still called by parts of the app, but the **LangGraph
> agent above does NOT use them** — it uses `/api/agent/tools/*`. Treat this
> section as a reference for the older surface; prefer the agent tools for new
> AI work, and check whether a function is still wired before relying on it.

### Function Pattern

All legacy AI functions follow this structure:

```typescript
// app/api/ai/functions/[function-name]/route.ts
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `${functionName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    // Professional logging
    logger.info(`[FUNCTION-NAME] Starting execution`, {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: args
    });

    // Tenant validation
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'TenantId is required', requestId },
        { status: 400 }
      );
    }

    // Execute function with tenant isolation
    const result = await functionImplementation(args, tenantId);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: { requestId, processingTime, timestamp: new Date().toISOString() }
    });

  } catch (error) {
    return handleApiError(error, requestId);
  }
}
```

### AI Functions Categories (60 Total)

| Category | Count | Key Functions |
|----------|-------|---------------|
| **CRM/Leads** | 11 | `create-lead`, `lead-pipeline-movement`, `classify-lead`, `analyze-lead-performance` |
| **Reservations** | 7 | `create-reservation`, `modify-reservation`, `cancel-reservation`, `check-availability` |
| **Properties** | 4 | `search-properties`, `get-property-details`, `send-property-media`, `send-property-map` |
| **Financial** | 6 | `calculate-price`, `calculate-dynamic-discount`, `check-discount-opportunities`, `get-financial-summary` |
| **Payments** | 8 | `create-payment-link`, `generate-pix-qrcode`, `check-payment-status`, `send-payment-reminder` |
| **Analytics** | 7 | `track-conversion-step`, `track-conversation-metric`, `get-analytics-dashboard`, `get-business-insights` |
| **Policies/Config** | 5 | `get-tenant-config`, `get-negotiation-settings`, `get-policies`, `get-company-address` |
| **Communication** | 3 | `post-notification`, `send-tenant-map`, `post-conversation` |
| **Goals/Tasks** | 4 | `create-goal`, `update-goal-progress`, `create-task`, `update-task` |
| **Wallet** | 2 | `wallet-get-balance`, `wallet-add-credit` |
| **Clients** | 1 | `register-client` |
| **Agent** | 1 | `get-agent-prompts` |
| **Scheduling** | 1 | `schedule-meeting` |

### Complete AI Functions List

```typescript
// === CRM/LEADS (11 functions) ===
POST /api/ai/functions/create-lead              // Create/update lead with deduplication
POST /api/ai/functions/get-lead-details         // Get complete lead info
POST /api/ai/functions/get-leads-list           // List leads with filters
POST /api/ai/functions/update-lead              // Update lead info
POST /api/ai/functions/update-lead-status       // Change lead status
POST /api/ai/functions/classify-lead            // Classify hot/warm/cold
POST /api/ai/functions/add-lead-interaction     // Track interactions
POST /api/ai/functions/analyze-lead-performance // AI analysis with predictions
POST /api/ai/functions/lead-pipeline-movement   // Pipeline progression
POST /api/ai/functions/follow-up-lead           // Schedule follow-ups
POST /api/ai/functions/track-qualification-milestone // Track qualification

// === RESERVATIONS (7 functions) ===
POST /api/ai/functions/create-reservation       // Create booking
POST /api/ai/functions/modify-reservation       // Modify booking
POST /api/ai/functions/cancel-reservation       // Cancel with refund policy
POST /api/ai/functions/check-availability       // Check property availability
POST /api/ai/functions/check-agenda-availability // Check full calendar
POST /api/ai/functions/check-visit-availability // Check visit slots
POST /api/ai/functions/schedule-visit           // Schedule property visit

// === PROPERTIES (4 functions) ===
POST /api/ai/functions/search-properties        // Advanced search with filters
POST /api/ai/functions/search-properties-cached // Cached version
POST /api/ai/functions/search-properties-optimized // Optimized with aggregations
POST /api/ai/functions/get-property-details     // Get complete property info

// === FINANCIAL (6 functions) ===
POST /api/ai/functions/calculate-price          // Dynamic pricing with surcharges
POST /api/ai/functions/calculate-dynamic-discount // Multi-criteria discounts
POST /api/ai/functions/check-discount-opportunities // List all discount strategies
POST /api/ai/functions/get-dynamic-discount     // Get discount with payment options
POST /api/ai/functions/generate-quote           // Generate formal quote
POST /api/ai/functions/request-withdrawal       // Request PIX withdrawal

// === PAYMENTS (8 functions) ===
POST /api/ai/functions/create-payment-link      // Create billing link (AbacatePay)
POST /api/ai/functions/generate-pix-qrcode      // Generate PIX QR code
POST /api/ai/functions/create-transaction       // Create transaction
POST /api/ai/functions/check-payment-status     // Check payment status
POST /api/ai/functions/cancel-payment           // Cancel pending payment
POST /api/ai/functions/list-pending-payments    // List pending/overdue payments
POST /api/ai/functions/send-payment-reminder    // Send WhatsApp reminder
POST /api/ai/functions/get-financial-summary    // Financial summary report

// === ANALYTICS (7 functions) ===
POST /api/ai/functions/track-conversion-step    // Track conversion funnel
POST /api/ai/functions/track-conversation-metric // Track conversation metrics
POST /api/ai/functions/track-conversation-session // Track full session
POST /api/ai/functions/track-message-engagement // Track message engagement
POST /api/ai/functions/track-metrics            // Track general metrics
POST /api/ai/functions/analyze-performance      // Analyze sales performance
POST /api/ai/functions/get-analytics-dashboard  // Get dashboard data

// === POLICIES/CONFIG (5 functions) ===
POST /api/ai/functions/get-tenant-config        // Get all tenant settings
POST /api/ai/functions/get-negotiation-settings // Get negotiation settings
POST /api/ai/functions/get-policies             // Get business policies
POST /api/ai/functions/get-cancellation-policies // Get cancellation rules
POST /api/ai/functions/get-company-address      // Get company info

// === COMMUNICATION (3 functions) ===
POST /api/ai/functions/post-notification        // Notify admin for human support
POST /api/ai/functions/send-tenant-map          // Send agency location
POST /api/ai/functions/post-conversation        // Save conversation permanently

// === GOALS/TASKS (4 functions) ===
POST /api/ai/functions/create-goal              // Create business goal
POST /api/ai/functions/update-goal-progress     // Update goal progress
POST /api/ai/functions/create-task              // Create follow-up task
POST /api/ai/functions/update-task              // Update task status

// === WALLET (2 functions) ===
POST /api/ai/functions/wallet-get-balance       // Get wallet balance
POST /api/ai/functions/wallet-add-credit        // Add credit (commissions)

// === OTHER (3 functions) ===
POST /api/ai/functions/register-client          // Register new client
POST /api/ai/functions/schedule-meeting         // Schedule meeting/call
POST /api/ai/functions/get-agent-prompts        // Get dynamic agent prompts
```

---

## Core API Routes

### Main APIs

```typescript
// Reservations (CRUD + Relations)
GET/POST  /api/reservations
GET/PUT   /api/reservations/[id]
DELETE    /api/reservations/[id]?soft=true

// Transactions (Income/Expense)
GET/POST  /api/transactions

// Properties (CRUD + Import)
GET/POST  /api/properties
POST      /api/properties/import
POST      /api/properties/import/validate

// iCal Integration
GET  /api/ical/[tenantId]/[propertyId]         // Export iCal feed
POST /api/properties/[id]/ical/generate-token   // Generate export token
POST /api/calendar/sync/configure               // Configure iCal import
POST /api/calendar/sync/[propertyId]           // Manual sync trigger
POST /api/calendar/sync/cron                    // Automated sync (every 30min)

// WhatsApp Integration
POST /api/webhook/whatsapp-microservice         // Inbound from Baileys microservice → dispatches to agent
POST /api/webhook/client-message                // Real-time client messages (persist + Redis)
POST /api/whatsapp/send-manual                  // Operator manual send
POST /api/whatsapp/send-n8n                     // LEGACY (N8N era) — not used by the LangGraph agent
GET  /api/whatsapp/qr
GET  /api/whatsapp/session

// AI Agent (LangGraph) — see "AI Agent Architecture" above
POST /api/agent/tools/*                         // Tool endpoints called BY the agent
POST /api/agent/console                         // Operator console → agent /operate

// Facebook/Instagram Integration (In Development)
GET/POST /api/facebook/webhook                  // FB/IG webhook
POST     /api/facebook/auth                     // Connect/disconnect pages
GET      /api/facebook/status                   // Connection status
POST     /api/social/send                       // Send FB/IG messages

// AI Block Control
GET/POST /api/ai/block-conversation            // Block/unblock AI for manual mode

// Tenant Settings
GET/PUT  /api/tenant/settings/company
GET/PUT  /api/tenant/settings/negotiation
GET/PUT  /api/tenant/settings/policies
GET/PUT  /api/tenant/discount-settings
```

### Authentication Pattern

```typescript
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';

// All API routes use this pattern:
const authContext = await validateFirebaseAuth(request);
if (!authContext.authenticated || !authContext.tenantId) {
  return NextResponse.json(
    { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
    { status: 401 }
  );
}

// Use tenant-scoped services
const services = new TenantServiceFactory(authContext.tenantId);
```

---

## Revolutionary Onboarding System

### Overview

2-step guided onboarding for new users:

1. **Add First Property** - Import from Airbnb or create manually
2. **Connect WhatsApp** - Scan QR code to enable Sofia AI

### Components

```typescript
// Main component
/components/organisms/RevolutionaryOnboarding/RevolutionaryOnboarding.tsx

// Step components
/components/organisms/RevolutionaryOnboarding/steps/Step1PropertySetup/
/components/organisms/RevolutionaryOnboarding/steps/Step3WhatsAppSetup/

// Hooks
/lib/hooks/useOnboarding.ts                    // Base hook
/lib/hooks/useRevolutionaryOnboarding.ts       // Extended hook with dialogs
```

### Data Structure

```typescript
interface OnboardingProgress {
  userId: string;
  tenantId: string;
  steps: {
    add_property: 'pending' | 'in_progress' | 'completed' | 'skipped';
    connect_whatsapp: 'pending' | 'in_progress' | 'completed' | 'skipped';
  };
  currentStepId: string | null;
  completionPercentage: number;  // 0, 50, 100
  isCompleted: boolean;
  viewMode: 'compact' | 'expanded' | 'fullscreen';
}
```

---

## iCal Synchronization System

### Bidirectional Sync

**Export (Locai → Airbnb/Booking):**
```typescript
// Generate secure token
POST /api/properties/[id]/ical/generate-token
// Returns: /api/ical/{tenantId}/{propertyId}?token={token}

// External platforms fetch this URL to get blocked dates
GET /api/ical/{tenantId}/{propertyId}?token={token}
// Returns: RFC 5545 compliant .ics file
```

**Import (Airbnb/Booking → Locai):**
```typescript
// Configure import
POST /api/calendar/sync/configure
{
  propertyId: string,
  iCalUrl: string,        // URL from Airbnb/Booking
  source: 'AIRBNB' | 'BOOKING' | 'VRBO' | 'GOOGLE_CALENDAR',
  syncFrequency: 'hourly' | 'daily' | 'manual'
}

// Manual sync
POST /api/calendar/sync/{propertyId}

// Automated sync (cron job every 30 min)
POST /api/calendar/sync/cron
```

### Key Services

```typescript
// lib/services/ical-generator-service.ts   - Generate iCal feeds
// lib/services/ical-parser-service.ts      - Parse external iCal
// lib/services/calendar-sync-service.ts    - Orchestrate sync
// lib/services/airbnb-import-service.ts    - Airbnb integration
// lib/services/property-import-service.ts  - Bulk property import
```

---

## Conversations System (Multi-Channel)

### Supported Channels

1. **WhatsApp** - Via Baileys dedicated server
2. **Facebook Messenger** - Via Facebook Graph API (in development)
3. **Instagram Direct** - Via Facebook Graph API (in development)

### Architecture

```typescript
// Page: /app/dashboard/conversas/page.tsx

// Key features:
// - Real-time chat interface (split-screen)
// - AI control (block/unblock Sofia)
// - Multi-channel filtering
// - Infinite scroll
// - Context menu actions

// Hook: useConversationsOptimized
const {
  conversations,
  selectedConversation,
  messages,
  loadConversations,
  selectConversation,
  markAsRead,
  updateStatus,
  renameConversation
} = useConversationsOptimized({ tenantId });
```

### AI Control

```typescript
// Block AI for manual mode (1h, 2h, 4h, 24h)
POST /api/ai/block-conversation
{
  phone: string,
  blocked: true,
  duration: number,  // hours
  reason?: string
}

// Check block status
GET /api/ai/block-conversation?phone={phone}
```

---

## CRM System

### Pipeline Stages

```typescript
enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PRESENTATION = 'presentation',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSING = 'closing',
  WON = 'won',
  LOST = 'lost'
}
```

### Automatic Pipeline Movement

Sofia AI automatically progresses leads through stages:

- `new → contacted`: First AI response
- `contacted → qualified`: Needs identified (dates, budget, location)
- `qualified → presentation`: Property options shown
- `presentation → proposal`: Budget request or strong interest
- `proposal → negotiation`: Price discussion
- `negotiation → closing`: Budget confirmation
- `closing → won`: Reservation completed

### CRM Dashboard (5 Views)

```typescript
// /app/dashboard/crm/page.tsx

// 1. Pipeline - Kanban drag-and-drop
// 2. All Leads - Complete list with filters
// 3. AI Insights - AI-powered recommendations
// 4. Advanced Analytics - Conversion funnels, time series
// 5. Performance - Individual lead tracking

// Components:
/app/dashboard/crm/components/KanbanBoard.tsx
/app/dashboard/crm/components/AdvancedAnalytics.tsx
/app/dashboard/crm/components/LeadPerformanceTracker.tsx
/app/dashboard/crm/components/AIInsights.tsx
/app/dashboard/crm/components/CRMStats.tsx
```

### Lead Scoring

Dynamic scoring based on 20+ factors:
- Base score (initial quality)
- Temperature bonus: hot (+15), warm (+5), cold (-10)
- Interaction frequency multiplier
- Qualification bonus (budget/timeline/need/authority)
- Time decay for stale leads
- AI-enhanced adjustments

---

## Security & Validation

### Standard Security Layers

1. **Zod Validation** - All API routes use Zod schemas
2. **Input Sanitization** - XSS protection via `sanitizeUserInput()`
3. **Rate Limiting** - Per-tenant limits on all endpoints
4. **Tenant Isolation** - Multi-tenant firestore paths
5. **PII Masking** - Automatic in logging system

### Example: API Route Pattern

```typescript
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

const Schema = z.object({
  name: z.string().min(1).max(100),
  // ... more fields
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated) return unauthorized();

    // 2. Validate
    const body = await request.json();
    const result = Schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 3. Sanitize text inputs
    const sanitized = {
      ...result.data,
      name: sanitizeUserInput(result.data.name)
    };

    // 4. Execute with tenant isolation
    const services = new TenantServiceFactory(authContext.tenantId);
    const data = await services.collection.create(sanitized);

    // 5. Log success
    logger.info('Operation completed', { tenantId: authContext.tenantId });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Operation failed', { error: error.message });
    return handleApiError(error);
  }
}
```

### Logging Best Practices

```typescript
import { logger } from '@/lib/utils/logger';

// Always use logger (never console.log)
logger.info('Operation completed', { tenantId, duration });
logger.error('Operation failed', { error: error.message });

// PII masking is automatic
logger.info('User action', {
  phone: '+5511999999***',  // Auto-masked
  tenantId: 'tenant123***'  // Auto-masked
});
```

---

## Dashboard Pages Reference

| Page | Path | Description |
|------|------|-------------|
| **Home** | `/dashboard` | Overview with KPIs, agenda, heatmap |
| **CRM** | `/dashboard/crm` | Pipeline, leads, analytics |
| **Properties** | `/dashboard/properties` | Property management |
| **Reservations** | `/dashboard/reservations` | Bookings and visits |
| **Clients** | `/dashboard/clients` | Customer management |
| **Conversations** | `/dashboard/conversas` | Multi-channel chat |
| **Agenda** | `/dashboard/agenda` | Calendar with events |
| **Financial** | `/dashboard/financeiro/*` | Transactions, charges, reports |
| **Settings** | `/dashboard/settings/*` | WhatsApp, company, policies, AI |
| **Admin** | `/dashboard/lkjhg` | Ultra-secure admin panel |

---

## Development Best Practices

### 1. Tenant Context (Always Required)

```typescript
// Component level
import { useTenant } from '@/contexts/TenantContext';
const { tenantId, isReady } = useTenant();

// API level
const authContext = await validateFirebaseAuth(request);
const services = new TenantServiceFactory(authContext.tenantId);
```

### 2. Type Safety

```typescript
import type { Reservation, Client, Property, Lead } from '@/lib/types';

const service = services.reservations;
const reservation = await service.get(id); // Reservation | null
```

### 3. Query Optimization

```typescript
// Always use limits
const properties = await services.properties.getAll(100);

// Use specific queries (not getAll + filter)
const active = await services.properties.getWhere('isActive', '==', true);

// Complex queries with optimizer
const results = await services.properties.getManyOptimized(
  [
    { field: 'status', operator: '==', value: 'active' },
    { field: 'price', operator: '<=', value: 1000 }
  ],
  { orderBy: [{ field: 'createdAt', direction: 'desc' }], limit: 20 }
);
```

### 4. Real-time Subscriptions

```typescript
useEffect(() => {
  const services = new TenantServiceFactory(tenantId);
  const unsubscribe = services.properties.onSnapshot(setProperties);
  return () => unsubscribe();
}, [tenantId]);
```

### 5. Error Handling

```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  return { success: false, error: 'Operation failed' };
}
```

---

## Development Commands

```bash
# Development
npm install                      # Install dependencies
npm run dev                      # Dev server (port 8080)

# Build & Deploy
npm run build                    # Production build
npm run start                    # Production server
npm run prod-check               # Full deployment check

# Quality
npm run lint                     # ESLint
npm run type-check               # TypeScript validation

# Utilities
npm run clean                    # Clean cache
npm run health                   # Health check
npm run generate-password-hash   # Admin password hash
```

---

## Testing Endpoints

```bash
# Test AI Functions
curl -X POST http://localhost:8080/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","phone":"+5511999999999"}'

# Search properties
curl -X POST http://localhost:8080/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","location":"Praia","guests":4}'

# Check discount opportunities
curl -X POST http://localhost:8080/api/ai/functions/check-discount-opportunities \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test"}'

# Test iCal export
curl http://localhost:8080/api/ical/{tenantId}/{propertyId}?token={token}
```

---

## Key Files Reference

### Core Services
- `lib/firebase/firestore-v2.ts` - Multi-tenant Firestore + TenantServiceFactory
- `lib/middleware/firebase-auth.ts` - User authentication middleware
- `lib/middleware/agent-auth.ts` - HMAC auth for requests from the LangGraph agent
- `lib/ai/tenant-aware-agent-functions.ts` - Legacy AI function implementations

### API Routes
- `app/api/webhook/whatsapp-microservice/route.ts` - Inbound WhatsApp → dispatch to agent
- `app/api/agent/tools/*/route.ts` - Tool endpoints called BY the LangGraph agent (current)
- `app/api/agent/console/route.ts` - Operator console → agent `/operate`
- `app/api/ai/functions/*/route.ts` - Legacy AI function endpoints (N8N era)
- `app/api/reservations/route.ts` - Reservations CRUD
- `app/api/transactions/route.ts` - Transactions CRUD
- `app/api/calendar/sync/*/route.ts` - iCal sync endpoints

### Agent (separate Python service)
- `agent/README.md` - How to run and configure the agent
- `agent/app/graph/graph.py` - LangGraph assembly + `run_agent`/`run_operator`
- `agent/app/tools/registry.py` - Tool schemas exposed to the LLM
- `agent/app/tools/client.py` - HTTP client that calls locai `/api/agent/tools/*`

### Dashboard
- `app/dashboard/crm/page.tsx` - CRM interface
- `app/dashboard/conversas/page.tsx` - Conversations interface
- `app/dashboard/properties/page.tsx` - Properties management

### Onboarding
- `components/organisms/RevolutionaryOnboarding/` - Onboarding system
- `lib/hooks/useRevolutionaryOnboarding.ts` - Onboarding hook

### iCal Sync
- `lib/services/ical-generator-service.ts` - Generate feeds
- `lib/services/calendar-sync-service.ts` - Sync orchestration
- `lib/services/property-import-service.ts` - Property import

### Utilities
- `lib/utils/logger.ts` - Professional logging with PII masking
- `lib/utils/validation.ts` - Input sanitization (XSS protection)
- `lib/utils/api-errors.ts` - Standardized error handling

---

## Critical Rules for New Features

1. **Multi-tenant Isolation** - Always use `TenantServiceFactory`
2. **Zod Validation** - Validate all inputs with Zod schemas
3. **Input Sanitization** - Use `sanitizeUserInput()` for text
4. **Logging** - Use `logger`, NEVER `console.log`
5. **Error Handling** - Use `handleApiError()` for consistency
6. **Type Safety** - Import types from `@/lib/types`
7. **Authentication** - Use `validateFirebaseAuth()` middleware

### Standard API Route Template

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const auth = await validateFirebaseAuth(request);
    if (!auth.authenticated) return unauthorized();

    // 2. Validate
    const body = await request.json();
    const result = Schema.safeParse(body);
    if (!result.success) return validationError(result.error);

    // 3. Sanitize
    const sanitized = { ...result.data, text: sanitizeUserInput(result.data.text) };

    // 4. Execute (tenant-scoped)
    const services = new TenantServiceFactory(auth.tenantId);
    const data = await services.collection.create(sanitized);

    // 5. Return
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

**This CLAUDE.md is optimized for Claude Code development.**
**Always prioritize: multi-tenant isolation, security, type safety, and professional error handling.**
**Last updated: May 2026 — AI brain migrated from N8N to the LangGraph agent (`locai/agent/`).**
