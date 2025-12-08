/**
 * WALLET-GET-BALANCE API ROUTE
 *
 * Endpoint para N8N consultar saldo da carteira do tenant
 * Usado pela Sofia IA para informar saldo ao usuário
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { WalletService } from '@/lib/services/wallet-service';

// Schema de validação
const GetBalanceSchema = z.object({
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  includeTransactions: z.boolean().optional().default(false),
  transactionLimit: z.number().min(1).max(50).optional().default(10),
});

/**
 * POST /api/ai/functions/wallet-get-balance
 *
 * Retorna saldo e opcionalmente últimas transações
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `wallet_balance_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Validar autenticação N8N
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (n8nSecret && authHeader !== `Bearer ${n8nSecret}`) {
      logger.warn('[WALLET-BALANCE] Unauthorized request', { requestId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Parse e validar body
    const body = await request.json();
    const validation = GetBalanceSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[WALLET-BALANCE] Validation failed', {
        requestId,
        errors: validation.error.errors,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { tenantId, includeTransactions, transactionLimit } = validation.data;

    logger.info('[WALLET-BALANCE] Fetching wallet balance', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      includeTransactions,
    });

    // 3. Obter carteira
    const wallet = await WalletService.getWallet(tenantId);

    // 4. Opcionalmente obter transações
    let transactions = null;
    let transactionSummary = null;

    if (includeTransactions) {
      const allTransactions = await WalletService.getTransactions(tenantId, transactionLimit);

      transactions = allTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt,
      }));

      // Calcular resumo
      const deposits = allTransactions
        .filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const withdrawals = allTransactions
        .filter(t => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const pending = allTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      transactionSummary = {
        totalDeposits: deposits,
        totalWithdrawals: withdrawals,
        pendingAmount: pending,
        transactionCount: allTransactions.length,
      };
    }

    // 5. Obter saques pendentes
    const withdrawals = await WalletService.getWithdrawals(tenantId);
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');

    const processingTime = Date.now() - startTime;

    logger.info('[WALLET-BALANCE] Balance retrieved successfully', {
      requestId,
      balance: wallet.balance,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      processingTime: `${processingTime}ms`,
    });

    // 6. Formatar resposta amigável
    const balanceFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(wallet.balance);

    let customerMessage = `Seu saldo atual é de ${balanceFormatted}`;

    if (pendingWithdrawals.length > 0) {
      const pendingTotal = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      const pendingFormatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(pendingTotal);
      customerMessage += `. Você tem ${pendingWithdrawals.length} saque(s) pendente(s) totalizando ${pendingFormatted}.`;
    } else {
      customerMessage += ', disponível para saque.';
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet.balance,
        balanceFormatted,
        currency: wallet.currency,
        updatedAt: wallet.updatedAt,

        // Saques pendentes
        pendingWithdrawals: pendingWithdrawals.map(w => ({
          id: w.id,
          amount: w.amount,
          status: w.status,
          requestedAt: w.requestedAt,
        })),
        pendingWithdrawalsTotal: pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0),

        // Transações (se solicitadas)
        ...(includeTransactions && {
          transactions,
          transactionSummary,
        }),

        // Mensagem formatada para o cliente
        customerMessage,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[WALLET-BALANCE] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao consultar saldo',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/wallet-get-balance
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'Wallet Get Balance API',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    description: 'Consulta saldo da carteira do tenant',
  });
}
