// Tipos para sistema de assinaturas e webhooks Kirvano

export interface KirvanoWebhookEvent {
  event:
    | 'BANK_SLIP_GENERATED'
    | 'BANK_SLIP_EXPIRED'
    | 'PIX_GENERATED'
    | 'PIX_EXPIRED'
    | 'SALE_REFUSED'
    | 'SALE_CHARGEBACK'
    | 'SALE_APPROVED'
    | 'SALE_REFUNDED'
    | 'ABANDONED_CART'
    | 'SUBSCRIPTION_CANCELED'
    | 'SUBSCRIPTION_EXPIRED'
    | 'SUBSCRIPTION_RENEWED';
  event_description: string;
  checkout_id: string;
  checkout_url?: string;
  sale_id: string;
  payment_method: 'BANK_SLIP' | 'PIX' | 'CREDIT_CARD';
  total_price: string;
  type: 'ONE_TIME' | 'RECURRING';
  status: 'PENDING' | 'APPROVED' | 'REFUSED' | 'CANCELED' | 'CHARGEBACK' | 'REFUNDED' | 'ABANDONED_CART';
  created_at: string;

  // Campos adicionais presentes nos webhooks reais
  ip?: string;
  fee?: number;
  commission?: number;
  contactEmail?: string;
  couponDiscount?: number;
  automaticDiscount?: number;
  affiliateCommission?: number;
  coproductionCommission?: number;

  // Informações fiscais/financeiras
  fiscal?: {
    fee?: number;
    net_value?: number;
    commission?: number;
    total_value?: number;
    original_value?: number;
    coupon_discount?: number;
    total_discounts?: number;
    total_commissions?: number;
    automatic_discount?: number;
    affiliate_commission?: number;
    coproduction_commission?: number;
  };

  // Cookies de tracking
  cookies?: Record<string, any>;

  customer: {
    name: string;
    document: string;
    email: string;
    phone_number: string;
    address?: {
      city?: string | null;
      state?: string | null;
      number?: string | null;
      street?: string | null;
      zipcode?: string | null;
      complement?: string | null;
      neighborhood?: string | null;
    };
  };
  payment: {
    method: 'BANK_SLIP' | 'PIX' | 'CREDIT_CARD';
    brand?: string;
    installments?: number;
    finished_at?: string;
    link?: string;
    digitable_line?: string;
    barcode?: string;
    expires_at?: string;
    qrcode?: string;
    qrcode_image?: string;
  };
  plan?: {
    name: string;
    charge_frequency: 'MONTHLY' | 'ANNUALLY' | 'WEEKLY';
    charge_number?: number;
    next_charge_date: string;
  };
  products: Array<{
    id: string;
    name: string;
    offer_id: string;
    offer_name: string;
    description: string;
    price: string;
    photo: string;
    category?: string;
    format?: string;
    is_order_bump: boolean;
  }>;
  utm: {
    src?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
}

export interface UserSubscription {
  id?: string;
  userId: string;
  
  // Dados da assinatura
  subscriptionActive: boolean;
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'pending' | 'suspended';
  subscriptionPlan?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  subscriptionNextChargeDate?: Date;
  
  // Dados Kirvano
  kirvanoSaleId?: string;
  kirvanoCheckoutId?: string;
  kirvanoCustomerDocument?: string;
  
  // Trial info
  trialDays?: number;
  trialStartDate?: Date;
  trialEndDate?: Date;
  trialExpired?: boolean;
  
  // Histórico de pagamentos
  lastPaymentDate?: Date;
  lastPaymentAmount?: string;
  lastPaymentMethod?: string;
  totalPayments?: number;
  
  // Controle interno
  createdAt: Date;
  updatedAt: Date;
  
  // Logs de eventos
  eventHistory?: SubscriptionEvent[];
}

export interface SubscriptionEvent {
  id?: string;
  userId: string;
  event: string;
  eventDescription: string;
  kirvanoEvent?: KirvanoWebhookEvent;
  status: 'processed' | 'failed' | 'ignored';
  processedAt: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface TrialStatus {
  hasTrialExpired: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
  shouldRedirectToPlans: boolean;
  isSubscriptionActive: boolean;
}

export interface SubscriptionValidation {
  isValid: boolean;
  hasAccess: boolean;
  reason?: 
    | 'active_subscription' 
    | 'trial_active' 
    | 'trial_expired' 
    | 'no_subscription' 
    | 'subscription_canceled' 
    | 'subscription_expired'
    | 'legacy_user_grandfathered'     // Usuário antigo com acesso mantido
    | 'grace_period_active'          // Período de graça ativo
    | 'grace_period_expired'         // Período de graça expirado
    | 'no_trial_restriction'         // Sem restrições de trial
    | 'no_trial_legacy_user';        // Usuário legacy sem trial
  redirectUrl?: string;
  message?: string;
  subscription?: UserSubscription;
  trialStatus?: TrialStatus;
}