# CLAUDE.md

**Development guide for Claude Code when working with this repository.**

## 🚀 Quick Start

```bash
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 3000)
npm run build              # Production build
npm run type-check         # TypeScript validation
```

**Access Points:**
- Dashboard: `http://localhost:3000/dashboard`
- CRM: `http://localhost:3000/dashboard/crm`
- Admin: `http://localhost:3000/dashboard/lkjhg` (ultra-secure)

---

## 📋 Project Overview

**Locai** - Enterprise-grade real estate AI system with Sofia AI Agent integration.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.3.5 + TypeScript 5.3 |
| **UI** | Material-UI v5.15 + Emotion |
| **Database** | Firebase Firestore v10.7 |
| **Auth** | Firebase Auth + Multi-tenant JWT |
| **AI** | N8N + Sofia Agent (GPT-4o Mini) |
| **Messaging** | Baileys v6.7 (dedicated server) |
| **Validation** | Zod schemas + input sanitization |

### Core Features

- **🤖 Sofia AI**: N8N-powered consultant with 45+ specialized functions
- **🏢 Multi-tenant**: Complete isolation (`tenants/{tenantId}/collections`)
- **🎛️ CRM**: Pipeline automation, lead scoring, advanced analytics
- **📱 WhatsApp**: Dedicated Baileys server on DigitalOcean
- **🔐 Security**: Zod validation + sanitization + rate limiting

---

## 🏗️ Architecture Overview

### Multi-Tenant Firestore Structure

```typescript
// Complete tenant isolation
tenants/
  {tenantId}/
    properties/       // Real estate listings
    clients/         // Customer information
    reservations/    // Booking management
    transactions/    // Financial records
    leads/           // CRM pipeline
    conversations/   // Chat history
    messages/        // Individual messages
    amenities/       // Property features
    goals/           // Business goals
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

## 🔧 AI Functions Architecture (42 Endpoints)

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

    // Success logging
    logger.info(`[FUNCTION-NAME] Execution completed`, {
      requestId,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Error logging
    logger.error(`[FUNCTION-NAME] Execution failed`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Execution failed',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}
```

### AI Functions Categories (45+ Total)

| Category | Count | Key Functions |
|----------|-------|---------------|
| **🏠 Property** | 6 | `search-properties`, `get-property-details`, `check-availability` |
| **💰 Financial** | 6 | `calculate-price`, `calculate-dynamic-discount`, `check-discount-opportunities` |
| **📅 Booking** | 5 | `create-reservation`, `cancel-reservation`, `modify-reservation` |
| **👤 CRM** | 11 | `create-lead`, `lead-pipeline-movement`, `classify-lead` |
| **📋 Operations** | 8 | `get-policies`, `register-client`, `schedule-meeting` |
| **📊 Analytics** | 7 | `track-conversion-step`, `get-analytics-dashboard` |
| **🎯 Goals** | 3 | `create-goal`, `update-goal-progress` |

**New Functions (2025):**
- `calculate-dynamic-discount` - Multi-criteria discount engine
- `check-discount-opportunities` - List all discount strategies
- `post-conversation` - Permanent conversation tracking

---

## 📡 Core API Routes

### Main APIs

```typescript
// Reservations (CRUD + Relations)
GET/POST  /api/reservations
GET/PUT   /api/reservations/[id]
DELETE    /api/reservations/[id]?soft=true

// Transactions (Income/Expense)
GET/POST  /api/transactions
// Supports: recurring, categories, payment methods

// Properties (CRUD + Airbnb Import)
GET/POST  /api/properties
POST      /api/properties/import

// AI Functions (45+ endpoints)
POST /api/ai/functions/create-lead
POST /api/ai/functions/search-properties
POST /api/ai/functions/calculate-dynamic-discount
// ... 42+ more specialized functions

// WhatsApp Integration
POST /api/webhook/whatsapp-microservice
POST /api/whatsapp/send-n8n
GET  /api/whatsapp/qr
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

## 🔐 Security & Validation

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

// Define Zod schema
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

// ✅ Always use logger (never console.log)
logger.info('Operation completed', { tenantId, duration });
logger.error('Operation failed', { error: error.message });

// ✅ PII masking is automatic
logger.info('User action', {
  phone: '+5511999999***',  // Auto-masked
  tenantId: 'tenant123***'  // Auto-masked
});
```

---

## 🎯 Development Best Practices

### 1. Tenant Context (Always Required)

```typescript
// ✅ Component level
import { useTenant } from '@/contexts/TenantContext';

const { tenantId, isReady } = useTenant();

// ✅ API level
const authContext = await validateFirebaseAuth(request);
const services = new TenantServiceFactory(authContext.tenantId);
```

### 2. Type Safety

```typescript
// ✅ Always use TypeScript types
import type { Reservation, Client, Property } from '@/lib/types';

const service = services.reservations; // Typed automatically
const reservation = await service.get(id); // Reservation | null
```

### 3. Query Optimization

```typescript
// ✅ Always use limits
const properties = await services.properties.getAll(100);

// ✅ Use specific queries (not getAll + filter)
const active = await services.properties.getWhere('isActive', '==', true);

// ✅ Complex queries with optimizer
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
// ✅ Collection subscription
useEffect(() => {
  const services = new TenantServiceFactory(tenantId);
  const unsubscribe = services.properties.onSnapshot(setProperties);
  return () => unsubscribe(); // Cleanup
}, [tenantId]);

// ✅ Document subscription
useEffect(() => {
  const unsubscribe = services.reservations.subscribeToDocument(
    reservationId,
    setReservation
  );
  return () => unsubscribe();
}, [reservationId]);
```

### 5. Error Handling

```typescript
// ✅ Always catch and log
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  return { success: false, error: 'Operation failed' };
}

// ❌ Never expose internal errors
catch (error) {
  throw error; // BAD - exposes stack traces
}
```

---

## 📊 CRM System

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

Sofia AI automatically progresses leads through stages based on interactions:

- `new → contacted`: First AI response
- `contacted → qualified`: Needs identified (dates, budget, location)
- `qualified → presentation`: Property options shown
- `presentation → proposal`: Budget request or strong interest
- `proposal → negotiation`: Price discussion
- `negotiation → closing`: Budget confirmation
- `closing → won`: Reservation completed

### Lead Scoring

Dynamic scoring based on 20+ factors:
- Base score (initial quality)
- Temperature bonus: hot (+15), warm (+5), cold (-10)
- Interaction frequency multiplier
- Qualification bonus (budget/timeline/need/authority)
- Time decay for stale leads
- AI-enhanced adjustments

### CRM Components

```typescript
// Main CRM Interface
/app/dashboard/crm/page.tsx

// Analytics Components
/app/dashboard/crm/components/AdvancedAnalytics.tsx       // Conversion funnels
/app/dashboard/crm/components/LeadPerformanceTracker.tsx  // Individual tracking
/app/dashboard/crm/components/AIInsights.tsx              // AI recommendations
/app/dashboard/crm/components/CRMStats.tsx                // KPIs
/app/dashboard/crm/components/KanbanBoard.tsx             // Drag-and-drop pipeline
```

---

## 🔧 Development Commands

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

## 🧪 Testing Endpoints

### Quick Tests

```bash
# Test AI Functions
curl -X POST http://localhost:3000/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","phone":"+5511999999999"}'

curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","location":"Praia","guests":4}'

# Test Core APIs
curl http://localhost:3000/api/reservations?status=confirmed

curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount":500,"type":"income","category":"reservation"}'
```

---

## 📝 Key Files Reference

### Core Services
- `lib/firebase/firestore-v2.ts` - Multi-tenant Firestore + TenantServiceFactory
- `lib/ai/tenant-aware-agent-functions.ts` - 45+ AI function implementations
- `lib/middleware/firebase-auth.ts` - Authentication middleware

### API Routes
- `app/api/ai/functions/*/route.ts` - 45+ AI function endpoints
- `app/api/reservations/route.ts` - Reservations CRUD
- `app/api/transactions/route.ts` - Transactions CRUD
- `app/api/whatsapp/send-n8n/route.ts` - WhatsApp integration

### CRM Dashboard
- `app/dashboard/crm/page.tsx` - Main CRM interface
- `app/dashboard/crm/components/AdvancedAnalytics.tsx` - Business intelligence
- `app/dashboard/crm/components/LeadPerformanceTracker.tsx` - Lead tracking

### Utilities
- `lib/utils/logger.ts` - Professional logging with PII masking
- `lib/utils/validation.ts` - Input sanitization (XSS protection)
- `lib/utils/api-errors.ts` - Standardized error handling

---

## 🎯 Quick Reference

### Critical Rules for New Features

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
