// app/api/ai/functions/calculate-dynamic-discount/route.ts
// Calcula desconto dinâmico baseado em critérios de negociação e configurações do tenant

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { db } from '@/lib/firebase/config';
import {
  NegotiationSettings,
  DEFAULT_NEGOTIATION_SETTINGS
} from '@/lib/types/tenant-settings';

interface DiscountCriteria {
  propertyName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  clientPhone: string;
  // Critérios para desconto
  paymentMethod?: 'pix' | 'card' | 'cash';
  bookNow?: boolean;
  extendStay?: number; // dias extras
  leadTemperature?: 'cold' | 'warm' | 'hot';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `discount_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body as { tenantId: string } & DiscountCriteria;

    logger.info('💰 [DYNAMIC-DISCOUNT] Calculando desconto', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      propertyName: args.propertyName,
      paymentMethod: args.paymentMethod,
      extendStay: args.extendStay
    });

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'TenantId is required', requestId },
        { status: 400 }
      );
    }

    // Buscar configurações de negociação do tenant
    const settingsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('negotiation');

    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.exists
      ? (settingsDoc.data() as NegotiationSettings)
      : DEFAULT_NEGOTIATION_SETTINGS;

    // Verificar se negociação está habilitada
    if (!settings.allowAINegotiation) {
      return NextResponse.json({
        success: true,
        data: {
          type: 'none',
          percentage: 0,
          amount: 0,
          originalPrice: args.totalPrice,
          finalPrice: args.totalPrice,
          reason: 'Negociação não disponível no momento',
          message: `O valor para ${args.propertyName} é R$ ${args.totalPrice.toFixed(2)}.`
        },
        meta: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calcular desconto baseado em critérios e configurações
    const discountResult = await calculateDiscount(args, tenantId, settings);
    const processingTime = Date.now() - startTime;

    logger.info('✅ [DYNAMIC-DISCOUNT] Desconto calculado', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      discountType: discountResult.type,
      discountPercentage: discountResult.percentage,
      finalPrice: discountResult.finalPrice,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json({
      success: true,
      data: discountResult,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [DYNAMIC-DISCOUNT] Erro ao calcular desconto', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate discount',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

async function calculateDiscount(
  criteria: DiscountCriteria,
  tenantId: string,
  settings: NegotiationSettings
): Promise<{
  type: string;
  percentage: number;
  amount: number;
  originalPrice: number;
  finalPrice: number;
  reason: string;
  message: string;
  conditions?: string[];
}> {
  const originalPrice = criteria.totalPrice;
  let discountPercentage = 0;
  let discountType = 'none';
  let reason = '';
  let conditions: string[] = [];

  // 🎯 ESTRATÉGIA 1: Desconto por pagamento à vista (PIX)
  if (criteria.paymentMethod === 'pix' && settings.pixDiscountEnabled) {
    discountPercentage = settings.pixDiscountPercentage;
    discountType = 'payment_method';
    reason = 'Desconto especial para pagamento à vista no PIX';
    conditions = ['Pagamento integral via PIX'];
  }

  // 🎯 ESTRATÉGIA 2: Desconto por extensão de estadia
  else if (criteria.extendStay && criteria.extendStay > 0 && settings.extendedStayDiscountEnabled) {
    const checkIn = new Date(criteria.checkIn);
    const checkOut = new Date(criteria.checkOut);
    const originalDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = originalDays + criteria.extendStay;

    // Encontrar a melhor regra aplicável (maior desconto)
    const applicableRules = settings.extendedStayRules
      .filter(rule => totalDays >= rule.minDays)
      .sort((a, b) => b.discountPercentage - a.discountPercentage);

    if (applicableRules.length > 0) {
      const bestRule = applicableRules[0];
      discountPercentage = bestRule.discountPercentage;
      reason = `Desconto especial para ${totalDays} dias`;

      discountType = 'extended_stay';
      conditions = [
        `Reservar ${totalDays} dias no total`,
        `${criteria.extendStay} dias extras com desconto`
      ];
    }
  }

  // 🎯 ESTRATÉGIA 3: Desconto por reserva imediata
  else if (criteria.bookNow && settings.bookNowDiscountEnabled) {
    discountPercentage = settings.bookNowDiscountPercentage;
    discountType = 'book_now';
    reason = 'Desconto exclusivo para fechar a reserva agora';
    conditions = [`Confirmar reserva nas próximas ${settings.bookNowTimeLimit} horas`];
  }

  // 🎯 ESTRATÉGIA 4: Desconto por dinheiro
  else if (criteria.paymentMethod === 'cash' && settings.cashDiscountEnabled) {
    discountPercentage = settings.cashDiscountPercentage;
    discountType = 'payment_method';
    reason = 'Desconto especial para pagamento em dinheiro';
    conditions = ['Pagamento integral em dinheiro'];
  }

  // 🎯 ESTRATÉGIA 5: Parcelamento sem juros (cartão)
  else if (criteria.paymentMethod === 'card' && settings.installmentEnabled) {
    discountPercentage = 0; // Sem desconto, mas oferece parcelamento
    discountType = 'installment';
    reason = `Parcelamento em até ${settings.maxInstallments}x sem juros no cartão`;
    conditions = [
      'Pagamento via cartão de crédito',
      `Até ${settings.maxInstallments} parcelas sem juros`,
      `Parcela mínima de R$ ${settings.minInstallmentValue.toFixed(2)}`
    ];
  }

  // Aplicar limites de desconto
  if (discountPercentage > settings.maxDiscountPercentage) {
    discountPercentage = settings.maxDiscountPercentage;
    reason += ` (limitado a ${settings.maxDiscountPercentage}%)`;
  }

  // Calcular valores finais
  let discountAmount = (originalPrice * discountPercentage) / 100;
  let finalPrice = originalPrice - discountAmount;

  // Validar preço mínimo após desconto
  if (settings.minPriceAfterDiscount > 0 && finalPrice < settings.minPriceAfterDiscount) {
    finalPrice = settings.minPriceAfterDiscount;
    discountAmount = originalPrice - finalPrice;
    discountPercentage = (discountAmount / originalPrice) * 100;
    reason += ` (ajustado ao preço mínimo permitido)`;
  }

  // Gerar mensagem personalizada
  const message = generateDiscountMessage({
    type: discountType,
    percentage: discountPercentage,
    originalPrice,
    finalPrice,
    reason,
    propertyName: criteria.propertyName,
    settings
  });

  return {
    type: discountType,
    percentage: discountPercentage,
    amount: discountAmount,
    originalPrice,
    finalPrice,
    reason,
    message,
    conditions: conditions.length > 0 ? conditions : undefined
  };
}

function generateDiscountMessage(params: {
  type: string;
  percentage: number;
  originalPrice: number;
  finalPrice: number;
  reason: string;
  propertyName: string;
  settings: NegotiationSettings;
}): string {
  const { type, percentage, originalPrice, finalPrice, reason, propertyName, settings } = params;

  if (type === 'none') {
    return `O valor para ${propertyName} é R$ ${originalPrice.toFixed(2)}.`;
  }

  if (type === 'installment') {
    return `Perfeito! ${propertyName} sai por R$ ${originalPrice.toFixed(2)}.

E para facilitar para você, posso parcelar em até **${settings.maxInstallments}x sem juros** no cartão! Assim fica apenas R$ ${(originalPrice / settings.maxInstallments).toFixed(2)} por mês. O que acha?`;
  }

  if (type === 'payment_method') {
    return `Ótima escolha! ${propertyName} normalmente sai por R$ ${originalPrice.toFixed(2)}.

Mas tenho uma **proposta especial** para você: pagando à vista no **PIX**, consigo te dar um desconto de **${percentage}%**! 🎉

Ou seja, você fecha por apenas **R$ ${finalPrice.toFixed(2)}**. São R$ ${(originalPrice - finalPrice).toFixed(2)} de economia! Vale super a pena, né?`;
  }

  if (type === 'extended_stay') {
    return `Olha, ${propertyName} está R$ ${originalPrice.toFixed(2)} para as datas que você pediu.

Mas deixa eu te fazer uma **proposta irresistível**:

Se você estender sua estadia, consigo te dar um **desconto de ${percentage}%** no valor total! Você aproveita mais dias e ainda economiza R$ ${(originalPrice - finalPrice).toFixed(2)}.

Valor final: **R$ ${finalPrice.toFixed(2)}**

Mais dias de férias + desconto = Negócio perfeito! O que me diz?`;
  }

  if (type === 'book_now') {
    return `${propertyName} está disponível por R$ ${originalPrice.toFixed(2)}.

Mas ó, tenho uma **condição especial** para você **fechar agora**:

Se confirmar a reserva nas próximas 2 horas, te dou **${percentage}% de desconto**! Valor final: **R$ ${finalPrice.toFixed(2)}**.

São R$ ${(originalPrice - finalPrice).toFixed(2)} de economia só por decidir agora. Essa oportunidade não vai durar muito! Vamos fechar?`;
  }

  return `${reason}. Valor final: R$ ${finalPrice.toFixed(2)} (${percentage}% de desconto aplicado).`;
}
