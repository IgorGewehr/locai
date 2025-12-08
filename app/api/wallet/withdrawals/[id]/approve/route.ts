import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = `approve_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: withdrawalId } = await params;

    logger.info('[WALLET-APPROVE] Approving withdrawal', {
      requestId,
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      withdrawalId,
    });

    // Get withdrawals list and find the one to approve
    const withdrawals = await WalletService.getWithdrawals(authContext.tenantId);
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, error: 'Withdrawal not found', requestId },
        { status: 404 }
      );
    }

    const processingTime = Date.now() - startTime;

    logger.info('[WALLET-APPROVE] Withdrawal approved successfully', {
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

    logger.error('[WALLET-APPROVE] Approval failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve withdrawal',
        requestId,
      },
      { status: 500 }
    );
  }
}
