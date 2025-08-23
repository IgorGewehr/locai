import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';

interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Hook para fazer requisições autenticadas à API
 * Automaticamente adiciona o token Firebase ao header Authorization
 */
export function useApiClient() {
  const { getFirebaseToken } = useAuth();

  const apiCall = useCallback(async (
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<Response> => {
    const { requireAuth = true, ...fetchOptions } = options;
    
    // Preparar headers
    const headers = new Headers(fetchOptions.headers);
    
    // Adicionar Content-Type se não estiver presente
    if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    
    // Adicionar token Firebase se necessário
    if (requireAuth) {
      try {
        const token = await getFirebaseToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
          logger.debug('🔑 [ApiClient] Token Firebase adicionado ao request');
        } else {
          logger.warn('⚠️ [ApiClient] Nenhum token Firebase disponível');
        }
      } catch (error) {
        logger.error('❌ [ApiClient] Erro ao obter token Firebase', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Fazer a requisição
    return fetch(url, {
      ...fetchOptions,
      headers
    });
  }, [getFirebaseToken]);

  // Helpers para métodos HTTP comuns
  const get = useCallback((url: string, options?: ApiRequestOptions) => {
    return apiCall(url, { ...options, method: 'GET' });
  }, [apiCall]);

  const post = useCallback((url: string, body?: any, options?: ApiRequestOptions) => {
    return apiCall(url, {
      ...options,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }, [apiCall]);

  const put = useCallback((url: string, body?: any, options?: ApiRequestOptions) => {
    return apiCall(url, {
      ...options,
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }, [apiCall]);

  const del = useCallback((url: string, options?: ApiRequestOptions) => {
    return apiCall(url, { ...options, method: 'DELETE' });
  }, [apiCall]);

  return {
    apiCall,
    get,
    post,
    put,
    delete: del
  };
}

/**
 * Exemplo de uso:
 * 
 * const { get, post } = useApiClient();
 * 
 * // Buscar propriedades (autenticado)
 * const response = await get('/api/properties');
 * 
 * // Criar propriedade (autenticado)
 * const response = await post('/api/properties', { name: 'Casa Nova' });
 * 
 * // Fazer chamada sem autenticação
 * const response = await get('/api/public/data', { requireAuth: false });
 */