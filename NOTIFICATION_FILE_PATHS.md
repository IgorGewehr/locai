# Notification Infrastructure - File Paths and Code Snippets

## ABSOLUTE FILE PATHS

### Type Definitions
- `/Users/igorgewehr/WebstormProjects/locai/lib/types/notification.ts` (345 lines)
  - Defines all notification types, enums, and interfaces
  - Contains labels, colors, icons maps
  - Includes analytics and preferences types

### Core Services
- `/Users/igorgewehr/WebstormProjects/locai/lib/services/notification-service.ts` (479 lines)
  - `NotificationService` class with tenant isolation
  - `NotificationServiceFactory` singleton
  - Key methods: createNotification, markAsRead, subscribeToNotifications

### UI Components
- `/Users/igorgewehr/WebstormProjects/locai/components/molecules/notifications/NotificationBell.tsx` (556 lines)
  - Real-time notification bell component
  - Material-UI implementation
  - Responsive design with badge

### API Endpoints
- `/Users/igorgewehr/WebstormProjects/locai/app/api/notifications/agenda-event/route.ts` (113 lines)
  - Webhook endpoint for N8N integration
  - POST: Create agenda event notification
  - GET: Health check

- `/Users/igorgewehr/WebstormProjects/locai/app/api/admin/tickets/[id]/reply/route.ts`
  - Currently integrates notifications for ticket replies

### Test Page
- `/Users/igorgewehr/WebstormProjects/locai/app/dashboard/test-notifications/page.tsx` (380 lines)
  - Test interface for notification system
  - Tests for agenda, tickets, custom notifications
  - Tests endpoint integration

### Database Layer
- `/Users/igorgewehr/WebstormProjects/locai/lib/firebase/firestore-v2.ts` (529 lines)
  - `MultiTenantFirestoreService<T>` class
  - `TenantServiceFactory` class
  - Real-time subscriptions via onSnapshot

### User Preferences (Types Only)
- `/Users/igorgewehr/WebstormProjects/locai/lib/types/client.ts`
  - `ClientPreferences` interface
  - `communicationPreference` field

- `/Users/igorgewehr/WebstormProjects/locai/lib/types/crm.ts`
  - `Lead` interface with communication preferences
  - `Interaction` types

- `/Users/igorgewehr/WebstormProjects/locai/lib/types/dashboard.ts`
  - `EmailNotificationSettings` type (defined but not used)

### WhatsApp Integration
- `/Users/igorgewehr/WebstormProjects/locai/contexts/WhatsAppStatusContext.tsx` (165 lines)
  - WhatsApp connection status monitoring
  - Polling mechanism for status updates
  - Real-time state management

### Core Infrastructure
- `/Users/igorgewehr/WebstormProjects/locai/lib/utils/logger.ts`
  - Structured logging utility
  - Already integrated with notification service

- `/Users/igorgewehr/WebstormProjects/locai/lib/middleware/firebase-auth.ts`
  - Authentication middleware
  - Validates user context for API routes

- `/Users/igorgewehr/WebstormProjects/locai/app/providers.tsx`
  - Root provider setup
  - Currently: AuthProvider, TenantProvider, ThemeProvider
  - Could add NotificationProvider here

---

## KEY CODE SNIPPETS

### 1. Notification Type Definition
```typescript
// From /lib/types/notification.ts
export interface Notification {
  id: string
  tenantId: string
  targetUserId: string
  targetUserName?: string
  type: NotificationType
  title: string
  message: string
  entityType: 'agenda' | 'ticket' | 'reservation' | 'payment' | 'system'
  entityId: string
  status: NotificationStatus
  priority: NotificationPriority
  channels: NotificationChannel[]
  deliveryStatus: Record<NotificationChannel, DeliveryStatus>
  createdAt: Date
  readAt?: Date
  actions?: NotificationAction[]
}
```

### 2. Service Creation Pattern
```typescript
// From /lib/services/notification-service.ts
export class NotificationServiceFactory {
  private static instances: Map<string, NotificationService> = new Map()

  static getInstance(tenantId: string): NotificationService {
    if (!this.instances.has(tenantId)) {
      this.instances.set(tenantId, new NotificationService(tenantId))
    }
    return this.instances.get(tenantId)!
  }
}

// Usage
const notificationService = NotificationServiceFactory.getInstance(tenantId)
```

### 3. Create Notification Method
```typescript
// From /lib/services/notification-service.ts
async createNotification(data: {
  targetUserId: string
  type: NotificationType
  title: string
  message: string
  entityType: 'agenda' | 'ticket' | 'reservation' | 'payment' | 'system'
  entityId: string
  priority?: NotificationPriority
  channels?: NotificationChannel[]
  scheduledFor?: Date
  actions?: any[]
  metadata?: Record<string, any>
}): Promise<string>
```

### 4. Real-Time Subscription Pattern
```typescript
// From /components/molecules/notifications/NotificationBell.tsx
useEffect(() => {
  if (!notificationService || !user?.uid) return

  const unsubscribe = notificationService.subscribeToNotifications(
    user.uid,
    (newNotifications) => {
      setNotifications(newNotifications.slice(0, maxNotifications))
      setUnreadCount(newNotifications.filter(n => !n.readAt).length)
    },
    { limit: maxNotifications }
  )

  return () => unsubscribe()
}, [notificationService, user?.uid])
```

### 5. Firestore Query Pattern
```typescript
// From /lib/firebase/firestore-v2.ts
const q = query(
  collection(db, `tenants/${this.tenantId}/notifications`),
  where('targetUserId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(20)
)
const snapshot = await getDocs(q)
```

### 6. API Endpoint Pattern
```typescript
// From /app/api/notifications/agenda-event/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, userId, userName, eventId, eventTitle, eventDate, ... } = body

    if (!tenantId || !userId || !eventId) {
      return NextResponse.json(
        { error: 'Required fields missing', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const notificationService = NotificationServiceFactory.getInstance(tenantId)
    const notificationId = await notificationService.createAgendaEventNotification({...})

    return NextResponse.json({
      success: true,
      notificationId,
      message: 'Notification created successfully'
    })

  } catch (error) {
    logger.error('Error processing event', error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 7. Logging Pattern
```typescript
// Used throughout services
logger.info('🔔 [Notification] Creating notification', {
  component: 'NotificationService',
  tenantId: tenantId.substring(0, 8) + '***',
  type: data.type,
  targetUserId: data.targetUserId,
  entityType: data.entityType
})
```

### 8. Mark as Read Implementation
```typescript
// From /lib/services/notification-service.ts
async markAsRead(notificationId: string): Promise<void> {
  await updateDoc(
    doc(db, `tenants/${this.tenantId}/notifications`, notificationId),
    {
      readAt: serverTimestamp(),
      status: NotificationStatus.READ
    }
  )
}
```

### 9. Client Preferences Type
```typescript
// From /lib/types/client.ts
export interface ClientPreferences {
  preferredPaymentMethod: PaymentMethod
  communicationPreference: 'whatsapp' | 'email' | 'phone' | 'sms'
  marketingOptIn: boolean
  // ... other fields
}
```

### 10. Multi-Tenant Service Creation
```typescript
// From /lib/firebase/firestore-v2.ts
export class TenantServiceFactory {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  createService<T extends { id?: string }>(collectionName: string) {
    return new MultiTenantFirestoreService<T>(this.tenantId, collectionName)
  }
}
```

---

## INTEGRATION POINTS FOR NOTIFICATIONS

### Where to Add Reservation Created Notification:
**File**: `/Users/igorgewehr/WebstormProjects/locai/lib/ai/tenant-aware-agent-functions.ts`
- Function: `createReservation()`
- Add after reservation is successfully created in Firestore

### Where to Add Payment Received Notification:
**File**: `/Users/igorgewehr/WebstormProjects/locai/app/api/ai/functions/create-transaction/route.ts`
- Add after transaction is created
- Or in transaction service

### Where to Add Lead Notifications:
**File**: `/Users/igorgewehr/WebstormProjects/locai/app/api/ai/functions/create-lead/route.ts`
- Function: `create-lead` endpoint
- Or in CRM service

### Where to Add Ticket Reply Notifications:
**File**: `/Users/igorgewehr/WebstormProjects/locai/app/api/admin/tickets/[id]/reply/route.ts`
- ALREADY INTEGRATED - just needs email/WhatsApp delivery

---

## NOTIFICATION ENUMERATION VALUES

### NotificationType
```typescript
AGENDA_EVENT_CREATED = 'agenda_event_created'
AGENDA_EVENT_REMINDER = 'agenda_event_reminder'
AGENDA_EVENT_UPDATED = 'agenda_event_updated'
AGENDA_EVENT_CANCELLED = 'agenda_event_cancelled'

TICKET_RESPONSE_RECEIVED = 'ticket_response_received'
TICKET_STATUS_CHANGED = 'ticket_status_changed'
TICKET_ASSIGNED = 'ticket_assigned'

RESERVATION_CREATED = 'reservation_created'
RESERVATION_CHECK_IN_REMINDER = 'reservation_check_in_reminder'
RESERVATION_CHECK_OUT_REMINDER = 'reservation_check_out_reminder'

PAYMENT_DUE_REMINDER = 'payment_due_reminder'
PAYMENT_OVERDUE = 'payment_overdue'
PAYMENT_RECEIVED = 'payment_received'

SYSTEM_ALERT = 'system_alert'
SYSTEM_MAINTENANCE = 'system_maintenance'
```

### NotificationStatus
```typescript
DRAFT = 'draft'
SCHEDULED = 'scheduled'
SENT = 'sent'
DELIVERED = 'delivered'
READ = 'read'
FAILED = 'failed'
EXPIRED = 'expired'
```

### NotificationPriority
```typescript
LOW = 'low'
MEDIUM = 'medium'
HIGH = 'high'
CRITICAL = 'critical'
```

### NotificationChannel
```typescript
DASHBOARD = 'dashboard'
EMAIL = 'email'
WHATSAPP = 'whatsapp'
WEBHOOK = 'webhook'
```

---

## DEPENDENCIES ALREADY INSTALLED

```json
{
  "firebase": "^10.7.0",
  "firebase-admin": "^12.7.0",
  "pino": "^9.9.0",
  "@whiskeysockets/baileys": "^6.7.18",
  "date-fns": "^2.30.0",
  "react-hot-toast": "^2.4.0",
  "ioredis": "^5.3.2",
  "rate-limiter-flexible": "^7.1.1"
}
```

---

## MISSING DEPENDENCIES (TO ADD)

### For Email:
```bash
npm install @sendgrid/mail
```

### For Scheduling:
```bash
npm install bull
```

### For Templates:
```bash
npm install handlebars
```

### For SMS (optional):
```bash
npm install twilio
```

---

## DATABASE COLLECTION PATH PATTERN

```
tenants/{tenantId}/notifications/
  - createdAt: Timestamp
  - targetUserId: string
  - type: string (enum value)
  - status: string (enum value)
  - priority: string (enum value)
  - channels: array (enum values)
  - deliveryStatus: object
  - readAt: Timestamp (null if unread)
  - sentAt: Timestamp
  - title: string
  - message: string
  - entityType: string
  - entityId: string
  - actions: array
  - metadata: object
```

---

## KEY ARCHITECTURAL DECISIONS

1. **Multi-Tenant Isolation**: Every service instance is scoped to a tenantId
2. **Factory Pattern**: NotificationServiceFactory prevents multiple instances
3. **Firestore Real-Time**: Uses onSnapshot for live updates
4. **Soft Deletes**: Deleted notifications have status=EXPIRED instead of being removed
5. **Delivery Status Tracking**: Per-channel status object for future delivery tracking
6. **Action Support**: Notifications can include actions (navigate, API call, dismiss)

---

## FIRESTORE INDEXES LIKELY NEEDED

For optimal performance, create indexes for:

1. `tenants/{tenantId}/notifications`
   - Field: `targetUserId` + `createdAt` (descending)
   - Field: `targetUserId` + `readAt`
   - Field: `targetUserId` + `type` + `createdAt`

2. Can be auto-created when first complex query is run

---

## IMPORT STATEMENTS

```typescript
// Type imports
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
  NotificationPreferences
} from '@/lib/types/notification'

// Service imports
import { NotificationServiceFactory } from '@/lib/services/notification-service'

// Firebase imports
import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

// Logger import
import { logger } from '@/lib/utils/logger'
```

---

## NEXT.js SPECIFIC PATTERNS

### API Route Pattern:
```typescript
// app/api/notifications/[endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // ... implementation
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'message' }, { status: 500 })
  }
}
```

### Component Pattern:
```typescript
// 'use client' for client components
'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/lib/hooks/useAuth'

export function MyComponent() {
  const { tenant } = useTenant()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Setup subscriptions and cleanup
    return () => {
      // Cleanup
    }
  }, [dependencies])
}
```

---

## TESTING THE SYSTEM

1. **Visit test page**: `/dashboard/test-notifications`
2. **Available tests**:
   - Test agenda notification
   - Test ticket response notification
   - Test custom notification
   - Test N8N endpoint integration
3. **Check notification bell**: Should show badge with count
4. **Expand notifications**: Click to see full message
5. **Mark as read**: Removes red dot indicator
6. **Delete notifications**: Soft delete (status = EXPIRED)

