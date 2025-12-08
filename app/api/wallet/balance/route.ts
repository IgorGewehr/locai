import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallet = await WalletService.getWallet(authContext.tenantId);

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    logger.error('Error getting wallet balance', { error });
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}
