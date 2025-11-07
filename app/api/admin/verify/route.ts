// app/api/admin/verify/route.ts
// Verificação de acesso admin

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, user, error } = await verifyAdminAccess(request);
    
    if (!isAdmin) {
      logger.warn('🚫 [Admin API] Acesso negado', {
        component: 'Security',
        error,
        ip: request.ip
      });
      
      return NextResponse.json(
        { isAdmin: false, error: error || 'Acesso negado' },
        { status: 403 }
      );
    }
    
    logger.info('✅ [Admin API] Acesso verificado', {
      component: 'Security',
      userId: user?.uid,
      email: user?.email
    });
    
    return NextResponse.json({
      isAdmin: true,
      user: {
        uid: user?.uid,
        email: user?.email,
        name: user?.name
      }
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro na verificação', error as Error, {
      component: 'Security'
    });
    
    return NextResponse.json(
      { error: 'Erro na verificação', isAdmin: false },
      { status: 500 }
    );
  }
}