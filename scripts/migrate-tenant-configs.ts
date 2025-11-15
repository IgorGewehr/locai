/**
 * TENANT AI CONFIG MIGRATION SCRIPT
 *
 * Migrates existing tenants to have default AI configuration documents
 * Creates: tenants/{tenantId}/config/ai-config
 *
 * Usage:
 *   npx ts-node scripts/migrate-tenant-configs.ts
 *   npx ts-node scripts/migrate-tenant-configs.ts --dry-run
 *   npx ts-node scripts/migrate-tenant-configs.ts --tenant=TENANT_ID
 *
 * @version 1.0.0
 */

import * as admin from 'firebase-admin';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  DEFAULT_AI_FEATURES,
  DEFAULT_AGENT_BEHAVIOR,
  DEFAULT_PAYMENT_SETTINGS,
} from '../lib/types/tenant-config';
import type { TenantConfig } from '../lib/types/tenant-config';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const specificTenant = args.find((arg) => arg.startsWith('--tenant='))?.split('=')[1];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use service account key if available
    const serviceAccount = require('../locai-firebase-adminsdk.json');
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log(`${colors.green}✓${colors.reset} Firebase Admin initialized with service account`);
  } catch (error) {
    // Fallback to default credentials
    initializeApp();
    console.log(`${colors.green}✓${colors.reset} Firebase Admin initialized with default credentials`);
  }
}

const db = getFirestore();

interface MigrationStats {
  total: number;
  alreadyConfigured: number;
  migrated: number;
  errors: number;
  skipped: number;
}

/**
 * Get all tenant IDs from Firestore
 */
async function getAllTenantIds(): Promise<string[]> {
  console.log(`\n${colors.cyan}📋 Fetching tenant list...${colors.reset}`);

  const tenantsSnapshot = await db.collection('tenants').listDocuments();
  const tenantIds = tenantsSnapshot.map((doc) => doc.id);

  console.log(`${colors.green}✓${colors.reset} Found ${colors.bright}${tenantIds.length}${colors.reset} tenants`);

  return tenantIds;
}

/**
 * Check if tenant already has AI config
 */
async function hasAIConfig(tenantId: string): Promise<boolean> {
  const configDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('config')
    .doc('ai-config')
    .get();

  return configDoc.exists;
}

/**
 * Create default AI config for tenant
 */
async function createDefaultConfig(tenantId: string, dryRun: boolean): Promise<boolean> {
  try {
    const defaultConfig: TenantConfig = {
      tenantId,
      features: DEFAULT_AI_FEATURES,
      paymentSettings: DEFAULT_PAYMENT_SETTINGS,
      agentBehavior: DEFAULT_AGENT_BEHAVIOR,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
      updatedBy: 'migration-script',
      version: 1,
    };

    if (dryRun) {
      console.log(`${colors.yellow}[DRY RUN]${colors.reset} Would create config for tenant: ${tenantId.substring(0, 8)}***`);
      console.log(`${colors.yellow}[DRY RUN]${colors.reset} Config:`, {
        features: defaultConfig.features,
        paymentSettings: {
          provider: defaultConfig.paymentSettings?.provider,
          enableAutoReminders: defaultConfig.paymentSettings?.enableAutoReminders,
        },
        agentBehavior: {
          router: defaultConfig.agentBehavior.router,
          sales: {
            maxDiscount: defaultConfig.agentBehavior.sales.maxDiscount,
            allowNegotiation: defaultConfig.agentBehavior.sales.allowNegotiation,
          },
        },
      });
      return true;
    }

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('config')
      .doc('ai-config')
      .set(defaultConfig);

    console.log(`${colors.green}✓${colors.reset} Created config for tenant: ${tenantId.substring(0, 8)}***`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Error creating config for tenant ${tenantId.substring(0, 8)}***:`, error);
    return false;
  }
}

/**
 * Migrate a single tenant
 */
async function migrateTenant(tenantId: string, dryRun: boolean, stats: MigrationStats): Promise<void> {
  stats.total++;

  try {
    const hasConfig = await hasAIConfig(tenantId);

    if (hasConfig) {
      console.log(`${colors.blue}ℹ${colors.reset} Tenant ${tenantId.substring(0, 8)}*** already has AI config - skipping`);
      stats.alreadyConfigured++;
      return;
    }

    const success = await createDefaultConfig(tenantId, dryRun);

    if (success) {
      stats.migrated++;
    } else {
      stats.errors++;
    }
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Error migrating tenant ${tenantId.substring(0, 8)}***:`, error);
    stats.errors++;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  TENANT AI CONFIG MIGRATION${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (dryRun) {
    console.log(`${colors.yellow}⚠ DRY RUN MODE - No changes will be made${colors.reset}\n`);
  }

  const stats: MigrationStats = {
    total: 0,
    alreadyConfigured: 0,
    migrated: 0,
    errors: 0,
    skipped: 0,
  };

  const startTime = Date.now();

  try {
    // Get tenant IDs
    let tenantIds: string[];

    if (specificTenant) {
      console.log(`${colors.cyan}🎯 Migrating specific tenant: ${specificTenant.substring(0, 8)}***${colors.reset}\n`);
      tenantIds = [specificTenant];
    } else {
      tenantIds = await getAllTenantIds();
    }

    if (tenantIds.length === 0) {
      console.log(`${colors.yellow}⚠ No tenants found${colors.reset}`);
      return;
    }

    console.log(`\n${colors.cyan}🚀 Starting migration...${colors.reset}\n`);

    // Migrate each tenant
    for (const tenantId of tenantIds) {
      await migrateTenant(tenantId, dryRun, stats);
    }

    const duration = Date.now() - startTime;

    // Print summary
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}  MIGRATION SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.bright}Total tenants:${colors.reset}         ${stats.total}`);
    console.log(`${colors.green}Already configured:${colors.reset}    ${stats.alreadyConfigured}`);
    console.log(`${colors.green}Migrated:${colors.reset}              ${stats.migrated}`);
    console.log(`${colors.red}Errors:${colors.reset}                ${stats.errors}`);
    console.log(`${colors.yellow}Skipped:${colors.reset}               ${stats.skipped}`);
    console.log(`\n${colors.bright}Duration:${colors.reset}              ${duration}ms`);

    if (dryRun) {
      console.log(`\n${colors.yellow}This was a DRY RUN. Run without --dry-run to apply changes.${colors.reset}`);
    } else if (stats.migrated > 0) {
      console.log(`\n${colors.green}✓ Migration completed successfully!${colors.reset}`);
      console.log(`${colors.cyan}ℹ All migrated tenants now have default AI configuration.${colors.reset}`);
      console.log(`${colors.cyan}ℹ Users can customize settings at /dashboard/settings/ai-config${colors.reset}`);
    } else if (stats.alreadyConfigured === stats.total) {
      console.log(`\n${colors.green}✓ All tenants already configured!${colors.reset}`);
    }

    if (stats.errors > 0) {
      console.log(`\n${colors.red}⚠ ${stats.errors} error(s) occurred during migration${colors.reset}`);
      console.log(`${colors.yellow}Please review the errors above and retry if necessary.${colors.reset}`);
    }

    console.log('');
  } catch (error) {
    console.error(`\n${colors.red}✗ Migration failed:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Validate default configuration structure
 */
function validateDefaultConfig() {
  console.log(`${colors.cyan}🔍 Validating default configuration...${colors.reset}`);

  const requiredFeatures = ['payments', 'contracts', 'analytics', 'customReports', 'autoFollowUp'];
  const missingFeatures = requiredFeatures.filter((f) => !(f in DEFAULT_AI_FEATURES));

  if (missingFeatures.length > 0) {
    console.error(`${colors.red}✗ Missing features in DEFAULT_AI_FEATURES:${colors.reset}`, missingFeatures);
    process.exit(1);
  }

  const requiredAgents = ['router', 'sales', 'search', 'booking', 'support'];
  const missingAgents = requiredAgents.filter((a) => !(a in DEFAULT_AGENT_BEHAVIOR));

  if (missingAgents.length > 0) {
    console.error(`${colors.red}✗ Missing agents in DEFAULT_AGENT_BEHAVIOR:${colors.reset}`, missingAgents);
    process.exit(1);
  }

  console.log(`${colors.green}✓${colors.reset} Default configuration is valid`);
}

// Run migration
(async () => {
  try {
    validateDefaultConfig();
    await runMigration();
    process.exit(0);
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
})();
