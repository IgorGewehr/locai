# API Reference - AI Functions
# Locai Platform - Sofia AI Integration

**Total Functions:** 61 endpoints
**Last Updated:** 2025-11-26
**Version:** 2.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Standard Response Structure](#standard-response-structure)
3. [Property Management (9 Functions)](#1-property-management-9-functions)
4. [Reservations & Bookings (5 Functions)](#2-reservations--bookings-5-functions)
5. [Financial Operations (12 Functions)](#3-financial-operations-12-functions)
6. [CRM & Leads (11 Functions)](#4-crm--leads-11-functions)
7. [Analytics & Tracking (7 Functions)](#5-analytics--tracking-7-functions)
8. [Notifications & Communication (3 Functions)](#6-notifications--communication-3-functions)
9. [Configuration & Settings (5 Functions)](#7-configuration--settings-5-functions)
10. [Goals, Tasks & Reports (9 Functions)](#8-goals-tasks--reports-9-functions)
11. [Common Patterns](#common-patterns)
12. [N8N Integration Notes](#integration-notes-for-n8nsofia-ai)

---

## Overview

All AI functions are exposed as **POST endpoints** at:
```
POST /api/ai/functions/{function-name}
```

### Key Principles

- **Multi-tenant isolation:** ALL functions require `tenantId` parameter
- **Type safety:** Zod validation on all inputs
- **Security:** Input sanitization + PII masking in logs
- **Professional logging:** Structured logs with request tracing
- **Error handling:** Standardized error responses

---

## Standard Response Structure

All functions follow this response pattern:

```typescript
{
  success: boolean;
  data?: any; // Function-specific data
  error?: string; // Error message if success = false
  details?: any; // Additional error details (dev mode only)
  requestId?: string; // Unique request identifier
  meta: {
    requestId: string;
    processingTime: number; // Milliseconds
    timestamp: string; // ISO date
  }
}
```

### HTTP Status Codes

- **200:** Success
- **400:** Validation errors, missing required parameters
- **401:** Authentication failures
- **500:** Server errors, function execution failures

---

## 1. Property Management (9 Functions)

### 1.1 search-properties

**Endpoint:** `POST /api/ai/functions/search-properties`

**Description:** Searches properties based on multiple filters including location, capacity, price range, and amenities.

**Required Parameters:**
- `tenantId` (string) - Tenant identifier

**Optional Parameters:**
- `location` (string) - Location filter
- `guests` (number) - Number of guests (values = 0 are ignored)
- `bedrooms` (number) - Number of bedrooms (values = 0 are ignored)
- `checkIn` (string) - Check-in date (ISO format)
- `checkOut` (string) - Check-out date (ISO format)
- `maxPrice` (number) - Maximum price (values = 0 are ignored)
- `amenities` (string[] | string) - Array or comma-separated string
- `propertyType` (string) - Type of property

**Note:** Numeric filters (`guests`, `bedrooms`, `maxPrice`) with value `0` are automatically ignored and treated as if not provided. This allows flexible filtering where `0` means "no filter".

**Returns:**
```typescript
{
  success: boolean;
  data: Property[];
  meta: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "location": "Praia Grande",
  "guests": 4,
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-27",
  "maxPrice": 3000,
  "amenities": ["piscina", "wifi"]
}
```

---

### 1.2 get-property-details

**Endpoint:** `POST /api/ai/functions/get-property-details`

**Description:** Retrieves complete details of a specific property including amenities, photos, and availability.

**Required Parameters:**
- `tenantId` (string)
- `propertyName` (string) - Property name (MANDATORY)

**Optional Parameters:**
- `propertyIndex` (number) - Property index
- `propertyReference` (string) - Property reference code

**Returns:**
```typescript
{
  success: boolean;
  data: {
    property: Property;
    details: PropertyDetails;
    amenities: string[];
    photos: Photo[];
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "propertyName": "Casa na Praia"
}
```

---

### 1.3 send-property-media

**Endpoint:** `POST /api/ai/functions/send-property-media`

**Description:** Sends property photos/videos to client via WhatsApp.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `propertyName` (string) - Property name
- `propertyIndex` (number) - Property index
- `mediaType` ('photos' | 'videos' | 'all') - Type of media to send

**Returns:**
```typescript
{
  success: boolean;
  data: {
    mediaUrls: string[];
    mediaType: string;
    propertyName: string;
  };
  meta: { ... }
}
```

---

### 1.4 send-property-map

**Endpoint:** `POST /api/ai/functions/send-property-map`

**Description:** Sends property location map to client.

**Required Parameters:**
- `tenantId` (string)
- `propertyName` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    mapUrl: string;
    coordinates: { lat: number; lng: number };
  };
  meta: { ... }
}
```

---

### 1.5 send-tenant-map

**Endpoint:** `POST /api/ai/functions/send-tenant-map`

**Description:** Sends map showing all properties in tenant's portfolio.

**Required Parameters:**
- `tenantId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    mapUrl: string;
    propertiesCount: number;
  };
  meta: { ... }
}
```

---

### 1.6 check-availability

**Endpoint:** `POST /api/ai/functions/check-availability`

**Description:** Checks if property is available for specified dates.

**Required Parameters:**
- `tenantId` (string)
- `propertyName` (string)
- `checkIn` (string) - ISO date
- `checkOut` (string) - ISO date

**Returns:**
```typescript
{
  success: boolean;
  data: {
    available: boolean;
    conflicts: Reservation[];
    blockedDates: string[];
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "propertyName": "Casa na Praia",
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-27"
}
```

---

### 1.7 check-visit-availability

**Endpoint:** `POST /api/ai/functions/check-visit-availability`

**Description:** Checks available time slots for property visits.

**Required Parameters:**
- `tenantId` (string)
- `visitDate` (string) - ISO date

**Optional Parameters:**
- `propertyId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    availableSlots: TimeSlot[];
    occupiedSlots: TimeSlot[];
  };
  meta: { ... }
}
```

---

### 1.8 schedule-visit

**Endpoint:** `POST /api/ai/functions/schedule-visit`

**Description:** Schedules a property visit for a client.

**Required Parameters:**
- `tenantId` (string)
- `propertyId` (string)
- `visitDate` (string) - ISO date

**Optional Parameters:**
- `clientId` (string)
- `clientName` (string)
- `clientPhone` (string)
- `visitTime` (string) - HH:MM format
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    visitId: string;
    scheduledDate: string;
    scheduledTime: string;
    confirmationSent: boolean;
  };
  meta: { ... }
}
```

---

### 1.9 check-agenda-availability

**Endpoint:** `POST /api/ai/functions/check-agenda-availability`

**Description:** Checks agenda availability for meetings/visits.

**Required Parameters:**
- `tenantId` (string)
- `year` (number)
- `month` (number) - 1-12

**Optional Parameters:**
- `day` (number) - If provided, returns only that day

**Returns:**
```typescript
{
  success: boolean;
  data: {
    availableSlots: AgendaSlot[];
    occupiedSlots: OccupiedTimeSlot[];
    date: string;
  };
  meta: { ... }
}
```

---

## 2. Reservations & Bookings (5 Functions)

### 2.1 create-reservation

**Endpoint:** `POST /api/ai/functions/create-reservation`

**Description:** Creates a new reservation for a property.

**Required Parameters:**
- `tenantId` (string)
- `propertyName` (string)
- `checkIn` (string) - ISO date
- `checkOut` (string) - ISO date
- `guests` (number)

**Optional Parameters:**
- `clientId` (string)
- `clientPhone` (string)
- `clientName` (string)
- `clientEmail` (string)
- `totalPrice` (number)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    reservationId: string;
    confirmationCode: string;
    property: Property;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    status: 'pending' | 'confirmed';
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "propertyName": "Casa na Praia",
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-27",
  "guests": 4,
  "clientPhone": "+5511999999999",
  "clientName": "João Silva",
  "totalPrice": 2800
}
```

---

### 2.2 cancel-reservation

**Endpoint:** `POST /api/ai/functions/cancel-reservation`

**Description:** Cancels an existing reservation with optional refund calculation.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `reservationId` (string) OR
- `clientPhone` (string)

**Optional Parameters:**
- `reason` (string)
- `refundAmount` (number)
- `refundPercentage` (number)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    reservationId: string;
    status: 'cancelled';
    refundAmount: number;
    refundPercentage: number;
    cancelledAt: string;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "clientPhone": "+5511999999999",
  "reason": "Cliente desistiu",
  "refundPercentage": 50
}
```

---

### 2.3 modify-reservation

**Endpoint:** `POST /api/ai/functions/modify-reservation`

**Description:** Modifies dates, guests, or other reservation details.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `reservationId` (string) OR
- `clientPhone` (string)

**Optional Parameters (updates object):**
- `checkIn` (string)
- `checkOut` (string)
- `guests` (number)
- `totalPrice` (number)
- `status` (ReservationStatus)
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    reservationId: string;
    updatedFields: string[];
    newCheckIn?: string;
    newCheckOut?: string;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "clientPhone": "+5511999999999",
  "updates": {
    "checkIn": "2025-12-21",
    "checkOut": "2025-12-28",
    "guests": 5
  }
}
```

---

### 2.4 schedule-meeting

**Endpoint:** `POST /api/ai/functions/schedule-meeting`

**Description:** Schedules meetings (key pickup, property tour, etc.).

**Required Parameters:**
- `tenantId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    meetingId: string;
    scheduledAt: string;
  };
  meta: { ... }
}
```

---

### 2.5 get-policies

**Endpoint:** `POST /api/ai/functions/get-policies`

**Description:** Retrieves property and booking policies.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `policyType` ('cancellation' | 'payment' | 'check_in' | 'general' | 'all')
- `propertyId` (string) - For property-specific policies

**Returns:**
```typescript
{
  success: boolean;
  data: {
    cancellationPolicy: Policy;
    paymentPolicy: Policy;
    checkInPolicy: Policy;
    houseRules: string[];
  };
  meta: { ... }
}
```

---

## 3. Financial Operations (12 Functions)

### 3.1 calculate-price

**Endpoint:** `POST /api/ai/functions/calculate-price`

**Description:** Calculates total price including all fees, taxes, and discounts.

**Required Parameters:**
- `tenantId` (string)
- `propertyName` (string)
- `checkIn` (string) - ISO date
- `checkOut` (string) - ISO date

**Optional Parameters:**
- `guests` (number)
- `clientPhone` (string) - For context access

**Returns:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    basePrice: number;
    taxes: number;
    fees: number;
    discounts: number;
    currency: string;
    breakdown: PriceBreakdown;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "propertyName": "Casa na Praia",
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-27",
  "guests": 4
}
```

---

### 3.2 calculate-dynamic-discount

**Endpoint:** `POST /api/ai/functions/calculate-dynamic-discount`

**Description:** Calculates dynamic discounts based on multiple criteria (payment method, booking timing, stay duration, lead temperature).

**Required Parameters:**
- `tenantId` (string)
- `propertyName` (string)
- `checkIn` (string)
- `checkOut` (string)
- `totalPrice` (number)
- `clientPhone` (string)

**Optional Parameters:**
- `paymentMethod` ('pix' | 'card' | 'cash')
- `bookNow` (boolean) - Immediate booking incentive
- `extendStay` (number) - Additional days
- `leadTemperature` ('cold' | 'warm' | 'hot')

**Returns:**
```typescript
{
  success: boolean;
  data: {
    type: string;
    percentage: number;
    amount: number;
    originalPrice: number;
    finalPrice: number;
    reason: string;
    message: string;
    conditions?: string[];
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "propertyName": "Casa na Praia",
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-27",
  "totalPrice": 2800,
  "clientPhone": "+5511999999999",
  "paymentMethod": "pix",
  "bookNow": true
}
```

---

### 3.3 check-discount-opportunities

**Endpoint:** `POST /api/ai/functions/check-discount-opportunities`

**Description:** Lists all available discount strategies and best combinations.

**Required Parameters:**
- `tenantId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    opportunities: {
      paymentMethod: PaymentMethodDiscounts;
      extendedStay: ExtendedStayDiscounts;
      earlyBooking: EarlyBookingDiscounts;
      lastMinute: LastMinuteDiscounts;
      bookNow: BookNowDiscount;
      limits: DiscountLimits;
    };
    bestCombinations: DiscountCombination[];
    negotiationTips: NegotiationTip[];
    summary: DiscountSummary;
  };
  meta: { ... }
}
```

---

### 3.4 generate-quote

**Endpoint:** `POST /api/ai/functions/generate-quote`

**Description:** Generates a formal price quote for the client.

**Required Parameters:**
- `tenantId` (string)
- `propertyId` (string)
- `checkIn` (string)
- `checkOut` (string)
- `guests` (number)

**Optional Parameters:**
- `includeDetails` (boolean)
- `paymentMethod` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    quoteId: string;
    property: Property;
    pricing: PricingDetails;
    paymentTerms: PaymentTerms;
    expiresAt: string;
  };
  meta: { ... }
}
```

---

### 3.5 create-transaction

**Endpoint:** `POST /api/ai/functions/create-transaction`

**Description:** Creates a financial transaction record.

**Required Parameters:**
- `tenantId` (string)
- `reservationId` (string)
- `clientId` (string)
- `propertyId` (string)
- `totalAmount` (number)
- `paymentMethod` ('pix' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash')

**Optional Parameters:**
- `advancePaymentPercentage` (number) - e.g., 10 for 10%
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    transactionId: string;
    amount: number;
    paymentMethod: string;
    status: 'pending' | 'completed';
    dueDate: string;
  };
  meta: { ... }
}
```

---

### 3.6 get-negotiation-settings

**Endpoint:** `POST /api/ai/functions/get-negotiation-settings`

**Description:** Retrieves tenant negotiation settings for AI-driven price negotiations.

**Required Parameters:**
- `tenantId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    settings: NegotiationSettings;
    isDefault: boolean;
  };
  meta: { ... }
}
```

---

### 3.7 generate-pix-qrcode

**Endpoint:** `POST /api/ai/functions/generate-pix-qrcode`

**Description:** Generates PIX QR code for payment.

**Required Parameters:**
- `tenantId` (string)

---

### 3.8 create-payment-link

**Endpoint:** `POST /api/ai/functions/create-payment-link`

**Description:** Creates a payment link for online transactions.

**Required Parameters:**
- `tenantId` (string)

---

### 3.9 check-payment-status

**Endpoint:** `POST /api/ai/functions/check-payment-status`

**Description:** Checks the status of a payment transaction.

**Required Parameters:**
- `tenantId` (string)

---

### 3.10 list-pending-payments

**Endpoint:** `POST /api/ai/functions/list-pending-payments`

**Description:** Lists all pending payments for the tenant.

**Required Parameters:**
- `tenantId` (string)

---

### 3.11 cancel-payment

**Endpoint:** `POST /api/ai/functions/cancel-payment`

**Description:** Cancels a pending payment.

**Required Parameters:**
- `tenantId` (string)

---

### 3.12 get-financial-summary

**Endpoint:** `POST /api/ai/functions/get-financial-summary`

**Description:** Retrieves financial summary for the tenant.

**Required Parameters:**
- `tenantId` (string)

---

## 4. CRM & Leads (11 Functions)

### 4.1 create-lead

**Endpoint:** `POST /api/ai/functions/create-lead`

**Description:** Creates a new lead in the CRM system.

**Required Parameters:**
- `tenantId` (string)
- `phone` (string)

**Optional Parameters:**
- `whatsappNumber` (string)
- `name` (string)
- `email` (string)
- `source` ('whatsapp_ai' | 'website' | 'referral' | 'social_media' | 'manual')
- `sourceDetails` (string)
- `initialInteraction` (string)
- `preferences` (object):
  - `propertyType` (string[])
  - `location` (string[])
  - `priceRange` ({ min: number; max: number })
  - `bedrooms` ({ min: number; max: number })

**Returns:**
```typescript
{
  success: boolean;
  data: {
    leadId: string;
    phone: string;
    name?: string;
    score: number;
    temperature: 'cold' | 'warm' | 'hot';
    status: LeadStatus;
    createdAt: string;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "phone": "+5511999999999",
  "name": "João Silva",
  "source": "whatsapp_ai",
  "preferences": {
    "location": ["Praia Grande", "Santos"],
    "priceRange": { "min": 2000, "max": 4000 },
    "bedrooms": { "min": 2, "max": 4 }
  }
}
```

---

### 4.2 update-lead

**Endpoint:** `POST /api/ai/functions/update-lead`

**Description:** Updates lead information and scoring.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `leadId` (string) OR
- `clientPhone` (string)

**Optional Parameters (updates object):**
- `name` (string)
- `email` (string)
- `status` (string)
- `score` (number)
- `temperature` ('cold' | 'warm' | 'hot')
- `clientId` (string)
- `preferences` (object)
- `tags` (string[])
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    leadId: string;
    updatedFields: string[];
  };
  meta: { ... }
}
```

---

### 4.3 classify-lead

**Endpoint:** `POST /api/ai/functions/classify-lead`

**Description:** Classifies lead based on interaction quality and interest level.

**Required Parameters:**
- `tenantId` (string)
- `clientPhone` (string)
- `interactionType` (string)

**Optional Parameters:**
- `sentiment` ('positive' | 'neutral' | 'negative')
- `interestedProperties` (string[])
- `budget` (number)
- `timeline` (string)
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    leadId: string;
    classification: LeadClassification;
    score: number;
    temperature: string;
    recommendedActions: string[];
  };
  meta: { ... }
}
```

---

### 4.4 update-lead-status

**Endpoint:** `POST /api/ai/functions/update-lead-status`

**Description:** Updates lead status in the pipeline.

**Required Parameters:**
- `tenantId` (string)
- `clientPhone` (string)
- `newStatus` (string)

**Optional Parameters:**
- `reason` (string)
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    leadId: string;
    oldStatus: string;
    newStatus: string;
    updatedAt: string;
  };
  meta: { ... }
}
```

---

### 4.5 get-lead-details

**Endpoint:** `POST /api/ai/functions/get-lead-details`

**Description:** Retrieves complete lead profile with optional related data.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `leadId` (string) OR
- `clientPhone` (string)

**Optional Parameters:**
- `includeInteractions` (boolean)
- `includeTasks` (boolean)
- `includeAnalytics` (boolean)
- `includeRecommendations` (boolean)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    lead: Lead;
    interactions?: Interaction[];
    tasks?: Task[];
    analytics?: LeadAnalytics;
    recommendations?: string[];
  };
  meta: { ... }
}
```

---

### 4.6 get-leads-list

**Endpoint:** `POST /api/ai/functions/get-leads-list`

**Description:** Lists leads with advanced filtering and pagination.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `status` (string | string[])
- `source` (string | string[])
- `temperature` ('cold' | 'warm' | 'hot')
- `assignedTo` (string)
- `minScore` (number)
- `maxScore` (number)
- `createdAfter` (string) - ISO date
- `createdBefore` (string) - ISO date
- `limit` (number) - Default 50
- `offset` (number) - For pagination
- `sortBy` ('score' | 'lastContactDate' | 'createdAt' | 'temperature')
- `sortOrder` ('asc' | 'desc')
- `includeAnalytics` (boolean)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    leads: Lead[];
    total: number;
    page: number;
    hasMore: boolean;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "temperature": "hot",
  "status": ["qualified", "presentation"],
  "sortBy": "score",
  "sortOrder": "desc",
  "limit": 20
}
```

---

### 4.7 add-lead-interaction

**Endpoint:** `POST /api/ai/functions/add-lead-interaction`

**Description:** Logs an interaction with a lead and updates scoring.

**Required Parameters:**
- `tenantId` (string)
- `type` ('whatsapp_message' | 'phone_call' | 'email' | 'visit' | 'meeting' | 'note' | 'property_view' | 'quote_sent')
- `content` (string)

**Either:**
- `leadId` (string) OR
- `clientPhone` (string)

**Optional Parameters:**
- `sentiment` ('positive' | 'neutral' | 'negative')
- `metadata` (Record<string, any>)
- `updateScore` (boolean) - Default true
- `autoClassify` (boolean) - Default true

**Returns:**
```typescript
{
  success: boolean;
  data: {
    interactionId: string;
    leadId: string;
    scoreAdjustment: number;
    newScore: number;
  };
  meta: { ... }
}
```

---

### 4.8 analyze-lead-performance

**Endpoint:** `POST /api/ai/functions/analyze-lead-performance`

**Description:** Analyzes lead performance over time with AI insights.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `leadId` (string) OR
- `clientPhone` (string)

**Optional Parameters:**
- `timeRange` ('7d' | '30d' | '90d' | '6m')
- `includeRecommendations` (boolean)
- `includePredictions` (boolean)
- `includeComparison` (boolean)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    performance: PerformanceMetrics;
    recommendations?: string[];
    predictions?: ConversionPrediction;
    comparison?: BenchmarkComparison;
  };
  meta: { ... }
}
```

---

### 4.9 follow-up-lead

**Endpoint:** `POST /api/ai/functions/follow-up-lead`

**Description:** Creates follow-up task or executes immediate follow-up.

**Required Parameters:**
- `tenantId` (string)
- `followUpType` ('call' | 'whatsapp' | 'email' | 'visit' | 'proposal')

**Either:**
- `leadId` (string) OR
- `clientPhone` (string)

**Optional Parameters:**
- `priority` ('low' | 'medium' | 'high' | 'urgent')
- `scheduledFor` (string) - ISO date
- `message` (string)
- `autoExecute` (boolean) - Execute immediately
- `assignTo` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    followUpId: string;
    taskCreated: boolean;
    scheduledFor: string;
    executed: boolean;
  };
  meta: { ... }
}
```

---

### 4.10 lead-pipeline-movement

**Endpoint:** `POST /api/ai/functions/lead-pipeline-movement`

**Description:** Moves lead through pipeline stages with automatic task creation.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `leadId` (string) OR
- `clientPhone` (string)

**Optional Parameters:**
- `currentStatus` (string)
- `newStatus` (string)
- `reason` (string)
- `autoAdvance` (boolean) - AI determines next stage
- `createTasks` (boolean) - Auto-create tasks for new stage
- `assignTo` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    leadId: string;
    movedFrom: string;
    movedTo: string;
    tasksCreated: Task[];
    nextRecommendedAction: string;
  };
  meta: { ... }
}
```

---

### 4.11 register-client

**Endpoint:** `POST /api/ai/functions/register-client`

**Description:** Registers a new client in the system.

**Required Parameters:**
- `tenantId` (string)
- `name` (string)

**Optional Parameters:**
- `phone` (string)
- `email` (string)
- `document` (string) - CPF/ID
- `whatsappNumber` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    clientId: string;
    name: string;
    phone?: string;
    email?: string;
  };
  meta: { ... }
}
```

---

## 5. Analytics & Tracking (7 Functions)

### 5.1 track-conversion-step

**Endpoint:** `POST /api/ai/functions/track-conversion-step`

**Description:** Tracks conversion funnel progression (e.g., interested → qualified → proposal).

**Required Parameters:**
- `tenantId` (string)
- `leadId` (string) - Phone, clientId, or generated ID

**Optional Parameters:**
- `sessionId` (string) - Generated if not provided
- `eventData` (object | string) - Accepts any structure

**Returns:**
```typescript
{
  success: boolean;
  data: {
    metricId: string;
    eventType: 'conversion_step';
    tracked: boolean;
    timestamp: string;
    context: string;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "leadId": "+5511999999999",
  "sessionId": "session_abc123",
  "eventData": {
    "step": "qualified",
    "previousStep": "interested",
    "properties_viewed": 3,
    "budget_confirmed": true
  }
}
```

---

### 5.2 track-conversation-metric

**Endpoint:** `POST /api/ai/functions/track-conversation-metric`

**Description:** Generic conversation metric tracking for Sofia AI.

**Required Parameters:**
- `tenantId` (string)
- `eventType` ('conversion_step' | 'qualification_milestone' | 'message_engagement' | 'conversation_session')
- `leadId` (string)

**Optional Parameters:**
- `sessionId` (string)
- `eventData` (object | string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    metricId: string;
    eventType: string;
    tracked: boolean;
    timestamp: string;
    context: string;
  };
  meta: { ... }
}
```

---

### 5.3 track-conversation-session

**Endpoint:** `POST /api/ai/functions/track-conversation-session`

**Description:** Tracks complete conversation sessions with duration and outcomes.

**Required Parameters:**
- `tenantId` (string)
- `leadId` (string)

**Optional Parameters:**
- `sessionId` (string)
- `eventData` (object):
  - `duration` (number) - Seconds
  - `messageCount` (number)
  - `outcome` (string)
  - `satisfaction` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    metricId: string;
    eventType: 'conversation_session';
    tracked: boolean;
    timestamp: string;
    context: string;
  };
  meta: { ... }
}
```

---

### 5.4 track-message-engagement

**Endpoint:** `POST /api/ai/functions/track-message-engagement`

**Description:** Tracks individual message engagement metrics.

**Required Parameters:**
- `tenantId` (string)
- `leadId` (string)

**Optional Parameters:**
- `sessionId` (string)
- `eventData` (object):
  - `outcome` (string)
  - `responseTime` (number) - Seconds
  - `engagementLevel` (string)
  - `sentiment` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    metricId: string;
    eventType: 'message_engagement';
    tracked: boolean;
    timestamp: string;
    context: string;
  };
  meta: { ... }
}
```

---

### 5.5 track-qualification-milestone

**Endpoint:** `POST /api/ai/functions/track-qualification-milestone`

**Description:** Tracks lead qualification milestones.

**Required Parameters:**
- `tenantId` (string)
- `leadId` (string)

**Optional Parameters:**
- `sessionId` (string)
- `eventData` (object):
  - `milestone` (string) - Default 'qualified'
  - `timeToMilestone` (number) - Seconds
  - `qualificationScore` (number)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    metricId: string;
    eventType: 'qualification_milestone';
    tracked: boolean;
    timestamp: string;
    context: string;
  };
  meta: { ... }
}
```

---

### 5.6 get-analytics-dashboard

**Endpoint:** `POST /api/ai/functions/get-analytics-dashboard`

**Description:** Retrieves comprehensive analytics dashboard for Sofia AI performance.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `period` ('24h' | '7d' | '30d' | '90d') - Default '7d'
- `includeHeatmap` (boolean) - Default true
- `includeTrends` (boolean) - Default true

**Returns:**
```typescript
{
  success: boolean;
  data: {
    summary: {
      totalConversations: number;
      conversionRate: number;
      avgQualificationTime: number;
      avgConversationTime: number;
      responseRate: number;
    };
    trends: TrendData;
    insights: string[];
    heatmap?: HeatmapData;
    recentTrends?: TrendPoint[];
  };
  meta: { ... }
}
```

---

### 5.7 get-business-insights

**Endpoint:** `POST /api/ai/functions/get-business-insights`

**Description:** Generates AI-powered business insights and recommendations.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `insightType` (string) - Default 'all'
- `period` ('7d' | '30d' | '90d') - Default '7d'
- `includeRecommendations` (boolean) - Default true
- `focusArea` (string) - Default 'general'

**Returns:**
```typescript
{
  success: boolean;
  data: {
    summary: InsightSummary;
    insights: Insight[];
    alerts: Alert[];
    opportunities: Opportunity[];
    recommendations: Recommendation[];
  };
  meta: { ... }
}
```

---

## 6. Notifications & Communication (3 Functions)

### 6.1 post-conversation

**Endpoint:** `POST /api/ai/functions/post-conversation`

**Description:** Saves conversation messages (both client and Sofia) to permanent storage.

**Required Parameters:**
- `tenantId` (string)
- `clientMessage` (string)
- `clientPhone` (string)

**Optional Parameters:**
- `sofiaMessage` (string) - Can be null
- `clientMessageTimestamp` (string) - ISO date
- `sofiaMessageTimestamp` (string) - ISO date

**Returns:**
```typescript
{
  success: boolean;
  conversationId: string;
  messageId: string;
  isNewConversation: boolean;
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "clientPhone": "+5511999999999",
  "clientMessage": "Oi Sofia, gostaria de saber sobre casas na praia",
  "sofiaMessage": "Olá! Claro, temos várias opções. Para qual período você está buscando?"
}
```

---

### 6.2 post-notification

**Endpoint:** `POST /api/ai/functions/post-notification`

**Description:** Sofia AI notifies admin when client requests human assistance.

**Required Parameters:**
- `tenantId` (string)
- `clientPhone` (string)

**Optional Parameters:**
- `reason` (string) - Reason for requesting human assistance

**Returns:**
```typescript
{
  success: boolean;
  data: {
    notificationId: string;
    message: string;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "clientPhone": "+5511999999999",
  "reason": "Cliente solicitou falar com humano"
}
```

---

### 6.3 send-payment-reminder

**Endpoint:** `POST /api/ai/functions/send-payment-reminder`

**Description:** Sends payment reminder notifications to clients.

**Required Parameters:**
- `tenantId` (string)

---

## 7. Configuration & Settings (5 Functions)

### 7.1 get-tenant-config

**Endpoint:** `POST /api/ai/functions/get-tenant-config`

**Description:** Retrieves complete tenant configuration including AI settings, negotiation rules, policies, and company info.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `includeSettings` (array) - ['ai', 'negotiation', 'policies', 'company', 'all']

**Returns:**
```typescript
{
  success: boolean;
  data: {
    tenantId: string;
    aiConfig?: AIConfig;
    negotiation?: NegotiationSettings;
    policies?: Policies;
    company?: CompanyInfo;
    fetchedAt: string;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "includeSettings": ["ai", "negotiation", "company"]
}
```

---

### 7.2 get-agent-prompts

**Endpoint:** `POST /api/ai/functions/get-agent-prompts`

**Description:** Generates dynamic agent prompts based on tenant configuration for multi-agent N8N workflows.

**Required Parameters:**
- `tenantId` (string)

**Optional Parameters:**
- `agentType` ('router' | 'search' | 'booking' | 'sales' | 'support' | 'all') - Default 'all'

**Returns:**
```typescript
{
  success: boolean;
  data: {
    tenantId: string;
    agentType: string;
    prompts: {
      router?: string;
      search?: string;
      booking?: string;
      sales?: string;
      support?: string;
    };
    generatedAt: string;
    configurations: ConfigSummary;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "agentType": "all"
}
```

---

### 7.3 get-cancellation-policies

**Endpoint:** `POST /api/ai/functions/get-cancellation-policies`

**Description:** Retrieves cancellation policies.

**Required Parameters:**
- `tenantId` (string)

---

### 7.4 get-company-address

**Endpoint:** `POST /api/ai/functions/get-company-address`

**Description:** Retrieves company address and contact information.

**Required Parameters:**
- `tenantId` (string)

---

### 7.5 request-withdrawal

**Endpoint:** `POST /api/ai/functions/request-withdrawal`

**Description:** Handles withdrawal requests.

**Required Parameters:**
- `tenantId` (string)

---

## 8. Goals, Tasks & Reports (9 Functions)

### 8.1 create-goal

**Endpoint:** `POST /api/ai/functions/create-goal`

**Description:** Creates business goals for tracking.

**Required Parameters:**
- `tenantId` (string)
- `name` (string)
- `type` ('revenue' | 'occupancy' | 'bookings' | 'average_ticket' | 'customer_acquisition')
- `targetValue` (number)
- `period` (object):
  - `startDate` (string)
  - `endDate` (string)
- `frequency` ('daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')

**Optional Parameters:**
- `description` (string)
- `notifications` (boolean)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    goalId: string;
    name: string;
    type: string;
    targetValue: number;
    currentValue: number;
    progress: number;
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "name": "Meta de Faturamento Q1",
  "type": "revenue",
  "targetValue": 100000,
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-03-31"
  },
  "frequency": "monthly"
}
```

---

### 8.2 update-goal-progress

**Endpoint:** `POST /api/ai/functions/update-goal-progress`

**Description:** Updates goal progress and tracks milestones.

**Required Parameters:**
- `tenantId` (string)

**Either:**
- `goalId` (string) OR
- `goalName` (string)

**Optional Parameters:**
- `currentValue` (number) - Set absolute value
- `addProgress` (number) - Add to current progress
- `notes` (string)
- `milestone` (object):
  - `name` (string)
  - `achieved` (boolean)
  - `date` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    goalId: string;
    oldValue: number;
    newValue: number;
    progress: number;
    milestoneAchieved?: boolean;
  };
  meta: { ... }
}
```

---

### 8.3 create-task

**Endpoint:** `POST /api/ai/functions/create-task`

**Description:** Creates tasks for follow-ups and action items.

**Required Parameters:**
- `tenantId` (string)
- `title` (string)
- `type` ('call' | 'email' | 'meeting' | 'follow_up' | 'document' | 'other')
- `priority` ('low' | 'medium' | 'high' | 'urgent')
- `dueDate` (string) - ISO date

**Optional Parameters:**
- `leadId` (string)
- `clientId` (string)
- `description` (string)
- `reminderDate` (string) - ISO date
- `assignedTo` (string)
- `notes` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    taskId: string;
    title: string;
    type: string;
    priority: string;
    dueDate: string;
    status: 'pending';
  };
  meta: { ... }
}
```

**Example Request:**
```json
{
  "tenantId": "tenant123",
  "title": "Ligar para João Silva",
  "type": "call",
  "priority": "high",
  "dueDate": "2025-11-27T14:00:00Z",
  "leadId": "lead_abc123",
  "description": "Follow-up sobre visita ao imóvel"
}
```

---

### 8.4 update-task

**Endpoint:** `POST /api/ai/functions/update-task`

**Description:** Updates task status and details.

**Required Parameters:**
- `tenantId` (string)
- `taskId` (string)

**Optional Parameters (updates object):**
- `status` ('pending' | 'in_progress' | 'completed' | 'cancelled')
- `notes` (string)
- `outcome` (string)
- `completedAt` (string) - ISO date
- `priority` ('low' | 'medium' | 'high' | 'urgent')

**Returns:**
```typescript
{
  success: boolean;
  data: {
    taskId: string;
    updatedFields: string[];
    newStatus: string;
  };
  meta: { ... }
}
```

---

### 8.5 generate-report

**Endpoint:** `POST /api/ai/functions/generate-report`

**Description:** Generates business reports with optional forecasting.

**Required Parameters:**
- `tenantId` (string)
- `reportType` ('financial' | 'crm' | 'properties' | 'occupancy' | 'custom')
- `period` (object):
  - `startDate` (string) - ISO date
  - `endDate` (string) - ISO date

**Optional Parameters:**
- `metrics` (string[]) - Specific metrics to include
- `format` ('summary' | 'detailed' | 'insights')
- `includeComparison` (boolean) - Compare with previous period
- `includeForecasting` (boolean) - Include projections

**Returns:**
```typescript
{
  success: boolean;
  data: {
    reportId: string;
    reportType: string;
    period: Period;
    data: ReportData;
    summary: ReportSummary;
    comparison?: ComparisonData;
    forecasting?: ForecastData;
  };
  meta: { ... }
}
```

---

### 8.6 track-metrics

**Endpoint:** `POST /api/ai/functions/track-metrics`

**Description:** Tracks business metrics over time.

**Required Parameters:**
- `tenantId` (string)
- `metricType` ('revenue' | 'occupancy' | 'conversion' | 'lead_score' | 'customer_satisfaction')

**Optional Parameters:**
- `period` ('today' | 'week' | 'month' | 'quarter' | 'year')
- `includeGrowth` (boolean)
- `includeTrends` (boolean)
- `clientPhone` (string) - For client-specific metrics

**Returns:**
```typescript
{
  success: boolean;
  data: {
    metricType: string;
    currentValue: number;
    previousValue?: number;
    growth?: number;
    trends?: TrendData[];
  };
  meta: { ... }
}
```

---

### 8.7 analyze-performance

**Endpoint:** `POST /api/ai/functions/analyze-performance`

**Description:** Analyzes business performance with AI-powered insights.

**Required Parameters:**
- `tenantId` (string)
- `analysisType` ('properties' | 'financial' | 'crm' | 'overall')
- `period` (object):
  - `startDate` (string)
  - `endDate` (string)

**Optional Parameters:**
- `includeRecommendations` (boolean)
- `includeAiInsights` (boolean)
- `compareWithPrevious` (boolean)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    analysisType: string;
    period: Period;
    performance: PerformanceMetrics;
    recommendations?: string[];
    insights?: AIInsights;
    comparison?: ComparisonData;
  };
  meta: { ... }
}
```

---

### 8.8 wallet-add-credit

**Endpoint:** `POST /api/ai/functions/wallet-add-credit`

**Description:** Adds credit to client wallet (commissions, bonuses, promotions).

**Required Parameters:**
- `tenantId` (string)
- `clientId` (string)
- `amount` (number) - Must be positive
- `description` (string)

**Optional Parameters:**
- `reference` (string)
- `transactionId` (string)
- `reservationId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    walletTransactionId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    status: 'completed';
    processedAt: string;
  };
  meta: { ... }
}
```

---

### 8.9 wallet-get-balance

**Endpoint:** `POST /api/ai/functions/wallet-get-balance`

**Description:** Retrieves client wallet balance and transaction history summary.

**Required Parameters:**
- `tenantId` (string)
- `clientId` (string)

**Returns:**
```typescript
{
  success: boolean;
  data: {
    walletId: string;
    balance: number;
    pendingBalance: number;
    totalEarned: number;
    totalSpent: number;
    totalWithdrawn: number;
    isActive: boolean;
    isFrozen: boolean;
  };
  meta: { ... }
}
```

---

## Common Patterns

### Multi-Tenant Isolation

**ALL functions require `tenantId`** as the first parameter to ensure complete data isolation between tenants.

```json
{
  "tenantId": "tenant123",
  ...
}
```

### Flexible Identifier Patterns

Many functions accept **multiple ways to identify entities**:

```typescript
// Lead/Client identification
{
  "leadId": "lead_abc123"  // OR
  "clientPhone": "+5511999999999"  // OR
  "clientId": "client_xyz789"
}

// Property identification
{
  "propertyName": "Casa na Praia"  // OR
  "propertyId": "prop_abc123"  // OR
  "propertyIndex": 1  // (from search results)
}
```

### Auto-generated IDs

Most functions auto-generate IDs when not provided:

```typescript
{
  sessionId: 'session_1638456789_a1b2',  // Auto-generated if not provided
  requestId: 'create-lead_1638456789_c3d4',  // Always generated
  metricId: 'metric_1638456789_e5f6'  // Always generated
}
```

### Event Data Flexibility

Analytics functions accept **flexible event data structures**:

```typescript
// As object
{
  "eventData": {
    "step": "qualified",
    "properties_viewed": 3,
    "budget_confirmed": true
  }
}

// As JSON string
{
  "eventData": "{\"step\": \"qualified\", \"properties_viewed\": 3}"
}

// Sofia AI can pass any structure
{
  "eventData": "Qualificado com sucesso após visualizar 3 propriedades"
}
```

---

## Integration Notes for N8N/Sofia AI

### Parameter Flexibility

All functions are designed for **easy N8N integration**:

1. **Flexible parameter formats** - Accept objects, strings, or JSON
2. **Auto-generated IDs** - No need to track sessionId manually
3. **Optional parameters** - Most parameters have sensible defaults
4. **Phone as identifier** - Use phone numbers directly as leadId

### N8N Variables Pattern

Use these patterns in N8N workflows:

```javascript
{
  "tenantId": "{{$json.tenantId}}",
  "leadId": "{{$json.clientPhone}}",
  "sessionId": "{{$json.sessionId || 'session_' + Date.now()}}",
  "eventData": "{{$fromAI('eventData', 'description', 'string', '{}')}}"
}
```

### Best Practices for Sofia AI

1. **Always include `tenantId`** - Required for all functions
2. **Use phone numbers as leadId** - Most convenient identifier
3. **Let functions auto-generate IDs** - sessionId, requestId, etc.
4. **Leverage eventData flexibility** - Pass any relevant context
5. **Check `success` boolean** - Always validate response before proceeding
6. **Use `meta.requestId`** - For debugging and tracing
7. **Handle errors gracefully** - Check `error` field when `success: false`

### Error Handling Pattern

```typescript
// N8N function node
if ($json.success === false) {
  throw new Error(`Function failed: ${$json.error}`);
}

// Continue with data
const result = $json.data;
```

### Common Workflow Patterns

#### Pattern 1: Create Lead + Track Interaction
```javascript
// Step 1: Create lead
POST /api/ai/functions/create-lead
{
  "tenantId": "{{$json.tenantId}}",
  "phone": "{{$json.from}}",
  "source": "whatsapp_ai"
}

// Step 2: Track interaction
POST /api/ai/functions/add-lead-interaction
{
  "tenantId": "{{$json.tenantId}}",
  "clientPhone": "{{$json.from}}",
  "type": "whatsapp_message",
  "content": "{{$json.message}}"
}
```

#### Pattern 2: Search + Calculate Price + Generate Quote
```javascript
// Step 1: Search properties
POST /api/ai/functions/search-properties
{
  "tenantId": "{{$json.tenantId}}",
  "location": "{{$fromAI('location')}}",
  "guests": "{{$fromAI('guests', 'number', 2)}}"
}

// Step 2: Calculate price for top result
POST /api/ai/functions/calculate-price
{
  "tenantId": "{{$json.tenantId}}",
  "propertyName": "{{$json.data[0].name}}",
  "checkIn": "{{$fromAI('checkIn')}}",
  "checkOut": "{{$fromAI('checkOut')}}"
}

// Step 3: Generate formal quote
POST /api/ai/functions/generate-quote
{
  "tenantId": "{{$json.tenantId}}",
  "propertyId": "{{$json.data[0].id}}",
  "checkIn": "{{$fromAI('checkIn')}}",
  "checkOut": "{{$fromAI('checkOut')}}",
  "guests": "{{$fromAI('guests', 'number', 2)}}"
}
```

#### Pattern 3: Complete Booking Flow
```javascript
// Step 1: Check availability
POST /api/ai/functions/check-availability

// Step 2: Calculate dynamic discount
POST /api/ai/functions/calculate-dynamic-discount

// Step 3: Create reservation
POST /api/ai/functions/create-reservation

// Step 4: Create transaction
POST /api/ai/functions/create-transaction

// Step 5: Update lead to 'won'
POST /api/ai/functions/lead-pipeline-movement

// Step 6: Save conversation
POST /api/ai/functions/post-conversation
```

---

## Summary

### Function Categories

| Category | Count | Key Use Cases |
|----------|-------|---------------|
| **Property Management** | 9 | Search, details, media, availability |
| **Reservations & Bookings** | 5 | Create, modify, cancel, policies |
| **Financial Operations** | 12 | Pricing, discounts, payments, quotes |
| **CRM & Leads** | 11 | Lead creation, scoring, pipeline, follow-ups |
| **Analytics & Tracking** | 7 | Metrics, performance, insights |
| **Notifications & Communication** | 3 | Conversations, notifications, reminders |
| **Configuration & Settings** | 5 | Tenant config, prompts, policies |
| **Goals, Tasks & Reports** | 9 | Goals, tasks, reports, wallet |

### Total Functions: 61

---

## Quick Reference

### Most Used Functions

1. **create-lead** - Start every new conversation
2. **search-properties** - Primary search functionality
3. **calculate-price** - Price calculation with discounts
4. **calculate-dynamic-discount** - Advanced discount engine
5. **create-reservation** - Complete booking
6. **post-conversation** - Save all conversations
7. **add-lead-interaction** - Track every interaction
8. **lead-pipeline-movement** - Move through sales funnel
9. **get-tenant-config** - Load tenant settings
10. **track-conversion-step** - Track funnel progress

### Essential Parameters

- **tenantId** - Required in ALL functions
- **clientPhone** - Best universal identifier
- **sessionId** - Auto-generated if not provided
- **eventData** - Accepts any structure (object/string)

---

**For implementation questions, refer to:**
- CLAUDE.md - Development guide
- /lib/ai/tenant-aware-agent-functions.ts - Function implementations
- /app/api/ai/functions/*/route.ts - Individual route handlers

**Last Updated:** 2025-11-26
**Maintained by:** Locai Development Team
