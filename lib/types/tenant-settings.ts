// lib/types/tenant-settings.ts
// Configurações gerais do tenant (aplicadas a todas as propriedades)

/**
 * 🤖 CONFIGURAÇÕES DE NEGOCIAÇÃO IA
 * Configuração global por tenant que controla o comportamento do Sales Agent
 */
export interface NegotiationSettings {
  // Controle geral
  allowAINegotiation: boolean // Permitir IA negociar?

  // Descontos por método de pagamento
  pixDiscountEnabled: boolean
  pixDiscountPercentage: number // Ex: 10 = 10% de desconto

  cashDiscountEnabled: boolean
  cashDiscountPercentage: number

  // Parcelamento
  installmentEnabled: boolean
  maxInstallments: number // Ex: 10 = até 10x sem juros
  minInstallmentValue: number // Valor mínimo da parcela (ex: 100.00)

  // Desconto por estadia prolongada
  extendedStayDiscountEnabled: boolean
  extendedStayRules: Array<{
    minDays: number // Ex: 7 dias
    discountPercentage: number // Ex: 15%
  }>

  // Desconto por reserva imediata
  bookNowDiscountEnabled: boolean
  bookNowDiscountPercentage: number // Ex: 5%
  bookNowTimeLimit: number // Tempo em horas (ex: 2h)

  // Desconto por antecedência
  earlyBookingDiscountEnabled: boolean
  earlyBookingRules: Array<{
    daysInAdvance: number // Ex: 30 dias antes
    discountPercentage: number // Ex: 10%
  }>

  // Desconto por última hora
  lastMinuteDiscountEnabled: boolean
  lastMinuteRules: Array<{
    daysBeforeCheckIn: number // Ex: 3 dias antes
    discountPercentage: number // Ex: 20%
  }>

  // Limites e restrições
  maxDiscountPercentage: number // Desconto máximo acumulado (ex: 25%)
  minPriceAfterDiscount: number // Preço mínimo após descontos (0 = sem limite)

  // Justificativas de preço (para IA usar em objeções)
  priceJustifications: string[] // Ex: ["Alto padrão", "Vista para o mar", "Perto do centro"]

  // Alternativas sugeridas
  allowSuggestAlternatives: boolean // Sugerir outras propriedades mais baratas?

  // Upselling
  upsellEnabled: boolean
  upsellSuggestions: string[] // Ex: ["Café da manhã incluso", "Transfer do aeroporto"]

  // Observações para a IA
  negotiationNotes?: string // Ex: "Dezembro é alta temporada, preços são fixos"
}

/**
 * Configurações gerais do tenant
 * Armazenadas em: tenants/{tenantId}/settings/general
 */
export interface TenantSettings {
  // Negociação IA
  negotiation: NegotiationSettings

  // Metadados
  updatedAt: Date
  updatedBy?: string // User ID que fez a última atualização
}

/**
 * Valores padrão para configurações de negociação
 */
export const DEFAULT_NEGOTIATION_SETTINGS: NegotiationSettings = {
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
export const AGGRESSIVE_NEGOTIATION_SETTINGS: NegotiationSettings = {
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
export const CONSERVATIVE_NEGOTIATION_SETTINGS: NegotiationSettings = {
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
export const HIGH_SEASON_NEGOTIATION_SETTINGS: NegotiationSettings = {
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
