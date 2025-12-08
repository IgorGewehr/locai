/**
 * WALLET API ROUTE
 *
 * API para consultar saldo, transações e saques da carteira
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { WalletService } from '@/lib/services/wallet-service';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/wallet
 *
 * Retorna dados da carteira do tenant autenticado
 *
 * Query params:
 * - includeTransactions: boolean (default: true)
 * - includeWithdrawals: boolean (default: true)
 * - transactionLimit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `wallet_get_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

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
    const includeTransactions = searchParams.get('includeTransactions') !== 'false';
    const includeWithdrawals = searchParams.get('includeWithdrawals') !== 'false';
    const transactionLimit = parseInt(searchParams.get('transactionLimit') || '20', 10);

    logger.info('[WALLET-API] Fetching wallet data', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      includeTransactions,
      includeWithdrawals,
    });

    // 3. Buscar dados
    const wallet = await WalletService.getWallet(tenantId);

    const result: Record<string, any> = {
      wallet: {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance || 0,
        blockedBalance: wallet.blockedBalance || 0,
        totalDeposits: wallet.totalDeposits || 0,
        totalWithdrawals: wallet.totalWithdrawals || 0,
        currency: wallet.currency,
        lastActivityAt: wallet.lastActivityAt,
        updatedAt: wallet.updatedAt,
      },
    };

    // Transações
    if (includeTransactions) {
      const transactions = await WalletService.getTransactions(tenantId, transactionLimit);
      result.transactions = transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        description: tx.description,
        paymentMethod: tx.paymentMethod,
        createdAt: tx.createdAt,
      }));
    }

    // Saques
    if (includeWithdrawals) {
      const withdrawals = await WalletService.getWithdrawals(tenantId);
      result.withdrawals = withdrawals.map(w => ({
        id: w.id,
        amount: w.amount,
        fee: w.fee,
        netAmount: w.netAmount,
        status: w.status,
        pixKey: w.bankInfo.pixKey?.substring(0, 4) + '***',
        requestedAt: w.requestedAt,
        completedAt: w.completedAt,
        abacatepayReceiptUrl: w.abacatepayReceiptUrl,
      }));

      // Resumo de saques
      const pending = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
      result.withdrawalSummary = {
        pendingCount: pending.length,
        pendingAmount: pending.reduce((sum, w) => sum + w.amount, 0),
        totalCount: withdrawals.length,
      };
    }

    const processingTime = Date.now() - startTime;

    logger.info('[WALLET-API] Wallet data fetched', {
      requestId,
      balance: wallet.balance,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[WALLET-API] Error fetching wallet', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar dados da carteira',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}
