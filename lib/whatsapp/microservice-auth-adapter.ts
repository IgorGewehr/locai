// lib/whatsapp/microservice-auth-adapter.ts
// Adapter para autenticação com microservice usando API Key

import { logger } from '@/lib/utils/logger';

/**
 * Adapter para autenticação com microservice WhatsApp
 * Usa API Key em vez de Firebase tokens
 */
export class MicroserviceAuthAdapter {
  private static apiKey: string | null = null;
  
  static initialize() {
    // API Key do microservice (deve estar no .env do LocAI)
    this.apiKey = process.env.WHATSAPP_MICROSERVICE_API_KEY || null;
    
    if (!this.apiKey) {
      logger.warn('⚠️ WHATSAPP_MICROSERVICE_API_KEY não configurado');
    } else {
      logger.info('✅ Microservice auth adapter inicializado');
    }
  }
  
  /**
   * Obter headers de autenticação para microservice
   */
  static getAuthHeaders(tenantId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }
    }
    
    return headers;
  }
  
  /**
   * Fazer requisição autenticada para microservice
   */
  static async fetch(url: string, options: RequestInit = {}, tenantId?: string): Promise<Response> {
    const headers = this.getAuthHeaders(tenantId);
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };
    
    logger.info('🌐 [Microservice] Making authenticated request', {
      url,
      method: options.method || 'GET',
      tenantId: tenantId?.substring(0, 8) + '***',
      hasApiKey: !!this.apiKey
    });
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      logger.error('❌ [Microservice] Request failed', {
        url,
        status: response.status,
        statusText: response.statusText,
        tenantId: tenantId?.substring(0, 8) + '***'
      });
    }
    
    return response;
  }
}

// Inicializar automaticamente
MicroserviceAuthAdapter.initialize();