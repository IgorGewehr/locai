/**
 * AI FUNCTION: list-pending-payments
 *
 * Lists all pending and overdue payments for a tenant
 * Supports filtering by client, property, and date range
 *
 * Sofia AI Usage Examples:
 * - "Liste todos os pagamentos pendentes"
 * - "Quais pagamentos do cliente João estão em aberto?"
 * - "Mostre os pagamentos vencidos desta semana"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { TransactionStatus } from '@/lib/types/transaction-unified';
import type { Transaction } from '@/lib/types/transaction-unified';

// ===== VALIDATION SCHEMA =====

const ListPendingPaymentsSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),

  // Filters
  clientId: z.string().optional(),
  propertyId: z.string().optional(),
  reservationId: z.string().optional(),

  // Include options
  includeOverdue: z.boolean().default(true).optional(),
  includePending: z.boolean().default(true).optional(),

  // Date range filters
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),

  // Amount filters
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),

  // Limit
  limit: z.number().int().positive().max(100).default(50).optional(),

  // Sort
  sortBy: z.enum(['dueDate', 'amount', 'createdAt']).default('dueDate').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
});

type ListPendingPaymentsInput = z.infer<typeof ListPendingPaymentsSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `list_pending_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[LIST-PENDING-PAYMENTS] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      hasClientFilter: !!body.clientId,
      hasPropertyFilter: !!body.propertyId,
    });

    // Validate input
    const validationResult = ListPendingPaymentsSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[LIST-PENDING-PAYMENTS] Validation failed', {
        requestId,
        errors: validationResult.error.flatten(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Get services
    const services = new TenantServiceFactory(input.tenantId);

    // Get all transactions
    const allTransactions = await services.transactions.getAll();

    logger.info('[LIST-PENDING-PAYMENTS] Transactions retrieved', {
      requestId,
      totalCount: allTransactions.length,
    });

    // Filter transactions
    let filteredTransactions = allTransactions.filter((t: Transaction) => {
      // Status filter
      const matchesStatus = (
        (input.includePending && t.status === TransactionStatus.PENDING) ||
        (input.includeOverdue && t.status === TransactionStatus.OVERDUE)
      );

      if (!matchesStatus) return false;

      // Only income transactions (receivables)
      if (t.type !== 'income') return false;

      // Client filter
      if (input.clientId && t.clientId !== input.clientId) return false;

      // Property filter
      if (input.propertyId && t.propertyId !== input.propertyId) return false;

      // Reservation filter
      if (input.reservationId && t.reservationId !== input.reservationId) return false;

      // Amount filters
      if (input.minAmount && t.amount < input.minAmount) return false;
      if (input.maxAmount && t.amount > input.maxAmount) return false;

      // Due date filter
      if (input.dueDateFrom || input.dueDateTo) {
        const dueDate = (t as any).dueDate || t.date;
        const dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);

        if (input.dueDateFrom) {
          const fromDate = new Date(input.dueDateFrom);
          if (dueDateObj < fromDate) return false;
        }

        if (input.dueDateTo) {
          const toDate = new Date(input.dueDateTo);
          if (dueDateObj > toDate) return false;
        }
      }

      return true;
    });

    logger.info('[LIST-PENDING-PAYMENTS] Transactions filtered', {
      requestId,
      filteredCount: filteredTransactions.length,
    });

    // Calculate overdue status for each transaction
    const now = new Date();
    const transactionsWithOverdueInfo = filteredTransactions.map((t: Transaction) => {
      const dueDate = (t as any).dueDate || t.date;
      const dueDateObj = dueDate instanceof Date ? dueDate : new Date(dueDate);
      const isOverdue = dueDateObj < now && t.status === TransactionStatus.PENDING;
      const overdueDays = isOverdue
        ? Math.floor((now.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...t,
        isOverdue,
        overdueDays,
        dueDateFormatted: dueDateObj.toLocaleDateString('pt-BR'),
      };
    });

    // Sort transactions
    const sortedTransactions = transactionsWithOverdueInfo.sort((a: any, b: any) => {
      let compareValue = 0;

      switch (input.sortBy) {
        case 'dueDate': {
          const aDate = (a.dueDate || a.date) instanceof Date
            ? (a.dueDate || a.date)
            : new Date(a.dueDate || a.date);
          const bDate = (b.dueDate || b.date) instanceof Date
            ? (b.dueDate || b.date)
            : new Date(b.dueDate || b.date);
          compareValue = aDate.getTime() - bDate.getTime();
          break;
        }
        case 'amount':
          compareValue = a.amount - b.amount;
          break;
        case 'createdAt': {
          const aDate = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const bDate = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          compareValue = aDate.getTime() - bDate.getTime();
          break;
        }
      }

      return input.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    // Apply limit
    const limitedTransactions = sortedTransactions.slice(0, input.limit);

    // Calculate totals
    const totalPendingAmount = filteredTransactions
      .filter((t: any) => !t.isOverdue)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const totalOverdueAmount = filteredTransactions
      .filter((t: any) => t.isOverdue)
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const pendingCount = filteredTransactions.filter((t: any) => !t.isOverdue).length;
    const overdueCount = filteredTransactions.filter((t: any) => t.isOverdue).length;

    // Format transactions for response
    const formattedTransactions = limitedTransactions.map((t: any) => ({
      id: t.id,
      amount: t.amount,
      amountFormatted: `R$ ${t.amount.toFixed(2)}`,
      description: t.description,
      status: t.status,
      isOverdue: t.isOverdue,
      overdueDays: t.overdueDays,

      // Dates
      dueDate: t.dueDate || t.date,
      dueDateFormatted: t.dueDateFormatted,
      createdAt: t.createdAt,

      // Relations
      clientId: t.clientId,
      clientName: t.clientName,
      propertyId: t.propertyId,
      propertyName: t.propertyName,
      reservationId: t.reservationId,

      // AbacatePay info
      hasPaymentLink: !!t.abacatepayUrl,
      paymentUrl: t.abacatepayUrl,
      hasPixQrCode: !!t.abacatepayPixId,
      abacatepayStatus: t.abacatepayStatus,

      // Payment method
      paymentMethod: t.paymentMethod,

      // Category
      category: t.category,
    }));

    // Prepare response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        payments: formattedTransactions,

        // Summary
        summary: {
          total: filteredTransactions.length,
          pending: pendingCount,
          overdue: overdueCount,
          totalPendingAmount,
          totalOverdueAmount,
          totalAmount: totalPendingAmount + totalOverdueAmount,
          totalPendingFormatted: `R$ ${totalPendingAmount.toFixed(2)}`,
          totalOverdueFormatted: `R$ ${totalOverdueAmount.toFixed(2)}`,
          totalFormatted: `R$ ${(totalPendingAmount + totalOverdueAmount).toFixed(2)}`,
        },

        // Filters applied
        filters: {
          clientId: input.clientId,
          propertyId: input.propertyId,
          reservationId: input.reservationId,
          includePending: input.includePending,
          includeOverdue: input.includeOverdue,
        },

        // Pagination
        pagination: {
          returned: formattedTransactions.length,
          total: filteredTransactions.length,
          hasMore: filteredTransactions.length > input.limit!,
        },

        // AI-friendly summary message
        summaryMessage: getSummaryMessage(pendingCount, overdueCount, totalPendingAmount, totalOverdueAmount),
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[LIST-PENDING-PAYMENTS] Execution completed successfully', {
      requestId,
      totalFound: filteredTransactions.length,
      returned: formattedTransactions.length,
      pendingCount,
      overdueCount,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[LIST-PENDING-PAYMENTS] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list pending payments',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Get human-readable summary message
 */
function getSummaryMessage(
  pendingCount: number,
  overdueCount: number,
  pendingAmount: number,
  overdueAmount: number
): string {
  const messages: string[] = [];

  if (pendingCount > 0) {
    messages.push(`${pendingCount} pagamento(s) pendente(s) no valor de R$ ${pendingAmount.toFixed(2)}`);
  }

  if (overdueCount > 0) {
    messages.push(`${overdueCount} pagamento(s) vencido(s) no valor de R$ ${overdueAmount.toFixed(2)}`);
  }

  if (messages.length === 0) {
    return 'Não há pagamentos pendentes no momento.';
  }

  return messages.join(' e ') + '.';
}
