// lib/utils/negotiation-defaults.ts
// Valores padrão e helpers para configurações de negociação

import { PropertyNegotiationSettings } from '@/lib/types/property';

/**
 * Configurações padrão de negociação (conservadoras)
 */
export const DEFAULT_NEGOTIATION_SETTINGS: PropertyNegotiationSettings = {
  // Controle geral
  allowAINegotiation: true,

  // Descontos por método de pagamento
  pixDiscountEnabled: true,
  pixDiscountPercentage: 10, // 10% de desconto no PIX

  cashDiscountEnabled: true,
  cashDiscountPercentage: 8, // 8% em dinheiro

  // Parcelamento
  installmentEnabled: true,
  maxInstallments: 10, // Até 10x sem juros
  minInstallmentValue: 100, // Parcela mínima de R$ 100

  // Desconto por estadia prolongada
  extendedStayDiscountEnabled: true,
  extendedStayRules: [
    { minDays: 7, discountPercentage: 15 },  // 7+ dias = 15%
    { minDays: 14, discountPercentage: 20 }, // 14+ dias = 20%
    { minDays: 30, discountPercentage: 25 }  // 30+ dias = 25%
  ],

  // Desconto por reserva imediata
  bookNowDiscountEnabled: true,
  bookNowDiscountPercentage: 5, // 5% para fechar agora
  bookNowTimeLimit: 2, // 2 horas

  // Desconto por antecedência
  earlyBookingDiscountEnabled: true,
  earlyBookingRules: [
    { daysInAdvance: 30, discountPercentage: 10 },  // 30+ dias = 10%
    { daysInAdvance: 60, discountPercentage: 15 }   // 60+ dias = 15%
  ],

  // Desconto por última hora
  lastMinuteDiscountEnabled: true,
  lastMinuteRules: [
    { daysBeforeCheckIn: 3, discountPercentage: 20 },  // 3 dias antes = 20%
    { daysBeforeCheckIn: 7, discountPercentage: 15 }   // 7 dias antes = 15%
  ],

  // Limites e restrições
  maxDiscountPercentage: 30, // Máximo 30% de desconto total
  minPriceAfterDiscount: 0, // Sem preço mínimo (usar com cautela)

  // Justificativas de preço
  priceJustifications: [
    'Localização privilegiada',
    'Imóvel em excelente estado',
    'Alta temporada'
  ],

  // Alternativas
  allowSuggestAlternatives: true,
  alternativePropertyIds: [],

  // Upselling
  upsellEnabled: true,
  upsellSuggestions: [
    'Check-in antecipado',
    'Check-out tardio',
    'Café da manhã',
    'Limpeza extra'
  ]
};

/**
 * Configurações agressivas (máximo de flexibilidade)
 */
export const AGGRESSIVE_NEGOTIATION_SETTINGS: PropertyNegotiationSettings = {
  ...DEFAULT_NEGOTIATION_SETTINGS,
  pixDiscountPercentage: 15,
  bookNowDiscountPercentage: 10,
  maxDiscountPercentage: 40,
  extendedStayRules: [
    { minDays: 5, discountPercentage: 15 },
    { minDays: 10, discountPercentage: 25 },
    { minDays: 20, discountPercentage: 35 }
  ]
};

/**
 * Configurações conservadoras (pouca flexibilidade)
 */
export const CONSERVATIVE_NEGOTIATION_SETTINGS: PropertyNegotiationSettings = {
  ...DEFAULT_NEGOTIATION_SETTINGS,
  allowAINegotiation: true,
  pixDiscountEnabled: true,
  pixDiscountPercentage: 5, // Apenas 5%
  cashDiscountEnabled: false,
  bookNowDiscountEnabled: false,
  earlyBookingDiscountEnabled: false,
  lastMinuteDiscountEnabled: false,
  maxDiscountPercentage: 10, // Máximo 10%
  extendedStayRules: [
    { minDays: 14, discountPercentage: 10 }
  ]
};

/**
 * Configurações para alta temporada (sem negociação)
 */
export const HIGH_SEASON_NEGOTIATION_SETTINGS: PropertyNegotiationSettings = {
  ...DEFAULT_NEGOTIATION_SETTINGS,
  allowAINegotiation: false, // Desabilitar negociação
  pixDiscountEnabled: false,
  cashDiscountEnabled: false,
  bookNowDiscountEnabled: false,
  extendedStayDiscountEnabled: false,
  earlyBookingDiscountEnabled: false,
  lastMinuteDiscountEnabled: false,
  maxDiscountPercentage: 0,
  priceJustifications: [
    'Alta temporada - preços fixos',
    'Demanda elevada',
    'Imóvel premium'
  ],
  negotiationNotes: 'Dezembro e janeiro são alta temporada. Preços não são negociáveis.'
};

/**
 * Helper: Verifica se negociação é permitida
 */
export function isNegotiationAllowed(settings?: PropertyNegotiationSettings): boolean {
  if (!settings) return false;
  return settings.allowAINegotiation === true;
}

/**
 * Helper: Obtém melhor desconto disponível
 */
export function getBestAvailableDiscount(
  settings: PropertyNegotiationSettings,
  context: {
    paymentMethod?: 'pix' | 'cash' | 'card';
    stayDuration?: number;
    daysUntilCheckIn?: number;
    bookNow?: boolean;
  }
): {
  type: string;
  percentage: number;
  description: string;
} | null {
  if (!settings.allowAINegotiation) return null;

  const discounts: Array<{ type: string; percentage: number; description: string }> = [];

  // Desconto PIX
  if (context.paymentMethod === 'pix' && settings.pixDiscountEnabled) {
    discounts.push({
      type: 'pix',
      percentage: settings.pixDiscountPercentage,
      description: `${settings.pixDiscountPercentage}% de desconto no PIX`
    });
  }

  // Desconto dinheiro
  if (context.paymentMethod === 'cash' && settings.cashDiscountEnabled) {
    discounts.push({
      type: 'cash',
      percentage: settings.cashDiscountPercentage,
      description: `${settings.cashDiscountPercentage}% de desconto em dinheiro`
    });
  }

  // Desconto por estadia prolongada
  if (context.stayDuration && settings.extendedStayDiscountEnabled) {
    for (const rule of settings.extendedStayRules.sort((a, b) => b.minDays - a.minDays)) {
      if (context.stayDuration >= rule.minDays) {
        discounts.push({
          type: 'extended_stay',
          percentage: rule.discountPercentage,
          description: `${rule.discountPercentage}% para ${rule.minDays}+ dias`
        });
        break;
      }
    }
  }

  // Desconto reserva imediata
  if (context.bookNow && settings.bookNowDiscountEnabled) {
    discounts.push({
      type: 'book_now',
      percentage: settings.bookNowDiscountPercentage,
      description: `${settings.bookNowDiscountPercentage}% para fechar agora`
    });
  }

  // Desconto antecedência
  if (context.daysUntilCheckIn && settings.earlyBookingDiscountEnabled) {
    for (const rule of settings.earlyBookingRules.sort((a, b) => b.daysInAdvance - a.daysInAdvance)) {
      if (context.daysUntilCheckIn >= rule.daysInAdvance) {
        discounts.push({
          type: 'early_booking',
          percentage: rule.discountPercentage,
          description: `${rule.discountPercentage}% por reservar com ${rule.daysInAdvance}+ dias de antecedência`
        });
        break;
      }
    }
  }

  // Desconto última hora
  if (context.daysUntilCheckIn && settings.lastMinuteDiscountEnabled) {
    for (const rule of settings.lastMinuteRules.sort((a, b) => a.daysBeforeCheckIn - b.daysBeforeCheckIn)) {
      if (context.daysUntilCheckIn <= rule.daysBeforeCheckIn) {
        discounts.push({
          type: 'last_minute',
          percentage: rule.discountPercentage,
          description: `${rule.discountPercentage}% por reservar em cima da hora`
        });
        break;
      }
    }
  }

  // Retornar melhor desconto (maior percentual)
  if (discounts.length === 0) return null;

  return discounts.reduce((best, current) =>
    current.percentage > best.percentage ? current : best
  );
}

/**
 * Helper: Calcula desconto máximo permitido
 */
export function calculateMaxAllowedDiscount(
  basePrice: number,
  settings: PropertyNegotiationSettings
): number {
  const maxDiscountAmount = (basePrice * settings.maxDiscountPercentage) / 100;
  const minAllowedPrice = settings.minPriceAfterDiscount || 0;
  const maxPossibleDiscount = Math.max(0, basePrice - minAllowedPrice);

  return Math.min(maxDiscountAmount, maxPossibleDiscount);
}
