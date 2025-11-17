/**
 * AI Agent Configuration Types
 * Configurações dinâmicas para personalização do agente Sofia por tenant
 */

export interface AgentPermissions {
  search: boolean;        // Busca e apresentação de imóveis
  booking: boolean;       // Reservas e agendamentos
  sales: boolean;         // Negociação e vendas
  support: boolean;       // Suporte e atendimento geral
  payments: boolean;      // Cobranças e pagamentos (futuro)
}

export interface DiscountSettings {
  enabled: boolean;
  maxPercentage: number;          // Máximo desconto em %
  requiresApproval: boolean;      // Requer aprovação humana acima de threshold
  approvalThreshold: number;      // % acima do qual requer aprovação
  allowedCriteria: {
    earlyBooking: boolean;        // Desconto por antecedência
    longStay: boolean;            // Desconto por estadia longa
    lowSeason: boolean;           // Desconto por baixa temporada
    lastMinute: boolean;          // Desconto de última hora
    multiProperty: boolean;       // Desconto para múltiplos imóveis
  };
}

export interface CustomPrompts {
  welcome?: string;               // Mensagem de boas-vindas personalizada
  companyName?: string;           // Nome da empresa
  companyValues?: string;         // Valores e diferenciais
  tone?: 'formal' | 'casual' | 'friendly';  // Tom de comunicação
  specialInstructions?: string;   // Instruções especiais
}

export interface AIConfig {
  id?: string;
  tenantId: string;

  // Permissões de agentes
  agentPermissions: AgentPermissions;

  // Configurações de desconto
  discountSettings: DiscountSettings;

  // Prompts personalizados
  customPrompts: CustomPrompts;

  // Configurações gerais
  enabled: boolean;               // IA habilitada/desabilitada globalmente
  autoResponse: boolean;          // Resposta automática ativada
  businessHoursOnly: boolean;     // Apenas em horário comercial

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// Configuração padrão para novos tenants
export const DEFAULT_AI_CONFIG: Omit<AIConfig, 'tenantId' | 'id' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  autoResponse: true,
  businessHoursOnly: false,

  agentPermissions: {
    search: true,
    booking: true,
    sales: true,
    support: true,
    payments: false, // Desabilitado por padrão até implementação
  },

  discountSettings: {
    enabled: true,
    maxPercentage: 15,
    requiresApproval: true,
    approvalThreshold: 10,
    allowedCriteria: {
      earlyBooking: true,
      longStay: true,
      lowSeason: true,
      lastMinute: true,
      multiProperty: false,
    },
  },

  customPrompts: {
    companyName: 'Nossa Imobiliária',
    tone: 'friendly',
  },
};

// Status de bloqueio de IA por conversa
export interface ConversationAIBlock {
  tenantId: string;
  phone: string;
  blocked: boolean;
  blockedBy?: string;      // ID do usuário que bloqueou
  blockedAt?: Date;
  reason?: string;
}
