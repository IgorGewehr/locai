/**
 * ABACATEPAY WEBHOOK ENDPOINT
 *
 * Receives webhook events from AbacatePay for payment status updates
 * Automatically updates transaction status in Firestore AND credits wallet
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/abacatepay
 *
 * @version 2.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { WalletService } from '@/lib/services/wallet-service';
import { toBRL } from '@/lib/types/abacatepay';
import { mapAbacatepayWithdrawStatus } from '@/lib/types/financial-wallet';
import type {
  WebhookPayload,
  WebhookEventType,
  BillingWebhookPayload,
  PixWebhookPayload,
  WithdrawWebhookPayload,
} from '@/lib/types/abacatepay';
import { TransactionStatus } from '@/lib/types/transaction-unified';
import type { Transaction } from '@/lib/types/transaction-unified';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Collection para rastrear webhooks processados (idempotência)
const PROCESSED_WEBHOOKS_COLLECTION = 'processed_webhooks';

/**
 * POST /api/webhooks/abacatepay
 * Handle incoming webhook events from AbacatePay
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    logger.info('[ABACATEPAY-WEBHOOK] Received webhook', {
      requestId,
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
      },
    });

    // Validate webhook secret (if configured)
    const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
    const querySecret = request.nextUrl.searchParams.get('webhookSecret');

    if (webhookSecret && querySecret !== webhookSecret) {
      logger.warn('[ABACATEPAY-WEBHOOK] Invalid webhook secret', { requestId });
      return NextResponse.json(
        { success: false, error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = await request.json();

    logger.info('[ABACATEPAY-WEBHOOK] Webhook payload parsed', {
      requestId,
      event: payload.event,
      devMode: payload.devMode,
      timestamp: payload.timestamp,
    });

    // Validate webhook (basic validation)
    if (!payload.event || !payload.data) {
      logger.warn('[ABACATEPAY-WEBHOOK] Invalid webhook payload', {
        requestId,
        hasEvent: !!payload.event,
        hasData: !!payload.data,
      });

      return NextResponse.json(
        { success: false, error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Check idempotency - already processed?
    const webhookId = (payload as any).id || `${payload.event}_${(payload.data as any).id}_${payload.timestamp}`;
    const processedRef = doc(db, PROCESSED_WEBHOOKS_COLLECTION, webhookId);
    const processedSnap = await getDoc(processedRef);

    if (processedSnap.exists()) {
      logger.info('[ABACATEPAY-WEBHOOK] Webhook already processed (idempotent)', {
        requestId,
        webhookId,
      });

      return NextResponse.json({
        success: true,
        message: 'Webhook already processed',
        requestId,
      });
    }

    // Validate timestamp (reject webhooks older than 15 minutes - increased for reliability)
    const webhookTime = new Date(payload.timestamp);
    const now = new Date();
    const ageMinutes = (now.getTime() - webhookTime.getTime()) / 1000 / 60;

    if (ageMinutes > 15) {
      logger.warn('[ABACATEPAY-WEBHOOK] Webhook too old, rejecting', {
        requestId,
        webhookTime: payload.timestamp,
        ageMinutes: Math.round(ageMinutes),
      });

      return NextResponse.json(
        { success: false, error: 'Webhook timestamp too old' },
        { status: 400 }
      );
    }

    // Process webhook based on event type
    let result;

    if (payload.event.startsWith('billing.')) {
      result = await handleBillingWebhook(payload as BillingWebhookPayload, requestId);
    } else if (payload.event.startsWith('pix.')) {
      result = await handlePixWebhook(payload as PixWebhookPayload, requestId);
    } else if (payload.event.startsWith('withdraw.')) {
      result = await handleWithdrawWebhook(payload as WithdrawWebhookPayload, requestId);
    } else {
      logger.warn('[ABACATEPAY-WEBHOOK] Unknown event type', {
        requestId,
        event: payload.event,
      });

      return NextResponse.json(
        { success: false, error: 'Unknown event type' },
        { status: 400 }
      );
    }

    // Mark webhook as processed (idempotency)
    await setDoc(processedRef, {
      webhookId,
      event: payload.event,
      processedAt: serverTimestamp(),
      requestId,
      result,
    });

    const processingTime = Date.now() - startTime;

    logger.info('[ABACATEPAY-WEBHOOK] Webhook processed successfully', {
      requestId,
      event: payload.event,
      processingTime: `${processingTime}ms`,
      result,
    });

    return NextResponse.json({
      success: true,
      requestId,
      processingTime,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[ABACATEPAY-WEBHOOK] Webhook processing failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle billing (payment link) webhooks
 */
async function handleBillingWebhook(
  payload: BillingWebhookPayload,
  requestId: string
): Promise<{ updated: boolean; transactionId?: string; walletCredited?: boolean }> {
  const { event, data } = payload;

  logger.info('[ABACATEPAY-WEBHOOK] Processing billing webhook', {
    requestId,
    event,
    billingId: data.id,
    status: data.status,
    amount: data.amount,
  });

  // Find transaction by billingId
  const billingId = data.id;

  // Extract tenantId from metadata if available
  const tenantId = data.customer?.metadata?.tenantId ||
                   (data as any).metadata?.tenantId;

  if (!tenantId) {
    logger.warn('[ABACATEPAY-WEBHOOK] No tenantId in billing webhook', {
      requestId,
      billingId,
    });
    return { updated: false };
  }

  const services = new TenantServiceFactory(tenantId);

  // Find transaction by abacatepayBillingId
  const transactions = await services.transactions.getAll();
  const transaction = transactions.find(
    (t: any) => t.abacatepayBillingId === billingId
  );

  if (!transaction) {
    logger.warn('[ABACATEPAY-WEBHOOK] Transaction not found for billing', {
      requestId,
      billingId,
      tenantId,
    });
    return { updated: false };
  }

  // Map AbacatePay status to our status
  const newStatus = mapAbacatePayStatus(data.status);

  logger.info('[ABACATEPAY-WEBHOOK] Updating transaction from billing webhook', {
    requestId,
    transactionId: transaction.id,
    oldStatus: transaction.status,
    newStatus,
    abacatepayStatus: data.status,
  });

  // Update transaction
  await services.transactions.update(transaction.id, {
    status: newStatus,
    abacatepayStatus: data.status,
    abacatepayWebhookReceived: true,
    abacatepayLastWebhookEvent: event,
    abacatepayLastWebhookAt: new Date(),
    paymentDate: data.status === 'PAID' ? new Date() : undefined,
    updatedAt: new Date(),
  });

  // Credit wallet if payment was successful
  let walletCredited = false;
  if (data.status === 'PAID') {
    try {
      await WalletService.addTransaction(tenantId, {
        type: 'deposit',
        amount: toBRL(data.amount),
        status: 'completed',
        description: `Pagamento via Link - ${billingId.substring(0, 8)}`,
        referenceId: billingId,
        abacatepayId: billingId,
        paymentMethod: 'billing',
        paymentProvider: 'abacatepay',
        metadata: {
          source: 'webhook',
          event,
          abacatepayStatus: data.status,
          customerPhone: (transaction as any).clientPhone,
          requestId,
        },
      });

      walletCredited = true;

      logger.info('[ABACATEPAY-WEBHOOK] Wallet credited for billing payment', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        amount: toBRL(data.amount),
        billingId,
      });

    } catch (walletError) {
      logger.error('[ABACATEPAY-WEBHOOK] Failed to credit wallet for billing', {
        requestId,
        error: walletError instanceof Error ? walletError.message : 'Unknown error',
      });
    }
  }

  // Send notification to user about payment status change
  await sendPaymentNotification({
    tenantId,
    transaction,
    event,
    status: data.status,
    amount: toBRL(data.amount),
    paymentMethod: 'Link de Pagamento',
  }).catch(error => {
    logger.error('[ABACATEPAY-WEBHOOK] Notification error (billing)', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return { updated: true, transactionId: transaction.id, walletCredited };
}

/**
 * Handle PIX QR Code webhooks
 */
async function handlePixWebhook(
  payload: PixWebhookPayload,
  requestId: string
): Promise<{ updated: boolean; transactionId?: string; walletCredited?: boolean }> {
  const { event, data } = payload;

  logger.info('[ABACATEPAY-WEBHOOK] Processing PIX webhook', {
    requestId,
    event,
    pixId: data.id,
    status: data.status,
    amount: data.amount,
  });

  // Extract tenantId from metadata
  const tenantId = data.metadata?.tenantId;

  if (!tenantId) {
    logger.warn('[ABACATEPAY-WEBHOOK] No tenantId in PIX webhook', {
      requestId,
      pixId: data.id,
    });
    return { updated: false };
  }

  const services = new TenantServiceFactory(tenantId);

  // Find transaction by abacatepayPixId
  const transactions = await services.transactions.getAll();
  const transaction = transactions.find(
    (t: any) => t.abacatepayPixId === data.id
  );

  if (!transaction) {
    logger.warn('[ABACATEPAY-WEBHOOK] Transaction not found for PIX', {
      requestId,
      pixId: data.id,
      tenantId,
    });
    return { updated: false };
  }

  // Map AbacatePay status to our status
  const newStatus = mapAbacatePayStatus(data.status);

  logger.info('[ABACATEPAY-WEBHOOK] Updating transaction from PIX webhook', {
    requestId,
    transactionId: transaction.id,
    oldStatus: transaction.status,
    newStatus,
    abacatepayStatus: data.status,
  });

  // Update transaction
  await services.transactions.update(transaction.id, {
    status: newStatus,
    abacatepayStatus: data.status,
    abacatepayWebhookReceived: true,
    abacatepayLastWebhookEvent: event,
    abacatepayLastWebhookAt: new Date(),
    paymentDate: data.status === 'PAID' ? new Date() : undefined,
    updatedAt: new Date(),
  });

  // Credit wallet if payment was successful
  let walletCredited = false;
  if (data.status === 'PAID') {
    try {
      await WalletService.addTransaction(tenantId, {
        type: 'deposit',
        amount: toBRL(data.amount),
        status: 'completed',
        description: `Pagamento PIX - ${data.id.substring(0, 12)}`,
        referenceId: data.id,
        abacatepayId: data.id,
        paymentMethod: 'pix',
        paymentProvider: 'abacatepay',
        metadata: {
          source: 'webhook',
          event,
          abacatepayStatus: data.status,
          customerPhone: data.metadata?.customerPhone || (transaction as any).clientPhone,
          requestId,
        },
      });

      walletCredited = true;

      logger.info('[ABACATEPAY-WEBHOOK] Wallet credited for PIX payment', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        amount: toBRL(data.amount),
        pixId: data.id,
      });

    } catch (walletError) {
      logger.error('[ABACATEPAY-WEBHOOK] Failed to credit wallet for PIX', {
        requestId,
        error: walletError instanceof Error ? walletError.message : 'Unknown error',
      });
    }
  }

  // Send notification to user about payment status change
  await sendPaymentNotification({
    tenantId,
    transaction,
    event,
    status: data.status,
    amount: toBRL(data.amount),
    paymentMethod: 'PIX',
  }).catch(error => {
    logger.error('[ABACATEPAY-WEBHOOK] Notification error (PIX)', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });

  return { updated: true, transactionId: transaction.id, walletCredited };
}

/**
 * Handle withdrawal webhooks
 */
async function handleWithdrawWebhook(
  payload: WithdrawWebhookPayload,
  requestId: string
): Promise<{ updated: boolean; withdrawalId?: string; walletUpdated?: boolean }> {
  const { event, data } = payload;

  logger.info('[ABACATEPAY-WEBHOOK] Processing withdrawal webhook', {
    requestId,
    event,
    abacatepayId: data.id,
    status: data.status,
    amount: data.amount,
  });

  // Extract tenantId and withdrawalId from externalId (format: tenantId_withdrawalId)
  const externalId = data.externalId;

  if (!externalId) {
    logger.warn('[ABACATEPAY-WEBHOOK] No externalId in withdrawal webhook', {
      requestId,
      abacatepayId: data.id,
    });
    return { updated: false };
  }

  // Parse tenantId from externalId
  const [tenantId, withdrawalId] = externalId.split('_');

  if (!tenantId || !withdrawalId) {
    logger.warn('[ABACATEPAY-WEBHOOK] Invalid externalId format', {
      requestId,
      externalId,
    });
    return { updated: false };
  }

  // Update withdrawal status in WalletService
  const newStatus = mapAbacatepayWithdrawStatus(data.status);

  try {
    await WalletService.updateWithdrawalStatus(withdrawalId, newStatus, {
      abacatepayId: data.id,
      abacatepayStatus: data.status,
      abacatepayFee: data.platformFee,
      abacatepayReceiptUrl: data.receiptUrl,
    });

    logger.info('[ABACATEPAY-WEBHOOK] Withdrawal status updated', {
      requestId,
      withdrawalId,
      status: newStatus,
      abacatepayStatus: data.status,
    });

    // If withdrawal failed, reverse the debit
    if (data.status === 'CANCELLED' || data.status === 'REFUNDED') {
      try {
        await WalletService.reverseWithdrawal(
          withdrawalId,
          `Saque ${data.status === 'CANCELLED' ? 'cancelado' : 'reembolsado'} pela AbacatePay`
        );

        logger.info('[ABACATEPAY-WEBHOOK] Withdrawal reversed', {
          requestId,
          withdrawalId,
        });
      } catch (reverseError) {
        logger.error('[ABACATEPAY-WEBHOOK] Failed to reverse withdrawal', {
          requestId,
          withdrawalId,
          error: reverseError instanceof Error ? reverseError.message : 'Unknown error',
        });
      }
    }

    // Get withdrawal for notification
    const withdrawal = await WalletService.getWithdrawal(withdrawalId);

    if (withdrawal) {
      // Send notification
      const notificationData = getWithdrawalNotificationData(data.status, toBRL(data.amount));

      try {
        const { NotificationServiceFactory } = await import('@/lib/services/notification-service');
        const notificationService = NotificationServiceFactory.getInstance(tenantId);

        await notificationService.createNotification({
          targetUserId: 'admin',
          targetUserName: 'Administrador',
          type: notificationData.type as any,
          title: notificationData.title,
          message: notificationData.message,
          entityType: 'withdrawal',
          entityId: withdrawalId,
          entityData: {
            amount: toBRL(data.amount),
            fee: data.platformFee / 100,
            status: data.status,
          },
          priority: notificationData.priority as any,
          channels: notificationData.channels as any[],
          actionUrl: '/dashboard/financeiro/carteira',
          actionLabel: 'Ver Carteira',
          metadata: {
            source: 'abacatepay_webhook',
            event,
            abacatepayId: data.id,
          },
        });
      } catch (notifyError) {
        logger.error('[ABACATEPAY-WEBHOOK] Notification error (withdrawal)', {
          requestId,
          error: notifyError instanceof Error ? notifyError.message : 'Unknown error',
        });
      }
    }

    return { updated: true, withdrawalId, walletUpdated: true };

  } catch (error) {
    logger.error('[ABACATEPAY-WEBHOOK] Failed to update withdrawal', {
      requestId,
      withdrawalId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return { updated: false };
  }
}

/**
 * Get notification data for withdrawal status
 */
function getWithdrawalNotificationData(status: string, amount: number): {
  type: string;
  title: string;
  message: string;
  priority: string;
  channels: string[];
} {
  const amountFormatted = `R$ ${amount.toFixed(2)}`;

  switch (status) {
    case 'COMPLETE':
    case 'COMPLETED':
      return {
        type: 'withdrawal_completed',
        title: '✅ Saque Concluído',
        message: `Saque de ${amountFormatted} foi processado com sucesso`,
        priority: 'high',
        channels: ['dashboard', 'email'],
      };

    case 'CANCELLED':
      return {
        type: 'withdrawal_cancelled',
        title: '❌ Saque Cancelado',
        message: `Saque de ${amountFormatted} foi cancelado. O valor foi devolvido à sua carteira.`,
        priority: 'high',
        channels: ['dashboard', 'email'],
      };

    case 'REFUNDED':
      return {
        type: 'withdrawal_refunded',
        title: '↩️ Saque Reembolsado',
        message: `Saque de ${amountFormatted} foi reembolsado. O valor foi devolvido à sua carteira.`,
        priority: 'high',
        channels: ['dashboard', 'email'],
      };

    case 'PENDING':
      return {
        type: 'withdrawal_processing',
        title: '⏳ Saque em Processamento',
        message: `Saque de ${amountFormatted} está sendo processado`,
        priority: 'medium',
        channels: ['dashboard'],
      };

    default:
      return {
        type: 'withdrawal_status_changed',
        title: '🔔 Status de Saque Atualizado',
        message: `Status do saque de ${amountFormatted} foi atualizado para ${status}`,
        priority: 'low',
        channels: ['dashboard'],
      };
  }
}

/**
 * Map AbacatePay status to our TransactionStatus
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
      logger.warn('[ABACATEPAY-WEBHOOK] Unknown AbacatePay status', {
        status: abacatePayStatus,
      });
      return TransactionStatus.PENDING;
  }
}

/**
 * Send notification about payment status change
 */
async function sendPaymentNotification(params: {
  tenantId: string;
  transaction: Transaction;
  event: string;
  status: string;
  amount: number;
  paymentMethod: string;
}): Promise<void> {
  try {
    const { NotificationServiceFactory } = await import('@/lib/services/notification-service');
    const notificationService = NotificationServiceFactory.getInstance(params.tenantId);

    // Get notification details based on status
    const notificationData = getNotificationData(params.status, params.amount, params.paymentMethod);

    // Get related entities for richer notification
    const services = new TenantServiceFactory(params.tenantId);
    const [property, client] = await Promise.all([
      params.transaction.propertyId
        ? services.properties.getById(params.transaction.propertyId).catch(() => null)
        : Promise.resolve(null),
      params.transaction.clientId
        ? services.clients.getById(params.transaction.clientId).catch(() => null)
        : Promise.resolve(null)
    ]);

    const propertyName = (property as any)?.name || '';
    const clientName = client?.name || (params.transaction as any).clientName || '';

    // Build notification message
    let message = notificationData.message;
    if (clientName) {
      message += ` de ${clientName}`;
    }
    if (propertyName) {
      message += ` (${propertyName})`;
    }
    message += `. Método: ${params.paymentMethod}.`;

    await notificationService.createNotification({
      targetUserId: (params.transaction as any).createdBy || 'system',
      targetUserName: 'Administrador',
      type: notificationData.type as any,
      title: notificationData.title,
      message,
      entityType: 'payment',
      entityId: params.transaction.id,
      entityData: {
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        category: params.transaction.category,
        description: params.transaction.description,
        propertyName,
        clientName,
        abacatepayStatus: params.status,
        event: params.event,
      },
      priority: notificationData.priority as any,
      channels: notificationData.channels as any[],
      actionUrl: `/dashboard/financeiro/transacoes/${params.transaction.id}`,
      actionLabel: 'Ver Transação',
      metadata: {
        source: 'abacatepay_webhook',
        triggerEvent: params.event,
        transactionId: params.transaction.id,
      }
    });

    logger.info('[ABACATEPAY-WEBHOOK] Notification sent successfully', {
      transactionId: params.transaction.id,
      status: params.status,
      type: notificationData.type,
    });

  } catch (error) {
    logger.error('[ABACATEPAY-WEBHOOK] Failed to send notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      transactionId: params.transaction.id,
    });
    // Don't throw - notification failure shouldn't break webhook
  }
}

/**
 * Get notification data based on payment status
 */
function getNotificationData(status: string, amount: number, paymentMethod: string): {
  type: string;
  title: string;
  message: string;
  priority: string;
  channels: string[];
} {
  const amountFormatted = `R$ ${amount.toFixed(2)}`;

  switch (status) {
    case 'PAID':
      return {
        type: 'payment_received',
        title: '💰 Pagamento Confirmado',
        message: `Pagamento de ${amountFormatted} confirmado`,
        priority: amount >= 1000 ? 'high' : 'medium',
        channels: ['dashboard', 'email'],
      };

    case 'EXPIRED':
      return {
        type: 'payment_expired',
        title: '⏰ Pagamento Expirado',
        message: `Pagamento de ${amountFormatted} expirou sem ser pago`,
        priority: 'medium',
        channels: ['dashboard'],
      };

    case 'CANCELLED':
      return {
        type: 'payment_cancelled',
        title: '❌ Pagamento Cancelado',
        message: `Pagamento de ${amountFormatted} foi cancelado`,
        priority: 'low',
        channels: ['dashboard'],
      };

    case 'REFUNDED':
      return {
        type: 'payment_refunded',
        title: '↩️ Pagamento Reembolsado',
        message: `Pagamento de ${amountFormatted} foi reembolsado`,
        priority: 'high',
        channels: ['dashboard', 'email'],
      };

    default:
      return {
        type: 'payment_status_changed',
        title: '🔔 Status de Pagamento Atualizado',
        message: `Status do pagamento de ${amountFormatted} foi atualizado para ${status}`,
        priority: 'low',
        channels: ['dashboard'],
      };
  }
}

/**
 * GET /api/webhooks/abacatepay
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'AbacatePay Webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
