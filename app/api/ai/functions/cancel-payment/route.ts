/**
 * AI FUNCTION: cancel-payment
 *
 * Cancels a pending payment
 * Updates transaction status to cancelled
 *
 * Sofia AI Usage Examples:
 * - "Cancele o pagamento #123"
 * - "Cancele essa cobrança"
 * - "O cliente desistiu, cancele o PIX"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { TransactionStatus } from '@/lib/types/transaction-unified';

// ===== VALIDATION SCHEMA =====

const CancelPaymentSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  transactionId: z.string().min(1, 'TransactionId is required'),

  // Reason for cancellation
  reason: z.string()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason must be at most 500 characters'),

  // Who cancelled (for audit)
  cancelledBy: z.string().default('sofia_ai').optional(),
});

type CancelPaymentInput = z.infer<typeof CancelPaymentSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `cancel_payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[CANCEL-PAYMENT] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      transactionId: body.transactionId,
    });

    // Validate input
    const validationResult = CancelPaymentSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[CANCEL-PAYMENT] Validation failed', {
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

    // Sanitize reason
    const sanitizedReason = sanitizeUserInput(input.reason);

    // Get services
    const services = new TenantServiceFactory(input.tenantId);

    // Get transaction
    const transaction = await services.transactions.get(input.transactionId);

    if (!transaction) {
      logger.warn('[CANCEL-PAYMENT] Transaction not found', {
        requestId,
        transactionId: input.transactionId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found',
          requestId,
        },
        { status: 404 }
      );
    }

    // Check if transaction can be cancelled
    if (transaction.status !== TransactionStatus.PENDING) {
      logger.warn('[CANCEL-PAYMENT] Transaction cannot be cancelled', {
        requestId,
        transactionId: transaction.id,
        currentStatus: transaction.status,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel payment with status: ${transaction.status}`,
          details: 'Only pending payments can be cancelled',
          requestId,
        },
        { status: 400 }
      );
    }

    logger.info('[CANCEL-PAYMENT] Cancelling transaction', {
      requestId,
      transactionId: transaction.id,
      amount: transaction.amount,
      currentStatus: transaction.status,
    });

    // Update transaction
    const existingNotes = transaction.notes || '';
    const cancellationNote = `\n\n[CANCELADO] ${new Date().toISOString()}\nMotivo: ${sanitizedReason}\nCancelado por: ${input.cancelledBy}`;

    await services.transactions.update(transaction.id, {
      status: TransactionStatus.CANCELLED,
      abacatepayStatus: 'CANCELLED',
      notes: existingNotes + cancellationNote,
      lastModifiedBy: input.cancelledBy,
      updatedAt: new Date(),
    });

    logger.info('[CANCEL-PAYMENT] Transaction cancelled successfully', {
      requestId,
      transactionId: transaction.id,
    });

    // Prepare response
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        transactionId: transaction.id,
        previousStatus: transaction.status,
        newStatus: 'cancelled',
        amount: transaction.amount,
        amountFormatted: `R$ ${transaction.amount.toFixed(2)}`,
        description: transaction.description,
        cancelledAt: new Date().toISOString(),
        cancelledBy: input.cancelledBy,
        reason: sanitizedReason,

        // Client info
        clientId: transaction.clientId,
        clientName: (transaction as any).clientName,

        // Message for AI
        message: `Pagamento de R$ ${transaction.amount.toFixed(2)} cancelado com sucesso. Motivo: ${sanitizedReason}`,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[CANCEL-PAYMENT] Execution completed successfully', {
      requestId,
      transactionId: transaction.id,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[CANCEL-PAYMENT] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel payment',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
      },
      { status: 500 }
    );
  }
}
