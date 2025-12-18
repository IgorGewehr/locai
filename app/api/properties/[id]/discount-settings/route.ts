import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';
import type { PropertyDiscountSettings } from '@/lib/types/property';

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
 * GET - Obter configurações de desconto de uma propriedade
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: propertyId } = await params;

    logger.info('📊 [DISCOUNT-SETTINGS-GET] Buscando configurações de desconto', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      propertyId
    });

    const services = new TenantServiceFactory(authContext.tenantId);
    const property = await services.properties.get(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found', code: 'PROPERTY_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property.discountSettings || null
    });

  } catch (error) {
    logger.error('❌ [DISCOUNT-SETTINGS-GET] Erro ao buscar configurações', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to fetch discount settings', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Atualizar configurações de desconto de uma propriedade
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: propertyId } = await params;
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

    const discountSettings: PropertyDiscountSettings = result.data;

    logger.info('💾 [DISCOUNT-SETTINGS-PUT] Salvando configurações de desconto', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      propertyId,
      settings: discountSettings
    });

    const services = new TenantServiceFactory(authContext.tenantId);

    // Verificar se propriedade existe
    const property = await services.properties.get(propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found', code: 'PROPERTY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Atualizar apenas o campo discountSettings
    await services.properties.update(propertyId, {
      discountSettings,
      updatedAt: new Date()
    });

    logger.info('✅ [DISCOUNT-SETTINGS-PUT] Configurações salvas com sucesso', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      propertyId
    });

    return NextResponse.json({
      success: true,
      data: discountSettings
    });

  } catch (error) {
    logger.error('❌ [DISCOUNT-SETTINGS-PUT] Erro ao salvar configurações', {
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id: propertyId } = await params;

    logger.info('🗑️ [DISCOUNT-SETTINGS-DELETE] Removendo configurações de desconto', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      propertyId
    });

    const services = new TenantServiceFactory(authContext.tenantId);

    // Verificar se propriedade existe
    const property = await services.properties.get(propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found', code: 'PROPERTY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Remover configurações de desconto
    await services.properties.update(propertyId, {
      discountSettings: null as any,
      updatedAt: new Date()
    });

    logger.info('✅ [DISCOUNT-SETTINGS-DELETE] Configurações removidas', {
      tenantId: authContext.tenantId.substring(0, 8) + '***',
      propertyId
    });

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    logger.error('❌ [DISCOUNT-SETTINGS-DELETE] Erro ao remover configurações', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to delete discount settings', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
