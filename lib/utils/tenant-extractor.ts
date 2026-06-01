// lib/utils/tenant-extractor.ts
// Utilitário para extrair tenantId dinamicamente do usuário autenticado

import { NextRequest } from 'next/server';
import { validateFirebaseAuth, requireAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { TenantError, APIError } from '@/lib/utils/custom-error';

export interface TenantContext {
  tenantId: string;
  userId: string;
  userEmail: string;
  userRole: string;
}

/**
 * Extrai o tenantId dinamicamente do token de autenticação
 */
export async function extractTenantFromAuth(request: NextRequest): Promise<TenantContext | null> {
  try {
    // Validar token Firebase diretamente a partir do request
    // (validateFirebaseAuth lê o header Authorization/X-Firebase-Token internamente)
    const authContext = await validateFirebaseAuth(request);

    if (authContext.authenticated && authContext.tenantId && authContext.userId) {
      // Log reduzido - apenas em debug
      if (process.env.LOG_LEVEL === 'debug') {
        logger.info('✅ [TenantExtractor] Auth validada', {
          userId: authContext.userId.substring(0, 8) + '***'
        });
      }

      return {
        tenantId: authContext.tenantId,
        userId: authContext.userId,
        userEmail: authContext.email || '',
        userRole: authContext.role || 'user'
      };
    }

    logger.warn('⚠️ [TenantExtractor] Nenhum token válido encontrado');
    return null;

  } catch (error) {
    logger.error('❌ [TenantExtractor] Erro ao extrair tenantId', 
      error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Extrai tenantId do body da requisição (fallback para WhatsApp)
 */
export function extractTenantFromBody(body: any): string | null {
  try {
    // 1. Tentar do campo tenantId direto
    if (body.tenantId) {
      if (process.env.LOG_LEVEL === 'debug') {
        logger.info('✅ [TenantExtractor] TenantId extraído do body', {
          tenantId: body.tenantId
        });
      }
      return body.tenantId;
    }

    // 2. Tentar extrair do metadata
    if (body.metadata?.tenantId) {
      if (process.env.LOG_LEVEL === 'debug') {
        logger.info('✅ [TenantExtractor] TenantId extraído do metadata', {
          tenantId: body.metadata.tenantId
        });
      }
      return body.metadata.tenantId;
    }

    logger.warn('⚠️ [TenantExtractor] TenantId não encontrado no body');
    return null;

  } catch (error) {
    logger.error('❌ [TenantExtractor] Erro ao extrair tenantId do body', 
      error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Resolve tenantId de múltiplas fontes (prioridade: Auth > Body > Env)
 */
export async function resolveTenantId(request: NextRequest, body?: any): Promise<string | null> {
  try {
    // 1. Prioridade: Extrair da autenticação (dinâmico)
    const authContext = await extractTenantFromAuth(request);
    if (authContext) {
      return authContext.tenantId;
    }

    // 2. Fallback: Extrair do body (para APIs públicas como WhatsApp)
    if (body) {
      const bodyTenantId = extractTenantFromBody(body);
      if (bodyTenantId) {
        return bodyTenantId;
      }
    }

    // 3. NÃO usar fallback para "default" - forçar autenticação apropriada
    // Se chegou aqui, o usuário não está autenticado corretamente

    logger.error('❌ [TenantExtractor] Não foi possível resolver tenantId');
    return null;

  } catch (error) {
    logger.error('❌ [TenantExtractor] Erro ao resolver tenantId', 
      error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Middleware helper para exigir autenticação e extrair tenant
 */
export async function requireAuthAndTenant(request: NextRequest): Promise<
  { tenantContext: TenantContext; authResult: any } | { error: any }
> {
  try {
    // 1. Verificar autenticação (lança erro se não autenticado)
    const authResult = await requireAuth(request);

    // Garantir que o tenantId foi resolvido
    if (!authResult.tenantId || !authResult.userId) {
      return {
        error: {
          success: false,
          error: 'Tenant não encontrado para o usuário autenticado',
          code: 'TENANT_NOT_FOUND'
        }
      };
    }

    // 2. Extrair contexto do tenant
    const tenantContext: TenantContext = {
      tenantId: authResult.tenantId,
      userId: authResult.userId,
      userEmail: authResult.email || '',
      userRole: authResult.role || 'user'
    };

    if (process.env.LOG_LEVEL === 'debug') {
      logger.info('✅ [TenantExtractor] Autenticação e tenant validados', {
        tenantId: tenantContext.tenantId,
        userId: tenantContext.userId,
        role: tenantContext.userRole
      });
    }

    return { tenantContext, authResult };

  } catch (error) {
    logger.error('❌ [TenantExtractor] Erro na autenticação/tenant', 
      error instanceof Error ? error : new Error('Unknown error'));

    return { 
      error: {
        success: false,
        error: 'Erro interno de autenticação',
        code: 'AUTH_ERROR'
      }
    };
  }
}

/**
 * Resolver tenantId para webhook do WhatsApp baseado no telefone
 */
export async function resolveTenantFromPhone(phone: string): Promise<string | null> {
  try {
    logger.info('🔍 [TenantExtractor] Resolvendo tenant por telefone', {
      phone: phone.substring(0, 6) + '***'
    });

    // Usar o serviço de mapeamento robusto
    const { tenantPhoneMappingService } = await import('@/lib/services/tenant-phone-mapping-service');
    const tenantId = await tenantPhoneMappingService.resolveTenantFromClientPhone(phone);

    if (tenantId) {
      logger.info('✅ [TenantExtractor] Tenant resolvido por telefone', {
        tenantId,
        phone: phone.substring(0, 6) + '***'
      });
      return tenantId;
    }

    logger.error('❌ [TenantExtractor] Não foi possível resolver tenant por telefone', undefined, {
      phone: phone.substring(0, 6) + '***'
    });
    return null;

  } catch (error) {
    logger.error('❌ [TenantExtractor] Erro ao resolver tenant por telefone', 
      error instanceof Error ? error : new Error('Unknown error'), {
      phone: phone.substring(0, 6) + '***'
    });
    return null;
  }
}