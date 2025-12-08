/**
 * CHECK-PAYMENT-STATUS API ROUTE
 *
 * Endpoint para N8N verificar status de um pagamento PIX ou Billing
 * Usado pela Sofia IA para confirmar se cliente já pagou
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { isAbacatePaySuccess, toBRL } from '@/lib/types/abacatepay';

// Schema de validação
const CheckPaymentSchema = z.object({
  tenantId: z.string().min(1, 'TenantId é obrigatório'),

  // Pode verificar por paymentId ou customerPhone
  paymentId: z.string().optional(),
  customerPhone: z.string().optional(),

  // Tipo de pagamento (se souber)
  paymentType: z.enum(['PIX', 'BILLING']).optional(),
}).refine(data => data.paymentId || data.customerPhone, {
  message: 'Informe paymentId ou customerPhone',
});

type CheckPaymentRequest = z.infer<typeof CheckPaymentSchema>;

/**
 * POST /api/ai/functions/check-payment-status
 *
 * Verifica status de um pagamento
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `check_payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    // 1. Validar autenticação N8N
    const authHeader = request.headers.get('Authorization');
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (n8nSecret && authHeader !== `Bearer ${n8nSecret}`) {
      logger.warn('[CHECK-PAYMENT] Unauthorized request', { requestId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Parse e validar body
    const body = await request.json();
    const validation = CheckPaymentSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[CHECK-PAYMENT] Validation failed', {
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

    logger.info('[CHECK-PAYMENT] Checking payment status', {
      requestId,
      tenantId: data.tenantId.substring(0, 8) + '***',
      paymentId: data.paymentId,
      customerPhone: data.customerPhone?.substring(0, 6) + '***',
      paymentType: data.paymentType,
    });

    const abacatepay = getAbacatePayService();
    const services = new TenantServiceFactory(data.tenantId);
    let result;

    // 3. Se tiver paymentId direto, verificar na AbacatePay
    if (data.paymentId) {
      if (data.paymentType === 'PIX' || data.paymentId.startsWith('pix_')) {
        // Verificar PIX
        const pixResponse = await abacatepay.checkPixQrCode(data.paymentId);

        if (!isAbacatePaySuccess(pixResponse)) {
          logger.warn('[CHECK-PAYMENT] PIX not found in AbacatePay', {
            requestId,
            paymentId: data.paymentId,
            error: pixResponse.error,
          });

          // Tentar buscar no Firestore
          result = await findPaymentInFirestore(services, data.paymentId);
        } else {
          result = {
            paymentId: data.paymentId,
            type: 'PIX',
            status: pixResponse.data.status,
            isPaid: pixResponse.data.status === 'PAID',
            isExpired: pixResponse.data.status === 'EXPIRED',
            isCancelled: pixResponse.data.status === 'CANCELLED',
            expiresAt: pixResponse.data.expiresAt,
            source: 'abacatepay',
          };
        }

      } else if (data.paymentType === 'BILLING' || data.paymentId.startsWith('bill_')) {
        // Verificar Billing
        const billingResponse = await abacatepay.getBilling(data.paymentId);

        if (!isAbacatePaySuccess(billingResponse) || !billingResponse.data) {
          logger.warn('[CHECK-PAYMENT] Billing not found in AbacatePay', {
            requestId,
            paymentId: data.paymentId,
          });

          // Tentar buscar no Firestore
          result = await findPaymentInFirestore(services, data.paymentId);
        } else {
          result = {
            paymentId: data.paymentId,
            type: 'BILLING',
            status: billingResponse.data.status,
            isPaid: billingResponse.data.status === 'PAID',
            isExpired: billingResponse.data.status === 'EXPIRED',
            isCancelled: billingResponse.data.status === 'CANCELLED',
            amount: toBRL(billingResponse.data.amount),
            paymentUrl: billingResponse.data.url,
            source: 'abacatepay',
          };
        }
      } else {
        // Tipo desconhecido, buscar no Firestore
        result = await findPaymentInFirestore(services, data.paymentId);
      }

    } else if (data.customerPhone) {
      // 4. Buscar por telefone do cliente no Firestore
      result = await findPaymentByPhone(services, data.customerPhone, abacatepay);
    }

    if (!result) {
      logger.info('[CHECK-PAYMENT] Payment not found', {
        requestId,
        paymentId: data.paymentId,
        customerPhone: data.customerPhone?.substring(0, 6) + '***',
      });

      return NextResponse.json({
        success: true,
        data: {
          found: false,
          message: 'Nenhum pagamento pendente encontrado',
        },
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const processingTime = Date.now() - startTime;

    logger.info('[CHECK-PAYMENT] Payment status retrieved', {
      requestId,
      paymentId: result.paymentId,
      status: result.status,
      isPaid: result.isPaid,
      processingTime: `${processingTime}ms`,
    });

    // 5. Gerar mensagem amigável para o N8N
    let customerMessage = '';
    if (result.isPaid) {
      customerMessage = `Pagamento confirmado! Valor: R$ ${result.amount?.toFixed(2).replace('.', ',') || 'N/A'}`;
    } else if (result.isExpired) {
      customerMessage = 'O pagamento expirou. Posso gerar um novo para você?';
    } else if (result.isCancelled) {
      customerMessage = 'O pagamento foi cancelado. Posso gerar um novo para você?';
    } else {
      customerMessage = 'Aguardando pagamento...';
    }

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        ...result,
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

    logger.error('[CHECK-PAYMENT] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao verificar pagamento',
        code: 'INTERNAL_ERROR',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Busca pagamento no Firestore por ID
 */
async function findPaymentInFirestore(
  services: TenantServiceFactory,
  paymentId: string
): Promise<any | null> {
  try {
    const transactions = await services.transactions.getAll(100);

    // Buscar por PIX ID ou Billing ID
    const transaction = transactions.find((t: any) =>
      t.abacatepayPixId === paymentId ||
      t.abacatepayBillingId === paymentId
    );

    if (!transaction) return null;

    return {
      paymentId,
      transactionId: transaction.id,
      type: transaction.abacatepayPixId ? 'PIX' : 'BILLING',
      status: transaction.abacatepayStatus || transaction.status,
      isPaid: transaction.status === 'paid',
      isExpired: transaction.abacatepayStatus === 'EXPIRED',
      isCancelled: transaction.status === 'cancelled',
      amount: transaction.amount,
      customerPhone: transaction.clientPhone,
      customerName: transaction.clientName,
      description: transaction.description,
      createdAt: transaction.createdAt,
      source: 'firestore',
    };
  } catch (error) {
    logger.error('[CHECK-PAYMENT] Error searching Firestore', {
      paymentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Busca último pagamento pendente por telefone do cliente
 */
async function findPaymentByPhone(
  services: TenantServiceFactory,
  customerPhone: string,
  abacatepay: ReturnType<typeof getAbacatePayService>
): Promise<any | null> {
  try {
    const transactions = await services.transactions.getAll(100);

    // Normalizar telefone para busca
    const normalizedPhone = customerPhone.replace(/\D/g, '');

    // Buscar transações pendentes do cliente (mais recente primeiro)
    const pendingTransactions = transactions
      .filter((t: any) => {
        const txPhone = (t.clientPhone || '').replace(/\D/g, '');
        return (
          txPhone.includes(normalizedPhone) ||
          normalizedPhone.includes(txPhone)
        ) && (
          t.status === 'pending' ||
          t.abacatepayStatus === 'PENDING'
        ) && (
          t.abacatepayPixId || t.abacatepayBillingId
        );
      })
      .sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    if (pendingTransactions.length === 0) {
      // Buscar último pagamento (mesmo que pago/expirado)
      const lastTransaction = transactions
        .filter((t: any) => {
          const txPhone = (t.clientPhone || '').replace(/\D/g, '');
          return (
            txPhone.includes(normalizedPhone) ||
            normalizedPhone.includes(txPhone)
          ) && (
            t.abacatepayPixId || t.abacatepayBillingId
          );
        })
        .sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

      if (!lastTransaction) return null;

      return {
        paymentId: lastTransaction.abacatepayPixId || lastTransaction.abacatepayBillingId,
        transactionId: lastTransaction.id,
        type: lastTransaction.abacatepayPixId ? 'PIX' : 'BILLING',
        status: lastTransaction.abacatepayStatus || lastTransaction.status,
        isPaid: lastTransaction.status === 'paid',
        isExpired: lastTransaction.abacatepayStatus === 'EXPIRED',
        isCancelled: lastTransaction.status === 'cancelled',
        amount: lastTransaction.amount,
        customerPhone: lastTransaction.clientPhone,
        customerName: lastTransaction.clientName,
        description: lastTransaction.description,
        createdAt: lastTransaction.createdAt,
        source: 'firestore',
      };
    }

    const transaction = pendingTransactions[0];

    // Verificar status atualizado na AbacatePay
    let liveStatus = null;

    if (transaction.abacatepayPixId) {
      const pixResponse = await abacatepay.checkPixQrCode(transaction.abacatepayPixId);
      if (isAbacatePaySuccess(pixResponse)) {
        liveStatus = pixResponse.data.status;
      }
    }

    return {
      paymentId: transaction.abacatepayPixId || transaction.abacatepayBillingId,
      transactionId: transaction.id,
      type: transaction.abacatepayPixId ? 'PIX' : 'BILLING',
      status: liveStatus || transaction.abacatepayStatus || transaction.status,
      isPaid: liveStatus === 'PAID' || transaction.status === 'paid',
      isExpired: liveStatus === 'EXPIRED' || transaction.abacatepayStatus === 'EXPIRED',
      isCancelled: liveStatus === 'CANCELLED' || transaction.status === 'cancelled',
      amount: transaction.amount,
      customerPhone: transaction.clientPhone,
      customerName: transaction.clientName,
      description: transaction.description,
      createdAt: transaction.createdAt,
      source: liveStatus ? 'abacatepay' : 'firestore',
    };

  } catch (error) {
    logger.error('[CHECK-PAYMENT] Error searching by phone', {
      customerPhone: customerPhone.substring(0, 6) + '***',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * GET /api/ai/functions/check-payment-status
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'Check Payment Status API',
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    description: 'Verifica status de pagamentos PIX ou Billing',
  });
}
