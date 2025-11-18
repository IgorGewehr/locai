import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletServiceFactory } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    const walletService = WalletServiceFactory.getInstance(authContext.tenantId);
    const wallet = await walletService.getOrCreateWallet(clientId, '', '');

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
      },
    });
  } catch (error) {
    logger.error('Error getting wallet balance', { error });
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}
