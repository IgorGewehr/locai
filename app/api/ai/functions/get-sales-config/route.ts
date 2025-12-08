import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';
import type { TenantDiscountSettings } from '@/lib/types/tenant-settings';
import { DEFAULT_TENANT_DISCOUNT_SETTINGS } from '@/lib/types/tenant-settings';

/**
 * GET - Obter configurações de vendas e descontos para o Agente de IA
 * Retorna um JSON estruturado com as regras de negociação permitidas
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validação de Autenticação
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;

    logger.info('🤖 [AI-SALES-CONFIG] Buscando configurações de vendas para IA', {
      tenantId: tenantId.substring(0, 8) + '***'
    });

    // 2. Buscar configurações no Firestore
    const settingsRef = doc(db, 'tenants', tenantId, 'settings', 'discounts');
    const settingsSnap = await getDoc(settingsRef);

    // 3. Preparar dados (usar padrão se não existir)
    const settings = settingsSnap.exists() 
      ? (settingsSnap.data() as TenantDiscountSettings) 
      : DEFAULT_TENANT_DISCOUNT_SETTINGS;

    // 4. Estruturar resposta para o Agente de IA
    // Formato otimizado para compreensão do LLM
    const salesConfig = {
      payment_methods: {
        pix: {
          enabled: settings.pixDiscountPercentage > 0,
          discount_percentage: settings.pixDiscountPercentage,
          description: `Desconto de ${settings.pixDiscountPercentage}% para pagamentos via PIX`
        },
        cash: {
          enabled: settings.cashDiscountPercentage > 0,
          discount_percentage: settings.cashDiscountPercentage,
          description: `Desconto de ${settings.cashDiscountPercentage}% para pagamentos em dinheiro`
        },
        credit_card: {
          enabled: settings.cardDiscountPercentage > 0,
          discount_percentage: settings.cardDiscountPercentage,
          description: `Desconto de ${settings.cardDiscountPercentage}% para pagamentos no cartão`
        }
      },
      negotiation_rules: {
        max_negotiation_margin: {
          percentage: settings.negotiationDiscountPercentage,
          description: `Margem máxima de negociação discricionária permitida: ${settings.negotiationDiscountPercentage}%`
        },
        long_stay: {
          enabled: settings.weeklyStayDiscountPercentage > 0,
          min_days: 7,
          discount_percentage: settings.weeklyStayDiscountPercentage,
          description: `Desconto automático de ${settings.weeklyStayDiscountPercentage}% para estadias de 7 dias ou mais`
        },
        last_minute: {
          enabled: settings.lastMinuteDiscountPercentage > 0,
          days_threshold: settings.lastMinuteDaysThreshold,
          discount_percentage: settings.lastMinuteDiscountPercentage,
          description: `Desconto de ${settings.lastMinuteDiscountPercentage}% para reservas com check-in em até ${settings.lastMinuteDaysThreshold} dias`
        }
      },
      instructions: "Use estas configurações para calcular o preço final durante negociações. Não ofereça descontos maiores que os permitidos aqui. Priorize pagamentos via PIX oferecendo o desconto configurado."
    };

    return NextResponse.json({
      success: true,
      data: salesConfig
    });

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error) || 'Unknown error');

    logger.error('❌ [AI-SALES-CONFIG] Erro ao buscar configurações', errorObj);

    return NextResponse.json(
      { error: 'Failed to fetch sales config', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}
