// lib/utils/emergency-auth.ts
// Sistema de autenticação de emergência quando Firebase está com quota exceeded

import { NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Sistema de autenticação de emergência para contornar problemas de quota do Firebase
 * Usa validação baseada em sessão local e fallbacks
 */
export class EmergencyAuth {
  private static readonly EMERGENCY_API_KEY = 'emergency-locai-auth-key-2025';
  private static readonly EMERGENCY_TENANT_ID = 'default-tenant-emergency';
  
  /**
   * Verificar se requisição tem credenciais de emergência
   */
  static isEmergencyAuth(request: NextRequest): boolean {
    const emergencyHeader = request.headers.get('x-emergency-auth');
    const userAgent = request.headers.get('user-agent');
    
    // Verificar se é uma requisição interna do próprio sistema
    const isInternalRequest = userAgent?.includes('LocAI') || 
                             request.headers.get('x-internal-request') === 'true';
    
    return emergencyHeader === this.EMERGENCY_API_KEY || isInternalRequest;
  }
  
  /**
   * Autenticação de emergência para endpoints críticos
   */
  static authenticateEmergency(request: NextRequest): { 
    success: boolean; 
    user?: { id: string; tenantId: string; email: string; role: string }; 
    reason?: string;
  } {
    try {
      // Verificar headers de emergência
      if (this.isEmergencyAuth(request)) {
        logger.info('🚨 [Emergency Auth] Using emergency authentication', {
          path: request.nextUrl.pathname,
          userAgent: request.headers.get('user-agent')?.substring(0, 50),
          reason: 'firebase_quota_exceeded'
        });
        
        return {
          success: true,
          user: {
            id: 'emergency-user',
            tenantId: this.EMERGENCY_TENANT_ID,
            email: 'emergency@locai.app',
            role: 'admin'
          }
        };
      }
      
      // Verificar se é uma requisição do microservice WhatsApp
      const referer = request.headers.get('referer');
      const origin = request.headers.get('origin');
      
      if (request.nextUrl.pathname.includes('/api/whatsapp/') && 
          (referer?.includes('localhost') || origin?.includes('localhost'))) {
        
        logger.info('🔗 [Emergency Auth] WhatsApp microservice authentication', {
          path: request.nextUrl.pathname,
          referer: referer?.substring(0, 50),
          reason: 'microservice_integration'
        });
        
        return {
          success: true,
          user: {
            id: 'microservice-user',
            tenantId: this.EMERGENCY_TENANT_ID,
            email: 'microservice@locai.app',
            role: 'service'
          }
        };
      }
      
      return { success: false, reason: 'no_emergency_credentials' };
      
    } catch (error) {
      logger.error('❌ [Emergency Auth] Authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { success: false, reason: 'authentication_error' };
    }
  }
  
  /**
   * Verificar se Firebase está com problemas de quota
   */
  static async isFirebaseQuotaExceeded(): Promise<boolean> {
    try {
      // Simples check baseado em tentativas recentes que falharam
      const quotaCheckKey = 'firebase_quota_check';
      const lastCheck = globalThis[quotaCheckKey as any] as number || 0;
      const now = Date.now();
      
      // Se a última verificação foi há menos de 5 minutos e falhou, assume quota exceeded
      if (now - lastCheck < 5 * 60 * 1000) {
        return true;
      }
      
      return false;
      
    } catch (error) {
      return true; // Em caso de erro, assume que há problemas
    }
  }
  
  /**
   * Marcar Firebase como problemático
   */
  static markFirebaseAsProblematic(): void {
    const quotaCheckKey = 'firebase_quota_check';
    globalThis[quotaCheckKey as any] = Date.now();
    
    logger.warn('⚠️ [Emergency Auth] Firebase marked as problematic - using emergency auth', {
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Headers para requisições de emergência
   */
  static getEmergencyHeaders(): HeadersInit {
    return {
      'x-emergency-auth': this.EMERGENCY_API_KEY,
      'x-internal-request': 'true',
      'user-agent': 'LocAI-Emergency-Client/1.0'
    };
  }
}

export default EmergencyAuth;