# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive **enterprise-grade** real estate AI agent system called "agente-imobiliaria" built with Next.js 14, Material-UI, and Firebase. The system features an **intelligent WhatsApp bot powered by OpenAI GPT-4** with advanced **function calling**, **conversation context management**, **automation workflows**, and **professional error handling**. The system includes a **visual configuration interface** for WhatsApp setup and **multi-tenant architecture** support.

## Technology Stack

- **Framework**: Next.js 14.2.0 with App Router
- **Language**: TypeScript 5.3.0
- **UI Library**: Material-UI v5.15.0 with Emotion
- **Database**: Firebase Firestore v10.7.0
- **Storage**: Firebase Storage
- **AI**: OpenAI API v4.20.0 with function calling
- **Messaging**: WhatsApp Business API
- **Payments**: Stripe integration
- **State Management**: Zustand
- **Forms**: React Hook Form with Yup validation
- **Date Handling**: date-fns v3.0.0

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
```

## Core Architecture

### AI Agent System (ENTERPRISE-GRADE)
The heart of the application is an intelligent agent system with multiple components:

**Core AI Processing (`lib/ai/response-generator.ts`)**:
- Processes WhatsApp messages using OpenAI GPT-4 with advanced function calling
- Maintains sophisticated conversation context and client preferences
- Implements **error classification** and **recovery strategies**
- **Input validation** and **sanitization** for security
- **Timeout handling** and **retry logic** for reliability

**Conversation Management (`lib/services/conversation-service.ts`)**:
- Persistent conversation state with context preservation
- **Sentiment analysis** and **confidence scoring**
- **Real-time conversation monitoring** and analytics
- Multi-turn conversation handling with memory

**WhatsApp Integration (`lib/whatsapp/message-handler.ts`)**:
- **Rate limiting** (20 messages/minute) for abuse prevention
- **Duplicate message detection** and prevention
- **Professional error handling** with user-friendly messages
- **Retry logic** for all API calls with exponential backoff
- **Media handling** with timeout protection

**Automation Engine (`lib/automation/workflow-engine.ts`)**:
- **Trigger-based automations** for follow-ups and workflows
- **Conditional logic** for personalized customer journeys
- **Scheduled actions** and **event-driven responses**
- **Performance tracking** and optimization

### Data Layer Architecture (ENHANCED)
- **Generic Firestore Service** (`lib/firebase/firestore.ts`): Type-safe CRUD operations with real-time subscriptions
- **Core Collections**: properties, reservations, clients, conversations, messages, amenities, payments
- **AI Collections**: ai_agents, automations, analytics, conversation_contexts
- **Specialized Query Services**: Property search, reservation management, conversation handling
- **Batch Operations**: For atomic multi-document transactions
- **Error Recovery**: Automatic retry and fallback mechanisms
- **Performance Optimization**: Query caching and batch processing

### Pricing Engine
Sophisticated dynamic pricing system (`lib/services/pricing.ts`):
- Base pricing with weekend/holiday multipliers
- Seasonal rate adjustments
- Brazilian holiday calendar integration
- Real-time price calculations for date ranges
- Revenue projections and occupancy analytics

### API Routes Structure (COMPREHENSIVE)
```
app/api/
├── agent/route.ts              # Core AI agent processing with function calling
├── webhook/whatsapp/route.ts   # WhatsApp message handling with professional error handling
├── properties/route.ts         # Property CRUD operations
├── properties/[id]/route.ts    # Individual property management
├── automations/route.ts        # NEW: Automation management
├── analytics/route.ts          # NEW: AI performance analytics
└── config/whatsapp/route.ts    # NEW: WhatsApp configuration API
```

## Key Data Models

### Property Interface
Complex property model with:
- Basic info (name, location, bedrooms, bathrooms)
- Media arrays (photos with ordering, videos)
- Dynamic pricing structure (base price, multipliers, seasonal rates)
- Amenities and availability status

### Conversation Flow (ENHANCED)
- **AgentContext**: Maintains search filters, interested properties, pending reservations, sentiment analysis
- **Message Processing**: WhatsApp → Validation → Rate Limiting → OpenAI → Function Execution → Response → Automations
- **Context Persistence**: Conversation state stored in Firestore with analytics
- **Error Recovery**: Automatic retry and graceful degradation
- **Security**: Input sanitization and validation at every step
- **Monitoring**: Real-time performance tracking and alerting

### Pricing Calculations
- **PriceCalculation**: Detailed breakdown with base price, surcharges, fees
- **Brazilian Holidays**: Built-in calendar with priority-based multipliers
- **Seasonal Pricing**: Custom date ranges with specific rates

## Component Architecture

### Dashboard Layout
- Persistent sidebar navigation with active state management
- Header with notifications and user menu
- Mobile-responsive drawer behavior
- Material-UI theme integration

### UI Components (EXPANDED)
- **Header/Sidebar**: Navigation with WhatsApp status indicators
- **Property Components**: Cards, forms, galleries, pricing forms
- **Reservation Components**: Calendar views, booking forms
- **Chat Interface**: Conversation management and message display
- **AI Configuration**: Visual setup interface for agents and personalities
- **WhatsApp Setup**: Step-by-step configuration wizard
- **Analytics Dashboard**: Real-time metrics and performance monitoring
- **Automation Builder**: Visual workflow and trigger configuration

## Firebase Integration

### Configuration
- Client-side SDK for real-time operations
- Server-side admin SDK for secure operations
- Storage service with image compression and thumbnail generation
- Type-safe service classes for each collection

### Services Pattern
```typescript
// Generic service for any collection
new FirestoreService<EntityType>(collectionName)

// Specialized services
propertyService, reservationService, clientService, etc.
```

## WhatsApp Integration

### Message Flow
1. Webhook receives message → `app/api/webhook/whatsapp/route.ts`
2. Message processed by agent → `app/api/agent/route.ts`
3. OpenAI determines intent and calls functions
4. Functions execute (search, calculate, send media)
5. Response sent back via WhatsApp API

### Function Calling (COMPREHENSIVE)
Agent can execute advanced functions:

**Search & Discovery**:
- `searchProperties`: Advanced filter-based property search with ML
- `getPropertyRecommendations`: Personalized recommendations
- `sendPropertyMedia`: Automated photo/video delivery with captions

**Pricing & Negotiation**:
- `calculatePrice`: Dynamic pricing with real-time calculations
- `applyDiscount`: Automated discount application
- `generateQuote`: Personalized pricing quotes

**Booking & Management**:
- `createReservation`: End-to-end booking creation
- `checkAvailability`: Real-time availability checking
- `sendConfirmation`: Automated confirmation delivery

**Customer Intelligence**:
- `analyzeClientBehavior`: Behavioral analysis and insights
- `updateClientPreferences`: Learning from interactions
- `triggerAutomations`: Context-based automation triggers

## Environment Configuration (ENHANCED)

Required environment variables (see `.env.example`):
- **Firebase**: API keys, project ID, service account credentials
- **OpenAI**: API key for GPT-4 function calling
- **WhatsApp**: Access token, phone number ID, verify token (configurable via UI)
- **Stripe**: Payment processing keys
- **Application**: Tenant ID, base URL, security settings

**NEW: Visual Configuration**
- WhatsApp credentials can be configured via `/dashboard/settings`
- Interactive setup wizard with validation
- Automatic environment variable generation
- Built-in connection testing and validation

## Development Patterns (ENTERPRISE-GRADE)

### Error Handling (PROFESSIONAL)
- **Error Classification System** (`lib/utils/errors.ts`): Categorizes errors by type
- **Recovery Strategies**: Automatic retry, circuit breaker, fallback responses
- **User-friendly Messages**: Context-aware error responses in Portuguese
- **Security**: No sensitive data exposure in error messages
- **Monitoring**: Comprehensive error logging and alerting

### Async Operations (ROBUST)
- **Timeout Handling** (`lib/utils/async.ts`): Configurable timeouts for all operations
- **Retry Logic**: Exponential backoff with smart retry policies
- **Rate Limiting**: Per-user and per-endpoint rate control
- **Circuit Breaker**: Automatic failure detection and recovery
- **Batch Processing**: Efficient bulk operations

### Type Safety (COMPREHENSIVE)
- **Runtime Validation** (`lib/utils/validation.ts`): TypeScript + runtime checks
- **Input Sanitization**: Security-focused data cleaning
- **Generic Service Classes**: Type-safe database operations
- **Proper Firebase Timestamp handling**: Date/time consistency
- **AI Type Definitions**: Complete typing for AI responses and contexts

### Real-time Features (ENHANCED)
- **Firestore onSnapshot**: Live updates with error handling
- **WhatsApp webhook**: Instant message processing with validation
- **Dashboard metrics**: Real-time data with caching
- **Performance monitoring**: Live system health tracking
- **User activity tracking**: Real-time engagement analytics

## Path Aliases

- `@/*` resolves to the project root
- Import examples: `@/lib/types`, `@/components/ui`, `@/theme/theme`

## Key Integration Points (UPDATED)

When extending the system:
1. **New agent functions**: Add to `lib/ai/agent-functions.ts` with proper error handling
2. **Database operations**: Use existing services or extend FirestoreService with validation
3. **API endpoints**: Follow existing patterns in `app/api/` with comprehensive error handling
4. **UI components**: Integrate with Material-UI theme system and atomic design principles
5. **WhatsApp features**: Extend webhook handler with rate limiting and validation
6. **Automation workflows**: Add to `lib/automation/` with trigger and action definitions
7. **Error handling**: Use classification system in `lib/utils/errors.ts`
8. **Validation**: Implement using utilities in `lib/utils/validation.ts`
9. **Performance**: Consider async patterns from `lib/utils/async.ts`
10. **Configuration**: Use dashboard interface for user-configurable features

## New Architecture Components

### Professional Error Handling
- **Error Classification**: Automatic categorization of errors
- **Recovery Mechanisms**: Retry, circuit breaker, fallback strategies
- **User Communication**: Context-aware error messages
- **Security**: No sensitive data leakage

### Performance & Reliability
- **Rate Limiting**: Abuse prevention and resource protection
- **Timeout Management**: Prevent hanging operations
- **Retry Logic**: Intelligent retry with exponential backoff
- **Circuit Breaker**: Automatic failure detection

### Security & Validation
- **Input Sanitization**: XSS and injection prevention
- **Type Validation**: Runtime type checking
- **Authentication**: Multi-layer security
- **Audit Logging**: Complete action tracking

### WhatsApp Configuration Interface
- **Visual Setup**: Step-by-step configuration wizard
- **Credential Management**: Secure storage and validation
- **Connection Testing**: Built-in connectivity verification
- **Environment Generation**: Automatic .env file creation

### Multi-tenant Architecture
- **Tenant Isolation**: Secure data separation
- **Configuration per Tenant**: Individual WhatsApp setups
- **Scalable Design**: Support for multiple organizations
- **Performance Optimization**: Tenant-aware caching