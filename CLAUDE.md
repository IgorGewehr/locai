# CLAUDE.md

**Development guide for Claude Code when working with this repository.**

## Quick Start

```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 3000)
npm run build              # Production build
npm run type-check         # TypeScript validation
```

**Access Points:**
- Dashboard: `http://localhost:3000/dashboard`
- CRM: `http://localhost:3000/dashboard/crm`
- Conversas: `http://localhost:3000/dashboard/conversas`
- Admin: `http://localhost:3000/dashboard/lkjhg` (ultra-secure)

---

## Project Overview

**Locai** — Vitrine + concierge para imobiliárias de temporada. O sistema NÃO
gerencia reservas. Quando um cliente quer fechar, o agent envia o link do
Airbnb e a reserva acontece lá. O agendamento interno cobre apenas visitas
presenciais, retirada de chave e suporte/manutenção no apto.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5.2 + TypeScript 5.3 |
| **UI** | Material-UI v5.15 + Emotion |
| **Database** | Firebase Firestore v10.7 |
| **Auth** | Firebase Auth + Multi-tenant JWT |
| **AI Agent** | LangGraph + OpenAI (Python — `locai/agent/`) |
| **Messaging** | Baileys v6.7 (dedicated server) + Facebook/Instagram |
| **Validation** | Zod schemas + input sanitization |
| **Airbnb Integration** | Link de fechamento + leitura de iCal sob demanda |

### Core Features

- **LangGraph Agent**: serviço Python autônomo (`locai/agent/`) que faz
  router → planner ↔ executor → reflection → responder. Substitui a Sofia/N8N.
- **Multi-tenant**: Complete isolation (`tenants/{tenantId}/collections`)
- **CRM**: Pipeline com estágio terminal `handed_off` (cliente foi pro Airbnb)
- **WhatsApp**: Dedicated Baileys server on DigitalOcean
- **Facebook/Instagram**: Direct Messages integration (in development)
- **Airbnb Hand-off**: agent compartilha link Airbnb (`share_airbnb_link`).
  Disponibilidade é checada ao vivo via `ical_check_availability` (read-only,
  nada é persistido no sistema).
- **Revolutionary Onboarding**: Guided 2-step property + WhatsApp setup
- **Security**: Zod validation + sanitization + rate limiting

---

## Architecture Overview

### Multi-Tenant Firestore Structure

```typescript
// Complete tenant isolation
tenants/
  {tenantId}/
    properties/              // Catálogo de imóveis (sem campos de disponibilidade)
    clients/                 // Customer information
    visit_appointments/      // Visitas, retiradas de chave e support (NÃO reservas)
    tenant_visit_schedules/  // Working hours, blocked dates, agentes disponíveis
    transactions/            // Financial records (manualmente lançadas)
    leads/                   // CRM pipeline (estágio terminal: 'handed_off')
    conversations/           // Chat history (WhatsApp/Facebook/Instagram)
    messages/                // Individual messages
    amenities/               // Property features
    goals/                   // Business goals
    agent_runs/              // Telemetria do agent LangGraph
    settings/                // Tenant configuration
      company/               // Company info
      policies/              // Business policies
    // DESCONTINUADAS: reservations/ e calendar_sync_configurations/ não são
    // mais escritas. Documentos legados continuam acessíveis para leitura
    // histórica (relatórios), mas nenhum fluxo novo cria docs nelas.

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

## LangGraph Agent (`locai/agent/`)

Serviço Python (FastAPI + LangGraph) que substitui a Sofia/N8N. Roda em
container próprio na porta `:8090`.

```
┌─────────────────┐   HMAC    ┌──────────────────┐
│  Next.js (web)  │──────────►│  locai/agent     │
│  - webhook      │◄──────────│  - FastAPI       │
│  - REST tools   │           │  - LangGraph     │
└─────────────────┘           └──────────────────┘
```

### Topologia do graph

```
START → router → planner ⇄ executor → reflection (operator-only) → responder → END
```

### Use cases (subconjunto de tools por modo)

| use_case      | Audiência       | Tools disponíveis |
|---------------|-----------------|-------------------|
| `imobiliario` | Cliente final   | properties, ical, appointments, clients, conversations, memory, knowledge |
| `operator`    | Equipe (chat)   | tudo do imobiliario + crm |
| `analyst`     | Equipe (relatórios) | subset read-only |

### Tools-chave

- `properties_list / get_details / get_photos / search` — read-only no catálogo
- `ical_check_availability` — busca o iCal do Airbnb ao vivo, NÃO persiste
- `appointments_check_slots / create / cancel / ...` — agenda interna
  restrita a `visit | key_pickup | support`
- `share_airbnb_link` — entrega o link Airbnb (única forma de fechar)
- `notify_human` — escala para atendente humano

### Endpoints Next.js consumidos pelo agent

Todos sob `/api/agent/*`, autenticados via HMAC-SHA256 com header
`x-agent-signature`/`x-tenant-id`. Implementação compartilhada em
`lib/agent/hmac.ts` e `lib/agent/dispatch.ts`.

```
POST /api/agent/tools/properties      (action: list|get_details|get_photos|search)
POST /api/agent/tools/ical            (action: check_availability)
POST /api/agent/tools/appointments    (action: check_slots|create|...|cancel)
POST /api/agent/tools/clients         (action: lookup_by_phone|create|...)
POST /api/agent/tools/conversations   (action: send_media|share_airbnb_link|notify_human)
POST /api/agent/tools/memory          (action: recall|remember)
POST /api/agent/tools/crm             (action: list_leads|search_leads|update_lead_stage)
POST /api/agent/tools/knowledge       (action: search)
POST /api/agent/runs                  (telemetria — persist)
POST /api/agent/budget                (gate diário — check)
```

### Webhook → Agent

`/api/webhook/whatsapp-microservice` chama `dispatchToAgent()` ao receber
uma mensagem. Toggle `USE_LEGACY_N8N=true` no env permite voltar pra
Sofia/N8N durante a transição (será removido depois da Tarefa 9 do roadmap
de migração).

---

## ⚠️ AI Functions Architecture (REMOVIDO)

Sofia/N8N e seus 60 endpoints foram **removidos**. O sistema usa apenas o
LangGraph agent acima. Permanecem em pé apenas duas rotas standalone que
não dependem do Sofia:

- `app/api/ai/analyze-leads/route.ts` — chamada OpenAI direta para análise de leads
- `app/api/ai/block-conversation/route.ts` — pausa o agent (Redis flag) para
  intervenção humana; o LangGraph agent respeita o mesmo flag



### Function Pattern

All AI functions follow this structure:

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
POST /api/webhook/whatsapp-microservice
POST /api/webhook/client-message                // Real-time client messages
POST /api/whatsapp/send-n8n
POST /api/whatsapp/send-manual
GET  /api/whatsapp/qr
GET  /api/whatsapp/session

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

## ⚠️ iCal Synchronization System (REMOVIDO)

A sincronização bidirecional de iCal foi **removida**. O sistema não
gerencia mais disponibilidade interna. A única interação com calendário é
o agent chamando `ical_check_availability` (leitura ao vivo da feed Airbnb,
sem persistir) para responder dúvidas pontuais do cliente.

Removidos:
- `app/api/ical/*` (export feed)
- `app/api/calendar/sync/*` (import + cron)
- `app/api/properties/[id]/ical/*` (token gen)
- `lib/services/{calendar-sync,ical-parser,ical-generator,airbnb-import,property-import}-service.ts`
- Campos `iCalExportToken*`, `iCalImportSource`, `iCalLastSync`,
  `iCalSyncEnabled`, `externalCalendarUrls` do Property type

Mantidos:
- `airbnbUrl` e `airbnbPropertyId` no Property — usados pelo agent
- `iCalImportUrl` no Property — read-only, consultado pelo agent

<details>
<summary>Documentação histórica (não use)</summary>

### Bidirectional Sync (LEGADO)

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
// (todos removidos)
```

</details>

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
npm run dev                      # Dev server (port 3000)

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
curl -X POST http://localhost:3000/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","phone":"+5511999999999"}'

# Search properties
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","location":"Praia","guests":4}'

# Check discount opportunities
curl -X POST http://localhost:3000/api/ai/functions/check-discount-opportunities \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test"}'

# Test iCal export
curl http://localhost:3000/api/ical/{tenantId}/{propertyId}?token={token}
```

---

## Key Files Reference

### Core Services
- `lib/firebase/firestore-v2.ts` - Multi-tenant Firestore + TenantServiceFactory
- `lib/ai/tenant-aware-agent-functions.ts` - AI function implementations
- `lib/middleware/firebase-auth.ts` - Authentication middleware

### API Routes
- `app/api/ai/functions/*/route.ts` - 60 AI function endpoints
- `app/api/reservations/route.ts` - Reservations CRUD
- `app/api/transactions/route.ts` - Transactions CRUD
- `app/api/whatsapp/send-n8n/route.ts` - WhatsApp integration
- `app/api/calendar/sync/*/route.ts` - iCal sync endpoints

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
**Last updated: November 2025**
