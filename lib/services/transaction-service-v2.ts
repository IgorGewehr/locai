/**
 * TRANSACTION SERVICE V2 - Enhanced with Unified Transaction Model
 *
 * Features:
 * - Full support for unified Transaction model
 * - Auto-billing and reminder management
 * - Installment creation and tracking
 * - Overdue detection and auto-update
 * - Enhanced filtering with new statuses (paid, overdue, refunded)
 * - Backward compatibility with old status values
 */

import { MultiTenantFirestoreService } from '@/lib/firebase/firestore-v2';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  RecurringType,
  calculateOverdueDays,
  isTransactionOverdue,
} from '@/lib/types/transaction-unified';
import {
  Timestamp,
  writeBatch,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  QueryConstraint,
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  WhereFilterOp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  addWeeks,
  addYears,
  addDays,
  isBefore,
  isAfter,
  differenceInDays,
} from 'date-fns';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus | TransactionStatus[];
  category?: TransactionCategory;
  propertyId?: string;
  clientId?: string;
  reservationId?: string;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
  isOverdue?: boolean;
  hasAutoCharge?: boolean;
  isInstallment?: boolean;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: PaymentMethod;
  tags?: string[];
  search?: string; // Search in description, clientName, propertyName
}

export interface RecurringTransactionInput {
  baseTransaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'isRecurring' | 'parentTransactionId'>;
  recurringType: RecurringType;
  recurringEndDate?: Date;
  createFirstNow?: boolean;
}

export interface InstallmentInput {
  totalAmount: number;
  totalInstallments: number;
  firstDueDate: Date;
  description: string;
  category: TransactionCategory;
  propertyId?: string;
  clientId?: string;
  clientName?: string;
  propertyName?: string;
  reservationId?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  tags?: string[];
}

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
  overdueIncome: number;
  overdueExpenses: number;
  transactionCount: {
    income: number;
    expense: number;
    pending: number;
    paid: number;
    overdue: number;
    cancelled: number;
    refunded: number;
  };
  byCategory: Record<string, { income: number; expense: number; count: number }>;
  byPaymentMethod: Record<string, number>;
  byProperty: Record<string, { income: number; expense: number; balance: number }>;
}

export interface AutoBillingConfig {
  reminderDaysBefore: number; // Days before due date to send reminder
  reminderFrequency: number; // Days between reminders after due date
  maxReminders: number; // Maximum reminders per transaction
}

// ===== TRANSACTION SERVICE V2 =====

export class TransactionServiceV2 extends MultiTenantFirestoreService<Transaction> {
  constructor(tenantId: string) {
    super(tenantId, 'transactions');
  }

  // ===== ENHANCED FILTERING =====

  async getFiltered(
    filters: TransactionFilters,
    pageSize = 50,
    lastDoc?: DocumentSnapshot
  ): Promise<{
    transactions: Transaction[];
    lastDocument?: DocumentSnapshot;
    hasMore: boolean;
  }> {
    const constraints: QueryConstraint[] = [];

    // Basic filters
    if (filters.type) {
      constraints.push(where('type', '==', filters.type));
    }

    // Status filter (support both single and array)
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        constraints.push(where('status', 'in', filters.status));
      } else {
        constraints.push(where('status', '==', filters.status));
      }
    }

    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters.propertyId) {
      constraints.push(where('propertyId', '==', filters.propertyId));
    }

    if (filters.clientId) {
      constraints.push(where('clientId', '==', filters.clientId));
    }

    if (filters.reservationId) {
      constraints.push(where('reservationId', '==', filters.reservationId));
    }

    if (filters.isRecurring !== undefined) {
      constraints.push(where('isRecurring', '==', filters.isRecurring));
    }

    if (filters.hasAutoCharge !== undefined) {
      constraints.push(where('autoCharge', '==', filters.hasAutoCharge));
    }

    if (filters.isInstallment !== undefined) {
      constraints.push(where('isInstallment', '==', filters.isInstallment));
    }

    if (filters.paymentMethod) {
      constraints.push(where('paymentMethod', '==', filters.paymentMethod));
    }

    // Amount filters
    if (filters.minAmount !== undefined) {
      constraints.push(where('amount', '>=', filters.minAmount));
    }
    if (filters.maxAmount !== undefined) {
      constraints.push(where('amount', '<=', filters.maxAmount));
    }

    // Date filters (use dueDate if available, fallback to date)
    if (filters.startDate) {
      constraints.push(where('dueDate', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      constraints.push(where('dueDate', '<=', Timestamp.fromDate(filters.endDate)));
    }

    // Ordering and pagination
    constraints.push(orderBy('dueDate', 'desc'));
    constraints.push(firestoreLimit(pageSize + 1));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(this.getCollectionRef(), ...constraints);
    const snapshot = await getDocs(q);

    let transactions = snapshot.docs.slice(0, pageSize).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));

    // Client-side filters (for fields not indexed)
    if (filters.isOverdue) {
      transactions = transactions.filter(t => isTransactionOverdue(t));
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      transactions = transactions.filter(t =>
        t.description?.toLowerCase().includes(searchLower) ||
        t.clientName?.toLowerCase().includes(searchLower) ||
        t.propertyName?.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      transactions = transactions.filter(t =>
        t.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    return {
      transactions,
      lastDocument: snapshot.docs[pageSize - 1],
      hasMore: snapshot.docs.length > pageSize
    };
  }

  // ===== OVERDUE MANAGEMENT =====

  /**
   * Detect and update overdue transactions
   * Should be run periodically (e.g., daily cron job)
   */
  async detectAndUpdateOverdue(): Promise<{ updated: number; overdueTransactions: Transaction[] }> {
    logger.info('[TransactionService] Starting overdue detection', { tenantId: this.tenantId });

    // Get all pending transactions
    const pendingTransactions = await this.getMany([
      { field: 'status', operator: '==', value: TransactionStatus.PENDING }
    ]);

    const batch = writeBatch(db);
    const overdueTransactions: Transaction[] = [];
    let updated = 0;

    const today = new Date();

    for (const transaction of pendingTransactions) {
      if (isTransactionOverdue(transaction)) {
        const overdueDays = calculateOverdueDays(transaction);

        // Update to overdue status
        batch.update(this.getDocRef(transaction.id!), {
          status: TransactionStatus.OVERDUE,
          overdueDays,
          updatedAt: serverTimestamp()
        });

        overdueTransactions.push({
          ...transaction,
          status: TransactionStatus.OVERDUE,
          overdueDays
        });
        updated++;
      }
    }

    if (updated > 0) {
      await batch.commit();
      logger.info('[TransactionService] Updated overdue transactions', {
        tenantId: this.tenantId,
        count: updated
      });
    }

    return { updated, overdueTransactions };
  }

  /**
   * Get all overdue transactions
   */
  async getOverdue(): Promise<Transaction[]> {
    const overdueTransactions = await this.getMany([
      { field: 'status', operator: '==', value: TransactionStatus.OVERDUE }
    ]);

    return overdueTransactions;
  }

  // ===== AUTO-BILLING & REMINDERS =====

  /**
   * Get transactions needing reminders
   */
  async getTransactionsNeedingReminders(config: AutoBillingConfig): Promise<Transaction[]> {
    const transactions = await this.getMany([
      { field: 'autoCharge', operator: '==', value: true }
    ]);

    const today = new Date();
    const needingReminders: Transaction[] = [];

    for (const transaction of transactions) {
      // Skip if already paid or cancelled
      if (transaction.status === TransactionStatus.PAID ||
          transaction.status === TransactionStatus.CANCELLED) {
        continue;
      }

      // Skip if max reminders reached
      if ((transaction.remindersSent || 0) >= config.maxReminders) {
        continue;
      }

      const dueDate = transaction.dueDate instanceof Date
        ? transaction.dueDate
        : transaction.dueDate?.toDate();

      if (!dueDate) continue;

      const shouldSendReminder = this.shouldSendReminder(
        transaction,
        dueDate,
        today,
        config
      );

      if (shouldSendReminder) {
        needingReminders.push(transaction);
      }
    }

    return needingReminders;
  }

  private shouldSendReminder(
    transaction: Transaction,
    dueDate: Date,
    today: Date,
    config: AutoBillingConfig
  ): boolean {
    const daysToDue = differenceInDays(dueDate, today);
    const lastReminderDate = transaction.lastReminderDate instanceof Date
      ? transaction.lastReminderDate
      : transaction.lastReminderDate?.toDate();

    // First reminder: send N days before due date
    if (!transaction.remindersSent || transaction.remindersSent === 0) {
      return daysToDue <= config.reminderDaysBefore && daysToDue >= 0;
    }

    // After due date: send reminders every N days
    if (daysToDue < 0) {
      if (!lastReminderDate) return true;

      const daysSinceLastReminder = differenceInDays(today, lastReminderDate);
      return daysSinceLastReminder >= config.reminderFrequency;
    }

    return false;
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(transactionId: string): Promise<void> {
    const transaction = await this.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const nextReminderDate = addDays(new Date(), 3); // Next reminder in 3 days

    await updateDoc(this.getDocRef(transactionId), {
      remindersSent: (transaction.remindersSent || 0) + 1,
      lastReminderDate: serverTimestamp(),
      nextReminderDate: Timestamp.fromDate(nextReminderDate),
      updatedAt: serverTimestamp()
    });
  }

  // ===== INSTALLMENTS =====

  /**
   * Create installment transactions
   */
  async createInstallments(input: InstallmentInput, createdBy?: string): Promise<string[]> {
    const {
      totalAmount,
      totalInstallments,
      firstDueDate,
      description,
      category,
      propertyId,
      clientId,
      clientName,
      propertyName,
      reservationId,
      paymentMethod,
      notes,
      tags
    } = input;

    if (totalInstallments < 2 || totalInstallments > 120) {
      throw new Error('Total installments must be between 2 and 120');
    }

    const installmentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;
    const lastInstallmentAmount = totalAmount - (installmentAmount * (totalInstallments - 1));

    // Create parent transaction (original full amount)
    const parentTransactionId = await this.create({
      tenantId: this.tenantId,
      amount: totalAmount,
      type: TransactionType.INCOME,
      status: TransactionStatus.PENDING,
      description: `${description} (Parcelado em ${totalInstallments}x)`,
      category,
      date: firstDueDate,
      dueDate: firstDueDate,
      propertyId,
      clientId,
      clientName,
      propertyName,
      reservationId,
      paymentMethod,
      isRecurring: false,
      isInstallment: true,
      totalInstallments,
      notes: `${notes || ''}\nValor total: R$ ${totalAmount.toFixed(2)}\nParcelas: ${totalInstallments}x de R$ ${installmentAmount.toFixed(2)}`,
      tags: tags || [],
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Create individual installments
    const batch = writeBatch(db);
    const installmentIds: string[] = [parentTransactionId];

    for (let i = 1; i <= totalInstallments; i++) {
      const installmentDueDate = addMonths(firstDueDate, i - 1);
      const isLastInstallment = i === totalInstallments;

      const installmentData: Partial<Transaction> = {
        tenantId: this.tenantId,
        amount: isLastInstallment ? lastInstallmentAmount : installmentAmount,
        type: TransactionType.INCOME,
        status: TransactionStatus.PENDING,
        description: `${description} - Parcela ${i}/${totalInstallments}`,
        category,
        date: installmentDueDate,
        dueDate: installmentDueDate,
        propertyId,
        clientId,
        clientName,
        propertyName,
        reservationId,
        paymentMethod,
        isRecurring: false,
        isInstallment: true,
        installmentNumber: i,
        totalInstallments,
        originalTransactionId: parentTransactionId,
        notes,
        tags: tags || [],
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const newInstallmentRef = doc(this.getCollectionRef());
      batch.set(newInstallmentRef, installmentData);
      installmentIds.push(newInstallmentRef.id);
    }

    await batch.commit();

    logger.info('[TransactionService] Created installments', {
      tenantId: this.tenantId,
      totalAmount,
      totalInstallments,
      parentTransactionId,
      installmentIds: installmentIds.length
    });

    return installmentIds;
  }

  /**
   * Get installments for a parent transaction
   */
  async getInstallments(parentTransactionId: string): Promise<Transaction[]> {
    return await this.getMany([
      { field: 'originalTransactionId', operator: '==', value: parentTransactionId }
    ], { orderBy: [{ field: 'installmentNumber', direction: 'asc' }] });
  }

  // ===== RECURRING TRANSACTIONS =====

  async getRecurring(): Promise<Transaction[]> {
    return await this.getMany([
      { field: 'isRecurring', operator: '==', value: true },
      { field: 'parentTransactionId', operator: '==', value: null }
    ], { orderBy: [{ field: 'date', direction: 'desc' }] });
  }

  async createRecurringTransaction(input: RecurringTransactionInput, createdBy?: string): Promise<string> {
    const { baseTransaction, recurringType, recurringEndDate, createFirstNow = true } = input;

    // Create parent transaction (template)
    const parentTransaction: Omit<Transaction, 'id'> = {
      ...baseTransaction,
      tenantId: this.tenantId,
      isRecurring: true,
      recurringType,
      recurringEndDate,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const parentRef = await addDoc(this.getCollectionRef(), {
      ...parentTransaction,
      date: serverTimestamp(),
      dueDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create first instance if requested
    if (createFirstNow) {
      await this.createRecurringInstance(parentRef.id, baseTransaction.date as Date || new Date());
    }

    logger.info('[TransactionService] Created recurring transaction', {
      tenantId: this.tenantId,
      parentTransactionId: parentRef.id,
      recurringType
    });

    return parentRef.id;
  }

  async createRecurringInstance(parentTransactionId: string, date: Date): Promise<string> {
    const parentDoc = await this.get(parentTransactionId);
    if (!parentDoc) {
      throw new Error('Parent recurring transaction not found');
    }

    const instance: Partial<Transaction> = {
      ...parentDoc,
      parentTransactionId,
      date,
      dueDate: date,
      status: TransactionStatus.PENDING,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    delete instance.id;
    delete instance.recurringType;
    delete instance.recurringEndDate;
    delete instance.isRecurring;

    const ref = await addDoc(this.getCollectionRef(), instance);

    return ref.id;
  }

  /**
   * Process recurring transactions (create new instances)
   * Should be run periodically (e.g., daily cron job)
   */
  async processRecurringTransactions(): Promise<number> {
    const recurringTransactions = await this.getRecurring();
    const batch = writeBatch(db);
    const today = new Date();
    let created = 0;

    for (const transaction of recurringTransactions) {
      if (transaction.recurringEndDate && isBefore(new Date(transaction.recurringEndDate), today)) {
        continue;
      }

      // Get last instance
      const lastInstanceQuery = query(
        this.getCollectionRef(),
        where('parentTransactionId', '==', transaction.id),
        orderBy('date', 'desc'),
        firestoreLimit(1)
      );

      const lastInstanceSnapshot = await getDocs(lastInstanceQuery);
      let nextDate: Date;

      if (lastInstanceSnapshot.empty) {
        nextDate = transaction.date instanceof Date ? transaction.date : transaction.date.toDate();
      } else {
        const lastInstance = lastInstanceSnapshot.docs[0].data() as Transaction;
        const lastDate = lastInstance.date instanceof Date ? lastInstance.date : lastInstance.date.toDate();

        nextDate = this.getNextRecurringDate(lastDate, transaction.recurringType!);
      }

      // Create instances up to today
      while (isBefore(nextDate, today) || nextDate.toDateString() === today.toDateString()) {
        if (transaction.recurringEndDate && isAfter(nextDate, new Date(transaction.recurringEndDate))) {
          break;
        }

        const newInstance: Partial<Transaction> = {
          ...transaction,
          parentTransactionId: transaction.id,
          date: Timestamp.fromDate(nextDate),
          dueDate: Timestamp.fromDate(nextDate),
          status: TransactionStatus.PENDING,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };

        delete newInstance.id;
        delete newInstance.recurringType;
        delete newInstance.recurringEndDate;
        delete newInstance.isRecurring;

        batch.set(doc(this.getCollectionRef()), newInstance);
        created++;

        nextDate = this.getNextRecurringDate(nextDate, transaction.recurringType!);
      }
    }

    if (created > 0) {
      await batch.commit();
      logger.info('[TransactionService] Processed recurring transactions', {
        tenantId: this.tenantId,
        created
      });
    }

    return created;
  }

  private getNextRecurringDate(currentDate: Date, recurringType: RecurringType): Date {
    switch (recurringType) {
      case RecurringType.DAILY:
        return addDays(currentDate, 1);
      case RecurringType.WEEKLY:
        return addWeeks(currentDate, 1);
      case RecurringType.MONTHLY:
        return addMonths(currentDate, 1);
      case RecurringType.YEARLY:
        return addYears(currentDate, 1);
      default:
        throw new Error(`Unknown recurring type: ${recurringType}`);
    }
  }

  // ===== STATUS MANAGEMENT =====

  async markAsPaid(
    transactionId: string,
    paymentDate: Date,
    paymentMethod?: PaymentMethod,
    paymentProof?: string,
    lastModifiedBy?: string
  ): Promise<void> {
    const updates: any = {
      status: TransactionStatus.PAID,
      paymentDate: Timestamp.fromDate(paymentDate),
      updatedAt: serverTimestamp(),
    };

    if (paymentMethod) {
      updates.paymentMethod = paymentMethod;
    }

    if (paymentProof) {
      updates.paymentProof = paymentProof;
    }

    if (lastModifiedBy) {
      updates.lastModifiedBy = lastModifiedBy;
    }

    await updateDoc(this.getDocRef(transactionId), updates);

    logger.info('[TransactionService] Transaction marked as paid', {
      tenantId: this.tenantId,
      transactionId,
      paymentDate
    });
  }

  async cancelTransaction(transactionId: string, reason?: string, lastModifiedBy?: string): Promise<void> {
    const updates: any = {
      status: TransactionStatus.CANCELLED,
      updatedAt: serverTimestamp()
    };

    if (reason) {
      updates.notes = reason;
    }

    if (lastModifiedBy) {
      updates.lastModifiedBy = lastModifiedBy;
    }

    await updateDoc(this.getDocRef(transactionId), updates);

    logger.info('[TransactionService] Transaction cancelled', {
      tenantId: this.tenantId,
      transactionId,
      reason
    });
  }

  async refundTransaction(transactionId: string, reason?: string, lastModifiedBy?: string): Promise<void> {
    const transaction = await this.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const updates: any = {
      status: TransactionStatus.REFUNDED,
      updatedAt: serverTimestamp()
    };

    if (reason) {
      updates.notes = `${transaction.notes || ''}\nReembolso: ${reason}`;
    }

    if (lastModifiedBy) {
      updates.lastModifiedBy = lastModifiedBy;
    }

    await updateDoc(this.getDocRef(transactionId), updates);

    logger.info('[TransactionService] Transaction refunded', {
      tenantId: this.tenantId,
      transactionId,
      reason
    });
  }

  // ===== STATISTICS =====

  async getStats(filters?: TransactionFilters): Promise<TransactionStats> {
    const transactions = filters
      ? (await this.getFiltered(filters)).transactions
      : await this.getAll();

    const stats: TransactionStats = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      pendingIncome: 0,
      pendingExpenses: 0,
      overdueIncome: 0,
      overdueExpenses: 0,
      transactionCount: {
        income: 0,
        expense: 0,
        pending: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
        refunded: 0,
      },
      byCategory: {},
      byPaymentMethod: {},
      byProperty: {}
    };

    transactions.forEach(transaction => {
      // Counters
      stats.transactionCount[transaction.type]++;

      // Handle both old 'completed' and new 'paid' status
      const normalizedStatus = transaction.status === 'completed' ? TransactionStatus.PAID : transaction.status;
      if (normalizedStatus in stats.transactionCount) {
        stats.transactionCount[normalizedStatus as keyof typeof stats.transactionCount]++;
      }

      // Totals by type and status
      if (transaction.type === TransactionType.INCOME) {
        if (normalizedStatus === TransactionStatus.PAID) {
          stats.totalIncome += transaction.amount;
        } else if (normalizedStatus === TransactionStatus.PENDING) {
          stats.pendingIncome += transaction.amount;
        } else if (normalizedStatus === TransactionStatus.OVERDUE) {
          stats.overdueIncome += transaction.amount;
        }
      } else {
        if (normalizedStatus === TransactionStatus.PAID) {
          stats.totalExpenses += transaction.amount;
        } else if (normalizedStatus === TransactionStatus.PENDING) {
          stats.pendingExpenses += transaction.amount;
        } else if (normalizedStatus === TransactionStatus.OVERDUE) {
          stats.overdueExpenses += transaction.amount;
        }
      }

      // By category
      if (!stats.byCategory[transaction.category]) {
        stats.byCategory[transaction.category] = { income: 0, expense: 0, count: 0 };
      }
      if (normalizedStatus === TransactionStatus.PAID) {
        if (transaction.type === TransactionType.INCOME) {
          stats.byCategory[transaction.category].income += transaction.amount;
        } else {
          stats.byCategory[transaction.category].expense += transaction.amount;
        }
      }
      stats.byCategory[transaction.category].count++;

      // By payment method
      if (transaction.paymentMethod) {
        if (!stats.byPaymentMethod[transaction.paymentMethod]) {
          stats.byPaymentMethod[transaction.paymentMethod] = 0;
        }
        if (normalizedStatus === TransactionStatus.PAID) {
          stats.byPaymentMethod[transaction.paymentMethod] += transaction.amount;
        }
      }

      // By property
      if (transaction.propertyId) {
        if (!stats.byProperty[transaction.propertyId]) {
          stats.byProperty[transaction.propertyId] = {
            income: 0,
            expense: 0,
            balance: 0
          };
        }

        if (normalizedStatus === TransactionStatus.PAID) {
          if (transaction.type === TransactionType.INCOME) {
            stats.byProperty[transaction.propertyId].income += transaction.amount;
          } else {
            stats.byProperty[transaction.propertyId].expense += transaction.amount;
          }
          stats.byProperty[transaction.propertyId].balance =
            stats.byProperty[transaction.propertyId].income -
            stats.byProperty[transaction.propertyId].expense;
        }
      }
    });

    stats.balance = stats.totalIncome - stats.totalExpenses;

    return stats;
  }

  async getMonthlyStats(year: number, month: number): Promise<TransactionStats> {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    return this.getStats({
      startDate,
      endDate
    });
  }

  // ===== BULK OPERATIONS =====

  async bulkUpdateStatus(
    transactionIds: string[],
    status: TransactionStatus,
    lastModifiedBy?: string
  ): Promise<void> {
    const batch = writeBatch(db);

    transactionIds.forEach(id => {
      const updates: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === TransactionStatus.PAID && lastModifiedBy) {
        updates.lastModifiedBy = lastModifiedBy;
        updates.paymentDate = serverTimestamp();
      }

      batch.update(this.getDocRef(id), updates);
    });

    await batch.commit();

    logger.info('[TransactionService] Bulk status update', {
      tenantId: this.tenantId,
      count: transactionIds.length,
      status
    });
  }
}

// ===== FACTORY =====

export const createTransactionServiceV2 = (tenantId: string) => new TransactionServiceV2(tenantId);
