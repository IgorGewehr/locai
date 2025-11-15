/**
 * AI FUNCTION: request-withdrawal
 *
 * Request withdrawal to bank account via PIX
 * HIGH SECURITY - Requires explicit confirmation
 *
 * Sofia AI Usage: LIMITED - Requires user confirmation
 * - "Faça um saque de R$ 5.000 para minha conta"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import {
  toCents,
  toBRL,
  isAbacatePaySuccess,
  PixKeyType,
  validatePixKey,
  MAX_WITHDRAW_AMOUNT_CENTS,
} from '@/lib/types/abacatepay';
import {
  TransactionType,
  TransactionStatus,
  TransactionCategory,
  PaymentMethod,
} from '@/lib/types/transaction-unified';

// Security limits
const MAX_DAILY_WITHDRAWALS = 3;
const MAX_WITHDRAWAL_AMOUNT_BRL = toBRL(MAX_WITHDRAW_AMOUNT_CENTS);

// ===== VALIDATION SCHEMA =====

const RequestWithdrawalSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),

  // Amount
  amount: z.number()
    .positive('Amount must be positive')
    .max(MAX_WITHDRAWAL_AMOUNT_BRL, `Maximum withdrawal is R$ ${MAX_WITHDRAWAL_AMOUNT_BRL.toFixed(2)}`),

  // PIX details
  pixKey: z.string().min(3, 'PIX key is required'),
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),

  // Description
  description: z.string().max(200).optional(),

  // Security confirmation
  userConfirmed: z.boolean().refine(val => val === true, {
    message: 'User confirmation is required for withdrawals',
  }),
});

type RequestWithdrawalInput = z.infer<typeof RequestWithdrawalSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `withdrawal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[REQUEST-WITHDRAWAL] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      amount: body.amount,
      pixKeyType: body.pixKeyType,
      userConfirmed: body.userConfirmed,
    });

    // Validate input
    const validationResult = RequestWithdrawalSchema.safeParse(body);

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

    // Validate PIX key format
    if (!validatePixKey(input.pixKeyType as PixKeyType, input.pixKey)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid PIX key format',
          requestId,
        },
        { status: 400 }
      );
    }

    // Get services
    const services = new TenantServiceFactory(input.tenantId);
    const abacatepay = getAbacatePayService();

    // Check daily withdrawal limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allTransactions = await services.transactions.getAll();
    const todayWithdrawals = allTransactions.filter((t: any) => {
      if (t.category !== TransactionCategory.OTHER || t.type !== TransactionType.EXPENSE) return false;

      const createdAt = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
      return createdAt >= today && t.description?.includes('Saque');
    });

    if (todayWithdrawals.length >= MAX_DAILY_WITHDRAWALS) {
      logger.warn('[REQUEST-WITHDRAWAL] Daily withdrawal limit reached', {
        requestId,
        todayCount: todayWithdrawals.length,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Daily withdrawal limit reached (${MAX_DAILY_WITHDRAWALS} per day)`,
          requestId,
        },
        { status: 429 }
      );
    }

    // Prepare withdrawal request
    const amountCents = toCents(input.amount);
    const description = input.description
      ? sanitizeUserInput(input.description)
      : `Saque PIX - ${new Date().toLocaleDateString('pt-BR')}`;

    const externalId = `${input.tenantId}_${Date.now()}`;

    const withdrawRequest = {
      description,
      externalId,
      method: 'PIX' as const,
      amount: amountCents,
      pix: {
        type: input.pixKeyType as PixKeyType,
        key: input.pixKey,
      },
    };

    logger.info('[REQUEST-WITHDRAWAL] Creating withdrawal via AbacatePay', {
      requestId,
      amountCents,
      pixKeyType: input.pixKeyType,
    });

    // Create withdrawal via AbacatePay
    const withdrawResponse = await abacatepay.createWithdrawal(withdrawRequest);

    if (!isAbacatePaySuccess(withdrawResponse)) {
      logger.error('[REQUEST-WITHDRAWAL] AbacatePay API error', {
        requestId,
        error: withdrawResponse.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create withdrawal',
          details: withdrawResponse.error,
          requestId,
        },
        { status: 500 }
      );
    }

    const withdrawData = withdrawResponse.data;

    logger.info('[REQUEST-WITHDRAWAL] Withdrawal created successfully', {
      requestId,
      withdrawalId: withdrawData.id,
      amount: withdrawData.amount,
      fee: withdrawData.platformFee,
    });

    // Create transaction in Firestore
    const transactionData = {
      amount: input.amount,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PENDING,
      description,

      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),

      category: TransactionCategory.OTHER,
      paymentMethod: PaymentMethod.PIX,

      isRecurring: false,
      createdBy: 'sofia_ai',
      tags: ['withdrawal', 'generated-by-ai'],
      createdByAI: true,
      tenantId: input.tenantId,

      // AbacatePay integration
      abacatepayExternalId: externalId,
      abacatepayStatus: withdrawData.status,
      abacatepayFee: withdrawData.platformFee,
      abacatepayMetadata: {
        withdrawalId: withdrawData.id,
        receiptUrl: withdrawData.receiptUrl,
      },
    };

    const transactionId = await services.transactions.create(transactionData);

    const processingTime = Date.now() - startTime;
    const netAmount = toBRL(withdrawData.amount - withdrawData.platformFee);

    const response = {
      success: true,
      data: {
        transactionId,
        withdrawalId: withdrawData.id,
        status: withdrawData.status,
        amount: input.amount,
        fee: toBRL(withdrawData.platformFee),
        netAmount,
        amountFormatted: `R$ ${input.amount.toFixed(2)}`,
        feeFormatted: `R$ ${toBRL(withdrawData.platformFee).toFixed(2)}`,
        netAmountFormatted: `R$ ${netAmount.toFixed(2)}`,
        receiptUrl: withdrawData.receiptUrl,
        pixKey: input.pixKey,
        pixKeyType: input.pixKeyType,
        estimatedTime: '1-2 dias úteis',
        message: `Saque de R$ ${input.amount.toFixed(2)} solicitado com sucesso. Você receberá R$ ${netAmount.toFixed(2)} (taxa de R$ ${toBRL(withdrawData.platformFee).toFixed(2)}).`,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[REQUEST-WITHDRAWAL] Execution completed successfully', {
      requestId,
      transactionId,
      withdrawalId: withdrawData.id,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[REQUEST-WITHDRAWAL] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to request withdrawal',
        requestId,
      },
      { status: 500 }
    );
  }
}
