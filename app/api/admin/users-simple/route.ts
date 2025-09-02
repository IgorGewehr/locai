// app/api/admin/users-simple/route.ts
// Lista APENAS usuários da estrutura root de forma otimizada

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Verificar acesso admin
    const { isAdmin, user } = await verifyAdminAccess(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }
    
    logger.info('👥 [Admin API] Buscando lista simplificada de usuários', {
      component: 'Admin',
      adminId: user?.uid
    });
    
    // Buscar TODOS os usuários da estrutura root
    const usersRef = collection(db, 'users');
    let usersSnapshot;
    
    try {
      // Tentar com ordenação
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
      usersSnapshot = await getDocs(usersQuery);
    } catch (error) {
      // Se falhar, buscar sem ordenação
      logger.warn('⚠️ [Admin] Buscando sem ordenação', error as Error);
      usersSnapshot = await getDocs(usersRef);
    }
    
    logger.info(`📊 [Admin] Total de usuários encontrados: ${usersSnapshot.docs.length}`, {
      component: 'Admin'
    });
    
    // Mapear usuários com informações essenciais
    const users = usersSnapshot.docs.map(userDoc => {
      const userData = userDoc.data();
      
      // Determinar plano baseado no campo free
      const plan = userData.free === 7 ? 'Free (7 dias)' : 
                   userData.free === 1 ? 'Free (1 dia)' : 
                   userData.plan || 'Pro';
      
      // Determinar status
      const status = userData.disabled ? 'Desativado' : 
                    userData.isActive === false ? 'Inativo' : 
                    'Ativo';
      
      return {
        id: userDoc.id,
        email: userData.email || '',
        name: userData.name || userData.displayName || userData.fullName || 'Sem nome',
        plan,
        status,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin || userData.lastAccess,
        phoneNumber: userData.phoneNumber || userData.phone || '',
        emailVerified: userData.emailVerified || false,
        role: userData.role || 'user',
        idog: userData.idog === true, // Super admin flag
        companyName: userData.companyName || '',
        // Campos extras úteis
        authProvider: userData.authProvider || userData.provider || 'email',
        whatsappNumbers: userData.whatsappNumbers || []
      };
    });
    
    // Ordenar por data de criação (mais recentes primeiro)
    users.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Estatísticas rápidas
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'Ativo').length,
      inactive: users.filter(u => u.status === 'Inativo').length,
      disabled: users.filter(u => u.status === 'Desativado').length,
      free: users.filter(u => u.plan.includes('Free')).length,
      pro: users.filter(u => u.plan === 'Pro').length,
      verified: users.filter(u => u.emailVerified).length,
      admins: users.filter(u => u.role === 'admin').length,
      superAdmins: users.filter(u => u.idog).length
    };
    
    logger.info(`✅ [Admin API] Lista de usuários carregada`, {
      component: 'Admin',
      adminId: user?.uid,
      stats
    });
    
    return NextResponse.json({
      success: true,
      users,
      stats,
      userIds: users.map(u => u.id) // Lista de IDs para processar tickets
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro ao buscar usuários', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}