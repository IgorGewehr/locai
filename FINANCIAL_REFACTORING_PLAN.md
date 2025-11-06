# FINANCIAL MODULE REFACTORING PLAN

## 1. TRANSACTION MODELS COMPARISON

### Current State: TWO MODELS

#### Model A: `Transaction` (lib/types/index.ts)
**Used by:** TransactionService, API routes, most UI components

```typescript
interface Transaction {
  // Basic
  id, amount, type, status, description, date

  // Categorization
  category: 'reservation' | 'maintenance' | 'cleaning' | 'commission' | 'refund' | 'other'
  subcategory?: string

  // Payment
  paymentMethod: 'stripe' | 'pix' | 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card'

  // Relations
  reservationId?, clientId?, propertyId?

  // Recurrence
  isRecurring, recurringType?, recurringEndDate?, parentTransactionId?

  // Control
  confirmedBy?, confirmedAt?, notes?

  // AI metadata
  createdByAI, aiConversationId?

  // Reporting
  tenantId?, attachments?, tags?
}
```

**Status Enum:** `'pending' | 'completed' | 'cancelled'`

---

#### Model B: `FinancialMovement` (lib/types/financial-movement.ts)
**Used by:** FinancialMovementService (appears unused in app)

```typescript
interface FinancialMovement {
  // Basic
  id, tenantId, type, category, description, amount

  // Dates
  dueDate, paymentDate?, createdAt, updatedAt

  // Status
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  overdueDays?

  // Relations (with denormalized names)
  propertyId?, propertyName?
  clientId?, clientName?
  reservationId?

  // Payment
  paymentMethod?, paymentProof?, transactionReference?

  // Recurrence
  isRecurring, recurringType?, recurringParentId?, recurringEndDate?

  // AUTO-BILLING (unique feature!)
  autoCharge: boolean
  remindersSent: number
  lastReminderDate?, nextReminderDate?

  // INSTALLMENTS (unique feature!)
  isInstallment: boolean
  installmentNumber?, totalInstallments?
  originalMovementId?

  // Metadata
  notes?, tags?, attachments?

  // Audit
  createdBy, createdByAI?, lastModifiedBy?
}
```

**Status Enum:** `'pending' | 'paid' | 'overdue' | 'cancelled'`

---

## 2. KEY DIFFERENCES

| Feature | Transaction | FinancialMovement | Winner |
|---------|-------------|-------------------|--------|
| **Status** | pending/completed/cancelled | pending/paid/overdue/cancelled | ✅ FM (more detailed) |
| **Dates** | date, createdAt, updatedAt | dueDate, paymentDate, createdAt, updatedAt | ✅ FM (separates due vs payment) |
| **Categories** | 6 categories | 8 categories (includes rent, utilities, marketing) | ✅ FM (more comprehensive) |
| **Denormalization** | Only IDs | IDs + Names (propertyName, clientName) | ✅ FM (better for queries) |
| **Auto-Billing** | ❌ Not supported | ✅ Full support | ✅ FM |
| **Installments** | ❌ Not supported | ✅ Full support | ✅ FM |
| **Audit Trail** | confirmedBy, confirmedAt | createdBy, lastModifiedBy | ⚖️ Tie (different approach) |
| **AI Integration** | createdByAI, aiConversationId | createdByAI | ✅ Transaction (more detailed) |
| **Usage** | ✅ Actively used | ❌ Appears unused | ✅ Transaction |

---

## 3. DECISION: UNIFIED MODEL

**Strategy:** Extend `Transaction` with best features from `FinancialMovement`

### Why Transaction as Base?
1. **Actively Used** - All current APIs and UI use Transaction
2. **Less Breaking Changes** - Existing code continues to work
3. **Better AI Integration** - Already has aiConversationId field

### What to Add from FinancialMovement?
1. ✅ **Better Status** - Add 'paid' and 'overdue'
2. ✅ **Better Dates** - Add dueDate, paymentDate (keep date for backward compat)
3. ✅ **More Categories** - Add 'rent', 'utilities', 'marketing'
4. ✅ **Auto-Billing** - Add autoCharge, remindersSent, reminder dates
5. ✅ **Installments** - Add installment fields
6. ✅ **Denormalization** - Add propertyName, clientName for performance
7. ✅ **Audit Trail** - Add createdBy, lastModifiedBy

---

## 4. UNIFIED TRANSACTION MODEL

```typescript
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',              // NEW from FinancialMovement
  COMPLETED = 'completed',    // DEPRECATED - alias for 'paid'
  OVERDUE = 'overdue',        // NEW from FinancialMovement
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'       // NEW for refunds
}

export enum TransactionCategory {
  // Existing
  RESERVATION = 'reservation',
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  COMMISSION = 'commission',
  REFUND = 'refund',
  OTHER = 'other',
  // NEW from FinancialMovement
  RENT = 'rent',
  UTILITIES = 'utilities',
  MARKETING = 'marketing'
}

export interface Transaction {
  // ===== CORE FIELDS =====
  id: string;
  tenantId: string;           // REQUIRED (not optional)
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;

  // ===== DATES (Enhanced) =====
  date: Date;                 // Legacy - general transaction date
  dueDate?: Date;             // NEW - when payment is due
  paymentDate?: Date;         // NEW - when payment was made
  createdAt: Date;
  updatedAt: Date;

  // ===== CATEGORIZATION =====
  category: TransactionCategory;
  subcategory?: string;

  // ===== PAYMENT =====
  paymentMethod?: 'stripe' | 'pix' | 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card';
  paymentProof?: string;      // NEW - URL to payment proof
  transactionReference?: string; // NEW - external reference

  // ===== RELATIONSHIPS =====
  reservationId?: string;
  clientId?: string;
  clientName?: string;        // NEW - denormalized for performance
  propertyId?: string;
  propertyName?: string;      // NEW - denormalized for performance

  // ===== RECURRENCE =====
  isRecurring: boolean;
  recurringType?: 'monthly' | 'weekly' | 'yearly';
  recurringEndDate?: Date;
  parentTransactionId?: string;

  // ===== AUTO-BILLING (NEW) =====
  autoCharge?: boolean;
  remindersSent?: number;
  lastReminderDate?: Date;
  nextReminderDate?: Date;
  overdueDays?: number;       // Calculated field

  // ===== INSTALLMENTS (NEW) =====
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
  originalTransactionId?: string;

  // ===== CONTROL & AUDIT =====
  confirmedBy?: string;
  confirmedAt?: Date;
  createdBy?: string;         // NEW
  lastModifiedBy?: string;    // NEW
  notes?: string;

  // ===== AI METADATA =====
  createdByAI?: boolean;
  aiConversationId?: string;

  // ===== ATTACHMENTS & TAGS =====
  attachments?: Array<{
    url: string;
    filename: string;
    uploadedAt: Date;
  }>;
  tags?: string[];
}
```

---

## 5. MIGRATION STRATEGY

### Phase 1: Type System Update ✅ (Safe - No Data Changes)
1. Create new unified Transaction interface
2. Mark old FinancialMovement as `@deprecated`
3. Update all type imports

### Phase 2: Status Enum Migration (Breaking Change)
1. Create migration utility:
   ```typescript
   function migrateStatus(oldStatus: string): TransactionStatus {
     if (oldStatus === 'completed') return TransactionStatus.PAID;
     if (oldStatus === 'paid') return TransactionStatus.PAID;
     if (oldStatus === 'overdue') return TransactionStatus.OVERDUE;
     if (oldStatus === 'pending') return TransactionStatus.PENDING;
     if (oldStatus === 'cancelled') return TransactionStatus.CANCELLED;
     return TransactionStatus.PENDING; // Default fallback
   }
   ```

2. Update ALL API routes to accept both old and new status
3. Update UI to display new statuses correctly
4. Background job to migrate existing data

### Phase 3: Service Layer Refactoring
1. Update TransactionService to support new fields
2. Add auto-billing methods from FinancialMovementService
3. Add installment methods
4. Deprecate FinancialMovementService

### Phase 4: Data Migration (Production)
1. Backup all transactions
2. Run migration script to add new fields:
   - `tenantId` (required - extract from document path)
   - `dueDate` (copy from `date` for pending transactions)
   - `createdBy` (set to system for AI transactions)
3. Verify data integrity
4. Monitor for issues

---

## 6. BILLING SERVICE MULTI-TENANT MIGRATION

### Current Structure (WRONG):
```
billing_settings/          (ROOT LEVEL - NOT TENANT-SCOPED!)
├─ {docId}
│  ├─ tenantId: "xxx"     (Manual filtering required)
│  └─ ...
```

### New Structure (CORRECT):
```
tenants/
├─ {tenantId}/
│  ├─ billing_settings/   (TENANT-SCOPED)
│  │  └─ default
│  ├─ billing_reminders/
│  │  └─ {reminderId}
│  └─ billing_campaigns/
│     └─ {campaignId}
```

### Migration Script:
```typescript
async function migrateBillingToTenantScoped() {
  // 1. Read all billing_settings from root
  const rootSettings = await getDocs(collection(db, 'billing_settings'));

  // 2. For each setting, move to tenant collection
  const batch = writeBatch(db);
  for (const doc of rootSettings.docs) {
    const data = doc.data();
    const tenantId = data.tenantId;

    // Write to new location
    const newRef = doc(db, `tenants/${tenantId}/billing_settings/default`);
    batch.set(newRef, data);

    // Delete from old location (after verification)
    // batch.delete(doc.ref);
  }

  await batch.commit();
}
```

---

## 7. IMPLEMENTATION CHECKLIST

### Week 1: Type System
- [x] Analyze current models
- [ ] Create unified Transaction interface
- [ ] Create TransactionStatus enum
- [ ] Create TransactionCategory enum
- [ ] Update all imports to use new types
- [ ] Mark FinancialMovement as @deprecated

### Week 2: API Layer
- [ ] Update transaction validation schemas (Zod)
- [ ] Update /api/transactions to support new fields
- [ ] Add status migration middleware
- [ ] Update error messages
- [ ] Add backward compatibility layer

### Week 3: Service Layer
- [ ] Refactor TransactionService
- [ ] Add auto-billing methods
- [ ] Add installment methods
- [ ] Add query optimizer
- [ ] Add comprehensive error handling

### Week 4: UI Components
- [ ] Update transaction table to show new statuses
- [ ] Add overdue indicator
- [ ] Add installment display
- [ ] Add auto-billing toggle
- [ ] Update filters

### Week 5: Billing Migration
- [ ] Create migration script
- [ ] Test in staging
- [ ] Backup production data
- [ ] Run migration
- [ ] Update BillingService
- [ ] Verify all billing features work

### Week 6: Data Migration & Cleanup
- [ ] Backup production transactions
- [ ] Run data migration script
- [ ] Verify data integrity
- [ ] Remove deprecated code
- [ ] Update documentation

---

## 8. ROLLBACK PLAN

If migration fails:
1. **API Layer**: Backward compatibility ensures old clients still work
2. **Service Layer**: Keep old service as fallback
3. **Data Layer**: Original data untouched until verification complete
4. **Billing**: Keep root collections until tenant-scoped verified

---

## 9. SUCCESS METRICS

- [ ] 0 breaking changes for existing API clients
- [ ] All transactions migrated successfully
- [ ] Billing isolation verified
- [ ] Performance improved (query times)
- [ ] Type safety at 100% (no `any` types)
- [ ] Test coverage > 80%

---

## 10. RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | CRITICAL | Full backup before migration, verify before deleting old data |
| Breaking API changes | HIGH | Maintain backward compatibility, gradual rollout |
| Performance degradation | MEDIUM | Indexes in place before migration, load testing |
| Billing downtime | HIGH | Migrate during low-traffic hours, keep old system running in parallel |

---

**Status:** PLANNED - Ready for implementation
**Estimated Duration:** 6 weeks
**Team:** Backend + Frontend + QA
