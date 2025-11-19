/**
 * AI Configuration API
 * Gerencia configurações dinâmicas do agente Sofia por tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { AIConfig } from '@/lib/types/ai-config';
import { DEFAULT_AI_CONFIG } from '@/lib/types/ai-config';

// Validation Schema
const AIConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoResponse: z.boolean().optional(),
  businessHoursOnly: z.boolean().optional(),

  agentPermissions: z.object({
    search: z.boolean().optional(),
    booking: z.boolean().optional(),
    sales: z.boolean().optional(),
    support: z.boolean().optional(),
    payments: z.boolean().optional(),
  }).optional(),

  discountSettings: z.object({
    enabled: z.boolean().optional(),
    maxPercentage: z.number().min(0).max(100).optional(),
    requiresApproval: z.boolean().optional(),
    approvalThreshold: z.number().min(0).max(100).optional(),
    allowedCriteria: z.object({
      earlyBooking: z.boolean().optional(),
      longStay: z.boolean().optional(),
      lowSeason: z.boolean().optional(),
      lastMinute: z.boolean().optional(),
      multiProperty: z.boolean().optional(),
    }).optional(),
  }).optional(),

  customPrompts: z.object({
    welcome: z.string().max(500).optional(),
    companyName: z.string().max(100).optional(),
    companyValues: z.string().max(1000).optional(),
    tone: z.enum(['formal', 'casual', 'friendly']).optional(),
    specialInstructions: z.string().max(2000).optional(),
  }).optional(),
});

/**
 * GET - Busca configurações de IA do tenant
 * Usado pelo N8N e pelo frontend
 */
export async function GET(request: NextRequest) {
  const requestId = `ai-config-get_${Date.now()}`;

  try {
    // Permitir acesso via tenantId query param (para N8N) ou Auth (para frontend)
    const { searchParams } = new URL(request.url);
    const queryTenantId = searchParams.get('tenantId');

    let tenantId: string;

    if (queryTenantId) {
      // Acesso direto via query param (N8N)
      tenantId = queryTenantId;
      logger.info('[AI-CONFIG] N8N access', { requestId, tenantId: tenantId.substring(0, 8) + '***' });
    } else {
      // Acesso autenticado (Frontend)
      const authContext = await validateFirebaseAuth(request);
      if (!authContext.authenticated || !authContext.tenantId) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }
      tenantId = authContext.tenantId;
    }

    // Buscar configuração do Firestore
    const configRef = doc(db, 'tenants', tenantId, 'aiConfig', 'settings');
    const configSnap = await getDoc(configRef);

    let config: AIConfig;

    if (!configSnap.exists()) {
      // Criar configuração padrão
      config = {
        ...DEFAULT_AI_CONFIG,
        tenantId,
        id: 'settings',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(configRef, config);
      logger.info('[AI-CONFIG] Default config created', { requestId, tenantId: tenantId.substring(0, 8) + '***' });
    } else {
      config = configSnap.data() as AIConfig;
    }

    return NextResponse.json({
      success: true,
      data: config,
      meta: { requestId, timestamp: new Date().toISOString() },
    });

  } catch (error) {
    logger.error('[AI-CONFIG] Get failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}

/**
 * PUT - Atualiza configurações de IA
 * Apenas para frontend autenticado
 */
export async function PUT(request: NextRequest) {
  const requestId = `ai-config-put_${Date.now()}`;

  try {
    // Autenticação obrigatória
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const body = await request.json();

    // Validação
    const result = AIConfigSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', code: 'VALIDATION_ERROR', details: result.error.issues },
        { status: 400 }
      );
    }

    const updates = result.data;

    // Buscar configuração existente
    const configRef = doc(db, 'tenants', tenantId, 'aiConfig', 'settings');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      // Criar nova configuração - merge deep para evitar sobrescrever objetos parciais
      const newConfig: AIConfig = {
        ...DEFAULT_AI_CONFIG,
        tenantId,
        id: 'settings',
        enabled: updates.enabled ?? DEFAULT_AI_CONFIG.enabled,
        autoResponse: updates.autoResponse ?? DEFAULT_AI_CONFIG.autoResponse,
        businessHoursOnly: updates.businessHoursOnly ?? DEFAULT_AI_CONFIG.businessHoursOnly,
        agentPermissions: {
          ...DEFAULT_AI_CONFIG.agentPermissions,
          ...(updates.agentPermissions || {}),
        },
        discountSettings: {
          ...DEFAULT_AI_CONFIG.discountSettings,
          ...(updates.discountSettings || {}),
          allowedCriteria: {
            ...DEFAULT_AI_CONFIG.discountSettings.allowedCriteria,
            ...(updates.discountSettings?.allowedCriteria || {}),
          },
        },
        customPrompts: {
          ...DEFAULT_AI_CONFIG.customPrompts,
          ...(updates.customPrompts || {}),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(configRef, newConfig);

      logger.info('[AI-CONFIG] Config created', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        updates: Object.keys(updates),
      });

      return NextResponse.json({
        success: true,
        data: newConfig,
        meta: { requestId, timestamp: new Date().toISOString() },
      });
    } else {
      // Atualizar configuração existente - DEEP MERGE para evitar perda de dados
      const existingConfig = configSnap.data() as AIConfig;

      const updateData: Partial<AIConfig> = {
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        ...(updates.autoResponse !== undefined && { autoResponse: updates.autoResponse }),
        ...(updates.businessHoursOnly !== undefined && { businessHoursOnly: updates.businessHoursOnly }),

        // Deep merge de agentPermissions
        ...(updates.agentPermissions && {
          agentPermissions: {
            ...existingConfig.agentPermissions,
            ...updates.agentPermissions,
          },
        }),

        // Deep merge de discountSettings (incluindo allowedCriteria)
        ...(updates.discountSettings && {
          discountSettings: {
            ...existingConfig.discountSettings,
            ...updates.discountSettings,
            ...(updates.discountSettings.allowedCriteria && {
              allowedCriteria: {
                ...existingConfig.discountSettings.allowedCriteria,
                ...updates.discountSettings.allowedCriteria,
              },
            }),
          },
        }),

        // Deep merge de customPrompts
        ...(updates.customPrompts && {
          customPrompts: {
            ...existingConfig.customPrompts,
            ...updates.customPrompts,
          },
        }),

        updatedAt: new Date(),
      };

      await updateDoc(configRef, updateData);

      const updatedConfig = {
        ...existingConfig,
        ...updateData,
      } as AIConfig;

      logger.info('[AI-CONFIG] Config updated', {
        requestId,
        tenantId: tenantId.substring(0, 8) + '***',
        updates: Object.keys(updates),
      });

      return NextResponse.json({
        success: true,
        data: updatedConfig,
        meta: { requestId, timestamp: new Date().toISOString() },
      });
    }

  } catch (error) {
    logger.error('[AI-CONFIG] Update failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}

/**
 * POST - Reset para configuração padrão
 */
export async function POST(request: NextRequest) {
  const requestId = `ai-config-reset_${Date.now()}`;

  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    // Reset para configuração padrão
    const configRef = doc(db, 'tenants', tenantId, 'aiConfig', 'settings');
    const defaultConfig: AIConfig = {
      ...DEFAULT_AI_CONFIG,
      tenantId,
      id: 'settings',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(configRef, defaultConfig);

    logger.info('[AI-CONFIG] Config reset to default', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
    });

    return NextResponse.json({
      success: true,
      data: defaultConfig,
      meta: { requestId, timestamp: new Date().toISOString() },
    });

  } catch (error) {
    logger.error('[AI-CONFIG] Reset failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return handleApiError(error);
  }
}
