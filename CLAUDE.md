# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Admin Panel: `/dashboard/lkjhg` - Ultra-secure admin interface

## Project Overview

This is a comprehensive **enterprise-grade** real estate AI agent system called "locai" built with Next.js 15, Material-UI, and Firebase. The system features:

### 🤖 **MODERN AI ARCHITECTURE - N8N POWERED (SEPTEMBER 2025)**
- **N8N Integration**: External AI processing via dedicated N8N workflows
- **Dedicated Baileys Server**: Separate WhatsApp Web server for optimal performance
- **30+ AI Functions**: Complete business automation via API endpoints
- **Sofia AI Agent**: Specialized real estate consultant with reactive behavior
- **CRM Pipeline Automation**: Automatic lead scoring, status progression, and follow-ups
- **Multi-Channel**: WhatsApp Web (Baileys) + Business API support

### Core Features
- **Advanced CRM**: Complete pipeline management with AI insights, performance tracking, and conversion analytics
- **N8N-Powered AI**: External workflow automation with Sofia agent integration
- **Dedicated WhatsApp Server**: Baileys-based dedicated server for reliable messaging
- **Multi-tenant Architecture**: Complete tenant isolation with `tenants/{tenantId}/collections` structure
- **Mini-Site System**: Public sites with custom domains and lead capture
- **Advanced Analytics**: Conversion funnels, lead performance tracking, and business intelligence
- **Enterprise Security**: Rate limiting, input validation, professional error handling

## Technology Stack

- **Framework**: Next.js 15.3.5 with App Router
- **Language**: TypeScript 5.3.0
- **UI Library**: Material-UI v5.15.0 with Emotion
- **Database**: Firebase Firestore v10.7.0
- **Storage**: Firebase Storage
- **AI Architecture**:
  - N8N v1.0+ for workflow automation
  - Sofia AI Agent with GPT-4o Mini integration
  - Dedicated Baileys server for WhatsApp Web
  - 30+ specialized AI function endpoints
- **Messaging Stack**:
  - Dedicated Baileys server (separate from main app)
  - WhatsApp Business API support
  - N8N webhook integrations
- **Analytics**: Recharts v2.15.4 with advanced CRM visualizations
- **Caching**: In-memory LRU cache with TTL
- **Payments**: Stripe integration
- **State Management**: Zustand + React Context
- **Forms**: React Hook Form with Yup validation
- **Authentication**: Firebase Auth with custom multi-tenant flows

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# TypeScript type checking
npm run type-check

# Production readiness check
npm run prod-check

# Deploy to production
npm run deploy

# Health check
npm run health

# Clean cache and build folders
npm run clean

# Generate password hash for admin users
npm run generate-password-hash
```

## 🎯 **UPDATED CORE ARCHITECTURE - N8N INTEGRATION**

### **Sofia AI Agent System - N8N Powered**
The heart of the application is Sofia, an intelligent real estate consultant now fully integrated with N8N workflows:

**🔄 N8N Integration Architecture**:
- **External Processing**: All AI conversations processed via N8N workflows
- **Webhook-Based**: Real-time communication between Next.js and N8N
- **Scalable**: Independent scaling of AI processing and web application
- **Resilient**: Fallback mechanisms for N8N downtime
- **Monitoring**: Complete request/response tracking and analytics

**🤖 Sofia Agent Characteristics**:
- **Reactive Behavior**: Never sends "thinking" or "processing" messages
- **Single Response Mode**: Executes all functions and provides complete response
- **Pipeline Management**: Automatically moves leads through CRM stages
- **Specialized Functions**: 30+ dedicated endpoints for business operations
- **Context Awareness**: Maintains conversation history and customer preferences

### **Dedicated WhatsApp Architecture**
Separate Baileys server for optimal WhatsApp Web performance:

**🔌 Baileys Server Integration**:
- **Dedicated Server**: Independent Node.js server running Baileys
- **API Communication**: RESTful API between main app and Baileys server
- **Session Management**: Persistent QR code authentication
- **Media Handling**: Direct media processing and delivery
- **Multi-Device**: Full WhatsApp multi-device support
- **Reliability**: Auto-reconnection and error recovery

**📱 Message Flow Architecture**:
```
WhatsApp → Baileys Server → Main App → N8N → Sofia Agent → Response → Baileys Server → WhatsApp
```

### **30+ AI Function Endpoints**
Complete business automation via specialized API routes:

**🏠 Property Management**:
- `search_properties`: Advanced property search with filters
- `get_property_details`: Complete property information
- `send_property_media`: Photo/video delivery with captions
- `send_property_map`: Location and map information
- `check_availability`: Real-time availability verification

**💰 Financial Operations**:
- `calculate_price`: Dynamic pricing with Brazilian holiday calendar
- `generate_quote`: Formal quotation generation
- `create_transaction`: Payment processing
- `track_metrics`: Financial performance tracking

**📅 Booking Management**:
- `create_reservation`: Complete booking creation with validation
- `cancel_reservation`: Cancellation with refund processing
- `modify_reservation`: Date/guest/price modifications
- `schedule_visit`: Property visit scheduling
- `check_visit_availability`: Visit slot verification

**👤 CRM Integration (6 NEW ENDPOINTS)**:
- `create_lead`: Smart lead creation with deduplication
- `get_lead_details`: Complete lead information retrieval
- `get_leads_list`: Filtered lead listing with pagination
- `add_lead_interaction`: Interaction tracking with sentiment analysis
- `analyze_lead_performance`: AI-powered lead analysis
- `follow_up_lead`: Automated follow-up scheduling
- `lead_pipeline_movement`: Automatic pipeline stage progression

**📋 Information & Policies**:
- `get_policies`: Cancellation, payment, and check-in policies
- `register_client`: Client registration with deduplication
- `schedule_meeting`: Meeting scheduling (retirada, reunião, visita)
- `check_agenda_availability`: Calendar availability checking
- `classify_lead`: Automatic lead classification (hot/warm/cold)
- `update_lead`: Lead information updates
- `update_lead_status`: Pipeline status management

**🎯 Goals & Analytics**:
- `create_goal`: Business goal creation
- `update_goal_progress`: Goal progress tracking
- `analyze_performance`: Performance metrics analysis

## **🎛️ ENHANCED CRM SYSTEM (SEPTEMBER 2025)**

### **Advanced Analytics Dashboard**
Complete business intelligence platform:

**📊 Analytics Components**:
- **AdvancedAnalytics.tsx**: Conversion funnels, time series, source analysis
- **LeadPerformanceTracker.tsx**: Real-time lead performance monitoring
- **AIInsights.tsx**: AI-powered recommendations and predictions
- **CRMStats.tsx**: Key performance indicators

**📈 Visualization Features**:
- **Conversion Funnel**: Visual pipeline with conversion rates per stage
- **Time Series Analysis**: Lead generation and conversion trends
- **Source Performance**: ROI analysis by lead source
- **Performance Tracking**: Individual lead scoring and risk assessment
- **Interactive Charts**: Recharts-based responsive visualizations

**🎯 Navigation Structure**:
- **Pipeline**: Kanban board with drag-and-drop
- **All Leads**: Comprehensive lead listing with filters
- **AI Insights**: AI-powered analysis and recommendations
- **Advanced Analytics**: Business intelligence dashboard
- **Performance**: Real-time lead performance tracking

### **CRM Pipeline Automation**
Intelligent lead progression and scoring:

**🔄 Automatic Pipeline Movement**:
- **new → contacted**: First interaction triggers
- **contacted → qualified**: Needs identification (dates, budget, location)
- **qualified → presentation**: Property options shown
- **presentation → proposal**: Budget request or strong interest
- **proposal → negotiation**: Price discussion or special conditions
- **negotiation → closing**: Budget confirmation
- **closing → won**: Reservation completed

**⭐ Dynamic Lead Scoring**:
- **Base Score**: Initial lead quality assessment
- **Temperature Bonus**: hot (+15), warm (+5), cold (-10)
- **Interaction Multiplier**: Frequency and engagement level
- **Qualification Bonus**: Budget/timeline/need/authority verification
- **Time Decay**: Reduced score for stale leads
- **AI-Enhanced**: Machine learning-based score adjustments

## Data Layer Architecture (MULTI-TENANT)

### **Complete Tenant Isolation**
- **Multi-tenant Structure**: `tenants/{tenantId}/collections` for complete data isolation
- **TenantServiceFactory** (`lib/services/tenant-service-factory.ts`): Creates tenant-scoped services
- **useTenant() Hook** (`contexts/TenantContext.tsx`): Global tenant context management
- **Generic Firestore Service** (`lib/firebase/firestore.ts`): Type-safe CRUD operations
- **Batch Operations**: Atomic multi-document transactions
- **Error Recovery**: Automatic retry and fallback mechanisms
- **Performance Optimization**: Query caching and batch processing

### **Core Collections**
- **Properties**: Real estate listings with media and pricing
- **Reservations**: Booking management with payment tracking
- **Clients**: Customer information with interaction history
- **Leads**: CRM pipeline with scoring and automation
- **Conversations**: Chat history with context preservation
- **Messages**: Individual message tracking
- **Amenities**: Property features and facilities
- **Payments**: Financial transaction records
- **AI Collections**: agents, automations, analytics, contexts

### **Advanced Firestore Queries**
- **Complex Filtering**: Multi-field queries with pagination
- **Real-time Subscriptions**: Live data updates via onSnapshot
- **Indexing Strategy**: Optimized composite indexes
- **Batch Processing**: Efficient bulk operations
- **Transaction Safety**: ACID compliance for critical operations

## **🌐 API ROUTES ARCHITECTURE (UPDATED)**

### **AI Function Endpoints** (`app/api/ai/functions/`)
30+ specialized endpoints for N8N integration:

```typescript
// Property Management
/api/ai/functions/search-properties          // Advanced property search
/api/ai/functions/get-property-details      // Complete property info
/api/ai/functions/send-property-media       // Photo/video delivery
/api/ai/functions/send-property-map         // Location information
/api/ai/functions/check-availability        // Real-time availability

// Financial Operations
/api/ai/functions/calculate-price           // Dynamic pricing
/api/ai/functions/generate-quote            // Formal quotations
/api/ai/functions/create-transaction        // Payment processing
/api/ai/functions/track-metrics            // Performance tracking

// Booking Management
/api/ai/functions/create-reservation        // Booking creation
/api/ai/functions/cancel-reservation        // Cancellation processing
/api/ai/functions/modify-reservation        // Booking modifications
/api/ai/functions/schedule-visit           // Property visits
/api/ai/functions/check-visit-availability // Visit scheduling

// CRM Integration (6 NEW)
/api/ai/functions/create-lead              // Smart lead creation
/api/ai/functions/get-lead-details         // Lead information
/api/ai/functions/get-leads-list           // Filtered lead listing
/api/ai/functions/add-lead-interaction     // Interaction tracking
/api/ai/functions/analyze-lead-performance // AI analysis
/api/ai/functions/follow-up-lead           // Follow-up automation
/api/ai/functions/lead-pipeline-movement   // Pipeline progression

// Additional Functions
/api/ai/functions/get-policies             // Business policies
/api/ai/functions/register-client          // Client registration
/api/ai/functions/schedule-meeting         // Meeting scheduling
/api/ai/functions/check-agenda-availability // Calendar checking
/api/ai/functions/classify-lead            // Lead classification
/api/ai/functions/update-lead              // Lead updates
/api/ai/functions/update-lead-status       // Status management
/api/ai/functions/create-goal              // Goal creation
/api/ai/functions/update-goal-progress     // Goal tracking
/api/ai/functions/analyze-performance      // Performance analysis
```

### **Core Application Routes**
```
app/api/
├── auth/                      # Authentication system
│   ├── login/route.ts        # User authentication
│   ├── logout/route.ts       # Session termination
│   ├── register/route.ts     # User registration
│   └── profile/route.ts      # Profile management
├── admin/                     # Admin panel APIs
│   ├── all-tickets/route.ts  # Global ticket management
│   ├── users/route.ts        # User administration
│   ├── stats/route.ts        # System statistics
│   └── verify/route.ts       # Admin verification
├── crm/                       # CRM system APIs
│   ├── analytics/route.ts    # CRM analytics
│   └── leads/[id]/insights/route.ts # Lead insights
├── properties/                # Property management
│   ├── route.ts              # CRUD operations
│   ├── import/route.ts       # Bulk import
│   └── [id]/route.ts         # Individual properties
├── mini-site/                 # Public site system
│   ├── domain/route.ts       # Domain management
│   └── analytics/route.ts    # Visitor tracking
├── webhooks/                  # External integrations
│   ├── ki/route.ts           # N8N webhooks
│   └── kirvano/route.ts      # Additional webhooks
├── whatsapp/                  # WhatsApp integration
│   ├── qr/route.ts           # QR code management
│   ├── send-n8n/route.ts     # N8N message sending
│   └── session/route.ts      # Session management
└── upload/                    # Media management
    ├── avatar/route.ts       # Profile pictures
    ├── logo/route.ts         # Company branding
    └── media/route.ts        # Property media
```

## **🔧 N8N Integration Patterns**

### **Webhook Communication**
Reliable communication between Next.js and N8N:

```typescript
// N8N Webhook Handler
export async function POST(request: NextRequest) {
  const { message, phone, tenantId } = await request.json();

  // Forward to N8N workflow
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, phone, tenantId })
  });

  const result = await response.json();
  return NextResponse.json(result);
}
```

### **Sofia Agent Integration**
N8N workflow calls Sofia with complete business context:

```json
// N8N → Sofia Request
{
  "message": "Preciso de apartamento para 4 pessoas em dezembro",
  "phone": "+5511999999999",
  "tenantId": "tenant123",
  "context": {
    "conversationId": "conv_123",
    "customerName": "João Silva",
    "previousInteractions": 5,
    "lastPropertyViewed": "apt_456"
  }
}
```

### **Function Execution Pattern**
Sofia executes multiple functions in reactive mode:

```typescript
// Sofia's reactive execution
const executionPlan = [
  'create_lead',           // Register/update customer
  'search_properties',     // Find suitable options
  'send_property_media',   // Show photos
  'add_lead_interaction',  // Track interaction
  'lead_pipeline_movement' // Advance pipeline
];

// Execute all functions before responding
const results = await Promise.all(
  executionPlan.map(func => executeFunction(func, params))
);

// Return complete response
return formatResponse(results);
```

## **💡 Development Patterns (UPDATED)**

### **Multi-Tenant Development**
Always use tenant-scoped services:

```typescript
// Correct pattern
const serviceFactory = new TenantServiceFactory(tenantId);
const leadService = serviceFactory.leads;
const propertyService = serviceFactory.properties;

// Use tenant context in components
const { tenantId, isReady } = useTenant();
```

### **Professional Logging**
Structured logging throughout the application:

```typescript
import { logger } from '@/lib/utils/logger';

// Use instead of console.log
logger.info('Operation completed', {
  tenantId,
  operation: 'create_lead',
  duration: Date.now() - startTime
});
```

### **Error Handling**
Professional error management:

```typescript
try {
  const result = await riskOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    tenantId,
    context: 'create_lead'
  });

  return {
    success: false,
    error: 'Operation temporarily unavailable'
  };
}
```

### **Type Safety**
Complete TypeScript integration:

```typescript
// Strict typing for all operations
interface LeadCreationArgs {
  phone: string;
  name?: string;
  email?: string;
  tenantId: string;
}

export async function createLead(
  args: LeadCreationArgs,
  tenantId: string
): Promise<LeadCreationResult> {
  // Implementation with full type safety
}
```

## **🚀 Key Integration Points (SEPTEMBER 2025)**

When extending the system:

1. **N8N Integration**: Use webhook patterns for AI communication
2. **Baileys Server**: Communicate via REST API for WhatsApp features
3. **Multi-tenant Development**: Always use TenantServiceFactory
4. **Professional Logging**: Use structured logger, never console.log
5. **CRM Automation**: Leverage 6 new CRM functions for pipeline management
6. **Advanced Analytics**: Extend CRM components for new visualizations
7. **Function Creation**: Add to `lib/ai/tenant-aware-agent-functions.ts`
8. **API Routes**: Follow `/api/ai/functions/` pattern for N8N endpoints
9. **Error Handling**: Use classification system with proper logging
10. **Type Safety**: Maintain strict TypeScript throughout
11. **Performance**: Implement caching and batch processing
12. **Security**: Input validation and rate limiting
13. **Testing**: Use `/dashboard/crm` for CRM testing
14. **Monitoring**: Leverage professional logging for debugging

## **📊 CRM Testing & Monitoring**

### **Testing Interface**
- **CRM Dashboard**: `/dashboard/crm` - Complete CRM testing environment
- **Pipeline Testing**: Drag-and-drop functionality with real data
- **Analytics Testing**: All visualization components with sample data
- **Performance Testing**: Lead performance tracking with real metrics

### **Monitoring & Analytics**
- **Lead Pipeline**: Real-time pipeline movement tracking
- **Conversion Metrics**: Funnel analysis with conversion rates
- **Performance Analytics**: Individual lead performance monitoring
- **AI Insights**: Automated recommendations and predictions
- **Business Intelligence**: Complete dashboard with KPIs

### **Key Files Reference**
- **CRM Main**: `app/dashboard/crm/page.tsx` - Main CRM interface
- **Advanced Analytics**: `app/dashboard/crm/components/AdvancedAnalytics.tsx`
- **Performance Tracker**: `app/dashboard/crm/components/LeadPerformanceTracker.tsx`
- **AI Insights**: `app/dashboard/crm/components/AIInsights.tsx`
- **Lead Functions**: `lib/ai/tenant-aware-agent-functions.ts` - CRM functions
- **Tenant Services**: `lib/services/tenant-service-factory.ts` - Data layer
- **Logger**: `lib/utils/logger.ts` - Professional logging

## **🎯 Quick Commands & Testing**

```bash
# Start development with CRM access
npm run dev
# Access: http://localhost:3000/dashboard/crm

# Test N8N integration
curl -X POST http://localhost:3000/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"test","phone":"+5511999999999"}'

# Monitor logs
tail -f logs/application.log

# Database backup (multi-tenant)
npm run backup-tenant -- --tenantId=example

# Health check
npm run health
```

This updated CLAUDE.md reflects the modern architecture with N8N integration, dedicated Baileys server, advanced CRM system, and 30+ AI function endpoints, providing comprehensive guidance for development in the new architecture.