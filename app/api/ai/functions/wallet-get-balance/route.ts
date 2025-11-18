import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { WalletServiceFactory } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';

/**
 * AI FUNCTION: wallet-get-balance
 *
 * Purpose: Allow Sofia AI Agent to check client wallet balance
 * Use cases:
 * - Check available balance before making payments
 * - Inform client about their current balance
 * - Verify eligibility for promotions based on balance
 *
 * Version: 1.0.0
 */

const GetBalanceSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  clientId: z.string().min(1, 'ClientId is required'),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'wallet-get-balance';
  const requestId = `${functionName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const result = GetBalanceSchema.safeParse(body);

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

    const { tenantId, clientId } = result.data;

    logger.info(`[${functionName.toUpperCase()}] Starting execution`, {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      clientId: clientId.substring(0, 8) + '***',
    });

    // Get wallet
    const walletService = WalletServiceFactory.getInstance(tenantId);
    const wallet = await walletService.getOrCreateWallet(clientId, '', '');

    const processingTime = Date.now() - startTime;

    logger.info(`[${functionName.toUpperCase()}] Execution completed`, {
      requestId,
      processingTime: `${processingTime}ms`,
      walletId: wallet.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        walletId: wallet.id,
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        totalWithdrawn: wallet.totalWithdrawn,
        isActive: wallet.isActive,
        isFrozen: wallet.isFrozen,
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
        error: error instanceof Error ? error.message : 'Failed to get balance',
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
