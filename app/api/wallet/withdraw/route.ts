import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';
import { sanitizeUserInput } from '@/lib/utils/validation';

const WithdrawRequestSchema = z.object({
  amount: z.number().positive(),
  pixKey: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = WithdrawRequestSchema.safeParse(body);

    if (!result.success) {
      logger.warn('[WALLET-WITHDRAW] Validation failed', {
        requestId,
        errors: result.error.errors,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid data',
          details: result.error.errors,
          requestId
        },
        { status: 400 }
      );
    }

    const data = result.data;

    logger.info('[WALLET-WITHDRAW] Processing withdrawal request', {
      requestId,
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      amount: data.amount,
    });

    const withdrawal = await WalletService.requestWithdrawal(
      authContext.tenantId,
      data.amount,
      { pixKey: sanitizeUserInput(data.pixKey) }
    );

    const processingTime = Date.now() - startTime;

    logger.info('[WALLET-WITHDRAW] Withdrawal requested successfully', {
      requestId,
      withdrawalId: withdrawal.id,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      data: withdrawal,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[WALLET-WITHDRAW] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process withdrawal',
        requestId,
      },
      { status: 500 }
    );
  }
}
