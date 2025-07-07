# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive real estate AI agent system called "agente-imobiliaria" built with Next.js 14, Material-UI, and Firebase. The system features an intelligent WhatsApp bot powered by OpenAI that helps clients find properties, calculate prices, and make reservations.

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

### AI Agent System
The heart of the application is an intelligent agent (`lib/services/openai.ts`) that:
- Processes WhatsApp messages using OpenAI GPT-4 function calling
- Maintains conversation context and client preferences
- Executes functions for property search, price calculation, and reservations
- Sends multimedia content (photos/videos) to clients
- Creates and manages reservations automatically

### Data Layer Architecture
- **Generic Firestore Service** (`lib/firebase/firestore.ts`): Type-safe CRUD operations with real-time subscriptions
- **Collections**: properties, reservations, clients, conversations, messages, amenities, payments
- **Specialized Query Services**: Property search, reservation management, conversation handling
- **Batch Operations**: For atomic multi-document transactions

### Pricing Engine
Sophisticated dynamic pricing system (`lib/services/pricing.ts`):
- Base pricing with weekend/holiday multipliers
- Seasonal rate adjustments
- Brazilian holiday calendar integration
- Real-time price calculations for date ranges
- Revenue projections and occupancy analytics

### API Routes Structure
```
app/api/
├── agent/route.ts              # Core AI agent processing
├── webhook/whatsapp/route.ts   # WhatsApp message handling
├── properties/route.ts         # Property CRUD operations
└── properties/[id]/route.ts    # Individual property management
```

## Key Data Models

### Property Interface
Complex property model with:
- Basic info (name, location, bedrooms, bathrooms)
- Media arrays (photos with ordering, videos)
- Dynamic pricing structure (base price, multipliers, seasonal rates)
- Amenities and availability status

### Conversation Flow
- **AgentContext**: Maintains search filters, interested properties, pending reservations
- **Message Processing**: WhatsApp → OpenAI → Function Execution → Response
- **Context Persistence**: Conversation state stored in Firestore

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

### UI Components
- **Header/Sidebar**: Navigation with WhatsApp status indicators
- **Property Components**: Cards, forms, galleries, pricing forms
- **Reservation Components**: Calendar views, booking forms
- **Chat Interface**: Conversation management and message display

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

### Function Calling
Agent can execute:
- `searchProperties`: Filter-based property search
- `calculatePrice`: Date-range pricing with breakdowns
- `sendPropertyMedia`: Automated photo/video delivery
- `createReservation`: End-to-end booking creation

## Environment Configuration

Required environment variables (see `.env.example`):
- **Firebase**: API keys, project ID, service account credentials
- **OpenAI**: API key for GPT-4 function calling
- **WhatsApp**: Access token, phone number ID, verify token
- **Stripe**: Payment processing keys

## Development Patterns

### Error Handling
- Consistent ApiResponse interface across all endpoints
- Try-catch blocks with proper error logging
- User-friendly error messages in Portuguese

### Type Safety
- Comprehensive TypeScript interfaces in `lib/types/index.ts`
- Generic service classes with type parameters
- Proper Firebase Timestamp handling

### Real-time Features
- Firestore onSnapshot for live updates
- WhatsApp webhook for instant message processing
- Dashboard metrics with real-time data

## Path Aliases

- `@/*` resolves to the project root
- Import examples: `@/lib/types`, `@/components/ui`, `@/theme/theme`

## Key Integration Points

When extending the system:
1. **New agent functions**: Add to `lib/services/agent-functions.ts`
2. **Database operations**: Use existing services or extend FirestoreService
3. **API endpoints**: Follow existing patterns in `app/api/`
4. **UI components**: Integrate with Material-UI theme system
5. **WhatsApp features**: Extend webhook handler and agent capabilities