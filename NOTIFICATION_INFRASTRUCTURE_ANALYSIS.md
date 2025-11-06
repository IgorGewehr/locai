# Locai Notification Infrastructure Analysis

## Executive Summary

The Locai codebase has a **well-designed but limited** notification system. A sophisticated foundation exists for multi-tenant notifications with support for multiple channels, but integration coverage is minimal and several gaps exist that prevent the system from being fully operational.

**Current Status**: Foundation 85%, Integration 20%, Channel Support 40%

---

## 1. EXISTING NOTIFICATION COMPONENTS

### 1.1 Core Type Definitions
**Location**: `/Users/igorgewehr/WebstormProjects/locai/lib/types/notification.ts`

**Comprehensive Type System with:**
- `Notification` interface (complete with 40+ fields)
- `NotificationPreferences` (user-level settings with quiet hours, digest frequency)
- `NotificationTemplate` (template system with variable substitution)
- `NotificationAnalytics` (detailed metrics tracking)
- `NotificationDashboard` (user-facing aggregation)

**Supported Notification Types** (14 total):
- Agenda: `AGENDA_EVENT_CREATED`, `AGENDA_EVENT_REMINDER`, `AGENDA_EVENT_UPDATED`, `AGENDA_EVENT_CANCELLED`
- Tickets: `TICKET_RESPONSE_RECEIVED`, `TICKET_STATUS_CHANGED`, `TICKET_ASSIGNED`
- Reservations: `RESERVATION_CREATED`, `RESERVATION_CHECK_IN_REMINDER`, `RESERVATION_CHECK_OUT_REMINDER`
- Payments: `PAYMENT_DUE_REMINDER`, `PAYMENT_OVERDUE`, `PAYMENT_RECEIVED`
- System: `SYSTEM_ALERT`, `SYSTEM_MAINTENANCE`

**Priority Levels**: LOW, MEDIUM, HIGH, CRITICAL

**Delivery Channels Defined**:
- Dashboard (in-app notifications)
- Email
- WhatsApp
- Webhook

### 1.2 Core Service Layer
**Location**: `/Users/igorgewehr/WebstormProjects/locai/lib/services/notification-service.ts`

**Features Implemented**:
```typescript
✓ createNotification() - Generic notification creation
✓ createAgendaEventNotification() - Specialized agenda events
✓ createTicketResponseNotification() - Ticket responses
✓ markAsRead() - Individual marking
✓ markAllAsRead() - Bulk marking
✓ getUserNotifications() - With filters (unreadOnly, limit, type)
✓ getUnreadCount() - Quick count
✓ subscribeToNotifications() - Real-time subscriptions (Firestore listeners)
✓ deleteNotification() - Soft delete via status=EXPIRED
```

**Design Strengths**:
- Multi-tenant isolation (one service per tenant via factory pattern)
- Real-time support via Firestore onSnapshot
- Delivery status tracking per channel
- Proper logging with logger utility
- Timestamps for audit trails

**Limitations**:
- No actual delivery to Email/WhatsApp/Webhook channels
- No scheduling/retry logic
- No deduplication
- No rate limiting
- No batch delivery operations

### 1.3 UI Component
**Location**: `/Users/igorgewehr/WebstormProjects/locai/components/molecules/notifications/NotificationBell.tsx`

**Features**:
- Real-time notification count badge with pulse animation
- Expandable notification list (max 10 configurable)
- Mark as read (single and bulk)
- Delete individual notifications
- Priority-based color coding
- Responsive design (mobile-aware)
- Time formatting (relative times in pt-BR)
- Action button support

**Issues**:
- Limited to dashboard display only
- No way to customize action handling
- Hard-coded "Ver Agenda" navigation for agenda events
- No support for notification preferences UI

### 1.4 API Endpoint
**Location**: `/Users/igorgewehr/WebstormProjects/locai/app/api/notifications/agenda-event/route.ts`

**Purpose**: Webhook endpoint for N8N to send agenda event notifications

**Implemented**:
- POST handler for agenda event creation
- GET health check endpoint
- Validation of required fields
- Proper error handling and logging

**Current Integration Points**:
- `/api/admin/tickets/[id]/reply/route.ts` - Creates notification when ticket is replied to

---

## 2. DATABASE STRUCTURE

### 2.1 Multi-Tenant Collection Structure
```
tenants/{tenantId}/
├── notifications/              ← Main notification collection
│   ├── createdAt
│   ├── targetUserId
│   ├── type
│   ├── status
│   ├── priority
│   ├── channels[]
│   ├── deliveryStatus{}
│   └── readAt
├── properties/
├── clients/
├── reservations/
├── transactions/
├── leads/
└── [other collections]
```

### 2.2 Firestore Implementation
**Service**: `MultiTenantFirestoreService<T>` in `/lib/firebase/firestore-v2.ts`

**Capabilities**:
- Create, Read, Update, Delete
- Complex queries with multiple filters
- Query optimization
- Real-time subscriptions via `onSnapshot`
- Batch operations
- Order by fields with direction control

**Notification-Specific Usage**:
- Uses `tenants/{tenantId}/notifications` path
- Leverages Firestore serverTimestamp for audit
- Supports document-level subscriptions

---

## 3. INTEGRATION GAPS

### 3.1 Missing Event Triggers
**Major Business Events with NO Notification Integration**:

1. **Reservations** (Critical):
   - Reservation creation/confirmation
   - Reservation modifications
   - Reservation cancellations
   - Check-in/Check-out reminders (scheduled)
   - Guest arrival notifications
   - Special requirements alerts

2. **Financial** (Critical):
   - Payment received confirmations
   - Payment due reminders (overdue)
   - Invoice generation/sending
   - Refund processing
   - Transaction status updates

3. **CRM System** (High):
   - Lead creation/assignment
   - Lead status changes (pipeline movement)
   - Task assignments/completions
   - Follow-up reminders
   - Lead scoring changes

4. **Properties** (Medium):
   - New property listing
   - Property status changes
   - Availability changes
   - Maintenance alerts
   - Occupancy status changes

5. **Messages/Chat** (High):
   - New WhatsApp messages from clients
   - Unread message counts
   - Conversation assignments

### 3.2 Missing Channel Implementations

**Email Channel** (Not Implemented):
- No email service integration (SendGrid, AWS SES, NodeMailer)
- No email templates
- No transactional email setup
- No delivery tracking
- No bounce handling

**WhatsApp Channel** (Partially Implemented):
- WhatsApp infrastructure exists (Baileys integration)
- But no notification-triggered messaging
- No template support
- No delivery confirmation

**Webhook Channel** (Type Defined, No Implementation):
- No webhook endpoint management
- No retry logic
- No authentication mechanism
- No payload standardization

**Push Notifications** (Completely Missing):
- No Firebase Cloud Messaging (FCM) setup
- No service worker configuration
- No device token management
- No browser push support

### 3.3 Missing User Preferences System
**Notification Preferences Type Exists** but:
- No UI to manage preferences
- No API endpoints to save/load preferences
- Not integrated into user profile
- Quiet hours feature type-defined but not enforced
- Digest frequency not implemented
- Per-type notification toggles not exposed

### 3.4 Missing Scheduling & Automation
- No scheduled notification system
- No reminder timers
- No cron-like scheduling
- No time-based triggers (e.g., check-in reminders 24h before)
- No conditional logic flows

### 3.5 Missing Delivery & Retry Logic
- No delivery status updates to channels
- No retry mechanism for failed deliveries
- No exponential backoff
- No dead letter queue
- No delivery confirmation tracking

---

## 4. CURRENT TECHNOLOGIES IN PLACE

### 4.1 Already Installed & Available
```json
{
  "firebase": "^10.7.0",                    // Firestore, Auth, Storage
  "firebase-admin": "^12.7.0",              // Server-side Firebase
  "pino": "^9.9.0",                         // Logging (already using)
  "@whiskeysockets/baileys": "^6.7.18",    // WhatsApp (Baileys)
  "stripe": "^14.0.0",                      // Payments
  "date-fns": "^2.30.0",                    // Date manipulation
  "react-hot-toast": "^2.4.0"               // Client toast notifications
}
```

### 4.2 Infrastructure Components Ready
- Multi-tenant Firestore with proper isolation
- Real-time listener system (Firestore subscriptions)
- Service factory pattern for tenant isolation
- Logging system with structured output
- WhatsApp integration (Baileys)
- API middleware and auth validation

### 4.3 Missing Dependencies
- **Email Service**: SendGrid, AWS SES, or NodeMailer
- **Task Scheduling**: Bull, RxJS scheduling, or node-cron
- **FCM (Push)**: firebase-admin has it, just needs setup
- **Template Engine**: Optional but recommended (Handlebars, EJS)
- **Rate Limiting**: `rate-limiter-flexible` is installed but not used for notifications

---

## 5. EXISTING PATTERNS & CONVENTIONS

### 5.1 Logging Pattern
```typescript
// All components use: logger from '@/lib/utils/logger'
logger.info('📅 [Notification] Event', {
  component: 'NotificationService',
  tenantId: tenantId.substring(0, 8) + '***',
  details: {}
})
```

### 5.2 Multi-Tenant Pattern
```typescript
// All services must use TenantServiceFactory or NotificationServiceFactory
const service = NotificationServiceFactory.getInstance(tenantId)
```

### 5.3 Error Handling
```typescript
// All async operations wrapped in try/catch with logger.error
try {
  // operation
} catch (error) {
  logger.error('Operation failed', error, { context })
  throw error
}
```

### 5.4 Real-Time Pattern
```typescript
// Firestore subscriptions with cleanup
const unsubscribe = service.subscribeToNotifications(
  userId,
  (notifications) => setNotifications(notifications),
  { unreadOnly: true }
)

useEffect(() => {
  return () => unsubscribe()
}, [dependencies])
```

### 5.5 User Preferences Pattern
**Exists in Types**: `ClientPreferences` with `communicationPreference: 'whatsapp' | 'email' | 'phone' | 'sms'`

**Current Location**: `/lib/types/client.ts`

---

## 6. INTEGRATION POINTS FOR NOTIFICATIONS

### 6.1 API Functions to Integrate
**High Priority**:
- `create-reservation` - Trigger reservation created notification
- `cancel-reservation` - Trigger cancellation notification
- `create-transaction` - Trigger payment received notification
- `create-lead` - Trigger lead assigned notification
- `add-lead-interaction` - Trigger interaction recorded
- `lead-pipeline-movement` - Trigger stage change notification

**Medium Priority**:
- `modify-reservation` - Trigger modification notification
- `schedule-meeting` - Trigger meeting scheduled notification
- `create-task` - Trigger task assigned notification
- `update-lead` - Trigger lead updated notification

### 6.2 Webhook Points
- **Existing**: `/api/notifications/agenda-event` (from N8N)
- **Needed**: Payment webhooks (Stripe), WhatsApp events, etc.

### 6.3 Ticket System Integration
**Already Partially Integrated**:
- `/api/admin/tickets/[id]/reply/route.ts` - Creates `TICKET_RESPONSE_RECEIVED` notification
- Only needs email/WhatsApp channel delivery

---

## 7. USER PREFERENCE INFRASTRUCTURE

### 7.1 Existing Preference Types
**Client Preferences** (`/lib/types/client.ts`):
```typescript
communicationPreference: 'whatsapp' | 'email' | 'phone' | 'sms'
marketingOptIn: boolean
```

**CRM Lead Preferences** (`/lib/types/crm.ts`):
```typescript
aiInsights?.communicationPreference?: string
```

**Dashboard Settings** (`/lib/types/dashboard.ts`):
```typescript
email: EmailNotificationSettings // Type defined
```

### 7.2 Missing Pieces
- No `NotificationPreferences` collection in Firestore
- No API to load/save user notification settings
- No UI for managing notification preferences
- No enforcement of quiet hours or frequency limits
- No per-notification-type toggles UI

---

## 8. REAL-TIME INFRASTRUCTURE

### 8.1 Real-Time Capabilities Present
- Firestore real-time subscriptions working in NotificationBell
- Unread count updates in real-time
- New notification pulse animation implemented
- Proper cleanup with unsubscribe functions

### 8.2 What's Missing
- Server-to-client push notifications (would need WebSockets or FCM)
- Sound/Desktop notifications on new messages
- Browser notification permissions handling
- Service worker setup for offline support

---

## 9. GAPS SUMMARY TABLE

| Component | Status | Coverage | Impact |
|-----------|--------|----------|--------|
| Type Definitions | ✓ Complete | 100% | N/A |
| Firestore Storage | ✓ Ready | 100% | N/A |
| Dashboard Display | ✓ Implemented | 100% | High |
| Email Delivery | ✗ Missing | 0% | Critical |
| WhatsApp Delivery | ✗ Missing | 0% | Critical |
| Webhook Delivery | ✗ Missing | 0% | Medium |
| Push Notifications | ✗ Missing | 0% | Medium |
| User Preferences UI | ✗ Missing | 0% | High |
| User Preferences API | ✗ Missing | 0% | High |
| Event Triggers (Reservations) | ✗ Missing | 0% | Critical |
| Event Triggers (Payments) | ✗ Missing | 0% | Critical |
| Event Triggers (CRM) | ✗ Missing | 0% | Critical |
| Scheduling/Reminders | ✗ Missing | 0% | High |
| Retry Logic | ✗ Missing | 0% | High |
| Rate Limiting | ✗ Missing | 0% | Medium |
| Deduplication | ✗ Missing | 0% | Medium |

---

## 10. RECOMMENDED TECHNOLOGY CHOICES

### 10.1 Email Service
**Recommended**: SendGrid (industry standard)
```
npm install @sendgrid/mail
```
- Easy integration
- Good documentation
- Webhook support for delivery tracking
- Templates support
- Cost-effective
- Alternative: AWS SES (if already using AWS)

### 10.2 Scheduling
**Recommended**: Bull (Redis-based queue)
```
npm install bull redis
```
- Reliable job queue
- Retry support built-in
- Scheduled jobs
- Good for distributed systems
- Already have ioredis in project
- Alternative: node-cron (simpler but less reliable)

### 10.3 Push Notifications
**Recommended**: Firebase Cloud Messaging (FCM)
- Already in firebase-admin
- Browser push via service worker
- Mobile app support
- No additional dependency needed

### 10.4 Template Engine
**Recommended**: Handlebars
```
npm install handlebars
```
- Used in SendGrid templates
- Simple variable substitution
- Logic support
- Lightweight

---

## 11. EXISTING PATTERNS TO FOLLOW

### Pattern 1: NotificationServiceFactory
```typescript
const service = NotificationServiceFactory.getInstance(tenantId)
// Use service methods
```

### Pattern 2: Logging
```typescript
logger.info('[COMPONENT] Message', {
  component: 'ComponentName',
  tenantId: maskedId,
  details: data
})
```

### Pattern 3: Multi-Tenant Query
```typescript
const q = query(
  collection(db, `tenants/${tenantId}/notifications`),
  where('targetUserId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```

### Pattern 4: Error Response
```typescript
return NextResponse.json(
  { success: false, error: 'message', requestId },
  { status: 400 }
)
```

---

## 12. KEY FILES REFERENCE

**Core System**:
- Type definitions: `/lib/types/notification.ts` (345 lines)
- Service layer: `/lib/services/notification-service.ts` (479 lines)
- UI component: `/components/molecules/notifications/NotificationBell.tsx` (556 lines)
- API endpoint: `/app/api/notifications/agenda-event/route.ts` (113 lines)
- Test page: `/app/dashboard/test-notifications/page.tsx` (380 lines)

**Database Layer**:
- Firestore service: `/lib/firebase/firestore-v2.ts` (529 lines)
- TenantServiceFactory: Located in same file

**Integration Points**:
- Ticket replies: `/app/api/admin/tickets/[id]/reply/route.ts`
- WhatsApp status: `/contexts/WhatsAppStatusContext.tsx` (165 lines)

**User Types**:
- Client preferences: `/lib/types/client.ts`
- CRM types: `/lib/types/crm.ts`
- Dashboard settings: `/lib/types/dashboard.ts`

---

## 13. IMPLEMENTATION PRIORITY ROADMAP

### Phase 1: Foundation (Critical)
1. Integrate notification triggers with major events
2. Implement email delivery channel
3. Implement basic user preferences system
4. Create preferences UI/API

### Phase 2: Enhancement (High)
1. Add WhatsApp message delivery
2. Implement scheduling system for reminders
3. Add retry logic and delivery tracking
4. Implement rate limiting

### Phase 3: Advanced (Medium)
1. Push notifications (FCM)
2. SMS delivery
3. Webhook delivery
4. Analytics dashboard

### Phase 4: Polish (Low)
1. Email templates styling
2. Desktop notifications
3. Advanced preference rules
4. Performance optimization

---

## 14. QUICK START FOR DEVELOPERS

### Adding a New Notification Trigger:

```typescript
// 1. In your API route or service
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority } from '@/lib/types/notification'

// 2. Get the service
const notificationService = NotificationServiceFactory.getInstance(tenantId)

// 3. Create notification
await notificationService.createNotification({
  targetUserId: userId,
  type: NotificationType.RESERVATION_CREATED,
  title: 'Nova Reserva Confirmada',
  message: `Reserva #${id} confirmada para ${propertyName}`,
  entityType: 'reservation',
  entityId: reservationId,
  priority: NotificationPriority.HIGH,
  channels: [NotificationChannel.DASHBOARD],
  actions: [{
    id: 'view_reservation',
    label: 'Ver Reserva',
    type: 'primary',
    action: 'navigate',
    config: { url: `/dashboard/reservations/${reservationId}` }
  }]
})
```

### Testing:
- Visit `/dashboard/test-notifications` page
- Use predefined test buttons
- Check notification bell in header
- Verify real-time updates

---

## Summary

**Strengths**:
- Solid type system and data model
- Professional UI component
- Real-time subscriptions working
- Multi-tenant isolation implemented
- Proper logging and error handling

**Weaknesses**:
- Only 2 notification types currently triggered
- No email/WhatsApp/Push delivery
- No scheduling system
- No user preference management
- Limited integration with business logic

**Effort to Completion**:
- Email delivery: 2-3 days
- WhatsApp delivery: 3-4 days
- Preferences system: 3-4 days
- Event integration (all): 5-7 days
- Scheduling: 3-4 days
- **Total**: ~3-4 weeks for full system

**Quick Wins** (high impact, low effort):
1. Add reservation creation trigger (2h)
2. Add payment received trigger (2h)
3. Add email service integration (1 day)
4. Add basic preferences API (1 day)
