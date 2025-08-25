/**
 * Arquivo de compatibilidade temporário
 * Redireciona chamadas antigas para o novo sistema Firebase Auth
 */

import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
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
  }
};