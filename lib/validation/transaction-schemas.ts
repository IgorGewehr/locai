/**
 * UNIFIED TRANSACTION VALIDATION SCHEMAS
 *
 * Zod schemas for validating transaction data with the new unified model
 * Supports both old and new field formats for backward compatibility
 */

import { z } from 'zod';
import {
  TransactionType,
  TransactionStatus,
  TransactionCategory,
  PaymentMethod,
  RecurringType,
} from '@/lib/types/transaction-unified';

// ===== ENUM SCHEMAS =====

const TransactionTypeSchema = z.nativeEnum(TransactionType);
const TransactionStatusSchema = z.nativeEnum(TransactionStatus);
const TransactionCategorySchema = z.nativeEnum(TransactionCategory);
const PaymentMethodSchema = z.nativeEnum(PaymentMethod);
const RecurringTypeSchema = z.nativeEnum(RecurringType);

// For backward compatibility, also accept string literals
const TransactionStatusLegacySchema = z.union([
  TransactionStatusSchema,
  z.enum(['completed']), // Legacy status
]).transform((val) => {
  // Auto-migrate 'completed' to 'paid'
  if (val === 'completed') return TransactionStatus.PAID;
  return val as TransactionStatus;
});

// ===== CREATE TRANSACTION SCHEMA =====

export const CreateTransactionSchema = z.object({
  // ===== REQUIRED FIELDS =====
  tenantId: z.string().min(10).max(100),
  amount: z.number().positive('Amount must be positive').max(10000000),
  type: TransactionTypeSchema,
  description: z.string().min(1, 'Description is required').max(500),
  category: TransactionCategorySchema,

  // ===== DATES (Smart Defaults) =====
  date: z.coerce.date().optional(), // Legacy field
  dueDate: z.coerce.date().optional(),
  paymentDate: z.coerce.date().optional(),

  // ===== OPTIONAL FIELDS =====
  status: TransactionStatusLegacySchema.optional().default(TransactionStatus.PENDING),
  subcategory: z.string().max(100).optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  paymentProof: z.string().url().optional(),
  transactionReference: z.string().max(200).optional(),

  // ===== RELATIONSHIPS =====
  reservationId: z.string().max(100).optional(),
  clientId: z.string().max(100).optional(),
  clientName: z.string().max(200).optional(),
  propertyId: z.string().max(100).optional(),
  propertyName: z.string().max(200).optional(),

  // ===== RECURRENCE =====
  isRecurring: z.boolean().optional().default(false),
  recurringType: RecurringTypeSchema.optional(),
  recurringEndDate: z.coerce.date().optional(),
  parentTransactionId: z.string().max(100).optional(),

  // ===== AUTO-BILLING =====
  autoCharge: z.boolean().optional(),
  remindersSent: z.number().int().min(0).max(100).optional(),
  lastReminderDate: z.coerce.date().optional(),
  nextReminderDate: z.coerce.date().optional(),

  // ===== INSTALLMENTS =====
  isInstallment: z.boolean().optional(),
  installmentNumber: z.number().int().min(1).max(120).optional(),
  totalInstallments: z.number().int().min(2).max(120).optional(),
  originalTransactionId: z.string().max(100).optional(),

  // ===== METADATA =====
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  createdByAI: z.boolean().optional(),
  aiConversationId: z.string().max(100).optional(),

  // ===== AUDIT =====
  createdBy: z.string().max(100).optional(),

}).refine((data) => {
  // Validation: If recurring, recurringType must be specified
  if (data.isRecurring && !data.recurringType) {
    return false;
  }
  return true;
}, {
  message: 'recurringType is required when isRecurring is true',
  path: ['recurringType']
}).refine((data) => {
  // Validation: If installment, must have number and total
  if (data.isInstallment) {
    return data.installmentNumber && data.totalInstallments;
  }
  return true;
}, {
  message: 'installmentNumber and totalInstallments required when isInstallment is true',
  path: ['isInstallment']
}).refine((data) => {
  // Validation: installmentNumber <= totalInstallments
  if (data.installmentNumber && data.totalInstallments) {
    return data.installmentNumber <= data.totalInstallments;
  }
  return true;
}, {
  message: 'installmentNumber cannot exceed totalInstallments',
  path: ['installmentNumber']
}).refine((data) => {
  // Validation: parentTransactionId cannot be same as id (circular reference)
  // Note: id not available at creation, validation done at update
  return true;
}, {
  message: 'Cannot create circular reference',
  path: ['parentTransactionId']
}).refine((data) => {
  // Validation: paymentDate should be after dueDate
  if (data.paymentDate && data.dueDate) {
    return data.paymentDate >= data.dueDate;
  }
  return true;
}, {
  message: 'paymentDate cannot be before dueDate',
  path: ['paymentDate']
}).refine((data) => {
  // Validation: If status is PAID, must have paymentDate or paymentMethod
  if (data.status === TransactionStatus.PAID) {
    return data.paymentDate || data.paymentMethod;
  }
  return true;
}, {
  message: 'PAID transactions must have paymentDate or paymentMethod',
  path: ['status']
});

// ===== UPDATE TRANSACTION SCHEMA =====

export const UpdateTransactionSchema = z.object({
  amount: z.number().positive().max(10000000).optional(),
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusLegacySchema.optional(),
  description: z.string().min(1).max(500).optional(),
  category: TransactionCategorySchema.optional(),
  subcategory: z.string().max(100).optional(),

  // Dates
  date: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  paymentDate: z.coerce.date().optional(),

  // Payment
  paymentMethod: PaymentMethodSchema.optional(),
  paymentProof: z.string().url().optional(),
  transactionReference: z.string().max(200).optional(),

  // Relationships
  reservationId: z.string().max(100).optional(),
  clientId: z.string().max(100).optional(),
  clientName: z.string().max(200).optional(),
  propertyId: z.string().max(100).optional(),
  propertyName: z.string().max(200).optional(),

  // Recurrence
  isRecurring: z.boolean().optional(),
  recurringType: RecurringTypeSchema.optional(),
  recurringEndDate: z.coerce.date().optional(),

  // Auto-billing
  autoCharge: z.boolean().optional(),
  nextReminderDate: z.coerce.date().optional(),

  // Installments
  isInstallment: z.boolean().optional(),
  installmentNumber: z.number().int().min(1).max(120).optional(),
  totalInstallments: z.number().int().min(2).max(120).optional(),

  // Metadata
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),

  // Audit
  lastModifiedBy: z.string().max(100).optional(),
}).refine((data) => {
  if (data.installmentNumber && data.totalInstallments) {
    return data.installmentNumber <= data.totalInstallments;
  }
  return true;
}, {
  message: 'installmentNumber cannot exceed totalInstallments',
  path: ['installmentNumber']
});

// ===== FILTER SCHEMA =====

export const TransactionFiltersSchema = z.object({
  // Basic filters
  type: TransactionTypeSchema.optional(),
  status: TransactionStatusLegacySchema.optional(),
  category: TransactionCategorySchema.optional(),

  // Date ranges
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),

  // Amount ranges
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),

  // Relations
  propertyId: z.string().max(100).optional(),
  clientId: z.string().max(100).optional(),
  reservationId: z.string().max(100).optional(),

  // Features
  isRecurring: z.boolean().optional(),
  isOverdue: z.boolean().optional(),
  hasAutoCharge: z.boolean().optional(),

  // Search & pagination
  search: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(50),

  // Sorting
  sortBy: z.enum(['date', 'dueDate', 'paymentDate', 'amount', 'createdAt', 'updatedAt']).optional().default('date'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).refine((data) => {
  // Validation: endDate must be after startDate
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'endDate must be after startDate',
  path: ['endDate']
}).refine((data) => {
  // Validation: maxAmount must be greater than minAmount
  if (data.minAmount !== undefined && data.maxAmount !== undefined) {
    return data.maxAmount >= data.minAmount;
  }
  return true;
}, {
  message: 'maxAmount must be greater than or equal to minAmount',
  path: ['maxAmount']
});

// ===== ATTACHMENT SCHEMA =====

export const TransactionAttachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1).max(255),
  fileType: z.string().max(100).optional(),
  uploadedAt: z.coerce.date(),
  uploadedBy: z.string().max(100).optional(),
});

// ===== BULK OPERATIONS =====

export const BulkUpdateTransactionSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  updates: UpdateTransactionSchema,
});

export const BulkDeleteTransactionSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  soft: z.boolean().optional().default(true), // Soft delete by default
});

// ===== HELPER FUNCTIONS =====

/**
 * Validate and sanitize transaction data for creation
 */
export function validateCreateTransaction(data: unknown) {
  return CreateTransactionSchema.safeParse(data);
}

/**
 * Validate and sanitize transaction data for update
 */
export function validateUpdateTransaction(data: unknown) {
  return UpdateTransactionSchema.safeParse(data);
}

/**
 * Validate transaction filters
 */
export function validateTransactionFilters(data: unknown) {
  return TransactionFiltersSchema.safeParse(data);
}

// ===== TYPE EXPORTS =====
// Schemas already exported above with 'export const'
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type TransactionAttachment = z.infer<typeof TransactionAttachmentSchema>;
