/**
 * EXECUTE-WITHDRAWAL API ROUTE
 *
 * Processa saques da carteira via AbacatePay
 * Implementa proteções robustas contra double-spend
 *
 * Fluxo:
 * 1. Validar saldo disponível
 * 2. Bloquear saldo (débito imediato na carteira)
 * 3. Criar saque na AbacatePay
 * 4. Webhook atualiza status final
 *
 * Se AbacatePay falhar, estornamos o débito
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { WalletService } from '@/lib/services/wallet-service';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import {
  isAbacatePaySuccess,
  toCents,
  PixKeyType,
  validatePixKey,
  detectPixKeyType,
} from '@/lib/types/abacatepay';
import { db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';

// Constantes
const MIN_WITHDRAWAL_AMOUNT = 10; // R$ 10.00 mínimo
const MAX_WITHDRAWAL_AMOUNT = 50000; // R$ 50.000.00 máximo
const WITHDRAWAL_FEE_PERCENT = 0; // Taxa interna (AbacatePay cobra separado)
const PENDING_WITHDRAWALS_COLLECTION = 'pending_withdrawals';

// Schema de validação
const ExecuteWithdrawalSchema = z.object({
  tenantId: z.string().min(1, 'TenantId é obrigatório'),

  // Valor do saque em reais
  amount: z.number()
    .positive('Valor deve ser positivo')
    .min(MIN_WITHDRAWAL_AMOUNT, `Valor mínimo é R$ ${MIN_WITHDRAWAL_AMOUNT},00`)
    .max(MAX_WITHDRAWAL_AMOUNT, `Valor máximo é R$ ${MAX_WITHDRAWAL_AMOUNT.toLocaleString('pt-BR')},00`),

  // Chave PIX
  pixKey: z.string().min(1, 'Chave PIX é obrigatória'),
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']).optional(),

  // Descrição (opcional)
  description: z.string().max(100).optional(),

  // Metadados
  metadata: z.record(z.any()).optional(),
});

type ExecuteWithdrawalRequest = z.infer<typeof ExecuteWithdrawalSchema>;

/**
 * POST /api/ai/functions/execute-withdrawal
 *
 * Executa saque da carteira via AbacatePay
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `withdrawal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Autenticar (Firebase Auth para usuário ou N8N secret)
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    let authenticatedTenantId: string | null = null;

    // Verificar se é chamada do N8N
    if (n8nSecret && authHeader === `Bearer ${n8nSecret}`) {
      // N8N pode sacar em nome do tenant
      logger.info('[WITHDRAWAL] N8N authenticated request', { requestId });
    } else {
      // Verificar Firebase Auth
      const authContext = await validateFirebaseAuth(request);

      if (!authContext.authenticated || !authContext.tenantId) {
        logger.warn('[WITHDRAWAL] Unauthorized request', { requestId });
        return NextResponse.json(
          { success: false, error: 'Não autorizado', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }

      authenticatedTenantId = authContext.tenantId;
    }

    // 2. Parse e validar body
    const body = await request.json();
    const validation = ExecuteWithdrawalSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[WITHDRAWAL] Validation failed', {
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

    const data = validation.data;

    // 3. Verificar se tenant autenticado corresponde ao solicitado
    if (authenticatedTenantId && authenticatedTenantId !== data.tenantId) {
      logger.warn('[WITHDRAWAL] Tenant mismatch', {
        requestId,
        authenticatedTenantId,
        requestedTenantId: data.tenantId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Não autorizado para este tenant',
          code: 'TENANT_MISMATCH'
        },
        { status: 403 }
      );
    }

    logger.info('[WITHDRAWAL] Processing withdrawal', {
      requestId,
      tenantId: data.tenantId.substring(0, 8) + '***',
      amount: data.amount,
      pixKey: data.pixKey.substring(0, 4) + '***',
    });

    // 4. Detectar e validar tipo de chave PIX
    let pixKeyType = data.pixKeyType
      ? PixKeyType[data.pixKeyType as keyof typeof PixKeyType]
      : detectPixKeyType(data.pixKey);

    if (!pixKeyType) {
      // Tentar identificar pelo formato
      if (data.pixKey.includes('@')) {
        pixKeyType = PixKeyType.EMAIL;
      } else if (data.pixKey.length === 11 && /^\d+$/.test(data.pixKey.replace(/\D/g, ''))) {
        pixKeyType = PixKeyType.CPF;
      } else if (data.pixKey.length === 14 && /^\d+$/.test(data.pixKey.replace(/\D/g, ''))) {
        pixKeyType = PixKeyType.CNPJ;
      } else if (data.pixKey.startsWith('+') || /^\d{10,11}$/.test(data.pixKey.replace(/\D/g, ''))) {
        pixKeyType = PixKeyType.PHONE;
      } else {
        pixKeyType = PixKeyType.RANDOM;
      }
    }

    // 5. Verificar saldo disponível
    const wallet = await WalletService.getWallet(data.tenantId);

    if (wallet.balance < data.amount) {
      logger.warn('[WITHDRAWAL] Insufficient funds', {
        requestId,
        balance: wallet.balance,
        requested: data.amount,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Saldo insuficiente',
          code: 'INSUFFICIENT_FUNDS',
          data: {
            balance: wallet.balance,
            requested: data.amount,
          }
        },
        { status: 400 }
      );
    }

    // 6. Verificar se não há saque pendente duplicado
    const pendingWithdrawalKey = `${data.tenantId}_pending`;
    const pendingRef = doc(db, PENDING_WITHDRAWALS_COLLECTION, pendingWithdrawalKey);
    const pendingSnap = await getDoc(pendingRef);

    if (pendingSnap.exists()) {
      const pendingData = pendingSnap.data();
      const pendingAge = Date.now() - pendingData.createdAt?.toDate?.()?.getTime();

      // Se há saque pendente há menos de 5 minutos, bloquear
      if (pendingAge < 5 * 60 * 1000) {
        logger.warn('[WITHDRAWAL] Pending withdrawal exists', {
          requestId,
          pendingWithdrawalId: pendingData.withdrawalId,
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Já existe um saque em processamento',
            code: 'WITHDRAWAL_PENDING',
            data: {
              withdrawalId: pendingData.withdrawalId,
              amount: pendingData.amount,
            }
          },
          { status: 400 }
        );
      }
    }

    // 7. Criar saque na carteira (débito imediato)
    let withdrawalRequest;
    try {
      withdrawalRequest = await WalletService.requestWithdrawal(
        data.tenantId,
        data.amount,
        {
          pixKey: data.pixKey,
          document: '', // Será preenchido pelo usuário se necessário
        }
      );

      logger.info('[WITHDRAWAL] Wallet debited', {
        requestId,
        withdrawalId: withdrawalRequest.id,
        transactionId: withdrawalRequest.transactionId,
      });

    } catch (walletError) {
      logger.error('[WITHDRAWAL] Failed to debit wallet', {
        requestId,
        error: walletError instanceof Error ? walletError.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          success: false,
          error: walletError instanceof Error ? walletError.message : 'Falha ao processar saque',
          code: 'WALLET_ERROR',
        },
        { status: 500 }
      );
    }

    // 8. Registrar saque pendente (para evitar duplicatas)
    await setDoc(pendingRef, {
      withdrawalId: withdrawalRequest.id,
      tenantId: data.tenantId,
      amount: data.amount,
      createdAt: serverTimestamp(),
    });

    // 9. Criar saque na AbacatePay
    let abacatepayResult;
    try {
      const abacatepay = getAbacatePayService();

      const externalId = `${data.tenantId}_${withdrawalRequest.id}`;

      const withdrawResponse = await abacatepay.createWithdrawal({
        description: data.description || `Saque - ${data.tenantId.substring(0, 8)}`,
        externalId,
        method: 'PIX',
        amount: toCents(data.amount),
        pix: {
          type: pixKeyType,
          key: data.pixKey,
        },
      });

      if (!isAbacatePaySuccess(withdrawResponse)) {
        throw new Error(withdrawResponse.error || 'Falha ao criar saque na AbacatePay');
      }

      abacatepayResult = withdrawResponse.data;

      logger.info('[WITHDRAWAL] AbacatePay withdrawal created', {
        requestId,
        abacatepayId: abacatepayResult.id,
        status: abacatepayResult.status,
        fee: abacatepayResult.platformFee,
      });

    } catch (abacatepayError) {
      // Se falhou na AbacatePay, precisamos estornar o débito na carteira
      logger.error('[WITHDRAWAL] AbacatePay creation failed, reversing wallet debit', {
        requestId,
        withdrawalId: withdrawalRequest.id,
        error: abacatepayError instanceof Error ? abacatepayError.message : 'Unknown error',
      });

      // Estornar débito
      try {
        await WalletService.addTransaction(data.tenantId, {
          type: 'adjustment',
          amount: data.amount, // Positivo = crédito
          status: 'completed',
          description: `Estorno - Falha no saque #${withdrawalRequest.id.substring(0, 8)}`,
          referenceId: withdrawalRequest.id,
          metadata: {
            originalWithdrawalId: withdrawalRequest.id,
            reason: 'abacatepay_failure',
            error: abacatepayError instanceof Error ? abacatepayError.message : 'Unknown error',
          },
        });

        logger.info('[WITHDRAWAL] Wallet debit reversed', {
          requestId,
          withdrawalId: withdrawalRequest.id,
        });

      } catch (reverseError) {
        // CRÍTICO: Falha ao estornar
        logger.error('[WITHDRAWAL] CRITICAL: Failed to reverse wallet debit', {
          requestId,
          withdrawalId: withdrawalRequest.id,
          reverseError: reverseError instanceof Error ? reverseError.message : 'Unknown error',
        });

        // TODO: Alertar administrador para correção manual
      }

      // Limpar saque pendente
      try {
        await updateDoc(pendingRef, {
          status: 'failed',
          error: abacatepayError instanceof Error ? abacatepayError.message : 'Unknown error',
          failedAt: serverTimestamp(),
        });
      } catch (_) {
        // Ignorar erro ao limpar
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao processar saque na AbacatePay',
          code: 'ABACATEPAY_ERROR',
          details: abacatepayError instanceof Error ? abacatepayError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 10. Atualizar saque pendente com dados da AbacatePay
    await updateDoc(pendingRef, {
      abacatepayId: abacatepayResult.id,
      abacatepayStatus: abacatepayResult.status,
      platformFee: abacatepayResult.platformFee,
      receiptUrl: abacatepayResult.receiptUrl,
    });

    const processingTime = Date.now() - startTime;

    logger.info('[WITHDRAWAL] Withdrawal processed successfully', {
      requestId,
      withdrawalId: withdrawalRequest.id,
      abacatepayId: abacatepayResult.id,
      processingTime: `${processingTime}ms`,
    });

    // 11. Obter saldo atualizado
    const updatedWallet = await WalletService.getWallet(data.tenantId);

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: withdrawalRequest.id,
        abacatepayId: abacatepayResult.id,
        amount: data.amount,
        platformFee: abacatepayResult.platformFee / 100, // Converter de centavos
        netAmount: data.amount - (abacatepayResult.platformFee / 100),
        status: abacatepayResult.status,
        receiptUrl: abacatepayResult.receiptUrl,
        pixKey: data.pixKey.substring(0, 4) + '***',
        newBalance: updatedWallet.balance,
        newBalanceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(updatedWallet.balance),
        estimatedTime: 'O valor será creditado em até 1 dia útil',
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[WITHDRAWAL] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao processar saque',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/execute-withdrawal
 * Health check e limites
 */
export async function GET() {
  return NextResponse.json({
    service: 'Execute Withdrawal API',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    limits: {
      minAmount: MIN_WITHDRAWAL_AMOUNT,
      maxAmount: MAX_WITHDRAWAL_AMOUNT,
      internalFee: `${WITHDRAWAL_FEE_PERCENT}%`,
      abacatepayFee: '~R$ 0.80 por saque',
    },
    pixKeyTypes: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'],
    description: 'Executa saques da carteira via AbacatePay PIX',
  });
}
