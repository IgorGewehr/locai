/**
 * UNIFIED TRANSACTION MODEL
 *
 * This is the consolidated transaction model that combines the best features from:
 * - Transaction (lib/types/index.ts) - Used by current APIs
 * - FinancialMovement (lib/types/financial-movement.ts) - More advanced features
 *
 * Migration Strategy: Gradual adoption with backward compatibility
 * Status: ACTIVE (replaces both old models)
 */

import { Timestamp } from 'firebase/firestore';

// ===== ENUMS =====

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  // Legacy support
  COMPLETED = 'paid' // Alias for backward compatibility
}

export enum TransactionCategory {
  // Property-related
  RESERVATION = 'reservation',
  RENT = 'rent',
  // Operational
  MAINTENANCE = 'maintenance',
  CLEANING = 'cleaning',
  UTILITIES = 'utilities',
  // Business
  COMMISSION = 'commission',
  MARKETING = 'marketing',
  // Other
  REFUND = 'refund',
  OTHER = 'other'
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PIX = 'pix',
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card'
}

export enum RecurringType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

// ===== MAIN INTERFACE =====

export interface Transaction {
  // ===== IDENTIFICATION =====
  id: string;
  tenantId: string; // REQUIRED - Multi-tenant isolation

  // ===== CORE FIELDS =====
  amount: number; // Always positive - type determines income/expense
  type: TransactionType;
  status: TransactionStatus;
  description: string;

  // ===== DATES (Enhanced with dueDate/paymentDate) =====
  /**
   * @deprecated Use dueDate for pending transactions, paymentDate for paid
   * Kept for backward compatibility with existing code
   */
  date: Date | Timestamp;

  /**
   * When the payment is due (for receivables/payables)
   */
  dueDate?: Date | Timestamp;

  /**
   * When the payment was actually made
   */
  paymentDate?: Date | Timestamp;

  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;

  // ===== CATEGORIZATION =====
  category: TransactionCategory;
  subcategory?: string;

  // ===== PAYMENT DETAILS =====
  paymentMethod?: PaymentMethod;
  paymentProof?: string; // URL to receipt/proof
  transactionReference?: string; // External transaction ID (bank, Stripe, etc.)

  // ===== RELATIONSHIPS =====
  reservationId?: string;
  clientId?: string;
  clientName?: string; // Denormalized for performance
  propertyId?: string;
  propertyName?: string; // Denormalized for performance

  // ===== RECURRENCE =====
  isRecurring: boolean;
  recurringType?: RecurringType;
  recurringEndDate?: Date | Timestamp;
  parentTransactionId?: string; // Links to parent recurring transaction

  // ===== AUTO-BILLING (from FinancialMovement) =====
  autoCharge?: boolean; // Enable automatic billing reminders
  remindersSent?: number; // How many reminders have been sent
  lastReminderDate?: Date | Timestamp;
  nextReminderDate?: Date | Timestamp;
  overdueDays?: number; // Calculated field - days past due date

  // ===== INSTALLMENTS (from FinancialMovement) =====
  isInstallment?: boolean;
  installmentNumber?: number; // Current installment (e.g., 1 of 12)
  totalInstallments?: number; // Total number of installments
  originalTransactionId?: string; // Links to original full amount transaction

  // ===== CONTROL & AUDIT =====
  confirmedBy?: string; // User ID who confirmed/approved
  confirmedAt?: Date | Timestamp;
  createdBy?: string; // User ID who created
  lastModifiedBy?: string; // User ID who last modified
  notes?: string; // Internal notes

  // ===== AI METADATA =====
  createdByAI?: boolean;
  aiConversationId?: string; // Links to AI conversation that created this

  // ===== ATTACHMENTS & TAGS =====
  attachments?: TransactionAttachment[];
  tags?: string[]; // Max 10 tags for filtering

  // ===== METADATA =====
  metadata?: Record<string, any>; // Flexible field for custom data

  // ===== ABACATEPAY INTEGRATION =====
  /**
   * AbacatePay billing ID (for payment links)
   * Format: bill_xxxxx
   */
  abacatepayBillingId?: string;

  /**
   * AbacatePay PIX QR Code ID (for instant PIX payments)
   * Format: pix_char_xxxxx
   */
  abacatepayPixId?: string;

  /**
   * AbacatePay customer ID
   * Format: cust_xxxxx
   */
  abacatepayCustomerId?: string;

  /**
   * AbacatePay payment status (mirrors AbacatePay's status)
   * Can differ from our internal status during sync
   */
  abacatepayStatus?: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

  /**
   * Payment link URL (for billing)
   * Customer can access this to complete payment
   */
  abacatepayUrl?: string;

  /**
   * PIX QR Code as base64 image
   * Format: data:image/png;base64,iVBORw0KGgoAAA...
   */
  abacatepayQrCodeBase64?: string;

  /**
   * PIX BR Code (copy-paste code)
   * Customer can copy this code to pay via their bank app
   */
  abacatepayBrCode?: string;

  /**
   * When the AbacatePay payment/link expires
   */
  abacatepayExpiresAt?: Date | Timestamp;

  /**
   * Platform fee charged by AbacatePay (in cents)
   */
  abacatepayFee?: number;

  /**
   * Whether webhook was received for this transaction
   */
  abacatepayWebhookReceived?: boolean;

  /**
   * Last webhook event received
   */
  abacatepayLastWebhookEvent?: string;

  /**
   * When the last webhook was received
   */
  abacatepayLastWebhookAt?: Date | Timestamp;

  /**
   * External ID sent to AbacatePay (for tracking)
   */
  abacatepayExternalId?: string;

  /**
   * Additional metadata from AbacatePay
   */
  abacatepayMetadata?: Record<string, any>;
}

// ===== SUPPORTING INTERFACES =====

export interface TransactionAttachment {
  url: string;
  filename: string;
  fileType?: string; // mime type
  uploadedAt: Date | Timestamp;
  uploadedBy?: string; // User ID
}

export interface CreateTransactionInput {
  // Required
  amount: number;
  type: TransactionType;
  description: string;
  category: TransactionCategory;

  // Dates (smart defaults)
  date?: Date; // Defaults to now
  dueDate?: Date; // For pending transactions

  // Optional
  paymentMethod?: PaymentMethod;
  reservationId?: string;
  clientId?: string;
  clientName?: string;
  propertyId?: string;
  propertyName?: string;

  // Recurrence
  isRecurring?: boolean;
  recurringType?: RecurringType;
  recurringEndDate?: Date;

  // Auto-billing
  autoCharge?: boolean;

  // Installments
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;

  // Metadata
  notes?: string;
  tags?: string[];
  createdByAI?: boolean;
  aiConversationId?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  description?: string;
  category?: TransactionCategory;
  status?: TransactionStatus;
  dueDate?: Date;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentProof?: string;
  notes?: string;
  tags?: string[];
}

export interface TransactionFilters {
  // Basic filters
  type?: TransactionType;
  status?: TransactionStatus;
  category?: TransactionCategory;

  // Date ranges
  startDate?: Date;
  endDate?: Date;

  // Amount ranges
  minAmount?: number;
  maxAmount?: number;

  // Relations
  propertyId?: string;
  clientId?: string;
  reservationId?: string;

  // Features
  isRecurring?: boolean;
  isOverdue?: boolean;
  hasAutoCharge?: boolean;

  // Search
  search?: string; // Searches in description, clientName, propertyName
  tags?: string[];
}

export interface TransactionSummary {
  period: {
    start: Date;
    end: Date;
  };

  // Totals
  totalIncome: number;
  totalExpenses: number;
  netIncome: number; // income - expenses

  // By status
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };

  // By category
  byCategory: Array<{
    category: TransactionCategory;
    income: number;
    expenses: number;
    count: number;
  }>;

  // By property (if filtered)
  byProperty?: Array<{
    propertyId: string;
    propertyName: string;
    income: number;
    expenses: number;
    netIncome: number;
  }>;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Migrate old status to new unified status
 */
export function migrateTransactionStatus(oldStatus: string): TransactionStatus {
  const statusMap: Record<string, TransactionStatus> = {
    'completed': TransactionStatus.PAID,
    'paid': TransactionStatus.PAID,
    'pending': TransactionStatus.PENDING,
    'overdue': TransactionStatus.OVERDUE,
    'cancelled': TransactionStatus.CANCELLED,
    'refunded': TransactionStatus.REFUNDED,
  };

  return statusMap[oldStatus] || TransactionStatus.PENDING;
}

/**
 * Calculate overdue days for a transaction
 */
export function calculateOverdueDays(transaction: Transaction): number {
  if (transaction.status === TransactionStatus.PAID) return 0;
  if (transaction.status === TransactionStatus.CANCELLED) return 0;
  if (!transaction.dueDate) return 0;

  const due = transaction.dueDate instanceof Date
    ? transaction.dueDate
    : transaction.dueDate.toDate();

  const now = new Date();
  const diffTime = now.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if transaction is overdue
 */
export function isTransactionOverdue(transaction: Transaction): boolean {
  if (transaction.status === TransactionStatus.PAID) return false;
  if (transaction.status === TransactionStatus.CANCELLED) return false;
  if (!transaction.dueDate) return false;

  const due = transaction.dueDate instanceof Date
    ? transaction.dueDate
    : transaction.dueDate.toDate();

  return new Date() > due;
}

/**
 * Format transaction status for display
 */
export function formatTransactionStatus(status: TransactionStatus): string {
  const labels: Record<TransactionStatus, string> = {
    [TransactionStatus.PENDING]: 'Pendente',
    [TransactionStatus.PAID]: 'Pago',
    [TransactionStatus.OVERDUE]: 'Vencido',
    [TransactionStatus.CANCELLED]: 'Cancelado',
    [TransactionStatus.REFUNDED]: 'Reembolsado',
  };

  return labels[status] || status;
}

/**
 * Format transaction category for display
 */
export function formatTransactionCategory(category: TransactionCategory): string {
  const labels: Record<TransactionCategory, string> = {
    [TransactionCategory.RESERVATION]: 'Reserva',
    [TransactionCategory.RENT]: 'Aluguel',
    [TransactionCategory.MAINTENANCE]: 'Manutenção',
    [TransactionCategory.CLEANING]: 'Limpeza',
    [TransactionCategory.UTILITIES]: 'Utilidades',
    [TransactionCategory.COMMISSION]: 'Comissão',
    [TransactionCategory.MARKETING]: 'Marketing',
    [TransactionCategory.REFUND]: 'Reembolso',
    [TransactionCategory.OTHER]: 'Outros',
  };

  return labels[category] || category;
}

// ===== TYPE GUARDS =====

export function isTransaction(obj: any): obj is Transaction {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.tenantId === 'string' &&
    typeof obj.amount === 'number' &&
    Object.values(TransactionType).includes(obj.type) &&
    Object.values(TransactionStatus).includes(obj.status)
  );
}

// ===== CONSTANTS =====

export const MAX_TRANSACTION_TAGS = 10;
export const MAX_TRANSACTION_ATTACHMENTS = 5;
export const MAX_INSTALLMENTS = 120; // 10 years monthly
export const MAX_REMINDER_ATTEMPTS = 5;

// ===== TYPE EXPORTS =====
// Enums and interfaces already exported above with 'export enum' and 'export interface'

export type {
  Transaction,
  TransactionAttachment,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  TransactionSummary,
};
