/**
 * GET AGENT CONFIG API ROUTE
 *
 * Returns dynamic agent configuration for N8N workflow
 * Includes feature flags, prompts, and behavior settings
 *
 * Used by N8N to customize AI agents per tenant
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { tenantConfigCache } from '@/lib/services/tenant-config-cache';
import { buildAllAgentPrompts } from '@/lib/utils/prompt-builder';
import { logger } from '@/lib/utils/logger';
import { handleApiError } from '@/lib/utils/api-errors';
import type {
  TenantConfig,
  AgentConfigResponse,
  DEFAULT_TENANT_CONFIG,
} from '@/lib/types/tenant-config';
import {
  DEFAULT_AI_FEATURES,
  DEFAULT_AGENT_BEHAVIOR,
} from '@/lib/types/tenant-config';

/**
 * POST /api/ai/get-agent-config
 *
 * Body:
 * {
 *   "tenantId": "pBLM1yqIGhdWthwEW7OyWE9F5mg2"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "features": { ... },
 *     "agentPrompts": { ... },
 *     "agentBehavior": { ... }
 *   },
 *   "cached": true
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `get-agent-config_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { tenantId } = body;

    logger.info('[GET-AGENT-CONFIG] Request received', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
    });

    // Validation
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Check cache first
    let config = tenantConfigCache.get(tenantId);
    let cached = !!config;

    if (config) {
      logger.info('[GET-AGENT-CONFIG] Cache hit', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        processingTime: `${Date.now() - startTime}ms`,
      });
    } else {
      // Cache miss - load from Firestore
      logger.info('[GET-AGENT-CONFIG] Cache miss - loading from Firestore', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
      });

      const services = new TenantServiceFactory(tenantId);

      // Try to load tenant config from Firestore
      // Path: tenants/{tenantId}/config/ai-config
      try {
        const configDoc = await services.db
          .collection('tenants')
          .doc(tenantId)
          .collection('config')
          .doc('ai-config')
          .get();

        if (configDoc.exists) {
          config = configDoc.data() as TenantConfig;
          logger.info('[GET-AGENT-CONFIG] Config loaded from Firestore', {
            requestId,
            hasCustomPrompts: !!config.customPrompts,
            featuresEnabled: Object.entries(config.features)
              .filter(([_, enabled]) => enabled)
              .map(([name, _]) => name),
          });
        } else {
          // No config found - use defaults
          logger.warn('[GET-AGENT-CONFIG] No config found - using defaults', {
            requestId,
            tenantId: tenantId.substring(0, 8) + '***',
          });

          config = {
            tenantId,
            features: DEFAULT_AI_FEATURES,
            agentBehavior: DEFAULT_AGENT_BEHAVIOR,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'system',
            version: 1,
          };

          // Save default config to Firestore
          await services.db
            .collection('tenants')
            .doc(tenantId)
            .collection('config')
            .doc('ai-config')
            .set(config);

          logger.info('[GET-AGENT-CONFIG] Default config saved to Firestore', {
            requestId,
          });
        }

        // Cache the config
        tenantConfigCache.set(tenantId, config);
        cached = false;

      } catch (firestoreError) {
        logger.error('[GET-AGENT-CONFIG] Firestore error', {
          requestId,
          error: firestoreError instanceof Error ? firestoreError.message : 'Unknown error',
        });

        // Fallback to defaults
        config = {
          tenantId,
          features: DEFAULT_AI_FEATURES,
          agentBehavior: DEFAULT_AGENT_BEHAVIOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'system',
          version: 1,
        };
      }
    }

    // Build dynamic prompts
    const agentPrompts = buildAllAgentPrompts(
      config.features,
      config.agentBehavior
    );

    // Prepare response
    const response: AgentConfigResponse = {
      success: true,
      data: {
        features: config.features,
        agentPrompts: {
          router: agentPrompts.router,
          sales: agentPrompts.sales,
          search: '', // Use original prompt from N8N
          booking: '', // Use original prompt from N8N
          support: '', // Use original prompt from N8N
          ...(agentPrompts.payments && { payments: agentPrompts.payments }),
          ...(agentPrompts.contracts && { contracts: agentPrompts.contracts }),
        },
        agentBehavior: config.agentBehavior,
      },
      cached,
      ...(cached && { cachedAt: new Date().toISOString() }),
    };

    const processingTime = Date.now() - startTime;

    logger.info('[GET-AGENT-CONFIG] Request completed', {
      requestId,
      cached,
      processingTime: `${processingTime}ms`,
      paymentsEnabled: config.features.payments,
      contractsEnabled: config.features.contracts,
    });

    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GET-AGENT-CONFIG] Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`,
    });

    return handleApiError(error);
  }
}

/**
 * GET /api/ai/get-agent-config (for testing/debugging)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json(
      {
        success: false,
        error: 'TenantId query parameter is required',
        usage: 'GET /api/ai/get-agent-config?tenantId=xxx',
      },
      { status: 400 }
    );
  }

  // Redirect to POST
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
