/**
 * WALLET WITHDRAWALS API ROUTE
 *
 * API para listar e gerenciar saques da carteira
 * Usa WalletService que gerencia collection 'withdrawal_requests'
 *
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';
import { WithdrawalStatus } from '@/lib/types/financial-wallet';

/**
 * GET /api/wallet/withdrawals
 *
 * Lista saques do tenant autenticado
 *
 * Query params:
 * - status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'all'
 * - limit: number (default: 50)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `withdrawals_list_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Autenticar
    const authContext = await validateFirebaseAuth(request);

    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    // 2. Parse query params
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    logger.info('[WITHDRAWALS-API] Listing withdrawals', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      status: statusFilter,
      limit,
    });

    // 3. Buscar saques usando WalletService
    let withdrawals;

    if (statusFilter && statusFilter !== 'all') {
      withdrawals = await WalletService.getWithdrawals(tenantId, statusFilter as WithdrawalStatus);
    } else {
      withdrawals = await WalletService.getWithdrawals(tenantId);
    }

    // 4. Limitar resultados
    const limitedWithdrawals = withdrawals.slice(0, limit);

    // 5. Calcular resumo
    const summary = {
      total: withdrawals.length,
      pending: withdrawals.filter(w => w.status === 'pending').length,
      processing: withdrawals.filter(w => w.status === 'processing').length,
      completed: withdrawals.filter(w => w.status === 'completed').length,
      failed: withdrawals.filter(w => w.status === 'failed' || w.status === 'rejected').length,
      reversed: withdrawals.filter(w => w.status === 'reversed').length,
      totalAmount: withdrawals.reduce((sum, w) => sum + w.amount, 0),
      pendingAmount: withdrawals
        .filter(w => w.status === 'pending' || w.status === 'processing')
        .reduce((sum, w) => sum + w.amount, 0),
    };

    const processingTime = Date.now() - startTime;

    logger.info('[WITHDRAWALS-API] Withdrawals listed', {
      requestId,
      count: limitedWithdrawals.length,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: limitedWithdrawals.map(w => ({
          id: w.id,
          amount: w.amount,
          fee: w.fee || 0,
          netAmount: w.netAmount || w.amount,
          status: w.status,
          pixKey: w.bankInfo?.pixKey ? w.bankInfo.pixKey.substring(0, 4) + '***' : null,
          pixKeyType: w.bankInfo?.pixKeyType,
          requestedAt: w.requestedAt,
          processedAt: w.processedAt,
          completedAt: w.completedAt,
          abacatepayId: w.abacatepayId,
          abacatepayStatus: w.abacatepayStatus,
          abacatepayReceiptUrl: w.abacatepayReceiptUrl,
          rejectionReason: w.rejectionReason,
          failureDetails: w.failureDetails,
        })),
        summary,
        pagination: {
          returned: limitedWithdrawals.length,
          total: withdrawals.length,
          limit,
        },
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[WITHDRAWALS-API] Error listing withdrawals', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao listar saques',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}
