/**
 * ABACATEPAY SERVICE
 *
 * Core service for AbacatePay API integration
 * Handles all API calls with retry logic, error handling, and logging
 *
 * @version 1.0.0
 * @see ABACATEPAY_INTEGRATION.md
 */

import { logger } from '@/lib/utils/logger';
import type {
  // Customer
  CreateCustomerRequest,
  CreateCustomerResponse,
  ListCustomersResponse,
  // Billing
  CreateBillingRequest,
  CreateBillingResponse,
  ListBillingsResponse,
  // PIX QR Code
  CreatePixQrCodeRequest,
  CreatePixQrCodeResponse,
  CheckPixQrCodeResponse,
  // Withdrawals
  CreateWithdrawRequest,
  CreateWithdrawResponse,
  GetWithdrawResponse,
  ListWithdrawsResponse,
  // Options
  AbacatePayServiceOptions,
  AbacatePayError,
} from '@/lib/types/abacatepay';
import {
  ABACATEPAY_BASE_URL,
  ABACATEPAY_DEFAULT_TIMEOUT,
  ABACATEPAY_MAX_RETRY_ATTEMPTS,
  ABACATEPAY_RETRY_DELAY,
  isAbacatePayError,
  isAbacatePaySuccess,
} from '@/lib/types/abacatepay';

/**
 * AbacatePay Service
 * Singleton service for managing AbacatePay API calls
 */
export class AbacatePayService {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(options: AbacatePayServiceOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || ABACATEPAY_BASE_URL;
    this.timeout = options.timeout || ABACATEPAY_DEFAULT_TIMEOUT;
    this.retryAttempts = options.retryAttempts || ABACATEPAY_MAX_RETRY_ATTEMPTS;
    this.retryDelay = options.retryDelay || ABACATEPAY_RETRY_DELAY;
  }

  // ===== PRIVATE HELPERS =====

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
    attempt = 1
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestId = `abp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    logger.info('[ABACATEPAY] Making API request', {
      requestId,
      endpoint,
      method,
      attempt,
      hasBody: !!body,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Check for API errors
      if (!response.ok || isAbacatePayError(data)) {
        const error = data as AbacatePayError;

        logger.error('[ABACATEPAY] API error response', {
          requestId,
          endpoint,
          status: response.status,
          error: error.error,
          code: error.code,
        });

        // Retry on specific errors
        if (this.shouldRetry(response.status, attempt)) {
          logger.warn('[ABACATEPAY] Retrying request', {
            requestId,
            attempt: attempt + 1,
            maxAttempts: this.retryAttempts,
          });

          await this.delay(this.retryDelay * attempt);
          return this.request(endpoint, method, body, attempt + 1);
        }

        throw new AbacatePayAPIError(error.error, response.status, error.code);
      }

      logger.info('[ABACATEPAY] API request successful', {
        requestId,
        endpoint,
        status: response.status,
      });

      return data as T;

    } catch (error) {
      if (error instanceof AbacatePayAPIError) {
        throw error;
      }

      logger.error('[ABACATEPAY] Request failed', {
        requestId,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt,
      });

      // Retry on network errors
      if (attempt < this.retryAttempts) {
        logger.warn('[ABACATEPAY] Retrying after network error', {
          requestId,
          attempt: attempt + 1,
        });

        await this.delay(this.retryDelay * attempt);
        return this.request(endpoint, method, body, attempt + 1);
      }

      throw new AbacatePayAPIError(
        'Network error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        0,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(status: number, attempt: number): boolean {
    if (attempt >= this.retryAttempts) return false;

    // Retry on server errors and rate limits
    return status >= 500 || status === 429;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== CUSTOMER METHODS =====

  /**
   * Create a new customer
   */
  async createCustomer(request: CreateCustomerRequest): Promise<CreateCustomerResponse> {
    logger.info('[ABACATEPAY] Creating customer', {
      name: request.name,
      email: request.email,
    });

    const response = await this.request<CreateCustomerResponse>(
      '/customer/create',
      'POST',
      request
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Customer created', {
        customerId: response.data.id,
      });
    }

    return response;
  }

  /**
   * List all customers
   */
  async listCustomers(): Promise<ListCustomersResponse> {
    logger.info('[ABACATEPAY] Listing customers');

    const response = await this.request<ListCustomersResponse>(
      '/customer/list',
      'GET'
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Customers listed', {
        count: response.data.length,
      });
    }

    return response;
  }

  // ===== BILLING METHODS =====

  /**
   * Create a billing (payment link)
   */
  async createBilling(request: CreateBillingRequest): Promise<CreateBillingResponse> {
    logger.info('[ABACATEPAY] Creating billing', {
      frequency: request.frequency,
      methods: request.methods,
      productsCount: request.products.length,
      hasCustomerId: !!request.customerId,
      hasCustomer: !!request.customer,
    });

    const response = await this.request<CreateBillingResponse>(
      '/billing/create',
      'POST',
      request
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Billing created', {
        billingId: response.data.id,
        url: response.data.url,
        amount: response.data.amount,
        status: response.data.status,
      });
    }

    return response;
  }

  /**
   * List all billings
   */
  async listBillings(): Promise<ListBillingsResponse> {
    logger.info('[ABACATEPAY] Listing billings');

    const response = await this.request<ListBillingsResponse>(
      '/billing/list',
      'GET'
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Billings listed', {
        count: response.data.length,
      });
    }

    return response;
  }

  /**
   * Get billing by ID
   */
  async getBilling(billingId: string): Promise<CreateBillingResponse> {
    logger.info('[ABACATEPAY] Getting billing', { billingId });

    // Note: AbacatePay doesn't have a direct GET endpoint for single billing
    // We'll list all and filter (or you can store the data after creation)
    const response = await this.listBillings();

    if (isAbacatePaySuccess(response)) {
      const billing = response.data.find(b => b.id === billingId);
      if (billing) {
        return { data: billing, error: null };
      }
      return { data: null, error: 'Billing not found' };
    }

    return { data: null, error: response.error };
  }

  // ===== PIX QR CODE METHODS =====

  /**
   * Create PIX QR Code for instant payment
   */
  async createPixQrCode(request: CreatePixQrCodeRequest): Promise<CreatePixQrCodeResponse> {
    logger.info('[ABACATEPAY] Creating PIX QR Code', {
      amount: request.amount,
      expiresIn: request.expiresIn,
      hasCustomer: !!request.customer,
    });

    const response = await this.request<CreatePixQrCodeResponse>(
      '/pixQrCode/create',
      'POST',
      request
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] PIX QR Code created', {
        pixId: response.data.id,
        amount: response.data.amount,
        status: response.data.status,
        expiresAt: response.data.expiresAt,
      });
    }

    return response;
  }

  /**
   * Check PIX QR Code payment status
   */
  async checkPixQrCode(pixId: string): Promise<CheckPixQrCodeResponse> {
    logger.info('[ABACATEPAY] Checking PIX QR Code status', { pixId });

    const response = await this.request<CheckPixQrCodeResponse>(
      `/pixQrCode/check?id=${pixId}`,
      'GET'
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] PIX QR Code status checked', {
        pixId,
        status: response.data.status,
        expiresAt: response.data.expiresAt,
      });
    }

    return response;
  }

  // ===== WITHDRAWAL METHODS =====

  /**
   * Create withdrawal request
   */
  async createWithdrawal(request: CreateWithdrawRequest): Promise<CreateWithdrawResponse> {
    logger.info('[ABACATEPAY] Creating withdrawal', {
      amount: request.amount,
      method: request.method,
      pixKeyType: request.pix.type,
    });

    const response = await this.request<CreateWithdrawResponse>(
      '/withdraw/create',
      'POST',
      request
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Withdrawal created', {
        withdrawalId: response.data.id,
        amount: response.data.amount,
        fee: response.data.platformFee,
        status: response.data.status,
      });
    }

    return response;
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawal(withdrawalId: string): Promise<GetWithdrawResponse> {
    logger.info('[ABACATEPAY] Getting withdrawal', { withdrawalId });

    const response = await this.request<GetWithdrawResponse>(
      `/withdraw/get?id=${withdrawalId}`,
      'GET'
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Withdrawal retrieved', {
        withdrawalId: response.data.id,
        status: response.data.status,
      });
    }

    return response;
  }

  /**
   * List all withdrawals
   */
  async listWithdrawals(): Promise<ListWithdrawsResponse> {
    logger.info('[ABACATEPAY] Listing withdrawals');

    const response = await this.request<ListWithdrawsResponse>(
      '/withdraw/list',
      'GET'
    );

    if (isAbacatePaySuccess(response)) {
      logger.info('[ABACATEPAY] Withdrawals listed', {
        count: response.data.length,
      });
    }

    return response;
  }

  // ===== HEALTH CHECK =====

  /**
   * Test API connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.info('[ABACATEPAY] Running health check');

      // Try to list customers as a simple health check
      const response = await this.listCustomers();
      const isHealthy = isAbacatePaySuccess(response);

      logger.info('[ABACATEPAY] Health check completed', {
        isHealthy,
      });

      return isHealthy;
    } catch (error) {
      logger.error('[ABACATEPAY] Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// ===== CUSTOM ERROR CLASS =====

export class AbacatePayAPIError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'AbacatePayAPIError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ===== SERVICE FACTORY =====

let serviceInstance: AbacatePayService | null = null;

/**
 * Get or create AbacatePay service instance (singleton)
 */
export function getAbacatePayService(): AbacatePayService {
  if (!serviceInstance) {
    const apiKey = process.env.ABACATEPAY_API_KEY;

    if (!apiKey) {
      throw new Error('ABACATEPAY_API_KEY environment variable is not set');
    }

    serviceInstance = new AbacatePayService({
      apiKey,
      baseUrl: ABACATEPAY_BASE_URL,
      timeout: ABACATEPAY_DEFAULT_TIMEOUT,
      retryAttempts: ABACATEPAY_MAX_RETRY_ATTEMPTS,
      retryDelay: ABACATEPAY_RETRY_DELAY,
    });

    logger.info('[ABACATEPAY] Service instance created');
  }

  return serviceInstance;
}

/**
 * Create a new AbacatePay service instance with custom options
 */
export function createAbacatePayService(options: AbacatePayServiceOptions): AbacatePayService {
  return new AbacatePayService(options);
}

// ===== TYPE EXPORTS =====
export type { AbacatePayServiceOptions };
