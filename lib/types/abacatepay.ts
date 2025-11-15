/**
 * ABACATEPAY TYPE DEFINITIONS
 *
 * Complete TypeScript types for AbacatePay API integration
 * API Documentation: https://api.abacatepay.com/docs
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

// ===== ENUMS =====

export enum AbacatePayStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum AbacatePayMethod {
  PIX = 'PIX',
  CARD = 'CARD'
}

export enum BillingFrequency {
  ONE_TIME = 'ONE_TIME',
  MULTIPLE_PAYMENTS = 'MULTIPLE_PAYMENTS'
}

export enum PixKeyType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  RANDOM = 'RANDOM'
}

export enum TransactionKind {
  WITHDRAW = 'WITHDRAW',
  BILLING = 'BILLING',
  REFUND = 'REFUND'
}

// ===== CUSTOMER =====

export interface AbacatePayCustomer {
  name: string;
  cellphone: string;
  email: string;
  taxId: string; // CPF ou CNPJ
}

export interface AbacatePayCustomerResponse {
  id: string; // Format: cust_xxxxx
  metadata: AbacatePayCustomer;
}

export interface CreateCustomerRequest {
  name: string;
  cellphone: string;
  email: string;
  taxId: string;
}

export interface CreateCustomerResponse {
  data: AbacatePayCustomerResponse | null;
  error: string | null;
}

export interface ListCustomersResponse {
  data: AbacatePayCustomerResponse[] | null;
  error: string | null;
}

// ===== BILLING (Payment Links) =====

export interface BillingProduct {
  externalId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number; // In cents (e.g., 1000 = R$ 10.00)
}

export interface BillingProductResponse {
  id: string; // Format: prod_xxxxx
  externalId: string;
  quantity: number;
}

export interface CreateBillingRequest {
  frequency: BillingFrequency;
  methods: AbacatePayMethod[];
  products: BillingProduct[];
  returnUrl: string; // URL to redirect if user clicks "Back"
  completionUrl: string; // URL to redirect when payment is completed

  // Customer (choose one)
  customerId?: string; // Existing customer ID
  customer?: AbacatePayCustomer; // New customer data

  // Coupons
  allowCoupons?: boolean;
  coupons?: string[];

  // External tracking
  externalId?: string;
  metadata?: Record<string, any>;
}

export interface BillingResponse {
  id: string; // Format: bill_xxxxx
  url: string; // Payment page URL
  amount: number; // Total amount in cents
  status: AbacatePayStatus;
  devMode: boolean;
  methods: AbacatePayMethod[];
  products: BillingProductResponse[];
  frequency: BillingFrequency;
  nextBilling: string | null; // ISO date or null
  customer: AbacatePayCustomerResponse;
  allowCoupons: boolean;
  coupons: string[];
}

export interface CreateBillingResponse {
  data: BillingResponse | null;
  error: string | null;
}

export interface ListBillingsResponse {
  data: BillingResponse[] | null;
  error: string | null;
}

// ===== PIX QR CODE =====

export interface CreatePixQrCodeRequest {
  amount: number; // In cents (e.g., 10000 = R$ 100.00)
  expiresIn: number; // Minutes until expiration
  description?: string;
  customer?: AbacatePayCustomer;
  metadata?: {
    externalId?: string;
    [key: string]: any;
  };
}

export interface PixQrCodeResponse {
  id: string; // Format: pix_char_xxxxx
  amount: number; // In cents
  status: AbacatePayStatus;
  devMode: boolean;
  brCode: string; // PIX copy-paste code
  brCodeBase64: string; // Base64 QR code image (data:image/png;base64,...)
  platformFee: number; // Fee in cents
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  expiresAt: string; // ISO date
  customer?: AbacatePayCustomerResponse;
  metadata?: Record<string, any>;
}

export interface CreatePixQrCodeResponse {
  data: PixQrCodeResponse | null;
  error: string | null;
}

export interface CheckPixQrCodeResponse {
  data: {
    status: AbacatePayStatus;
    expiresAt: string; // ISO date
  } | null;
  error: string | null;
}

// ===== WITHDRAWALS =====

export interface PixWithdrawDetails {
  type: PixKeyType;
  key: string; // PIX key (CPF, email, phone, etc.)
}

export interface CreateWithdrawRequest {
  description: string;
  externalId?: string;
  method: 'PIX'; // Currently only PIX supported
  amount: number; // In cents
  pix: PixWithdrawDetails;
}

export interface WithdrawResponse {
  id: string; // Format: tran_xxxxx
  status: AbacatePayStatus;
  devMode: boolean;
  receiptUrl: string;
  kind: TransactionKind;
  amount: number; // In cents
  platformFee: number; // Fee in cents
  externalId?: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface CreateWithdrawResponse {
  data: WithdrawResponse | null;
  error: string | null;
}

export interface GetWithdrawResponse {
  data: WithdrawResponse | null;
  error: string | null;
}

export interface ListWithdrawsResponse {
  data: WithdrawResponse[] | null;
  error: string | null;
}

// ===== WEBHOOKS =====

export enum WebhookEventType {
  BILLING_PAID = 'billing.paid',
  BILLING_EXPIRED = 'billing.expired',
  BILLING_CANCELLED = 'billing.cancelled',
  BILLING_REFUNDED = 'billing.refunded',
  PIX_PAID = 'pix.paid',
  PIX_EXPIRED = 'pix.expired',
  PIX_CANCELLED = 'pix.cancelled',
  WITHDRAW_PENDING = 'withdraw.pending',
  WITHDRAW_COMPLETED = 'withdraw.completed',
  WITHDRAW_FAILED = 'withdraw.failed'
}

export interface WebhookPayloadBase {
  event: WebhookEventType;
  timestamp: string; // ISO date
  devMode: boolean;
}

export interface BillingWebhookPayload extends WebhookPayloadBase {
  event: WebhookEventType.BILLING_PAID |
         WebhookEventType.BILLING_EXPIRED |
         WebhookEventType.BILLING_CANCELLED |
         WebhookEventType.BILLING_REFUNDED;
  data: BillingResponse;
}

export interface PixWebhookPayload extends WebhookPayloadBase {
  event: WebhookEventType.PIX_PAID |
         WebhookEventType.PIX_EXPIRED |
         WebhookEventType.PIX_CANCELLED;
  data: PixQrCodeResponse;
}

export interface WithdrawWebhookPayload extends WebhookPayloadBase {
  event: WebhookEventType.WITHDRAW_PENDING |
         WebhookEventType.WITHDRAW_COMPLETED |
         WebhookEventType.WITHDRAW_FAILED;
  data: WithdrawResponse;
}

export type WebhookPayload = BillingWebhookPayload | PixWebhookPayload | WithdrawWebhookPayload;

// ===== API ERROR =====

export interface AbacatePayError {
  error: string;
  code?: string;
  details?: any;
}

// ===== SERVICE OPTIONS =====

export interface AbacatePayServiceOptions {
  apiKey: string;
  baseUrl?: string; // Default: https://api.abacatepay.com/v1
  timeout?: number; // Default: 30000ms
  retryAttempts?: number; // Default: 3
  retryDelay?: number; // Default: 1000ms
}

// ===== UTILITY TYPES =====

/**
 * Converts amount from BRL to cents
 * @example toCents(10.50) => 1050
 */
export function toCents(amountBRL: number): number {
  return Math.round(amountBRL * 100);
}

/**
 * Converts amount from cents to BRL
 * @example toBRL(1050) => 10.50
 */
export function toBRL(amountCents: number): number {
  return amountCents / 100;
}

/**
 * Format BRL amount for display
 * @example formatBRL(1050) => "R$ 10,50"
 */
export function formatBRL(amountCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(toBRL(amountCents));
}

/**
 * Type guard for AbacatePay error responses
 */
export function isAbacatePayError(response: any): response is AbacatePayError {
  return response && typeof response.error === 'string';
}

/**
 * Type guard for successful responses
 */
export function isAbacatePaySuccess<T>(response: { data: T | null; error: string | null }): response is { data: T; error: null } {
  return response.data !== null && response.error === null;
}

/**
 * Validate PIX key format based on type
 */
export function validatePixKey(type: PixKeyType, key: string): boolean {
  switch (type) {
    case PixKeyType.CPF:
      return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(key) || /^\d{11}$/.test(key);
    case PixKeyType.CNPJ:
      return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(key) || /^\d{14}$/.test(key);
    case PixKeyType.EMAIL:
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
    case PixKeyType.PHONE:
      return /^\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(key);
    case PixKeyType.RANDOM:
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key);
    default:
      return false;
  }
}

/**
 * Detect PIX key type from key string
 */
export function detectPixKeyType(key: string): PixKeyType | null {
  if (validatePixKey(PixKeyType.CPF, key)) return PixKeyType.CPF;
  if (validatePixKey(PixKeyType.CNPJ, key)) return PixKeyType.CNPJ;
  if (validatePixKey(PixKeyType.EMAIL, key)) return PixKeyType.EMAIL;
  if (validatePixKey(PixKeyType.PHONE, key)) return PixKeyType.PHONE;
  if (validatePixKey(PixKeyType.RANDOM, key)) return PixKeyType.RANDOM;
  return null;
}

/**
 * Calculate net amount after platform fee
 * Default fee: 0.8% (80 cents per R$ 100)
 */
export function calculateNetAmount(grossAmountCents: number, feeCents: number): number {
  return grossAmountCents - feeCents;
}

/**
 * Estimate platform fee (approximate, actual fee comes from API)
 */
export function estimateFee(amountCents: number): number {
  return Math.round(amountCents * 0.008); // 0.8%
}

// ===== CONSTANTS =====

export const ABACATEPAY_BASE_URL = 'https://api.abacatepay.com/v1';
export const ABACATEPAY_DEFAULT_TIMEOUT = 30000;
export const ABACATEPAY_MAX_RETRY_ATTEMPTS = 3;
export const ABACATEPAY_RETRY_DELAY = 1000;

// Limits
export const MIN_PAYMENT_AMOUNT_CENTS = 100; // R$ 1.00
export const MAX_PAYMENT_AMOUNT_CENTS = 10_000_000; // R$ 100,000.00
export const MAX_WITHDRAW_AMOUNT_CENTS = 5_000_000; // R$ 50,000.00
export const DEFAULT_PIX_EXPIRATION_MINUTES = 30;
export const MAX_PIX_EXPIRATION_MINUTES = 1440; // 24 hours

// Rate limits (per tenant, per day)
export const MAX_DAILY_PIX_GENERATIONS = 100;
export const MAX_DAILY_BILLING_CREATIONS = 50;
export const MAX_DAILY_WITHDRAWALS = 3;

// ===== TYPE EXPORTS =====
export type {
  AbacatePayCustomer,
  AbacatePayCustomerResponse,
  CreateCustomerRequest,
  CreateCustomerResponse,
  ListCustomersResponse,
  BillingProduct,
  BillingProductResponse,
  CreateBillingRequest,
  BillingResponse,
  CreateBillingResponse,
  ListBillingsResponse,
  CreatePixQrCodeRequest,
  PixQrCodeResponse,
  CreatePixQrCodeResponse,
  CheckPixQrCodeResponse,
  PixWithdrawDetails,
  CreateWithdrawRequest,
  WithdrawResponse,
  CreateWithdrawResponse,
  GetWithdrawResponse,
  ListWithdrawsResponse,
  WebhookPayloadBase,
  BillingWebhookPayload,
  PixWebhookPayload,
  WithdrawWebhookPayload,
  WebhookPayload,
  AbacatePayError,
  AbacatePayServiceOptions,
};
