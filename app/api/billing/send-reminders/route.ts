/**
 * API Route: Send Billing Reminders
 * Envia lembretes de cobrança via WhatsApp
 * Pode ser chamada manualmente ou por um serviço externo
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type { AutoBillingConfig } from '../config/route';

interface SendResult {
  transactionId: string;
  clientPhone: string;
  sent: boolean;
  error?: string;
}

/**
 * POST - Send billing reminders for pending transactions
 * Pode ser chamada por:
 * 1. Usuário no frontend (com auth Firebase)
 * 2. Serviço externo agendado (futuro)
 */
export async function POST(request: NextRequest) {
  const requestId = `billing-reminders_${Date.now()}`;
  const startTime = Date.now();

  try {
    // Authenticate
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    logger.info('[BILLING-REMINDERS] Starting reminder process', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    // Get billing configuration
    const services = new TenantServiceFactory(tenantId);
    const configDoc = await services.getFirestore()
      .collection(`tenants/${tenantId}/billing_config`)
      .doc('auto_charge')
      .get();

    if (!configDoc.exists) {
      return NextResponse.json({
        success: true,
        message: 'No billing configuration found',
        data: { sent: 0, skipped: 0 },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
    }

    const config = configDoc.data() as AutoBillingConfig;

    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Billing reminders are disabled',
        data: { sent: 0, skipped: 0 },
        meta: { requestId, timestamp: new Date().toISOString() },
      });
    }

    // Calculate target due date (today + daysBeforeDue)
    const targetDueDate = new Date();
    targetDueDate.setDate(targetDueDate.getDate() + config.daysBeforeDue);
    targetDueDate.setHours(0, 0, 0, 0);

    const targetDueDateEnd = new Date(targetDueDate);
    targetDueDateEnd.setHours(23, 59, 59, 999);

    logger.info('[BILLING-REMINDERS] Configuration loaded', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      daysBeforeDue: config.daysBeforeDue,
      targetDueDate: targetDueDate.toISOString(),
    });

    // Get pending income transactions with due date = target date
    const transactions = await services.transactions.getMany([
      { field: 'type', operator: '==', value: 'income' },
      { field: 'status', operator: '==', value: 'pending' },
      { field: 'dueDate', operator: '>=', value: targetDueDate },
      { field: 'dueDate', operator: '<=', value: targetDueDateEnd },
    ]);

    logger.info('[BILLING-REMINDERS] Found transactions', {
      requestId,
      count: transactions.length,
    });

    const results: SendResult[] = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Process each transaction
    for (const transaction of transactions) {
      try {
        // Check if transaction has client
        if (!transaction.clientId) {
          skipped++;
          logger.warn('[BILLING-REMINDERS] Skipping - no clientId', {
            requestId,
            transactionId: transaction.id,
          });
          continue;
        }

        // Get client
        const client = await services.clients.get(transaction.clientId);
        if (!client || !client.whatsappNumber) {
          skipped++;
          logger.warn('[BILLING-REMINDERS] Skipping - no whatsappNumber', {
            requestId,
            transactionId: transaction.id,
            clientId: transaction.clientId,
          });
          continue;
        }

        // Check if reminder already sent
        const reminderDoc = await services.getFirestore()
          .collection(`tenants/${tenantId}/billing_reminders`)
          .doc(transaction.id!)
          .get();

        if (reminderDoc.exists) {
          skipped++;
          logger.info('[BILLING-REMINDERS] Skipping - already sent', {
            requestId,
            transactionId: transaction.id,
          });
          continue;
        }

        // Send message via WhatsApp microservice (mesma forma que conversas)
        const whatsappResponse = await fetch(`${process.env.WHATSAPP_MICROSERVICE_URL}/api/v1/messages/${tenantId}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WHATSAPP_MICROSERVICE_API_KEY}`
          },
          body: JSON.stringify({
            tenantId,
            to: client.whatsappNumber,
            message: config.message,
            type: 'text',
            source: 'billing_reminder'
          })
        });

        if (!whatsappResponse.ok) {
          failed++;
          results.push({
            transactionId: transaction.id!,
            clientPhone: client.whatsappNumber,
            sent: false,
            error: 'WhatsApp send failed'
          });
          continue;
        }

        // Mark reminder as sent
        await services.getFirestore()
          .collection(`tenants/${tenantId}/billing_reminders`)
          .doc(transaction.id!)
          .set({
            transactionId: transaction.id,
            sentAt: new Date(),
            status: 'sent',
            clientPhone: client.whatsappNumber,
            message: config.message,
          });

        sent++;
        results.push({
          transactionId: transaction.id!,
          clientPhone: client.whatsappNumber.substring(0, 8) + '***',
          sent: true
        });

        logger.info('[BILLING-REMINDERS] Reminder sent', {
          requestId,
          transactionId: transaction.id,
          phone: client.whatsappNumber.substring(0, 8) + '***',
        });

      } catch (error) {
        failed++;
        results.push({
          transactionId: transaction.id!,
          clientPhone: 'unknown',
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        logger.error('[BILLING-REMINDERS] Failed to send reminder', {
          requestId,
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('[BILLING-REMINDERS] Process completed', {
      requestId,
      sent,
      skipped,
      failed,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Billing reminders process completed',
      data: {
        processed: transactions.length,
        sent,
        skipped,
        failed,
        results,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        durationMs: duration,
      },
    });

  } catch (error) {
    logger.error('[BILLING-REMINDERS] Process failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}

/**
 * GET - Check reminder status and configuration
 */
export async function GET(request: NextRequest) {
  const requestId = `billing-check_${Date.now()}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const services = new TenantServiceFactory(tenantId);

    // Get configuration
    const configDoc = await services.getFirestore()
      .collection(`tenants/${tenantId}/billing_config`)
      .doc('auto_charge')
      .get();

    const config = configDoc.exists ? configDoc.data() as AutoBillingConfig : null;

    // Get reminder history count
    const remindersSnapshot = await services.getFirestore()
      .collection(`tenants/${tenantId}/billing_reminders`)
      .count()
      .get();

    return NextResponse.json({
      success: true,
      data: {
        configured: !!config,
        enabled: config?.enabled || false,
        totalRemindersSent: remindersSnapshot.data().count,
        configuration: config || null,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('[BILLING-CHECK] Failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}
