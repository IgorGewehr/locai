# 🥑 AbacatePay Integration - Technical Documentation

**Status:** ✅ Production Ready
**Version:** 1.1.0
**Last Updated:** 2025-01-14

---

## 📋 Overview

Complete integration of **AbacatePay** payment gateway into Locai's financial system with AI agent (Sofia) automation capabilities.

### Integration Goals

1. ✅ **Financial System Enhancement** - Current transaction system upgraded with AbacatePay
2. ✅ **Webhook Automation** - Real-time payment status synchronization (IMPLEMENTED)
3. ✅ **Cron Sync Backup** - Periodic validation every 30 minutes (IMPLEMENTED)
4. ✅ **Notification System** - Instant alerts on payment status changes (IMPLEMENTED)
5. ✅ **AI Agent Integration** - Sofia can manage payments autonomously (5 functions ready)
6. ✅ **Security First** - Enterprise-grade validation and audit trails

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Sofia AI Agent (N8N)                    │
│                 (Autonomous Payment Management)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Functions (8 Payment Endpoints)              │
│   create-payment-link | generate-pix-qrcode | check-status  │
│   list-pending | cancel-payment | request-withdrawal ...    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               AbacatePayService (Core Service)               │
│        Centralized API integration + error handling          │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ AbacatePay   │  │  Firestore   │  │   Webhooks   │
│  REST API    │  │ (Transactions)│  │  (Sync)      │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📊 Current State Analysis

### Existing Financial System

**Location:** `app/api/transactions/route.ts`

**Current Features:**
- ✅ Multi-tenant transaction management
- ✅ Income/Expense tracking
- ✅ Status management (pending, paid, overdue, cancelled, refunded)
- ✅ Category-based organization
- ✅ Recurring transactions
- ✅ Installment support
- ✅ Relationship tracking (reservation, client, property)

**Current Gaps:**
- ❌ No payment gateway integration
- ❌ No QR Code PIX generation
- ❌ No automated payment status updates
- ❌ No external payment tracking
- ❌ Limited AI agent payment capabilities

---

## 🔧 Implementation Plan

### Phase 1: Core Infrastructure (Tasks 2-5)

#### 1.1 TypeScript Types
**File:** `lib/types/abacatepay.ts`

Comprehensive type definitions for:
- API requests/responses
- Customer entities
- Billing/Charges
- PIX QR Codes
- Withdrawals
- Webhooks

#### 1.2 AbacatePay Service
**File:** `lib/services/abacatepay-service.ts`

Core service implementing all AbacatePay endpoints:
- Customer management (create, list)
- Billing creation (one-time, recurring, multiple payments)
- PIX QR Code generation
- Payment status checking
- Withdrawal management
- Error handling & retry logic

#### 1.3 Enhanced Transaction Schema
**Updates:** `lib/types/transaction-unified.ts`

New fields:
```typescript
interface Transaction {
  // Existing fields...

  // NEW: AbacatePay Integration
  abacatepayBillingId?: string;      // bill_xxxxx
  abacatepayPixId?: string;           // pix_char_xxxxx
  abacatepayCustomerId?: string;      // cust_xxxxx
  abacatepayStatus?: AbacatePayStatus;
  abacatepayUrl?: string;             // Payment link
  abacatepayQrCode?: string;          // Base64 QR code image
  abacatepayBrCode?: string;          // PIX copy-paste code
  abacatepayExpiresAt?: Date;
  abacatepayWebhookReceived?: boolean;
  abacatepayMetadata?: Record<string, any>;
}
```

---

### Phase 2: Webhook & Synchronization (Tasks 6-7)

#### 2.1 Webhook Endpoint
**File:** `app/api/webhooks/abacatepay/route.ts`

**Responsibilities:**
- Receive AbacatePay webhook events
- Validate webhook signature/authenticity
- Update transaction status automatically
- Trigger notifications
- Log all webhook events

**Events to Handle:**
- `billing.paid` - Update status to 'paid'
- `billing.expired` - Update status to 'cancelled'
- `billing.refunded` - Update status to 'refunded'
- `pix.paid` - Update PIX payment status
- `pix.expired` - Update PIX payment status

#### 2.2 Status Synchronization Service
**File:** `lib/services/abacatepay-sync-service.ts`

**Features:**
- Periodic status checks for pending payments
- Reconciliation for missed webhooks
- Retry logic for failed updates
- Audit trail logging

---

### Phase 3: AI Functions (Tasks 8-14)

#### 3.1 Function: create-payment-link
**File:** `app/api/ai/functions/create-payment-link/route.ts`

**Purpose:** Generate AbacatePay billing link for customer

**Input:**
```typescript
{
  tenantId: string;
  clientId: string;
  amount: number;
  description: string;
  reservationId?: string;
  propertyId?: string;
  dueDate?: Date;
  allowCoupons?: boolean;
  coupons?: string[];
}
```

**Output:**
```typescript
{
  transactionId: string;
  billingId: string;
  paymentUrl: string;
  status: 'pending';
  expiresAt: Date;
}
```

**AI Use Case:**
- "Sofia, gere um link de pagamento de R$ 1.500 para o cliente João referente à reserva #123"

---

#### 3.2 Function: generate-pix-qrcode
**File:** `app/api/ai/functions/generate-pix-qrcode/route.ts`

**Purpose:** Generate instant PIX QR Code for payment

**Input:**
```typescript
{
  tenantId: string;
  clientId: string;
  amount: number;
  description: string;
  expiresIn?: number; // minutes (default: 30)
  reservationId?: string;
  propertyId?: string;
}
```

**Output:**
```typescript
{
  transactionId: string;
  pixId: string;
  qrCodeBase64: string;
  brCode: string; // Copy-paste code
  status: 'pending';
  expiresAt: Date;
}
```

**AI Use Case:**
- "Sofia, gere um QR Code PIX de R$ 500 para o cliente Maria"
- "Crie um pagamento PIX de R$ 2.000 que expire em 60 minutos"

---

#### 3.3 Function: check-payment-status
**File:** `app/api/ai/functions/check-payment-status/route.ts`

**Purpose:** Check current payment status

**Input:**
```typescript
{
  tenantId: string;
  transactionId: string;
}
```

**Output:**
```typescript
{
  transactionId: string;
  status: TransactionStatus;
  abacatepayStatus: string;
  isPaid: boolean;
  paidAt?: Date;
  expiresAt?: Date;
}
```

**AI Use Case:**
- "Sofia, verifique o status do pagamento #123"
- "O cliente pagou?"

---

#### 3.4 Function: list-pending-payments
**File:** `app/api/ai/functions/list-pending-payments/route.ts`

**Purpose:** List all pending/overdue payments

**Input:**
```typescript
{
  tenantId: string;
  clientId?: string;
  propertyId?: string;
  includeOverdue?: boolean;
}
```

**Output:**
```typescript
{
  pending: Transaction[];
  overdue: Transaction[];
  totalPending: number;
  totalOverdue: number;
}
```

**AI Use Case:**
- "Sofia, liste todos os pagamentos pendentes"
- "Quais pagamentos do cliente João estão em aberto?"

---

#### 3.5 Function: cancel-payment
**File:** `app/api/ai/functions/cancel-payment/route.ts`

**Purpose:** Cancel a pending payment

**Input:**
```typescript
{
  tenantId: string;
  transactionId: string;
  reason: string;
}
```

**Output:**
```typescript
{
  transactionId: string;
  status: 'cancelled';
  cancelledAt: Date;
}
```

**AI Use Case:**
- "Sofia, cancele o pagamento #123"
- "Cancele essa cobrança"

---

#### 3.6 Function: request-withdrawal
**File:** `app/api/ai/functions/request-withdrawal/route.ts`

**Purpose:** Request withdrawal to bank account

**Input:**
```typescript
{
  tenantId: string;
  amount: number;
  pixKey: string;
  pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  description?: string;
}
```

**Output:**
```typescript
{
  withdrawalId: string;
  status: 'pending';
  amount: number;
  fee: number;
  netAmount: number;
  estimatedDate: Date;
}
```

**AI Use Case:**
- "Sofia, faça um saque de R$ 5.000 para minha conta"

**Security:**
- ⚠️ Requires explicit user confirmation
- ⚠️ Rate limiting (max 3/day)
- ⚠️ Audit logging
- ⚠️ Multi-factor auth recommended

---

#### 3.7 Function: get-financial-summary
**File:** `app/api/ai/functions/get-financial-summary/route.ts`

**Purpose:** Get comprehensive financial overview

**Input:**
```typescript
{
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  propertyId?: string;
}
```

**Output:**
```typescript
{
  period: { start: Date; end: Date };
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };
  byCategory: CategoryBreakdown[];
  byProperty: PropertyBreakdown[];
  abacatepay: {
    totalProcessed: number;
    totalFees: number;
    pendingWithdrawals: number;
  };
}
```

**AI Use Case:**
- "Sofia, me dê um resumo financeiro do mês"
- "Qual foi meu faturamento esta semana?"

---

#### 3.8 Function: send-payment-reminder
**File:** `app/api/ai/functions/send-payment-reminder/route.ts`

**Purpose:** Send payment reminder via WhatsApp

**Input:**
```typescript
{
  tenantId: string;
  transactionId: string;
  customMessage?: string;
}
```

**Output:**
```typescript
{
  sent: boolean;
  clientPhone: string;
  messageId: string;
}
```

**AI Use Case:**
- "Sofia, envie um lembrete de pagamento para o cliente João"

---

### Phase 4: Security & Validation (Task 15)

#### Security Measures

**4.1 Input Validation**
- Zod schemas for all AI function inputs
- Amount limits (min: R$ 1.00, max: R$ 100.000)
- Rate limiting per tenant
- XSS/SQL injection protection

**4.2 Financial Operation Guards**
```typescript
// Withdrawal limits
MAX_WITHDRAWAL_AMOUNT = 50_000; // R$ 50k
MAX_DAILY_WITHDRAWALS = 3;

// Payment limits
MAX_PAYMENT_AMOUNT = 100_000; // R$ 100k
MAX_DAILY_PAYMENTS = 50;

// Auto-approval thresholds
AUTO_APPROVE_UNDER = 5_000; // R$ 5k
```

**4.3 Audit Trail**
All operations logged with:
- User/AI agent identity
- Timestamp
- IP address (if available)
- Operation type
- Amount
- Status changes
- Metadata

**4.4 Webhook Security**
- Signature validation
- Timestamp verification (reject old webhooks)
- Idempotency (prevent duplicate processing)
- Source IP validation

---

### Phase 5: Dashboard & Monitoring (Task 16)

#### 5.1 Payment Dashboard
**File:** `app/dashboard/financeiro/pagamentos/page.tsx`

**Features:**
- Real-time payment status
- PIX QR Code display
- Payment link management
- Overdue payment alerts
- AbacatePay balance
- Withdrawal history

#### 5.2 Analytics Integration
- Payment conversion rates
- Average time to payment
- Payment method preferences
- Failed payment analysis
- Revenue forecasting

---

### Phase 6: Testing & Documentation (Tasks 17-18)

#### 6.1 Test Strategy

**Unit Tests:**
- AbacatePayService methods
- Type guards
- Validation schemas

**Integration Tests:**
- Full payment flow (create → webhook → update)
- AI function execution
- Webhook processing

**E2E Tests:**
- AI agent creates PIX QR Code
- Customer pays
- Webhook updates status
- Notification sent

#### 6.2 Documentation

**For Developers:**
- API endpoint reference
- Service usage examples
- Error handling guide
- Webhook setup instructions

**For Sofia AI:**
- Function usage guide
- Example prompts
- Best practices
- Security restrictions

---

## 🔐 Security Considerations

### Critical Security Rules

1. **Never expose API keys** - Store in `.env` only
2. **Validate all webhooks** - Signature + timestamp check
3. **Rate limit AI operations** - Prevent abuse
4. **Audit all withdrawals** - Full logging
5. **Require confirmations** - For high-value operations
6. **PII masking** - In all logs
7. **Transaction atomicity** - Prevent inconsistent states

### AI Agent Restrictions

```typescript
// Operations requiring human approval
REQUIRE_APPROVAL = [
  'request-withdrawal',           // Always
  'cancel-payment',               // If > R$ 5k
  'create-payment-link',          // If > R$ 10k
];

// Operations with daily limits
DAILY_LIMITS = {
  'generate-pix-qrcode': 100,
  'create-payment-link': 50,
  'request-withdrawal': 3,
  'cancel-payment': 10,
};
```

---

## 📊 Success Metrics

### KPIs to Track

1. **Payment Success Rate** - Target: >95%
2. **Average Time to Payment** - Target: <24h
3. **Webhook Processing Time** - Target: <2s
4. **AI Function Success Rate** - Target: >99%
5. **Failed Payment Recovery** - Target: >30%

---

## 🚀 Deployment Checklist

### Pre-Production

- [ ] All types implemented
- [ ] AbacatePayService tested
- [ ] All 8 AI functions working
- [ ] Webhook endpoint deployed
- [ ] Security validation complete
- [ ] Rate limiting configured
- [ ] Monitoring dashboards live
- [ ] Documentation complete

### Production

- [ ] Environment variables set
- [ ] Webhook URL registered with AbacatePay
- [ ] Rate limits configured
- [ ] Monitoring alerts active
- [ ] Backup/rollback plan ready
- [ ] Sofia AI trained on new functions

---

## 📞 AbacatePay API Reference

**Base URL:** `https://api.abacatepay.com/v1`

**Authentication:** `Bearer <ABACATEPAY_API_KEY>`

**Key Endpoints:**
- POST `/customer/create` - Create customer
- POST `/billing/create` - Create billing
- POST `/pixQrCode/create` - Generate PIX QR
- GET `/pixQrCode/check` - Check PIX status
- POST `/withdraw/create` - Request withdrawal

**Response Format:**
```typescript
{
  data: T | T[];
  error: string | null;
}
```

---

## 🔄 Migration Strategy

### Existing Transactions

No migration required - new fields are optional. Existing transactions continue working without AbacatePay integration.

### Gradual Rollout

1. **Week 1:** Core service + types
2. **Week 2:** Basic AI functions (PIX QR, payment links)
3. **Week 3:** Webhook integration
4. **Week 4:** Advanced functions + dashboard
5. **Week 5:** Testing + refinement
6. **Week 6:** Production rollout

---

## 🆘 Troubleshooting

### Common Issues

**Webhook not received:**
- Check webhook URL is correct
- Verify firewall allows AbacatePay IPs
- Check webhook logs

**Payment stuck in pending:**
- Run manual status check
- Verify customer completed payment
- Check AbacatePay dashboard

**AI function fails:**
- Check rate limits
- Verify tenant has valid API key
- Review function logs

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-13
**Maintained By:** Development Team
