/**
 * AI FUNCTION: check-payment-status
 *
 * Checks the current status of a payment (PIX or billing)
 * Returns detailed payment information and status
 *
 * Sofia AI Usage Examples:
 * - "Verifique o status do pagamento #123"
 * - "O cliente já pagou?"
 * - "Qual o status da transação ABC123?"
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getAbacatePayService } from '@/lib/services/abacatepay-service';
import { isAbacatePaySuccess } from '@/lib/types/abacatepay';
import type { Transaction } from '@/lib/types/transaction-unified';
import { TransactionStatus } from '@/lib/types/transaction-unified';

// ===== VALIDATION SCHEMA =====

const CheckPaymentStatusSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  transactionId: z.string().min(1, 'TransactionId is required'),

  // Option to force sync with AbacatePay
  forceSync: z.boolean().default(false).optional(),
});

type CheckPaymentStatusInput = z.infer<typeof CheckPaymentStatusSchema>;

// ===== HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `check_payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();

    logger.info('[CHECK-PAYMENT-STATUS] Starting execution', {
      requestId,
      tenantId: body.tenantId?.substring(0, 8) + '***',
      transactionId: body.transactionId,
    });

    // Validate input
    const validationResult = CheckPaymentStatusSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[CHECK-PAYMENT-STATUS] Validation failed', {
        requestId,
        errors: validationResult.error.flatten(),
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.flatten(),
          requestId,
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Get services
    const services = new TenantServiceFactory(input.tenantId);

    // Get transaction from Firestore
    const transaction = await services.transactions.get(input.transactionId);

    if (!transaction) {
      logger.warn('[CHECK-PAYMENT-STATUS] Transaction not found', {
        requestId,
        transactionId: input.transactionId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found',
          requestId,
        },
        { status: 404 }
      );
    }

    logger.info('[CHECK-PAYMENT-STATUS] Transaction found', {
      requestId,
      transactionId: transaction.id,
      status: transaction.status,
      hasAbacatepayPixId: !!(transaction as any).abacatepayPixId,
      hasAbacatepayBillingId: !!(transaction as any).abacatepayBillingId,
    });

    let abacatepayStatus = null;
    let abacatepayData = null;
    let statusSynced = false;

    // If forceSync is true or transaction is pending, check with AbacatePay
    if (input.forceSync || transaction.status === TransactionStatus.PENDING) {
      const abacatepay = getAbacatePayService();

      // Check PIX status
      if ((transaction as any).abacatepayPixId) {
        try {
          const pixId = (transaction as any).abacatepayPixId;
          const pixResponse = await abacatepay.checkPixQrCode(pixId);

          if (isAbacatePaySuccess(pixResponse)) {
            abacatepayStatus = pixResponse.data.status;
            abacatepayData = {
              type: 'pix',
              status: pixResponse.data.status,
              expiresAt: pixResponse.data.expiresAt,
            };

            // Update transaction if status changed
            if (pixResponse.data.status !== (transaction as any).abacatepayStatus) {
              logger.info('[CHECK-PAYMENT-STATUS] PIX status changed, updating', {
                requestId,
                transactionId: transaction.id,
                oldStatus: (transaction as any).abacatepayStatus,
                newStatus: pixResponse.data.status,
              });

              const newInternalStatus = mapAbacatePayStatus(pixResponse.data.status);

              await services.transactions.update(transaction.id, {
                status: newInternalStatus,
                abacatepayStatus: pixResponse.data.status,
                paymentDate: pixResponse.data.status === 'PAID' ? new Date() : undefined,
                updatedAt: new Date(),
              });

              statusSynced = true;

              // Update local transaction object
              (transaction as any).status = newInternalStatus;
              (transaction as any).abacatepayStatus = pixResponse.data.status;
            }
          }
        } catch (error) {
          logger.error('[CHECK-PAYMENT-STATUS] Failed to check PIX status', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Check billing status
      else if ((transaction as any).abacatepayBillingId) {
        try {
          const billingId = (transaction as any).abacatepayBillingId;
          const billingResponse = await abacatepay.getBilling(billingId);

          if (isAbacatePaySuccess(billingResponse)) {
            abacatepayStatus = billingResponse.data.status;
            abacatepayData = {
              type: 'billing',
              status: billingResponse.data.status,
              url: billingResponse.data.url,
              amount: billingResponse.data.amount,
            };

            // Update transaction if status changed
            if (billingResponse.data.status !== (transaction as any).abacatepayStatus) {
              logger.info('[CHECK-PAYMENT-STATUS] Billing status changed, updating', {
                requestId,
                transactionId: transaction.id,
                oldStatus: (transaction as any).abacatepayStatus,
                newStatus: billingResponse.data.status,
              });

              const newInternalStatus = mapAbacatePayStatus(billingResponse.data.status);

              await services.transactions.update(transaction.id, {
                status: newInternalStatus,
                abacatepayStatus: billingResponse.data.status,
                paymentDate: billingResponse.data.status === 'PAID' ? new Date() : undefined,
                updatedAt: new Date(),
              });

              statusSynced = true;

              // Update local transaction object
              (transaction as any).status = newInternalStatus;
              (transaction as any).abacatepayStatus = billingResponse.data.status;
            }
          }
        } catch (error) {
          logger.error('[CHECK-PAYMENT-STATUS] Failed to check billing status', {
            requestId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Prepare response
    const processingTime = Date.now() - startTime;

    const isPaid = transaction.status === TransactionStatus.PAID;
    const isPending = transaction.status === TransactionStatus.PENDING;
    const isCancelled = transaction.status === TransactionStatus.CANCELLED;
    const isExpired = (transaction as any).abacatepayStatus === 'EXPIRED';

    // Get payment date
    const paidAt = (transaction as any).paymentDate
      ? new Date((transaction as any).paymentDate)
      : null;

    // Get expiration date
    const expiresAt = (transaction as any).abacatepayExpiresAt
      ? new Date((transaction as any).abacatepayExpiresAt)
      : null;

    const response = {
      success: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        abacatepayStatus: (transaction as any).abacatepayStatus || null,

        // Status checks
        isPaid,
        isPending,
        isCancelled,
        isExpired,

        // Payment info
        amount: transaction.amount,
        amountFormatted: `R$ ${transaction.amount.toFixed(2)}`,
        description: transaction.description,

        // Dates
        createdAt: transaction.createdAt,
        paidAt: paidAt?.toISOString() || null,
        expiresAt: expiresAt?.toISOString() || null,

        // Payment details
        paymentMethod: transaction.paymentMethod,
        hasPixQrCode: !!(transaction as any).abacatepayPixId,
        hasPaymentLink: !!(transaction as any).abacatepayBillingId,
        paymentUrl: (transaction as any).abacatepayUrl || null,

        // Sync info
        statusSynced,
        lastWebhookReceived: (transaction as any).abacatepayWebhookReceived || false,
        lastWebhookAt: (transaction as any).abacatepayLastWebhookAt || null,

        // Client info
        clientId: transaction.clientId,
        clientName: (transaction as any).clientName,

        // Additional data from AbacatePay (if available)
        abacatepayData,

        // Status message for AI
        statusMessage: getStatusMessage(transaction),
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    };

    logger.info('[CHECK-PAYMENT-STATUS] Execution completed successfully', {
      requestId,
      status: transaction.status,
      statusSynced,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[CHECK-PAYMENT-STATUS] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check payment status',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined,
      },
      { status: 500 }
    );
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Map AbacatePay status to internal status
 */
function mapAbacatePayStatus(abacatePayStatus: string): TransactionStatus {
  switch (abacatePayStatus) {
    case 'PAID':
      return TransactionStatus.PAID;
    case 'PENDING':
      return TransactionStatus.PENDING;
    case 'EXPIRED':
      return TransactionStatus.CANCELLED;
    case 'CANCELLED':
      return TransactionStatus.CANCELLED;
    case 'REFUNDED':
      return TransactionStatus.REFUNDED;
    default:
      return TransactionStatus.PENDING;
  }
}

/**
 * Get human-readable status message
 */
function getStatusMessage(transaction: Transaction): string {
  const status = transaction.status;
  const abacatepayStatus = (transaction as any).abacatepayStatus;

  if (status === TransactionStatus.PAID) {
    const paidAt = (transaction as any).paymentDate;
    if (paidAt) {
      return `Pagamento confirmado em ${new Date(paidAt).toLocaleDateString('pt-BR')}`;
    }
    return 'Pagamento confirmado';
  }

  if (status === TransactionStatus.PENDING) {
    const expiresAt = (transaction as any).abacatepayExpiresAt;
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      const now = new Date();

      if (expirationDate < now) {
        return 'Pagamento pendente (prazo expirado)';
      }

      const hoursLeft = Math.floor((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft < 24) {
        return `Pagamento pendente (expira em ${hoursLeft}h)`;
      }

      const daysLeft = Math.floor(hoursLeft / 24);
      return `Pagamento pendente (expira em ${daysLeft} dias)`;
    }
    return 'Aguardando pagamento';
  }

  if (status === TransactionStatus.CANCELLED) {
    if (abacatepayStatus === 'EXPIRED') {
      return 'Pagamento expirado (não foi pago no prazo)';
    }
    return 'Pagamento cancelado';
  }

  if (status === TransactionStatus.REFUNDED) {
    return 'Pagamento reembolsado';
  }

  return 'Status desconhecido';
}
