# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working with this repository.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Access at http://localhost:3000
```

**Key Areas:**
- Dashboard: `/dashboard` - Main application interface
- CRM System: `/dashboard/crm` - Complete lead management with advanced analytics
- Mini-site: Configure custom domains for tenant-specific public sites
- Admin Panel: `/dashboard/lkjhg` - Ultra-secure admin interface (`idog: true`)

---

## 📋 Project Overview

This is a comprehensive **enterprise-grade** real estate AI agent system called "Locai" built with Next.js 15, Material-UI, and Firebase.

### Technology Stack

```typescript
{
  "framework": "Next.js 15.3.5 (App Router)",
  "language": "TypeScript 5.3.0",
  "ui": "Material-UI v5.15.0 + Emotion",
  "database": "Firebase Firestore v10.7.0",
  "storage": "Firebase Storage",
  "auth": "Firebase Auth + Multi-tenant JWT",
  "validation": "Zod schemas (all critical routes)",
  "state": "Zustand + React Context",
  "forms": "React Hook Form + Yup",
  "charts": "Recharts v2.15.4",
  "payments": "Stripe integration",
  "ai": "N8N + Sofia Agent + GPT-4o Mini",
  "whatsapp": "Baileys v6.7 (dedicated server)"
}
```

### Core Features

- **🤖 Sofia AI Agent**: N8N-powered real estate consultant with 42 specialized functions
- **🏢 Multi-tenant Architecture**: Complete isolation with `tenants/{tenantId}/collections`
- **🎛️ Advanced CRM**: Pipeline automation, lead scoring, analytics dashboards
- **📱 WhatsApp Integration**: Dedicated Baileys server for reliable messaging
- **🌐 Mini-Site System**: Public sites with custom domains and lead capture
- **🔐 Enterprise Security**: Zod validation, input sanitization, professional error handling
- **📊 Business Intelligence**: Conversion funnels, performance tracking, AI insights

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

### AI Functions Categories

#### 🏠 Property Management (6 functions)
```typescript
search-properties          // Advanced property search with filters
get-property-details       // Complete property information
send-property-media        // Photo/video delivery with captions
send-property-map          // Location and map information
check-availability         // Real-time availability verification
```

#### 💰 Financial Operations (4 functions)
```typescript
calculate-price            // Dynamic pricing
generate-quote             // Formal quotation generation
create-transaction         // Payment processing
track-metrics              // Financial performance tracking
```

#### 📅 Booking Management (5 functions)
```typescript
create-reservation         // Complete booking creation with validation
cancel-reservation         // Cancellation with refund processing
modify-reservation         // Date/guest/price modifications
schedule-visit             // Property visit scheduling
check-visit-availability   // Visit slot verification
```

#### 👤 CRM Integration (9 functions)
```typescript
create-lead                // Smart lead creation with deduplication
get-lead-details           // Complete lead information retrieval
get-leads-list             // Filtered lead listing with pagination
add-lead-interaction       // Interaction tracking with sentiment analysis
analyze-lead-performance   // AI-powered lead analysis
follow-up-lead             // Automated follow-up scheduling
lead-pipeline-movement     // Automatic pipeline stage progression
classify-lead              // Lead classification (hot/warm/cold)
update-lead-status         // Pipeline status management
```

#### 📋 Business Operations (8 functions)
```typescript
get-policies               // Cancellation, payment, check-in policies
register-client            // Client registration with deduplication
schedule-meeting           // Meeting scheduling
check-agenda-availability  // Calendar availability checking
update-lead                // Lead information updates
create-task                // Task creation
update-task                // Task updates
get-business-insights      // Business insights
```

#### 📊 Analytics & Tracking (7 functions)
```typescript
track-conversation-metric     // Metrics tracking
track-conversation-session    // Session tracking
track-conversion-step         // Conversion funnel tracking
track-message-engagement      // Engagement metrics
track-qualification-milestone // Qualification tracking
get-analytics-dashboard       // Analytics dashboard
```

#### 🎯 Goals & Performance (3 functions)
```typescript
create-goal                // Business goal creation
update-goal-progress       // Goal progress tracking
analyze-performance        // Performance metrics analysis
```

---

## 📡 Core API Routes

### Reservations API

```typescript
// GET /api/reservations - List with filters
GET /api/reservations?page=1&limit=10&status=confirmed&propertyId=xxx

// POST /api/reservations - Create reservation
POST /api/reservations
{
  "propertyId": "xxx",
  "clientId": "xxx",
  "checkIn": "2025-12-01",
  "checkOut": "2025-12-05",
  "guests": 4,
  "totalAmount": 2000,
  "paidAmount": 500,
  "paymentMethod": "pix",
  "guestDetails": [...],
  "extraServices": [...]
}

// GET /api/reservations/[id] - Get single with relations
GET /api/reservations/xxx?include=property,client,transactions

// PUT /api/reservations/[id] - Update reservation
// DELETE /api/reservations/[id] - Soft delete (status: cancelled)
DELETE /api/reservations/xxx?soft=true
```

**Validation:** Full Zod schema with business rules
- ✅ Check-out must be after check-in
- ✅ Guests must not exceed property capacity
- ✅ Property and client must exist
- ✅ Automatic calculations: nights, pendingAmount
- ✅ Input sanitization on all text fields

### Transactions API

```typescript
// GET /api/transactions - List with filters
GET /api/transactions?type=income&status=completed&startDate=2025-01-01

// POST /api/transactions - Create transaction
POST /api/transactions
{
  "amount": 500,
  "type": "income",
  "category": "reservation",
  "description": "Pagamento reserva Vista Mar",
  "paymentMethod": "pix",
  "reservationId": "xxx",
  "propertyId": "xxx"
}

// Supports recurring transactions
{
  "isRecurring": true,
  "recurringType": "monthly",
  "recurringEndDate": "2025-12-31"
}
```

**Features:**
- ✅ Income/Expense tracking
- ✅ Category system (reservation, maintenance, cleaning, commission, refund, other)
- ✅ Payment methods (stripe, pix, cash, bank_transfer, credit_card, debit_card)
- ✅ Related entities (reservationId, clientId, propertyId)
- ✅ Tags system (max 10)
- ✅ AI metadata (createdByAI, aiConversationId)

### Properties API

```typescript
// CRUD operations
GET    /api/properties
POST   /api/properties
GET    /api/properties/[id]
PUT    /api/properties/[id]
DELETE /api/properties/[id]

// Airbnb import
POST /api/properties/import
{
  "hasData": "window.hasData from Airbnb",
  "url": "https://airbnb.com/rooms/xxx"
}

// Import validation
POST /api/properties/import/validate
```

### Authentication

All API routes use `validateFirebaseAuth` middleware:

```typescript
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';

const authContext = await validateFirebaseAuth(request);
if (!authContext.authenticated || !authContext.tenantId) {
  return NextResponse.json(
    { error: 'Authentication required', code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

// Use tenant context
const services = new TenantServiceFactory(authContext.tenantId);
```

---

## 🔐 Security & Validation

### Input Validation Pattern

```typescript
import { z } from 'zod';
import { sanitizeUserInput } from '@/lib/utils/validation';

// Define Zod schema
const CreateReservationSchema = z.object({
  propertyId: z.string().min(1).max(100),
  clientId: z.string().min(1).max(100),
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  guests: z.number().int().positive().min(1),
  totalAmount: z.number().min(0),
  // ... more fields
});

// Validate request
const validationResult = CreateReservationSchema.safeParse(body);
if (!validationResult.success) {
  return NextResponse.json(
    {
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: validationResult.error.flatten()
    },
    { status: 400 }
  );
}

// Sanitize text inputs
const sanitizedData = {
  ...validatedData,
  specialRequests: sanitizeUserInput(validatedData.specialRequests),
  observations: sanitizeUserInput(validatedData.observations),
};
```

### Error Handling Pattern

```typescript
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';

try {
  // Operation
  const result = await riskyOperation();
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  // Professional logging
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    tenantId,
    context: 'operation_name'
  });

  // Standardized error response
  return handleApiError(error);
}
```

### Professional Logging

```typescript
import { logger } from '@/lib/utils/logger';

// Never use console.log - always use logger
logger.info('Operation completed', {
  tenantId,
  operation: 'create_lead',
  duration: Date.now() - startTime,
  metadata: { /* additional context */ }
});

logger.error('Operation failed', {
  error: error.message,
  tenantId,
  stack: error.stack?.substring(0, 500),
  context: 'create_lead'
});

// PII masking automatically applied
logger.info('User action', {
  phone: '+5511999999***',  // Last digits masked
  tenantId: 'tenant123***'   // Partially hidden
});
```

---

## 🎯 Development Best Practices

### 1. Always Use Tenant Context

```typescript
// ✅ Correct - Component level
import { useTenant } from '@/contexts/TenantContext';

export default function MyComponent() {
  const { tenantId, isReady } = useTenant();

  useEffect(() => {
    if (isReady && tenantId) {
      loadData();
    }
  }, [isReady, tenantId]);
}

// ✅ Correct - API level
const authContext = await validateFirebaseAuth(request);
const services = new TenantServiceFactory(authContext.tenantId);
```

### 2. Type Safety

```typescript
// ✅ Always use TypeScript interfaces
import type { Reservation } from '@/lib/types/reservation';
import type { Client } from '@/lib/types/client';
import type { Property } from '@/lib/types/property';

// ✅ Use generic services with types
const reservationService = services.reservations; // Type: MultiTenantFirestoreService<Reservation>
const reservation = await reservationService.get(id); // Type: Reservation | null
```

### 3. Error Handling

```typescript
// ✅ Professional error handling
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    context: 'operation_name'
  });

  return {
    success: false,
    error: 'Operation temporarily unavailable'
  };
}

// ❌ Never expose internal errors to user
catch (error) {
  throw error; // BAD - exposes stack traces
}
```

### 4. Query Optimization

```typescript
// ✅ Use limits on getAll
const properties = await services.properties.getAll(100); // Max 100

// ✅ Use specific queries instead of getAll + filter
const activeProperties = await services.properties.getWhere(
  'isActive', '==', true, 'createdAt', 50
);

// ✅ Use optimized queries for complex filters
const results = await services.properties.getManyOptimized(
  [
    { field: 'status', operator: '==', value: 'active' },
    { field: 'price', operator: '<=', value: 1000 }
  ],
  { orderBy: [{ field: 'createdAt', direction: 'desc' }], limit: 20 }
);
```

### 5. Real-time Subscriptions

```typescript
// ✅ Subscribe to collection changes
useEffect(() => {
  const services = new TenantServiceFactory(tenantId);

  const unsubscribe = services.properties.onSnapshot((properties) => {
    setProperties(properties);
  });

  return () => unsubscribe(); // Cleanup
}, [tenantId]);

// ✅ Subscribe to document changes
useEffect(() => {
  const services = new TenantServiceFactory(tenantId);

  const unsubscribe = services.reservations.subscribeToDocument(
    reservationId,
    (reservation) => {
      setReservation(reservation);
    }
  );

  return () => unsubscribe();
}, [tenantId, reservationId]);
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
npm run dev                      # Start dev server (port 3000)
npm install                      # Install dependencies

# Building
npm run build                    # Production build
npm run start                    # Production server

# Quality Checks
npm run lint                     # ESLint
npm run type-check               # TypeScript validation
npm run prod-check               # Full deployment check

# Maintenance
npm run clean                    # Clean cache and build folders
npm run health                   # System health check
npm run generate-password-hash   # Admin password hash generator
```

---

## 🧪 Testing Endpoints

### Test AI Functions

```bash
# Test create-lead
curl -X POST http://localhost:3000/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","phone":"+5511999999999"}'

# Test search-properties
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","location":"Praia","guests":4}'

# Test create-reservation
curl -X POST http://localhost:3000/api/ai/functions/create-reservation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId":"test",
    "propertyId":"xxx",
    "clientPhone":"+5511999999999",
    "checkIn":"2025-12-01",
    "checkOut":"2025-12-05",
    "guests":4,
    "totalPrice":2000
  }'
```

### Test Core APIs

```bash
# List reservations with filters
curl http://localhost:3000/api/reservations?status=confirmed

# Get reservation with relations
curl http://localhost:3000/api/reservations/xxx?include=property,client

# Create transaction
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount":500,
    "type":"income",
    "category":"reservation",
    "description":"Test payment",
    "paymentMethod":"pix"
  }'
```

---

## 📝 Key Files Reference

### Services & Data Layer
- `lib/firebase/firestore-v2.ts` - Multi-tenant Firestore service
- `lib/services/tenant-service-factory.ts` - Service factory (no longer exists, use firestore-v2)
- `lib/ai/tenant-aware-agent-functions.ts` - AI function implementations

### API Routes
- `app/api/reservations/route.ts` - Reservations CRUD
- `app/api/transactions/route.ts` - Transactions CRUD
- `app/api/properties/route.ts` - Properties CRUD
- `app/api/ai/functions/*/route.ts` - 42 AI function endpoints

### CRM Components
- `app/dashboard/crm/page.tsx` - Main CRM interface
- `app/dashboard/crm/components/AdvancedAnalytics.tsx` - Analytics
- `app/dashboard/crm/components/LeadPerformanceTracker.tsx` - Performance tracking

### Utilities
- `lib/utils/logger.ts` - Professional logging
- `lib/utils/validation.ts` - Input sanitization
- `lib/utils/api-errors.ts` - Error handling
- `lib/middleware/firebase-auth.ts` - Authentication middleware

---

## 🎯 Quick Reference

### When Adding New Features

1. **Multi-tenant Isolation**: Always use `TenantServiceFactory`
2. **Validation**: Use Zod schemas for all inputs
3. **Sanitization**: Use `sanitizeUserInput` for text fields
4. **Logging**: Use `logger`, never `console.log`
5. **Error Handling**: Use `handleApiError` for consistent responses
6. **Type Safety**: Use TypeScript interfaces from `lib/types`
7. **Authentication**: Use `validateFirebaseAuth` middleware

### Common Patterns

```typescript
// API Route Pattern
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated) return unauthorized();

    // 2. Validate
    const body = await request.json();
    const result = Schema.safeParse(body);
    if (!result.success) return validationError(result.error);

    // 3. Sanitize
    const sanitized = sanitizeInputs(result.data);

    // 4. Execute with tenant isolation
    const services = new TenantServiceFactory(authContext.tenantId);
    const data = await services.collection.create(sanitized);

    // 5. Return
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

This CLAUDE.md provides comprehensive guidance for developing within the Locai codebase. Always prioritize multi-tenant isolation, security, type safety, and professional error handling.
