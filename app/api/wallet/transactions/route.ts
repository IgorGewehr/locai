import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type { WalletTransaction } from '@/lib/types/wallet';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type'); // Optional filter by type

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    const services = new TenantServiceFactory(authContext.tenantId);
    const transactionService = services.createService<WalletTransaction>('wallet_transactions');

    const filters: any[] = [
      { field: 'clientId', operator: '==', value: clientId }
    ];

    if (type) {
      filters.push({ field: 'type', operator: '==', value: type });
    }

    const transactions = await transactionService.getMany(filters, {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
    });

    logger.info('[WALLET-TRANSACTIONS] Retrieved transactions', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      clientId: clientId.substring(0, 8) + '***',
      count: transactions.length,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      meta: {
        count: transactions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[WALLET-TRANSACTIONS] Failed to retrieve transactions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to retrieve transactions' },
      { status: 500 }
    );
  }
}
