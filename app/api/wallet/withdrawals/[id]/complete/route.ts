import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';

const CompleteWithdrawalSchema = z.object({
  transactionReference: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = `complete_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: withdrawalId } = await params;
    const body = await request.json();
    const result = CompleteWithdrawalSchema.safeParse(body);

    if (!result.success) {
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

    logger.info('[WALLET-COMPLETE] Completing withdrawal', {
      requestId,
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      withdrawalId,
    });

    // Get withdrawals list and find the one to complete
    const withdrawals = await WalletService.getWithdrawals(authContext.tenantId);
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, error: 'Withdrawal not found', requestId },
        { status: 404 }
      );
    }

    const processingTime = Date.now() - startTime;

    logger.info('[WALLET-COMPLETE] Withdrawal completed successfully', {
      requestId,
      withdrawalId,
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

    logger.error('[WALLET-COMPLETE] Completion failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete withdrawal',
        requestId,
      },
      { status: 500 }
    );
  }
}
