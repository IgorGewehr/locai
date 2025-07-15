// Sistema de cobranças automáticas via WhatsApp
export interface BillingSettings {
  id: string;
  tenantId: string;
  enabled: boolean;
  
  // Configurações gerais
  defaultReminderDays: number; // quantos dias antes do vencimento
  defaultOverdueDays: number; // quantos dias após o vencimento
  maxReminders: number; // máximo de lembretes por fatura
  
  // Configurações de horário
  sendTimeStart: string; // "09:00"
  sendTimeEnd: string; // "18:00"
  workDays: number[]; // [1,2,3,4,5] (seg-sex)
  
  // Templates de mensagem
  templates: {
    beforeDue: BillingTemplate;
    onDue: BillingTemplate;
    overdue: BillingTemplate;
    receipt: BillingTemplate;
  };
  
  // Configurações por tipo
  transactionTypes: {
    all: boolean;
    reservation: boolean;
    maintenance: boolean;
    cleaning: boolean;
    commission: boolean;
    other: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingTemplate {
  id: string;
  name: string;
  message: string; // suporta variáveis: {{clientName}}, {{amount}}, {{dueDate}}, etc.
  tone: 'formal' | 'friendly' | 'neutral';
  includePaymentLink: boolean;
  includeInvoice: boolean;
}

export interface BillingReminder {
  id: string;
  tenantId: string;
  transactionId: string;
  clientId: string;
  
  // Configuração do lembrete
  type: 'before_due' | 'on_due' | 'overdue';
  scheduledDate: Date;
  daysFromDue: number; // negativo = antes, 0 = no dia, positivo = depois
  
  // Status
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Date;
  error?: string;
  
  // WhatsApp
  whatsappNumber: string;
  whatsappMessageId?: string;
  
  // Resposta do cliente
  clientResponse?: {
    message: string;
    timestamp: Date;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
  
  // Metadados
  attemptCount: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  
  // Configuração
  type: 'one_time' | 'recurring';
  filters: {
    propertyIds?: string[];
    clientIds?: string[];
    transactionTypes?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    minAmount?: number;
    maxAmount?: number;
    status?: ('pending' | 'completed')[];
  };
  
  // Agendamento
  scheduledDate: Date;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  
  // Template
  templateId: string;
  customMessage?: string;
  
  // Status
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  stats: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    read: number;
    responded: number;
    paid: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BillingAnalytics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  
  // Métricas gerais
  overview: {
    totalReminders: number;
    successRate: number;
    responseRate: number;
    paymentConversionRate: number;
    averageResponseTime: number; // em horas
  };
  
  // Por tipo de lembrete
  byReminderType: {
    beforeDue: ReminderTypeStats;
    onDue: ReminderTypeStats;
    overdue: ReminderTypeStats;
  };
  
  // Por período
  byPeriod: Array<{
    date: Date;
    sent: number;
    delivered: number;
    responded: number;
    paid: number;
  }>;
  
  // Insights
  insights: Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    metric?: number;
    recommendation?: string;
  }>;
  
  // Top performers
  topClients: Array<{
    clientId: string;
    name: string;
    responseRate: number;
    paymentRate: number;
    averageResponseTime: number;
  }>;
  
  // Horários ideais
  bestSendTimes: Array<{
    hour: number;
    responseRate: number;
    paymentRate: number;
  }>;
}

interface ReminderTypeStats {
  sent: number;
  delivered: number;
  read: number;
  responded: number;
  paid: number;
  avgResponseTime: number;
  conversionRate: number;
}

// Configuração simplificada para pequenos proprietários
export interface SimpleBillingConfig {
  enabled: boolean;
  reminderDays: 'none' | '1_day' | '2_days' | '3_days' | '7_days';
  overdueReminder: boolean;
  tone: 'formal' | 'friendly';
  autoSend: boolean; // enviar automaticamente ou exigir aprovação
}

// Notificação para o proprietário
export interface BillingNotification {
  id: string;
  tenantId: string;
  type: 'reminder_scheduled' | 'reminder_sent' | 'payment_received' | 'client_response';
  
  title: string;
  message: string;
  
  relatedData: {
    reminderId?: string;
    transactionId?: string;
    clientId?: string;
    amount?: number;
  };
  
  read: boolean;
  createdAt: Date;
}

// Status de cobrança para transações
export interface TransactionBillingStatus {
  transactionId: string;
  
  // Lembretes
  reminders: {
    scheduled: number;
    sent: number;
    lastSentAt?: Date;
    nextScheduledAt?: Date;
  };
  
  // Resposta do cliente
  lastClientResponse?: {
    message: string;
    timestamp: Date;
    sentiment: 'positive' | 'negative' | 'neutral';
    promisedPaymentDate?: Date;
  };
  
  // Métricas
  firstReminderSentAt?: Date;
  paymentReceivedAt?: Date;
  daysToPayment?: number;
  
  // Flags
  isOverdue: boolean;
  isPaid: boolean;
  stopReminders: boolean; // parar lembretes manualmente
}

// Templates pré-definidos
export const DEFAULT_TEMPLATES = {
  beforeDue: {
    formal: `Prezado(a) {{clientName}},

Gostaríamos de lembrá-lo(a) que sua fatura no valor de {{amount}} vence em {{dueDate}}.

{{propertyName}}
Período: {{period}}

Para sua comodidade, você pode realizar o pagamento através do link abaixo:
{{paymentLink}}

Caso já tenha efetuado o pagamento, por favor, desconsidere esta mensagem.

Atenciosamente,
{{companyName}}`,
    
    friendly: `Oi {{clientName}}! 👋

Passando para lembrar que sua fatura de {{amount}} vence {{dueDate}} 📅

{{propertyName}}
Período: {{period}}

Se quiser, pode pagar pelo link:
{{paymentLink}}

Qualquer dúvida, é só chamar! 😊

{{companyName}}`
  },
  
  onDue: {
    formal: `Prezado(a) {{clientName}},

Sua fatura no valor de {{amount}} vence hoje, {{dueDate}}.

{{propertyName}}
Período: {{period}}

Link para pagamento:
{{paymentLink}}

Agradecemos a pontualidade.

Atenciosamente,
{{companyName}}`,
    
    friendly: `Oi {{clientName}}! 

Hoje é o dia do vencimento da sua fatura de {{amount}} 📆

{{propertyName}}
Período: {{period}}

Paga rapidinho pelo link:
{{paymentLink}}

Obrigado! 🙏

{{companyName}}`
  },
  
  overdue: {
    formal: `Prezado(a) {{clientName}},

Identificamos que sua fatura no valor de {{amount}} está vencida desde {{dueDate}}.

{{propertyName}}
Período: {{period}}

Para regularizar sua situação, por favor efetue o pagamento através do link:
{{paymentLink}}

Valor atualizado: {{updatedAmount}}

Aguardamos seu contato.

Atenciosamente,
{{companyName}}`,
    
    friendly: `Oi {{clientName}},

Vi aqui que sua fatura de {{amount}} venceu em {{dueDate}} 📋

{{propertyName}}
Período: {{period}}

Que tal regularizar? 
{{paymentLink}}

Valor atualizado: {{updatedAmount}}

Me avisa se precisar de algo! 

{{companyName}}`
  },
  
  receipt: {
    formal: `Prezado(a) {{clientName}},

Confirmamos o recebimento do pagamento no valor de {{amount}}.

{{propertyName}}
Período: {{period}}
Data do pagamento: {{paymentDate}}

Obrigado pela pontualidade.

Atenciosamente,
{{companyName}}`,
    
    friendly: `{{clientName}}, recebi seu pagamento! ✅

Valor: {{amount}}
{{propertyName}}
Período: {{period}}

Tudo certo por aqui! Obrigado! 🎉

{{companyName}}`
  }
};

// Variáveis disponíveis nos templates
export const TEMPLATE_VARIABLES: Record<string, string> = {
  clientName: 'Nome do cliente',
  amount: 'Valor da fatura',
  dueDate: 'Data de vencimento',
  propertyName: 'Nome da propriedade',
  period: 'Período da cobrança',
  paymentLink: 'Link para pagamento',
  companyName: 'Nome da empresa',
  updatedAmount: 'Valor atualizado (com juros/multa)',
  paymentDate: 'Data do pagamento',
  daysOverdue: 'Dias em atraso',
};