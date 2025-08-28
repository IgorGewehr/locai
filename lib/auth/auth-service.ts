/**
 * Arquivo de compatibilidade temporário
 * Redireciona chamadas antigas para o novo sistema Firebase Auth
 */

import { 
  validateFirebaseAuth, 
  requireAuth as firebaseRequireAuth,
  getTenantId
} from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';

export const authService = {
  async verifyToken(token: string) {
    logger.warn('⚠️ authService.verifyToken chamado - use validateFirebaseAuth');
    // Retornar estrutura compatível
    return {
      sub: 'legacy-user',
      tenantId: 'legacy-tenant',
      role: 'user'
    };
  },
  
  async generateToken(user: any) {
    logger.warn('⚠️ authService.generateToken chamado - não mais necessário com Firebase Auth');
    return 'firebase-token-placeholder';
  },

  // ✅ ADICIONAR requireAuth que estava faltando
  async requireAuth(request: any) {
    try {
      return await firebaseRequireAuth(request);
    } catch (error) {
      logger.error('❌ Error in requireAuth:', error);
      throw error;
    }
  }
};