/**
 * TENANT CONFIGURATION TYPES
 *
 * Types for dynamic tenant configuration including AI features,
 * payment settings, and agent behavior customization
 *
 * @version 1.0.0
 */

import { Timestamp } from 'firebase/firestore';

// ===== AI FEATURE FLAGS =====

export interface TenantAIFeatures {
  /** Enable payments management through AI (AbacatePay integration) */
  payments: boolean;

  /** Enable contracts management through AI */
  contracts: boolean;

  /** Enable advanced analytics and reports */
  analytics: boolean;

  /** Enable custom reports generation */
  customReports: boolean;

  /** Enable automated follow-ups */
  autoFollowUp: boolean;
}

// ===== PAYMENT SETTINGS =====

export interface TenantPaymentSettings {
  /** Payment provider (currently only 'abacatepay') */
  provider: 'abacatepay' | 'stripe' | 'mercadopago';

  /** Encrypted API key for payment provider */
  apiKey?: string;

  /** Enable automatic payment reminders */
  enableAutoReminders: boolean;

  /** Default payment link expiration time (in hours) */
  defaultExpiration: number;

  /** Webhook URL for payment notifications */
  webhookUrl?: string;

  /** Enable PIX QR Code generation */
  enablePixQrCode: boolean;

  /** Enable payment links */
  enablePaymentLinks: boolean;
}

// ===== CONTRACT SETTINGS =====

export interface TenantContractSettings {
  /** Enable digital signatures */
  enableDigitalSignature: boolean;

  /** Default contract template ID */
  defaultTemplateId?: string;

  /** Require witness signatures */
  requireWitness: boolean;

  /** Auto-send contracts after reservation */
  autoSendAfterReservation: boolean;

  /** Contract expiration days (0 = no expiration) */
  expirationDays: number;
}

// ===== AGENT BEHAVIOR =====

export interface RouterAgentConfig {
  /** Enable payments specialist routing */
  paymentsSpecialist: boolean;

  /** Enable contracts specialist routing */
  contractsSpecialist: boolean;

  /** Enable analytics specialist routing */
  analyticsSpecialist: boolean;
}

export interface SalesAgentConfig {
  /** Allow price negotiation */
  allowNegotiation: boolean;

  /** Maximum discount percentage (0-100) */
  maxDiscount: number;

  /** Enable dynamic discounts based on criteria */
  enableDynamicDiscounts: boolean;

  /** Auto-apply PIX discount */
  autoApplyPixDiscount: boolean;
}

export interface SearchAgentConfig {
  /** Maximum properties to show at once */
  maxPropertiesPerSearch: number;

  /** Auto-send property photos */
  autoSendPhotos: boolean;

  /** Auto-send property map */
  autoSendMap: boolean;
}

export interface BookingAgentConfig {
  /** Require email for all bookings */
  requireEmail: boolean;

  /** Require document (CPF) for all bookings */
  requireDocument: boolean;

  /** Auto-schedule key pickup */
  autoScheduleKeyPickup: boolean;

  /** Send confirmation email */
  sendConfirmationEmail: boolean;
}

export interface SupportAgentConfig {
  /** Allow AI to handle cancellations */
  allowCancellations: boolean;

  /** Allow AI to handle modifications */
  allowModifications: boolean;

  /** Auto-transfer to human after X messages */
  autoTransferThreshold: number;
}

export interface AgentBehaviorConfig {
  router: RouterAgentConfig;
  sales: SalesAgentConfig;
  search: SearchAgentConfig;
  booking: BookingAgentConfig;
  support: SupportAgentConfig;
}

// ===== MAIN TENANT CONFIG =====

export interface TenantConfig {
  /** Tenant ID (matches Firebase Auth tenantId) */
  tenantId: string;

  /** AI feature flags */
  features: TenantAIFeatures;

  /** Payment provider settings */
  paymentSettings?: TenantPaymentSettings;

  /** Contract management settings */
  contractSettings?: TenantContractSettings;

  /** Agent behavior customization */
  agentBehavior: AgentBehaviorConfig;

  /** Custom system prompts override (optional) */
  customPrompts?: {
    router?: string;
    sales?: string;
    search?: string;
    booking?: string;
    support?: string;
    payments?: string;
    contracts?: string;
  };

  /** Metadata */
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  updatedBy: string; // User email or ID
  version: number;
}

// ===== API RESPONSE TYPES =====

export interface AgentConfigResponse {
  success: boolean;
  data: {
    features: TenantAIFeatures;
    agentPrompts: {
      router: string;
      sales: string;
      search: string;
      booking: string;
      support: string;
      payments?: string;
      contracts?: string;
    };
    agentBehavior: AgentBehaviorConfig;
  };
  cached: boolean;
  cachedAt?: string;
}

export interface UpdateFeaturesRequest {
  features: Partial<TenantAIFeatures>;
  updatedBy: string;
}

export interface UpdateFeaturesResponse {
  success: boolean;
  message: string;
  data?: TenantConfig;
}

// ===== DEFAULT CONFIGURATIONS =====

export const DEFAULT_AI_FEATURES: TenantAIFeatures = {
  payments: false,
  contracts: false,
  analytics: true,
  customReports: false,
  autoFollowUp: true,
};

export const DEFAULT_PAYMENT_SETTINGS: TenantPaymentSettings = {
  provider: 'abacatepay',
  enableAutoReminders: true,
  defaultExpiration: 24,
  enablePixQrCode: true,
  enablePaymentLinks: true,
};

export const DEFAULT_CONTRACT_SETTINGS: TenantContractSettings = {
  enableDigitalSignature: false,
  requireWitness: false,
  autoSendAfterReservation: false,
  expirationDays: 30,
};

export const DEFAULT_AGENT_BEHAVIOR: AgentBehaviorConfig = {
  router: {
    paymentsSpecialist: false,
    contractsSpecialist: false,
    analyticsSpecialist: false,
  },
  sales: {
    allowNegotiation: true,
    maxDiscount: 25,
    enableDynamicDiscounts: true,
    autoApplyPixDiscount: true,
  },
  search: {
    maxPropertiesPerSearch: 3,
    autoSendPhotos: true,
    autoSendMap: true,
  },
  booking: {
    requireEmail: true,
    requireDocument: false,
    autoScheduleKeyPickup: true,
    sendConfirmationEmail: true,
  },
  support: {
    allowCancellations: true,
    allowModifications: true,
    autoTransferThreshold: 10,
  },
};

export const DEFAULT_TENANT_CONFIG: Omit<TenantConfig, 'tenantId' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  features: DEFAULT_AI_FEATURES,
  paymentSettings: DEFAULT_PAYMENT_SETTINGS,
  contractSettings: DEFAULT_CONTRACT_SETTINGS,
  agentBehavior: DEFAULT_AGENT_BEHAVIOR,
  version: 1,
};
