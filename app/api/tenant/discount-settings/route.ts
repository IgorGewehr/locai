import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import type { TenantDiscountSettings } from '@/lib/types/tenant-settings';
import { DEFAULT_TENANT_DISCOUNT_SETTINGS } from '@/lib/types/tenant-settings';

const DiscountSettingsSchema = z.object({
  pixDiscountPercentage: z.number().min(0).max(100),
  cashDiscountPercentage: z.number().min(0).max(100),
  cardDiscountPercentage: z.number().min(0).max(100),
  weeklyStayDiscountPercentage: z.number().min(0).max(100),
  negotiationDiscountPercentage: z.number().min(0).max(100),
  lastMinuteDiscountPercentage: z.number().min(0).max(100),
  lastMinuteDaysThreshold: z.number().min(1).max(30)
});

/**
 * GET - Obter configurações de desconto do tenant
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    logger.info('📊 [TENANT-DISCOUNT-GET] Buscando configurações de desconto', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    // Buscar em tenants/{tenantId}/settings/discounts
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'discounts');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      // Retornar configurações padrão se não existir
      return NextResponse.json({
        success: true,
        data: DEFAULT_TENANT_DISCOUNT_SETTINGS
      });
    }

    const settings = settingsSnap.data() as TenantDiscountSettings;

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    logger.error('❌ [TENANT-DISCOUNT-GET] Erro ao buscar configurações', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to fetch discount settings', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Atualizar configurações de desconto do tenant
 */
export async function PUT(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const body = await request.json();

    // Validar com Zod
    const result = DiscountSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid discount settings',
          code: 'VALIDATION_ERROR',
          details: result.error.errors
        },
        { status: 400 }
      );
    }

    const discountSettings: TenantDiscountSettings = result.data;

    logger.info('💾 [TENANT-DISCOUNT-PUT] Salvando configurações de desconto', {
      tenantId: tenantId.substring(0, 8) + '***',
      settings: discountSettings
    });

    // Salvar em tenants/{tenantId}/settings/discounts
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'discounts');
    await setDoc(settingsRef, {
      ...discountSettings,
      updatedAt: new Date(),
      updatedBy: authContext.uid
    });

    logger.info('✅ [TENANT-DISCOUNT-PUT] Configurações salvas com sucesso', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    return NextResponse.json({
      success: true,
      data: discountSettings
    });

  } catch (error) {
    logger.error('❌ [TENANT-DISCOUNT-PUT] Erro ao salvar configurações', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to save discount settings', code: 'SAVE_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remover configurações de desconto (voltar ao padrão)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    logger.info('🗑️ [TENANT-DISCOUNT-DELETE] Removendo configurações de desconto', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    // Salvar configurações padrão
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'discounts');
    await setDoc(settingsRef, {
      ...DEFAULT_TENANT_DISCOUNT_SETTINGS,
      updatedAt: new Date(),
      updatedBy: authContext.uid
    });

    logger.info('✅ [TENANT-DISCOUNT-DELETE] Configurações resetadas', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    return NextResponse.json({
      success: true,
      data: DEFAULT_TENANT_DISCOUNT_SETTINGS
    });

  } catch (error) {
    logger.error('❌ [TENANT-DISCOUNT-DELETE] Erro ao remover configurações', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to delete discount settings', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
