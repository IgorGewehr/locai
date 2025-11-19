/**
 * API Route: Process Billing Reminders
 * Processa lembretes automáticos de cobrança
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import type { AutoBillingConfig } from '../config/route';
import type { Transaction } from '@/lib/types';

interface ProcessResult {
  tenantId: string;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{ transactionId: string; error: string }>;
}

/**
 * POST - Process billing reminders for all tenants
 * This endpoint is called by cron job
 */
export async function POST(request: NextRequest) {
  const requestId = `billing-process_${Date.now()}`;
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[BILLING-PROCESS] Unauthorized cron access attempt', { requestId });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('[BILLING-PROCESS] Starting billing process', {
      requestId,
      timestamp: new Date().toISOString(),
    });

    // Get all tenants (in a real scenario, you'd have a tenants collection)
    // For now, we'll process based on configurations found
    const results: ProcessResult[] = [];

    // TODO: Get list of all tenantIds
    // For MVP, we can use an environment variable or admin collection
    const tenantIds = await getAllTenantIds();

    logger.info('[BILLING-PROCESS] Processing tenants', {
      requestId,
      tenantCount: tenantIds.length,
    });

    // Process each tenant
    for (const tenantId of tenantIds) {
      try {
        const result = await processTenantBilling(tenantId, requestId);
        results.push(result);
      } catch (error) {
        logger.error('[BILLING-PROCESS] Tenant processing failed', {
          requestId,
          tenantId: tenantId.substring(0, 8) + '***',
          error: error instanceof Error ? error.message : 'Unknown',
        });

        results.push({
          tenantId,
          processed: 0,
          sent: 0,
          failed: 0,
          skipped: 0,
          errors: [{
            transactionId: 'N/A',
            error: error instanceof Error ? error.message : 'Unknown error',
          }],
        });
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      totalTenants: tenantIds.length,
      totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
      totalSent: results.reduce((sum, r) => sum + r.sent, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      durationMs: duration,
    };

    logger.info('[BILLING-PROCESS] Process completed', {
      requestId,
      summary,
    });

    return NextResponse.json({
      success: true,
      message: 'Billing process completed',
      data: {
        summary,
        results,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        durationMs: duration,
      },
    });

  } catch (error) {
    logger.error('[BILLING-PROCESS] Process failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}

/**
 * Process billing for a single tenant
 */
async function processTenantBilling(tenantId: string, requestId: string): Promise<ProcessResult> {
  const result: ProcessResult = {
    tenantId,
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get tenant configuration
    const services = new TenantServiceFactory(tenantId);
    const configDoc = await services.getFirestore()
      .collection(`tenants/${tenantId}/billing_config`)
      .doc('auto_charge')
      .get();

    if (!configDoc.exists) {
      result.skipped++;
      return result; // No config, skip
    }

    const config = configDoc.data() as AutoBillingConfig;

    if (!config.enabled) {
      result.skipped++;
      return result; // Disabled, skip
    }

    // Check if current time matches send time
    const now = new Date();
    const [targetHour, targetMinute] = config.sendTime.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Allow ±5 minutes window (cron runs every 30min)
    const timeDiffMinutes = Math.abs((currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute));
    if (timeDiffMinutes > 30) {
      result.skipped++;
      logger.info('[BILLING-PROCESS] Skipping tenant - outside time window', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        targetTime: config.sendTime,
        currentTime: `${currentHour}:${currentMinute}`,
      });
      return result;
    }

    // Calculate target due date (today + daysBeforeDue)
    const targetDueDate = new Date();
    targetDueDate.setDate(targetDueDate.getDate() + config.daysBeforeDue);
    targetDueDate.setHours(0, 0, 0, 0); // Start of day

    const targetDueDateEnd = new Date(targetDueDate);
    targetDueDateEnd.setHours(23, 59, 59, 999); // End of day

    logger.info('[BILLING-PROCESS] Processing tenant', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      targetDueDate: targetDueDate.toISOString(),
      daysBeforeDue: config.daysBeforeDue,
    });

    // Get pending income transactions with due date = target date
    const transactions = await services.transactions.getMany([
      { field: 'type', operator: '==', value: 'income' },
      { field: 'status', operator: '==', value: 'pending' },
      { field: 'dueDate', operator: '>=', value: targetDueDate },
      { field: 'dueDate', operator: '<=', value: targetDueDateEnd },
    ]);

    logger.info('[BILLING-PROCESS] Found transactions', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      count: transactions.length,
    });

    // Process each transaction
    for (const transaction of transactions) {
      result.processed++;

      try {
        // Check if transaction has client phone
        if (!transaction.clientId) {
          result.skipped++;
          logger.warn('[BILLING-PROCESS] Skipping transaction - no clientId', {
            requestId,
            transactionId: transaction.id,
          });
          continue;
        }

        // Get client to get phone number
        const client = await services.clients.get(transaction.clientId);
        if (!client || !client.whatsappNumber) {
          result.skipped++;
          logger.warn('[BILLING-PROCESS] Skipping transaction - no client phone', {
            requestId,
            transactionId: transaction.id,
            clientId: transaction.clientId,
          });
          continue;
        }

        // Check if reminder already sent (prevent duplicates)
        const alreadySent = await checkIfReminderSent(tenantId, transaction.id);
        if (alreadySent) {
          result.skipped++;
          logger.info('[BILLING-PROCESS] Skipping transaction - reminder already sent', {
            requestId,
            transactionId: transaction.id,
          });
          continue;
        }

        // Format message with transaction data
        const message = formatMessage(config.message, transaction, client);

        // Send WhatsApp message
        const sent = await sendBillingMessage(tenantId, client.whatsappNumber, message);

        if (sent) {
          result.sent++;

          // Mark reminder as sent
          await markReminderSent(tenantId, transaction.id);

          logger.info('[BILLING-PROCESS] Reminder sent successfully', {
            requestId,
            transactionId: transaction.id,
            phone: client.whatsappNumber.substring(0, 8) + '***',
          });
        } else {
          result.failed++;
          result.errors.push({
            transactionId: transaction.id,
            error: 'Failed to send WhatsApp message',
          });
        }

      } catch (error) {
        result.failed++;
        result.errors.push({
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        logger.error('[BILLING-PROCESS] Transaction processing failed', {
          requestId,
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    return result;

  } catch (error) {
    logger.error('[BILLING-PROCESS] Tenant processing failed', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

/**
 * Check if reminder was already sent for this transaction
 */
async function checkIfReminderSent(tenantId: string, transactionId: string): Promise<boolean> {
  const services = new TenantServiceFactory(tenantId);
  const reminderDoc = await services.getFirestore()
    .collection(`tenants/${tenantId}/billing_reminders`)
    .doc(transactionId)
    .get();

  return reminderDoc.exists;
}

/**
 * Mark reminder as sent
 */
async function markReminderSent(tenantId: string, transactionId: string): Promise<void> {
  const services = new TenantServiceFactory(tenantId);
  await services.getFirestore()
    .collection(`tenants/${tenantId}/billing_reminders`)
    .doc(transactionId)
    .set({
      transactionId,
      sentAt: new Date(),
      status: 'sent',
    });
}

/**
 * Format message with transaction data
 */
function formatMessage(template: string, transaction: Transaction, client: any): string {
  let message = template;

  // Replace variables (if any - for now, just use the message as-is)
  // In the future, you can add {{clientName}}, {{amount}}, {{dueDate}} support

  return message;
}

/**
 * Send WhatsApp message via send-manual API
 */
async function sendBillingMessage(tenantId: string, phone: string, message: string): Promise<boolean> {
  try {
    // Use internal API to send message
    // We need to bypass authentication since this is a server-side call
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/send-n8n`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
      },
      body: JSON.stringify({
        tenantId,
        clientPhone: phone,
        finalMessage: message,
      }),
    });

    return response.ok;
  } catch (error) {
    logger.error('[BILLING-PROCESS] Failed to send WhatsApp message', {
      error: error instanceof Error ? error.message : 'Unknown',
      phone: phone.substring(0, 8) + '***',
    });
    return false;
  }
}

/**
 * Get all tenant IDs
 * TODO: Implement proper tenant listing
 */
async function getAllTenantIds(): Promise<string[]> {
  // For MVP, return from environment variable or single tenant
  const singleTenant = process.env.DEFAULT_TENANT_ID;
  if (singleTenant) {
    return [singleTenant];
  }

  // TODO: Query Firestore for all tenants
  // This would require an admin collection listing all tenant IDs
  return [];
}
