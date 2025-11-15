/**
 * AI FUNCTION: get-financial-summary
 *
 * Get comprehensive financial overview for a period
 * Includes income, expenses, pending payments, and analytics
 *
 * Sofia AI Usage Examples:
 * - "Me dê um resumo financeiro do mês"
 * - "Qual foi meu faturamento esta semana?"
 * - "Mostre o balanço financeiro de outubro"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { TransactionStatus, TransactionCategory } from '@/lib/types/transaction-unified';
import type { Transaction } from '@/lib/types/transaction-unified';

// ===== VALIDATION SCHEMA =====

const GetFinancialSummarySchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),

  // Date range (optional - defaults to current month)
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),

  // Filters
  propertyId: z.string().optional(),
  category: z.string().optional(),

  // Include detailed breakdowns
  includeByCategory: z.boolean().default(true).optional(),
  includeByProperty: z.boolean().default(true).optional(),
  includeAbacatepayStats: z.boolean().default(true).optional(),
});

type GetFinancialSummaryInput = z.infer<typeof GetFinancialSummarySchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `financial_summary_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[GET-FINANCIAL-SUMMARY] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      hasStartDate: !!body.startDate,
      hasEndDate: !!body.endDate,
    });

    // Validate input
    const validationResult = GetFinancialSummarySchema.safeParse(body);

    if (!validationResult.success) {
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

    // Default to current month if no dates provided
    const startDate = input.startDate
      ? new Date(input.startDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const endDate = input.endDate
      ? new Date(input.endDate)
      : new Date();

    logger.info('[GET-FINANCIAL-SUMMARY] Date range determined', {
      requestId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Get services
    const services = new TenantServiceFactory(input.tenantId);

    // Get all transactions
    const allTransactions = await services.transactions.getAll();

    // Filter transactions by date range
    const transactions = allTransactions.filter((t: Transaction) => {
      const transactionDate = t.date instanceof Date ? t.date : new Date(t.date);

      if (transactionDate < startDate || transactionDate > endDate) return false;

      // Property filter
      if (input.propertyId && t.propertyId !== input.propertyId) return false;

      // Category filter
      if (input.category && t.category !== input.category) return false;

      return true;
    });

    logger.info('[GET-FINANCIAL-SUMMARY] Transactions filtered', {
      requestId,
      totalTransactions: allTransactions.length,
      filteredTransactions: transactions.length,
    });

    // Calculate totals
    const totalIncome = transactions
      .filter((t: Transaction) => t.type === 'income' && t.status === TransactionStatus.PAID)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t: Transaction) => t.type === 'expense' && t.status === TransactionStatus.PAID)
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    // Calculate by status
    const pending = {
      count: transactions.filter((t: Transaction) => t.status === TransactionStatus.PENDING).length,
      amount: transactions
        .filter((t: Transaction) => t.status === TransactionStatus.PENDING)
        .reduce((sum, t) => sum + t.amount, 0),
    };

    const paid = {
      count: transactions.filter((t: Transaction) => t.status === TransactionStatus.PAID).length,
      amount: transactions
        .filter((t: Transaction) => t.status === TransactionStatus.PAID)
        .reduce((sum, t) => sum + t.amount, 0),
    };

    const overdue = {
      count: transactions.filter((t: Transaction) => t.status === TransactionStatus.OVERDUE).length,
      amount: transactions
        .filter((t: Transaction) => t.status === TransactionStatus.OVERDUE)
        .reduce((sum, t) => sum + t.amount, 0),
    };

    // By category breakdown
    let byCategory = [];
    if (input.includeByCategory) {
      const categories = Array.from(new Set(transactions.map((t: Transaction) => t.category)));

      byCategory = categories.map(category => {
        const categoryTransactions = transactions.filter((t: Transaction) => t.category === category);

        const income = categoryTransactions
          .filter((t: Transaction) => t.type === 'income' && t.status === TransactionStatus.PAID)
          .reduce((sum, t) => sum + t.amount, 0);

        const expenses = categoryTransactions
          .filter((t: Transaction) => t.type === 'expense' && t.status === TransactionStatus.PAID)
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          category,
          income,
          expenses,
          net: income - expenses,
          count: categoryTransactions.length,
          incomeFormatted: `R$ ${income.toFixed(2)}`,
          expensesFormatted: `R$ ${expenses.toFixed(2)}`,
          netFormatted: `R$ ${(income - expenses).toFixed(2)}`,
        };
      });
    }

    // By property breakdown
    let byProperty = [];
    if (input.includeByProperty && !input.propertyId) {
      const propertyIds = Array.from(new Set(
        transactions.filter((t: Transaction) => t.propertyId).map((t: Transaction) => t.propertyId)
      ));

      byProperty = propertyIds.map(propertyId => {
        const propertyTransactions = transactions.filter((t: Transaction) => t.propertyId === propertyId);

        const income = propertyTransactions
          .filter((t: Transaction) => t.type === 'income' && t.status === TransactionStatus.PAID)
          .reduce((sum, t) => sum + t.amount, 0);

        const expenses = propertyTransactions
          .filter((t: Transaction) => t.type === 'expense' && t.status === TransactionStatus.PAID)
          .reduce((sum, t) => sum + t.amount, 0);

        const propertyName = (propertyTransactions[0] as any).propertyName || 'Sem nome';

        return {
          propertyId,
          propertyName,
          income,
          expenses,
          netIncome: income - expenses,
          incomeFormatted: `R$ ${income.toFixed(2)}`,
          expensesFormatted: `R$ ${expenses.toFixed(2)}`,
          netIncomeFormatted: `R$ ${(income - expenses).toFixed(2)}`,
        };
      });
    }

    // AbacatePay stats
    let abacatepayStats = null;
    if (input.includeAbacatepayStats) {
      const abacatepayTransactions = transactions.filter((t: any) =>
        t.abacatepayPixId || t.abacatepayBillingId
      );

      const totalProcessed = abacatepayTransactions
        .filter((t: Transaction) => t.status === TransactionStatus.PAID)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalFees = abacatepayTransactions
        .filter((t: any) => t.abacatepayFee)
        .reduce((sum, t: any) => sum + (t.abacatepayFee || 0), 0);

      const pendingWithdrawals = transactions.filter((t: any) =>
        t.type === 'expense' &&
        t.status === TransactionStatus.PENDING &&
        t.description?.includes('Saque')
      ).length;

      abacatepayStats = {
        totalProcessed,
        totalFees,
        pendingWithdrawals,
        pixPaymentsCount: abacatepayTransactions.filter((t: any) => t.abacatepayPixId).length,
        billingPaymentsCount: abacatepayTransactions.filter((t: any) => t.abacatepayBillingId).length,
        totalProcessedFormatted: `R$ ${totalProcessed.toFixed(2)}`,
        totalFeesFormatted: `R$ ${totalFees.toFixed(2)}`,
      };
    }

    // Prepare response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          startFormatted: startDate.toLocaleDateString('pt-BR'),
          endFormatted: endDate.toLocaleDateString('pt-BR'),
        },

        // Main totals
        totalIncome,
        totalExpenses,
        netIncome,
        totalIncomeFormatted: `R$ ${totalIncome.toFixed(2)}`,
        totalExpensesFormatted: `R$ ${totalExpenses.toFixed(2)}`,
        netIncomeFormatted: `R$ ${netIncome.toFixed(2)}`,

        // By status
        pending,
        paid,
        overdue,

        // Breakdowns
        byCategory,
        byProperty,
        abacatepay: abacatepayStats,

        // Summary message
        summaryMessage: getSummaryMessage(totalIncome, totalExpenses, netIncome, pending.amount, overdue.amount),
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[GET-FINANCIAL-SUMMARY] Execution completed successfully', {
      requestId,
      totalIncome,
      totalExpenses,
      netIncome,
      transactionsAnalyzed: transactions.length,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GET-FINANCIAL-SUMMARY] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get financial summary',
        requestId,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

function getSummaryMessage(
  income: number,
  expenses: number,
  net: number,
  pending: number,
  overdue: number
): string {
  const messages = [
    `Receitas: R$ ${income.toFixed(2)}`,
    `Despesas: R$ ${expenses.toFixed(2)}`,
    `Saldo: R$ ${net.toFixed(2)} ${net >= 0 ? '(positivo)' : '(negativo)'}`,
  ];

  if (pending > 0) {
    messages.push(`Pendente: R$ ${pending.toFixed(2)}`);
  }

  if (overdue > 0) {
    messages.push(`Vencido: R$ ${overdue.toFixed(2)}`);
  }

  return messages.join(' | ');
}
