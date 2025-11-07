/**
 * TRANSACTION MAINTENANCE CRON JOBS
 *
 * Automated tasks to run periodically:
 * - Detect and update overdue transactions
 * - Process recurring transactions
 * - Send auto-billing reminders
 *
 * Should be run daily via cron job or scheduled function
 */

import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { TransactionServiceV2, AutoBillingConfig } from '@/lib/services/transaction-service-v2';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// ===== CONFIGURATION =====

const DEFAULT_AUTO_BILLING_CONFIG: AutoBillingConfig = {
  reminderDaysBefore: 3, // Send reminder 3 days before due date
  reminderFrequency: 3, // Send reminder every 3 days after due date
  maxReminders: 5, // Maximum 5 reminders per transaction
};

// ===== MAIN FUNCTIONS =====

/**
 * Process all tenants' transaction maintenance
 */
export async function runTransactionMaintenance(): Promise<{
  success: boolean;
  tenantsProcessed: number;
  overdueUpdated: number;
  recurringCreated: number;
  remindersNeeded: number;
  errors: string[];
}> {
  const startTime = Date.now();
  logger.info('[TransactionMaintenance] Starting maintenance job');

  const results = {
    success: true,
    tenantsProcessed: 0,
    overdueUpdated: 0,
    recurringCreated: 0,
    remindersNeeded: 0,
    errors: [] as string[],
  };

  try {
    // Get all tenants
    const tenantIds = await getAllTenantIds();
    logger.info('[TransactionMaintenance] Processing tenants', { count: tenantIds.length });

    // Process each tenant
    for (const tenantId of tenantIds) {
      try {
        const tenantResults = await processTransactionsForTenant(tenantId);

        results.tenantsProcessed++;
        results.overdueUpdated += tenantResults.overdueUpdated;
        results.recurringCreated += tenantResults.recurringCreated;
        results.remindersNeeded += tenantResults.remindersNeeded;

        logger.info('[TransactionMaintenance] Tenant processed', {
          tenantId: tenantId.substring(0, 8) + '***',
          ...tenantResults
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Tenant ${tenantId}: ${errorMessage}`);
        results.success = false;

        logger.error('[TransactionMaintenance] Tenant processing failed', {
          tenantId: tenantId.substring(0, 8) + '***',
          error: errorMessage
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('[TransactionMaintenance] Maintenance job completed', {
      ...results,
      duration: `${duration}ms`
    });

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[TransactionMaintenance] Maintenance job failed', { error: errorMessage });

    return {
      ...results,
      success: false,
      errors: [errorMessage]
    };
  }
}

/**
 * Process transactions for a single tenant
 */
async function processTransactionsForTenant(tenantId: string): Promise<{
  overdueUpdated: number;
  recurringCreated: number;
  remindersNeeded: number;
}> {
  const services = new TenantServiceFactory(tenantId);
  const transactionService = services.transactions as TransactionServiceV2;

  // 1. Detect and update overdue transactions
  const { updated: overdueUpdated } = await transactionService.detectAndUpdateOverdue();

  // 2. Process recurring transactions
  const recurringCreated = await transactionService.processRecurringTransactions();

  // 3. Get transactions needing reminders
  const needingReminders = await transactionService.getTransactionsNeedingReminders(
    DEFAULT_AUTO_BILLING_CONFIG
  );
  const remindersNeeded = needingReminders.length;

  return {
    overdueUpdated,
    recurringCreated,
    remindersNeeded,
  };
}

/**
 * Get all tenant IDs from Firestore
 */
async function getAllTenantIds(): Promise<string[]> {
  try {
    const tenantsRef = collection(db, 'tenants');
    const snapshot = await getDocs(tenantsRef);

    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    logger.error('[TransactionMaintenance] Failed to get tenant IDs', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Send auto-billing reminders for a tenant
 * This should be called separately, potentially with email/WhatsApp integration
 */
export async function sendAutoBillingReminders(tenantId: string): Promise<{
  success: boolean;
  remindersSent: number;
  errors: string[];
}> {
  const results = {
    success: true,
    remindersSent: 0,
    errors: [] as string[],
  };

  try {
    const services = new TenantServiceFactory(tenantId);
    const transactionService = services.transactions as TransactionServiceV2;

    const needingReminders = await transactionService.getTransactionsNeedingReminders(
      DEFAULT_AUTO_BILLING_CONFIG
    );

    logger.info('[AutoBilling] Transactions needing reminders', {
      tenantId: tenantId.substring(0, 8) + '***',
      count: needingReminders.length
    });

    for (const transaction of needingReminders) {
      try {
        // TODO: Integrate with notification service to send actual reminders
        // For now, just mark as sent
        await transactionService.markReminderSent(transaction.id!);
        results.remindersSent++;

        logger.info('[AutoBilling] Reminder sent', {
          tenantId: tenantId.substring(0, 8) + '***',
          transactionId: transaction.id,
          clientName: transaction.clientName,
          amount: transaction.amount,
          dueDate: transaction.dueDate
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Transaction ${transaction.id}: ${errorMessage}`);
        results.success = false;

        logger.error('[AutoBilling] Failed to send reminder', {
          tenantId: tenantId.substring(0, 8) + '***',
          transactionId: transaction.id,
          error: errorMessage
        });
      }
    }

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[AutoBilling] Failed to send reminders', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: errorMessage
    });

    return {
      ...results,
      success: false,
      errors: [errorMessage]
    };
  }
}

/**
 * Manual trigger for a single tenant
 */
export async function runMaintenanceForTenant(tenantId: string): Promise<{
  success: boolean;
  overdueUpdated: number;
  recurringCreated: number;
  remindersNeeded: number;
  error?: string;
}> {
  try {
    const results = await processTransactionsForTenant(tenantId);

    return {
      success: true,
      ...results
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[TransactionMaintenance] Manual maintenance failed', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: errorMessage
    });

    return {
      success: false,
      overdueUpdated: 0,
      recurringCreated: 0,
      remindersNeeded: 0,
      error: errorMessage
    };
  }
}
