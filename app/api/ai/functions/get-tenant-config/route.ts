/**
 * GET TENANT CONFIG - AI Function
 *
 * Retorna TODAS as configurações do tenant em um único endpoint
 * para o N8N ter acesso completo às personalizações
 *
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import {
  NegotiationSettings,
  DEFAULT_NEGOTIATION_SETTINGS
} from '@/lib/types/tenant-settings';

// Validation schema
const GetTenantConfigSchema = z.object({
  tenantId: z.string().min(1, 'TenantId is required'),
  includeSettings: z.array(z.enum([
    'ai',
    'negotiation',
    'policies',
    'company',
    'agents',
    'all'
  ])).optional().default(['all'])
});

/**
 * POST /api/ai/functions/get-tenant-config
 * N8N Sofia AI retrieves complete tenant configuration
 *
 * @example
 * {
 *   "tenantId": "tenant123",
 *   "includeSettings": ["negotiation", "ai", "company"]
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `get_tenant_config_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    logger.info('[GET-TENANT-CONFIG] Starting execution', {
      requestId,
      function: 'get-tenant-config'
    });

    // Parse and validate
    const body = await request.json();
    const validation = GetTenantConfigSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('[GET-TENANT-CONFIG] Validation failed', {
        requestId,
        errors: validation.error.errors
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
          requestId
        },
        { status: 400 }
      );
    }

    const { tenantId, includeSettings } = validation.data;
    const includeAll = includeSettings.includes('all');

    logger.info('[GET-TENANT-CONFIG] Fetching configurations', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      includeSettings
    });

    // Build response object
    const config: any = {
      tenantId,
      fetchedAt: new Date().toISOString()
    };

    // 1. AI CONFIG (agent behavior)
    if (includeAll || includeSettings.includes('ai') || includeSettings.includes('agents')) {
      try {
        const aiConfigRef = doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'aiConfig');
        const aiConfigDoc = await getDoc(aiConfigRef);

        if (aiConfigDoc.exists()) {
          const aiData = aiConfigDoc.data();
          config.aiConfig = {
            enabled: aiData?.enabled ?? true,
            autoResponse: aiData?.autoResponse ?? true,
            businessHoursOnly: aiData?.businessHoursOnly ?? false,
            agentBehavior: aiData?.agentBehavior || {
              search: {
                maxPropertiesPerSearch: 3,
                autoSendPhotos: true,
                autoSendMap: true
              },
              booking: {
                requireEmail: true,
                requireDocument: false,
                autoScheduleKeyPickup: true
              },
              support: {
                allowCancellations: true,
                allowModifications: true,
                autoTransferThreshold: 10
              }
            },
            features: aiData?.features || {
              payments: false,
              contracts: false,
              analytics: true,
              customReports: false
            }
          };
        } else {
          config.aiConfig = {
            enabled: true,
            autoResponse: true,
            note: 'Using default AI configuration'
          };
        }
      } catch (error) {
        logger.warn('[GET-TENANT-CONFIG] Failed to fetch AI config', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
        config.aiConfig = { error: 'Failed to fetch AI configuration' };
      }
    }

    // 2. NEGOTIATION SETTINGS (pricing, discounts)
    if (includeAll || includeSettings.includes('negotiation')) {
      try {
        const negotiationRef = doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'negotiation');
        const negotiationDoc = await getDoc(negotiationRef);

        if (negotiationDoc.exists()) {
          config.negotiation = negotiationDoc.data() as NegotiationSettings;
        } else {
          config.negotiation = DEFAULT_NEGOTIATION_SETTINGS;
          config.negotiation.note = 'Using default negotiation settings';
        }
      } catch (error) {
        logger.warn('[GET-TENANT-CONFIG] Failed to fetch negotiation settings', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
        config.negotiation = DEFAULT_NEGOTIATION_SETTINGS;
      }
    }

    // 3. POLICIES (cancellation, check-in/out, house rules)
    if (includeAll || includeSettings.includes('policies')) {
      try {
        const policiesRef = doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'policies');
        const policiesDoc = await getDoc(policiesRef);

        if (policiesDoc.exists()) {
          const policiesData = policiesDoc.data();
          config.policies = {
            cancellationPolicy: policiesData?.cancellationPolicy || 'flexible',
            cancellationDetails: policiesData?.cancellationDetails || {},
            checkInTime: policiesData?.checkInTime || '14:00',
            checkOutTime: policiesData?.checkOutTime || '12:00',
            houseRules: policiesData?.houseRules || [],
            petPolicy: policiesData?.petPolicy || 'not_allowed',
            smokingPolicy: policiesData?.smokingPolicy || 'not_allowed',
            minimumStay: policiesData?.minimumStay || 1,
            maximumStay: policiesData?.maximumStay || 365
          };
        } else {
          config.policies = {
            note: 'Using default policies',
            cancellationPolicy: 'flexible',
            checkInTime: '14:00',
            checkOutTime: '12:00'
          };
        }
      } catch (error) {
        logger.warn('[GET-TENANT-CONFIG] Failed to fetch policies', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
        config.policies = { error: 'Failed to fetch policies' };
      }
    }

    // 4. COMPANY INFO (name, contact, address)
    if (includeAll || includeSettings.includes('company')) {
      try {
        const companyRef = doc(collection(doc(collection(db, 'tenants'), tenantId), 'settings'), 'company');
        const companyDoc = await getDoc(companyRef);

        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          config.company = {
            name: companyData?.name || 'Imobiliária',
            phone: companyData?.phone || '',
            email: companyData?.email || '',
            address: companyData?.address || {},
            website: companyData?.website || '',
            description: companyData?.description || '',
            businessHours: companyData?.businessHours || {}
          };
        } else {
          config.company = {
            note: 'No company information configured'
          };
        }
      } catch (error) {
        logger.warn('[GET-TENANT-CONFIG] Failed to fetch company info', {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown'
        });
        config.company = { error: 'Failed to fetch company information' };
      }
    }

    const processingTime = Date.now() - startTime;

    logger.info('[GET-TENANT-CONFIG] Configuration retrieved successfully', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      sectionsIncluded: Object.keys(config).filter(k => k !== 'tenantId' && k !== 'fetchedAt'),
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: config,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[GET-TENANT-CONFIG] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get tenant configuration',
        requestId,
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/functions/get-tenant-config
 * Health check and function info
 */
export async function GET() {
  return NextResponse.json({
    function: 'get-tenant-config',
    version: '1.0.0',
    description: 'AI agent retrieves complete tenant configuration for N8N workflows',
    status: 'operational',
    parameters: {
      required: ['tenantId'],
      optional: ['includeSettings']
    },
    availableSettings: [
      'ai - AI agent behavior and features',
      'negotiation - Pricing and discount settings',
      'policies - Cancellation, check-in/out, house rules',
      'company - Company information and contact',
      'all - All settings above (default)'
    ],
    returns: {
      tenantId: 'string',
      aiConfig: 'object - AI configuration',
      negotiation: 'object - Negotiation settings',
      policies: 'object - Property policies',
      company: 'object - Company information',
      fetchedAt: 'ISO timestamp'
    },
    timestamp: new Date().toISOString()
  });
}
