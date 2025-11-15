import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

/**
 * AI Function: check-discount-opportunities
 *
 * Retorna todas as oportunidades de desconto disponíveis para negociação
 * baseado nas configurações do tenant (Negotiation Settings)
 *
 * @param tenantId - ID do tenant
 * @returns Lista de descontos disponíveis com condições e limites
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `check_discount_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId } = body;

    logger.info('[CHECK-DISCOUNT-OPPORTUNITIES] Starting execution', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
    });

    // Validate tenantId
    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    // Get tenant negotiation settings - CORRECTED PATH
    const settingsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('negotiation');

    const settingsDoc = await settingsRef.get();

    // If no settings found, use defaults
    let settings: any = {};

    if (settingsDoc.exists) {
      settings = settingsDoc.data() || {};
      logger.info('[CHECK-DISCOUNT-OPPORTUNITIES] Found negotiation settings', {
        requestId,
        hasPixDiscount: settings.pixDiscountEnabled !== undefined
      });
    } else {
      logger.info('[CHECK-DISCOUNT-OPPORTUNITIES] No negotiation settings found, using defaults', {
        requestId
      });

      // Use default settings structure
      const { DEFAULT_NEGOTIATION_SETTINGS } = await import('@/lib/types/tenant-settings');
      settings = DEFAULT_NEGOTIATION_SETTINGS;
    }

    // Build discount opportunities object using CORRECT field names
    const opportunities = {
      paymentMethod: {
        enabled: settings.pixDiscountEnabled || settings.cashDiscountEnabled,
        options: [
          {
            method: 'pix',
            discount: settings.pixDiscountPercentage || 10,
            enabled: settings.pixDiscountEnabled !== false,
            label: 'PIX',
            description: 'Pagamento à vista via PIX',
            recommended: true,
            conditions: 'Pagamento imediato'
          },
          {
            method: 'cash',
            discount: settings.cashDiscountPercentage || 8,
            enabled: settings.cashDiscountEnabled || false,
            label: 'Dinheiro',
            description: 'Pagamento em dinheiro',
            recommended: false,
            conditions: 'Pagamento no check-in'
          },
          {
            method: 'card',
            discount: 0,
            enabled: settings.installmentEnabled !== false,
            label: 'Cartão de Crédito',
            description: `Parcelamento em até ${settings.maxInstallments || 10}x`,
            recommended: false,
            conditions: `Parcela mínima de R$ ${settings.minInstallmentValue || 100}`
          }
        ]
      },

      extendedStay: {
        enabled: settings.extendedStayDiscountEnabled || false,
        tiers: (settings.extendedStayRules || []).map((rule: any) => ({
          minNights: rule.minDays,
          discount: rule.discountPercentage,
          label: `${rule.minDays}+ dias`,
          description: `Desconto para estadias de ${rule.minDays}+ dias`,
          recommended: true
        }))
      },

      earlyBooking: {
        enabled: settings.earlyBookingDiscountEnabled || false,
        tiers: (settings.earlyBookingRules || []).map((rule: any) => ({
          daysInAdvance: rule.daysInAdvance,
          discount: rule.discountPercentage,
          label: `${rule.daysInAdvance}+ dias de antecedência`,
          description: `Reserve com ${rule.daysInAdvance}+ dias de antecedência`,
          recommended: true
        }))
      },

      lastMinute: {
        enabled: settings.lastMinuteDiscountEnabled || false,
        tiers: (settings.lastMinuteRules || []).map((rule: any) => ({
          daysUntilCheckIn: rule.daysBeforeCheckIn,
          discount: rule.discountPercentage,
          label: `Últimos ${rule.daysBeforeCheckIn} dias`,
          description: `Check-in em até ${rule.daysBeforeCheckIn} dias`,
          recommended: false
        }))
      },

      bookNow: {
        enabled: settings.bookNowDiscountEnabled || false,
        discount: settings.bookNowDiscountPercentage || 5,
        timeLimit: settings.bookNowTimeLimit || 2, // hours
        label: 'Fechar Agora',
        description: 'Desconto adicional para confirmar imediatamente',
        conditions: `Cliente deve aceitar em até ${settings.bookNowTimeLimit || 2} horas`,
        recommended: true
      },

      limits: {
        maxTotalDiscount: settings.maxDiscountPercentage || 30,
        minPriceAfterDiscount: settings.minPriceAfterDiscount || 0,
        allowNegotiation: settings.allowAINegotiation !== false
      },

      customRules: []
    };

    // Calculate best possible combinations
    const bestCombinations = calculateBestCombinations(opportunities);

    // Generate negotiation tips
    const negotiationTips = generateNegotiationTips(opportunities, settings);

    const processingTime = Date.now() - startTime;

    logger.info('[CHECK-DISCOUNT-OPPORTUNITIES] Execution completed', {
      requestId,
      processingTime: `${processingTime}ms`,
      opportunitiesCount: Object.keys(opportunities).length
    });

    return NextResponse.json({
      success: true,
      data: {
        opportunities,
        bestCombinations,
        negotiationTips,
        summary: {
          totalDiscountTypes: Object.keys(opportunities).filter(k => k !== 'limits' && k !== 'customRules').length,
          maxPossibleDiscount: opportunities.limits.maxTotalDiscount,
          recommendedApproach: bestCombinations[0]?.description || 'Oferecer PIX + Book Now'
        }
      },
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('[CHECK-DISCOUNT-OPPORTUNITIES] Execution failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check discount opportunities',
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
 * Calculate best discount combinations based on common scenarios
 */
function calculateBestCombinations(opportunities: any) {
  const combinations = [];

  // Scenario 1: Best for immediate booking
  if (opportunities.paymentMethod.enabled && opportunities.bookNow.enabled) {
    const pixDiscount = opportunities.paymentMethod.options.find((o: any) => o.method === 'pix')?.discount || 0;
    const bookNowDiscount = opportunities.bookNow.discount;

    combinations.push({
      scenario: 'immediate_booking',
      description: 'Cliente quer fechar agora',
      discounts: [
        { type: 'PIX', value: pixDiscount },
        { type: 'Book Now', value: bookNowDiscount }
      ],
      totalDiscount: Math.min(pixDiscount + bookNowDiscount, opportunities.limits.maxTotalDiscount),
      recommended: true,
      pitch: `Fechando AGORA no PIX você ganha ${pixDiscount + bookNowDiscount}% de desconto!`
    });
  }

  // Scenario 2: Best for extended stay
  if (opportunities.extendedStay.enabled && opportunities.paymentMethod.enabled) {
    const extendedStay = opportunities.extendedStay.tiers[0]; // 7+ days
    const pixDiscount = opportunities.paymentMethod.options.find((o: any) => o.method === 'pix')?.discount || 0;

    combinations.push({
      scenario: 'extended_stay',
      description: 'Cliente pode estender estadia',
      discounts: [
        { type: 'PIX', value: pixDiscount },
        { type: 'Extended Stay (7+ dias)', value: extendedStay.discount }
      ],
      totalDiscount: Math.min(pixDiscount + extendedStay.discount, opportunities.limits.maxTotalDiscount),
      recommended: true,
      pitch: `Ficando ${extendedStay.minNights}+ noites no PIX você economiza ${pixDiscount + extendedStay.discount}%!`
    });
  }

  // Scenario 3: Best for early booking
  if (opportunities.earlyBooking.enabled && opportunities.paymentMethod.enabled) {
    const earlyBooking = opportunities.earlyBooking.tiers[0]; // 30+ days
    const pixDiscount = opportunities.paymentMethod.options.find((o: any) => o.method === 'pix')?.discount || 0;

    combinations.push({
      scenario: 'early_booking',
      description: 'Cliente reservando com antecedência',
      discounts: [
        { type: 'PIX', value: pixDiscount },
        { type: 'Early Booking (30+ dias)', value: earlyBooking.discount }
      ],
      totalDiscount: Math.min(pixDiscount + earlyBooking.discount, opportunities.limits.maxTotalDiscount),
      recommended: true,
      pitch: `Reservando com ${earlyBooking.daysInAdvance}+ dias e PIX: ${pixDiscount + earlyBooking.discount}% OFF!`
    });
  }

  // Scenario 4: Last minute deal
  if (opportunities.lastMinute.enabled && opportunities.paymentMethod.enabled) {
    const lastMinute = opportunities.lastMinute.tiers[0]; // 7 days
    const pixDiscount = opportunities.paymentMethod.options.find((o: any) => o.method === 'pix')?.discount || 0;

    combinations.push({
      scenario: 'last_minute',
      description: 'Check-in próximo',
      discounts: [
        { type: 'PIX', value: pixDiscount },
        { type: 'Last Minute', value: lastMinute.discount }
      ],
      totalDiscount: Math.min(pixDiscount + lastMinute.discount, opportunities.limits.maxTotalDiscount),
      recommended: false,
      pitch: `Oportunidade de última hora: ${pixDiscount + lastMinute.discount}% OFF no PIX!`
    });
  }

  // Scenario 5: Triple stack (PIX + Extended + Book Now)
  if (opportunities.paymentMethod.enabled && opportunities.extendedStay.enabled && opportunities.bookNow.enabled) {
    const pixDiscount = opportunities.paymentMethod.options.find((o: any) => o.method === 'pix')?.discount || 0;
    const extendedStay = opportunities.extendedStay.tiers[0].discount;
    const bookNowDiscount = opportunities.bookNow.discount;

    const total = Math.min(
      pixDiscount + extendedStay + bookNowDiscount,
      opportunities.limits.maxTotalDiscount
    );

    combinations.push({
      scenario: 'maximum_discount',
      description: 'Desconto máximo possível',
      discounts: [
        { type: 'PIX', value: pixDiscount },
        { type: 'Extended Stay', value: extendedStay },
        { type: 'Book Now', value: bookNowDiscount }
      ],
      totalDiscount: total,
      recommended: true,
      pitch: `SUPER OFERTA: Ficando 7+ dias, fechando AGORA no PIX = ${total}% OFF!`
    });
  }

  return combinations.sort((a, b) => b.totalDiscount - a.totalDiscount);
}

/**
 * Generate negotiation tips based on available opportunities
 */
function generateNegotiationTips(opportunities: any, settings: any) {
  const tips = [];

  // PIX is almost always the best starting point
  if (opportunities.paymentMethod.enabled) {
    const pixOption = opportunities.paymentMethod.options.find((o: any) => o.method === 'pix');
    if (pixOption && pixOption.discount > 0) {
      tips.push({
        priority: 'high',
        tip: `SEMPRE mencione o PIX primeiro (${pixOption.discount}% OFF)`,
        reason: 'Maior taxa de conversão e sem taxas de processamento'
      });
    }
  }

  // Extended stay upsell
  if (opportunities.extendedStay.enabled) {
    tips.push({
      priority: 'high',
      tip: 'Se cliente reservar 4-6 noites, sugira estender para 7+ noites',
      reason: `Ganha desconto adicional de ${opportunities.extendedStay.tiers[0].discount}%`
    });
  }

  // Book now urgency
  if (opportunities.bookNow.enabled) {
    tips.push({
      priority: 'medium',
      tip: `Use "Fechando AGORA" para adicionar ${opportunities.bookNow.discount}% extra`,
      reason: 'Cria urgência e incentiva decisão imediata'
    });
  }

  // Early booking incentive
  if (opportunities.earlyBooking.enabled) {
    tips.push({
      priority: 'medium',
      tip: 'Para reservas com 30+ dias de antecedência, destaque desconto de planejamento',
      reason: 'Incentiva bookings antecipados e melhora fluxo de caixa'
    });
  }

  // Card fallback
  tips.push({
    priority: 'low',
    tip: 'Só mencione cartão se cliente insistir (sem desconto)',
    reason: 'PIX e dinheiro são sempre melhores opções'
  });

  // Max discount limit warning
  if (opportunities.limits.maxTotalDiscount) {
    tips.push({
      priority: 'critical',
      tip: `NUNCA ultrapasse ${opportunities.limits.maxTotalDiscount}% de desconto total`,
      reason: 'Limite configurado pelo proprietário'
    });
  }

  return tips;
}
