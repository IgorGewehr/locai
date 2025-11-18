import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type { Withdrawal } from '@/lib/types/wallet';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status'); // Optional filter by status
    const limit = parseInt(searchParams.get('limit') || '50');

    const services = new TenantServiceFactory(authContext.tenantId);
    const withdrawalService = services.createService<Withdrawal>('withdrawals');

    const filters: any[] = [];

    if (clientId) {
      filters.push({ field: 'clientId', operator: '==', value: clientId });
    }

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

    const withdrawals = await withdrawalService.getMany(filters, {
      orderBy: [{ field: 'requestedAt', direction: 'desc' }],
      limit,
    });

    logger.info('[WALLET-WITHDRAWALS] Retrieved withdrawals', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      clientId: clientId?.substring(0, 8) + '***',
      count: withdrawals.length,
    });

    return NextResponse.json({
      success: true,
      data: withdrawals,
      meta: {
        count: withdrawals.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[WALLET-WITHDRAWALS] Failed to retrieve withdrawals', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to retrieve withdrawals' },
      { status: 500 }
    );
  }
}
