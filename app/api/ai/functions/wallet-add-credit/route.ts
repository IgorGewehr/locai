import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { WalletServiceFactory } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';

/**
 * AI FUNCTION: wallet-add-credit
 *
 * Purpose: Allow Sofia AI Agent to add credit to client wallets
 * Use cases:
 * - Commission payments
 * - Referral bonuses
 * - Promotional credits
 * - Manual adjustments
 *
 * Version: 1.0.0
 */

const AddCreditSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  clientId: z.string().min(1, 'ClientId is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional(),
  transactionId: z.string().optional(),
  reservationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'wallet-add-credit';
  const requestId = `${functionName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const result = AddCreditSchema.safeParse(body);

    if (!result.success) {
      logger.warn(`[${functionName.toUpperCase()}] Validation failed`, {
        requestId,
        errors: result.error.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: result.error.errors,
          requestId,
        },
        { status: 400 }
      );
    }

    const { tenantId, clientId, amount, description, reference, transactionId, reservationId } = result.data;

    logger.info(`[${functionName.toUpperCase()}] Starting execution`, {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      clientId: clientId.substring(0, 8) + '***',
      amount,
    });

    // Sanitize description
    const sanitizedDescription = sanitizeUserInput(description);

    // Add credit to wallet
    const walletService = WalletServiceFactory.getInstance(tenantId);
    const walletTransaction = await walletService.addCredit(
      clientId,
      amount,
      sanitizedDescription,
      {
        reference,
        transactionId,
        reservationId,
      }
    );

    const processingTime = Date.now() - startTime;

    logger.info(`[${functionName.toUpperCase()}] Execution completed`, {
      requestId,
      processingTime: `${processingTime}ms`,
      walletTransactionId: walletTransaction.id,
      balanceAfter: walletTransaction.balanceAfter,
    });

    return NextResponse.json({
      success: true,
      data: {
        walletTransactionId: walletTransaction.id,
        amount: walletTransaction.amount,
        balanceBefore: walletTransaction.balanceBefore,
        balanceAfter: walletTransaction.balanceAfter,
        description: walletTransaction.description,
        status: walletTransaction.status,
        processedAt: walletTransaction.processedAt,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error(`[${functionName.toUpperCase()}] Execution failed`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add credit',
        requestId,
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : undefined,
      },
      { status: 500 }
    );
  }
}
