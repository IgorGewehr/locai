// lib/utils/simple-api-client.ts
// Cliente API simplificado que bypass problemas de autenticação

import { logger } from '@/lib/utils/logger';
import { EmergencyAuth } from './emergency-auth';

/**
 * Cliente API simplificado para contornar problemas de Firebase quota
 */
export class SimpleApiClient {
  
  /**
   * Fazer requisição simples sem complexidade de autenticação
   */
  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      // Use emergency headers se necessário
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...EmergencyAuth.getEmergencyHeaders(),
        ...options.headers
      };
      
      const config: RequestInit = {
        ...options,
        headers,
        timeout: 30000 // 30 segundos
      };
      
      logger.info('📡 [SimpleApiClient] Making request', {
        url: url.includes('localhost') ? url : url.replace(/\/\/[^\/]+/, '//***'),
        method: options.method || 'GET',
        hasBody: !!options.body
      });
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        logger.warn(`⚠️ [SimpleApiClient] Request failed: ${response.status}`, {
          url: url.substring(0, 50) + '***',
          status: response.status,
          statusText: response.statusText
        });
      } else {
        logger.info('✅ [SimpleApiClient] Request successful', {
          url: url.substring(0, 30) + '***',
          status: response.status
        });
      }
      
      return response;
      
    } catch (error) {
      logger.error('❌ [SimpleApiClient] Request error', {
        url: url.substring(0, 50) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * GET request simplificado
   */
  static async get(url: string): Promise<Response> {
    return this.fetch(url, { method: 'GET' });
  }
  
  /**
   * POST request simplificado
   */
  static async post(url: string, data?: any): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }
}

export default SimpleApiClient;