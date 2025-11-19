// app/api/tenant/settings/negotiation/route.ts
// API para gerenciar configurações de negociação do tenant

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  NegotiationSettings,
  DEFAULT_NEGOTIATION_SETTINGS
} from '@/lib/types/tenant-settings';

// GET /api/tenant/settings/negotiation - Obter configurações de negociação
export async function GET(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);

    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Autenticação necessária', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { tenantId } = authContext;

    // ✅ NOVO PATH: config/negotiation (padrão desde Nov 2025)
    const configRef = doc(db, 'tenants', tenantId, 'config', 'negotiation');

    // ❌ PATH ANTIGO: settings/negotiation (fallback para compatibilidade)
    const oldSettingsRef = doc(db, 'tenants', tenantId, 'settings', 'negotiation');

    let settingsDoc = await getDoc(configRef);

    if (!settingsDoc.exists()) {
      // Tentar path antigo como fallback
      logger.info('📋 [NEGOTIATION-SETTINGS] Config not found, trying old path', {
        tenantId: tenantId.substring(0, 8) + '***'
      });

      settingsDoc = await getDoc(oldSettingsRef);

      if (settingsDoc.exists()) {
        // Migrar automaticamente para novo path
        const data = settingsDoc.data();
        await setDoc(configRef, data);

        logger.info('✅ [NEGOTIATION-SETTINGS] Migrated from old path to config/', {
          tenantId: tenantId.substring(0, 8) + '***'
        });
      }
    }

    if (!settingsDoc.exists()) {
      // Retornar configurações padrão se não existir
      logger.info('📋 [NEGOTIATION-SETTINGS] Returning default settings', {
        tenantId: tenantId.substring(0, 8) + '***'
      });

      return NextResponse.json({
        success: true,
        data: DEFAULT_NEGOTIATION_SETTINGS,
        isDefault: true
      });
    }

    const settings = settingsDoc.data() as NegotiationSettings;

    logger.info('📋 [NEGOTIATION-SETTINGS] Settings retrieved', {
      tenantId: tenantId.substring(0, 8) + '***',
      allowNegotiation: settings.allowAINegotiation
    });

    return NextResponse.json({
      success: true,
      data: settings,
      isDefault: false
    });

  } catch (error) {
    logger.error('❌ [NEGOTIATION-SETTINGS] Failed to get settings', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao buscar configurações',
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/tenant/settings/negotiation - Atualizar configurações de negociação
export async function PUT(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);

    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Autenticação necessária', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { tenantId, userId } = authContext;
    const body = await request.json();

    // Validar campos obrigatórios
    const requiredFields = [
      'allowAINegotiation',
      'pixDiscountEnabled',
      'pixDiscountPercentage',
      'maxDiscountPercentage'
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          {
            error: 'Dados inválidos',
            code: 'VALIDATION_ERROR',
            details: `Campo obrigatório faltando: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // Validar percentuais
    if (body.maxDiscountPercentage < 0 || body.maxDiscountPercentage > 100) {
      return NextResponse.json(
        {
          error: 'maxDiscountPercentage deve estar entre 0 e 100',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Preparar dados
    const settings: NegotiationSettings = {
      allowAINegotiation: body.allowAINegotiation,

      pixDiscountEnabled: body.pixDiscountEnabled,
      pixDiscountPercentage: body.pixDiscountPercentage,

      cashDiscountEnabled: body.cashDiscountEnabled ?? false,
      cashDiscountPercentage: body.cashDiscountPercentage ?? 0,

      installmentEnabled: body.installmentEnabled ?? true,
      maxInstallments: body.maxInstallments ?? 10,
      minInstallmentValue: body.minInstallmentValue ?? 100,

      extendedStayDiscountEnabled: body.extendedStayDiscountEnabled ?? false,
      extendedStayRules: body.extendedStayRules ?? [],

      bookNowDiscountEnabled: body.bookNowDiscountEnabled ?? false,
      bookNowDiscountPercentage: body.bookNowDiscountPercentage ?? 0,
      bookNowTimeLimit: body.bookNowTimeLimit ?? 2,

      earlyBookingDiscountEnabled: body.earlyBookingDiscountEnabled ?? false,
      earlyBookingRules: body.earlyBookingRules ?? [],

      lastMinuteDiscountEnabled: body.lastMinuteDiscountEnabled ?? false,
      lastMinuteRules: body.lastMinuteRules ?? [],

      maxDiscountPercentage: body.maxDiscountPercentage,
      minPriceAfterDiscount: body.minPriceAfterDiscount ?? 0,

      priceJustifications: body.priceJustifications ?? [],

      allowSuggestAlternatives: body.allowSuggestAlternatives ?? false,

      upsellEnabled: body.upsellEnabled ?? false,
      upsellSuggestions: body.upsellSuggestions ?? [],

      negotiationNotes: body.negotiationNotes
    };

    // Salvar no Firestore (NOVO PATH: config/negotiation)
    const settingsRef = doc(db, 'tenants', tenantId, 'config', 'negotiation');
    await setDoc(settingsRef, settings);

    logger.info('✅ [NEGOTIATION-SETTINGS] Settings updated', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId?.substring(0, 8) + '***',
      allowNegotiation: settings.allowAINegotiation,
      maxDiscount: settings.maxDiscountPercentage
    });

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Configurações atualizadas com sucesso'
    });

  } catch (error) {
    logger.error('❌ [NEGOTIATION-SETTINGS] Failed to update settings', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao atualizar configurações',
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/tenant/settings/negotiation - Aplicar preset
export async function POST(request: NextRequest) {
  try {
    const authContext = await validateFirebaseAuth(request);

    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Autenticação necessária', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { tenantId, userId } = authContext;
    const body = await request.json();
    const { preset } = body;

    let settings: NegotiationSettings;

    switch (preset) {
      case 'default':
        const { DEFAULT_NEGOTIATION_SETTINGS } = await import('@/lib/types/tenant-settings');
        settings = DEFAULT_NEGOTIATION_SETTINGS;
        break;

      case 'aggressive':
        const { AGGRESSIVE_NEGOTIATION_SETTINGS } = await import('@/lib/types/tenant-settings');
        settings = AGGRESSIVE_NEGOTIATION_SETTINGS;
        break;

      case 'conservative':
        const { CONSERVATIVE_NEGOTIATION_SETTINGS } = await import('@/lib/types/tenant-settings');
        settings = CONSERVATIVE_NEGOTIATION_SETTINGS;
        break;

      case 'high_season':
        const { HIGH_SEASON_NEGOTIATION_SETTINGS } = await import('@/lib/types/tenant-settings');
        settings = HIGH_SEASON_NEGOTIATION_SETTINGS;
        break;

      default:
        return NextResponse.json(
          {
            error: 'Preset inválido. Use: default, aggressive, conservative, ou high_season',
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        );
    }

    // Salvar no Firestore (NOVO PATH: config/negotiation)
    const settingsRef = doc(db, 'tenants', tenantId, 'config', 'negotiation');
    await setDoc(settingsRef, settings);

    logger.info('✅ [NEGOTIATION-SETTINGS] Preset applied', {
      tenantId: tenantId.substring(0, 8) + '***',
      userId: userId?.substring(0, 8) + '***',
      preset
    });

    return NextResponse.json({
      success: true,
      data: settings,
      message: `Preset "${preset}" aplicado com sucesso`
    });

  } catch (error) {
    logger.error('❌ [NEGOTIATION-SETTINGS] Failed to apply preset', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao aplicar preset',
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}
