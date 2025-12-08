/**
 * PROCESS-PAYMENT API ROUTE
 *
 * Processa confirmação de pagamento recebido
 * Chamado pelo N8N quando webhook da AbacatePay confirma pagamento
 * OU quando queremos creditar manualmente na carteira
 *
 * IMPORTANTE: Esta route deve ser idempotente - processar o mesmo
 * pagamento múltiplas vezes deve ter o mesmo resultado
 *
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { WalletService } from '@/lib/services/wallet-service';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { isAbacatePaySuccess, toBRL } from '@/lib/types/abacatepay';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Schema de validação robusto
const ProcessPaymentSchema = z.object({
  tenantId: z.string().min(1, 'TenantId é obrigatório'),

  // Valor em reais
  amount: z.number().positive('Valor deve ser positivo'),

  // Método de pagamento
  paymentMethod: z.enum(['PIX', 'CARD', 'BILLING']),

  // ID da transação na AbacatePay
  transactionId: z.string().min(1, 'TransactionId é obrigatório'),

  // Tipo do ID (PIX ou Billing)
  transactionType: z.enum(['PIX', 'BILLING']).optional(),

  // Dados do cliente
  customerPhone: z.string().min(10, 'Telefone inválido'),
  customerName: z.string().optional(),

  // Descrição
  description: z.string().optional(),

  // Referências
  reservationId: z.string().optional(),
  propertyId: z.string().optional(),

  // Verificar na AbacatePay antes de creditar?
  verifyWithAbacatePay: z.boolean().optional().default(true),

  // Metadados
  metadata: z.record(z.any()).optional(),
});

type ProcessPaymentRequest = z.infer<typeof ProcessPaymentSchema>;

// Collection para rastrear pagamentos já processados (idempotência)
const PROCESSED_PAYMENTS_COLLECTION = 'processed_payments';

/**
 * POST /api/ai/functions/process-payment
 *
 * Processa e credita pagamento na carteira
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `process_payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Validar autenticação N8N
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (n8nSecret && authHeader !== `Bearer ${n8nSecret}`) {
      // Em produção, bloquear se secret configurado
      if (process.env.NODE_ENV === 'production') {
        logger.warn('[PROCESS-PAYMENT] Unauthorized request', { requestId });
        return NextResponse.json(
          { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    // 2. Parse e validar body
    const body = await request.json();
    const validation = ProcessPaymentSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[PROCESS-PAYMENT] Validation failed', {
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

    logger.info('[PROCESS-PAYMENT] Processing payment', {
      requestId,
      tenantId: data.tenantId.substring(0, 8) + '***',
      amount: data.amount,
      transactionId: data.transactionId,
      paymentMethod: data.paymentMethod,
    });

    // 3. Verificar idempotência - pagamento já foi processado?
    const idempotencyKey = `${data.tenantId}_${data.transactionId}`;
    const processedRef = doc(db, PROCESSED_PAYMENTS_COLLECTION, idempotencyKey);
    const processedSnap = await getDoc(processedRef);

    if (processedSnap.exists()) {
      const processedData = processedSnap.data();

      logger.info('[PROCESS-PAYMENT] Payment already processed (idempotent)', {
        requestId,
        idempotencyKey,
        originalRequestId: processedData.requestId,
        walletTransactionId: processedData.walletTransactionId,
      });

      return NextResponse.json({
        success: true,
        data: {
          alreadyProcessed: true,
          walletTransactionId: processedData.walletTransactionId,
          processedAt: processedData.processedAt,
          message: 'Pagamento já foi processado anteriormente',
        },
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 4. Verificar status na AbacatePay (opcional mas recomendado)
    let abacatepayVerified = false;
    let abacatepayStatus = 'UNKNOWN';

    if (data.verifyWithAbacatePay) {
      try {
        const abacatepay = getAbacatePayService();

        // Detectar tipo de transação
        const isPix = data.transactionType === 'PIX' ||
                     data.transactionId.startsWith('pix_') ||
                     data.paymentMethod === 'PIX';

        if (isPix) {
          const pixResponse = await abacatepay.checkPixQrCode(data.transactionId);

          if (isAbacatePaySuccess(pixResponse)) {
            abacatepayStatus = pixResponse.data.status;
            abacatepayVerified = pixResponse.data.status === 'PAID';
          }
        } else {
          const billingResponse = await abacatepay.getBilling(data.transactionId);

          if (isAbacatePaySuccess(billingResponse) && billingResponse.data) {
            abacatepayStatus = billingResponse.data.status;
            abacatepayVerified = billingResponse.data.status === 'PAID';
          }
        }

        logger.info('[PROCESS-PAYMENT] AbacatePay verification', {
          requestId,
          transactionId: data.transactionId,
          status: abacatepayStatus,
          verified: abacatepayVerified,
        });

        if (!abacatepayVerified) {
          logger.warn('[PROCESS-PAYMENT] Payment not verified as PAID', {
            requestId,
            transactionId: data.transactionId,
            status: abacatepayStatus,
          });

          return NextResponse.json(
            {
              success: false,
              error: 'Pagamento não confirmado na AbacatePay',
              code: 'PAYMENT_NOT_CONFIRMED',
              data: {
                abacatepayStatus,
                message: abacatepayStatus === 'PENDING'
                  ? 'Aguardando confirmação do pagamento'
                  : abacatepayStatus === 'EXPIRED'
                    ? 'Pagamento expirado'
                    : 'Pagamento não encontrado ou não confirmado',
              },
            },
            { status: 400 }
          );
        }

      } catch (verifyError) {
        logger.error('[PROCESS-PAYMENT] AbacatePay verification error', {
          requestId,
          error: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        });

        // Se verificação falhar, podemos continuar com cautela ou rejeitar
        // Por segurança, vamos rejeitar em produção
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            {
              success: false,
              error: 'Falha ao verificar pagamento na AbacatePay',
              code: 'VERIFICATION_FAILED',
            },
            { status: 500 }
          );
        }

        // Em dev, permitir continuar
        logger.warn('[PROCESS-PAYMENT] Continuing without verification (dev mode)', {
          requestId,
        });
      }
    }

    // 5. Garantir que a carteira existe
    await WalletService.getWallet(data.tenantId);

    // 6. Creditar na carteira
    const walletTransaction = await WalletService.addTransaction(data.tenantId, {
      type: 'deposit',
      amount: data.amount,
      status: 'completed',
      description: data.description || `Pagamento via ${data.paymentMethod} - ${data.customerPhone}`,
      referenceId: data.transactionId,
      metadata: {
        source: 'n8n_agent',
        paymentMethod: data.paymentMethod,
        provider: 'abacatepay',
        abacatepayStatus,
        abacatepayVerified,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        reservationId: data.reservationId,
        propertyId: data.propertyId,
        requestId,
        ...data.metadata,
      },
    });

    logger.info('[PROCESS-PAYMENT] Payment credited to wallet', {
      requestId,
      walletTransactionId: walletTransaction.id,
      amount: data.amount,
    });

    // 7. Atualizar transação no Firestore (se existir)
    try {
      const services = new TenantServiceFactory(data.tenantId);
      const allTransactions = await services.transactions.getAll(100);

      const existingTransaction = allTransactions.find((t: any) =>
        t.abacatepayPixId === data.transactionId ||
        t.abacatepayBillingId === data.transactionId
      );

      if (existingTransaction) {
        await services.transactions.update(existingTransaction.id, {
          status: 'paid',
          abacatepayStatus: 'PAID',
          paymentDate: new Date(),
          walletTransactionId: walletTransaction.id,
          updatedAt: new Date(),
        });

        logger.info('[PROCESS-PAYMENT] Firestore transaction updated', {
          requestId,
          transactionId: existingTransaction.id,
        });
      }
    } catch (dbError) {
      // Log mas não falha
      logger.warn('[PROCESS-PAYMENT] Failed to update Firestore transaction', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });
    }

    // 8. Registrar como processado (idempotência)
    await setDoc(processedRef, {
      requestId,
      tenantId: data.tenantId,
      transactionId: data.transactionId,
      amount: data.amount,
      walletTransactionId: walletTransaction.id,
      abacatepayStatus,
      abacatepayVerified,
      processedAt: serverTimestamp(),
    });

    const processingTime = Date.now() - startTime;

    logger.info('[PROCESS-PAYMENT] Payment processed successfully', {
      requestId,
      walletTransactionId: walletTransaction.id,
      processingTime: `${processingTime}ms`,
    });

    // 9. Obter saldo atualizado
    const updatedWallet = await WalletService.getWallet(data.tenantId);

    return NextResponse.json({
      success: true,
      data: {
        walletTransactionId: walletTransaction.id,
        amountCredited: data.amount,
        newBalance: updatedWallet.balance,
        newBalanceFormatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(updatedWallet.balance),
        abacatepayVerified,
        customerMessage: `Pagamento de R$ ${data.amount.toFixed(2).replace('.', ',')} confirmado com sucesso!`,
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[PROCESS-PAYMENT] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao processar pagamento',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/process-payment
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'Process Payment API',
    status: 'active',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Idempotency protection',
      'AbacatePay verification',
      'Wallet credit',
      'Firestore sync',
    ],
    description: 'Processa e credita pagamentos confirmados na carteira',
  });
}
