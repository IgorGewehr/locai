// app/api/admin/users/route.ts
// Lista todos os usuários de todos os tenants

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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
    
    logger.info('👥 [Admin API] Buscando usuários de todos os tenants', {
      component: 'Admin',
      adminId: user?.uid
    });
    
    // Buscar todos os tenants
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    const allUsers: any[] = [];
    
    // PRIMEIRO: Tentar buscar usuários na estrutura antiga (root level)
    try {
      const rootUsersSnapshot = await getDocs(collection(db, 'users'));
      logger.info(`📊 [Admin Debug] Estrutura antiga: ${rootUsersSnapshot.docs.length} usuários encontrados`, {
        component: 'Admin'
      });
      
      for (const userDoc of rootUsersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Mapear usuário da estrutura antiga para formato admin
        allUsers.push({
          id: userDoc.id,
          tenantId: 'root', // Marcar como estrutura antiga
          tenantName: 'Sistema Antigo',
          email: userData.email || '',
          name: userData.name || userData.displayName || 'Usuário',
          phoneNumber: userData.phoneNumber || userData.phone || '',
          plan: userData.plan || 'Free',
          status: userData.disabled ? 'suspended' : 'active',
          propertyCount: 0, // Será calculado depois
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin || userData.lastAccess,
          metadata: {
            emailVerified: userData.emailVerified || false,
            provider: userData.provider || 'email',
            role: userData.role || 'user',
            lastIP: userData.lastIP || '',
            totalLogins: userData.totalLogins || 0,
            isLegacyUser: true
          }
        });
      }
    } catch (error) {
      logger.info('⚠️ [Admin Debug] Nenhum usuário encontrado na estrutura antiga', {
        component: 'Admin'
      });
    }
    
    // Para cada tenant, buscar seus usuários
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      console.log(`🔍 [Admin Debug] Processando tenant: ${tenantId}`, {
        tenantName: tenantData.name || tenantData.companyName || 'sem nome'
      });
      
      try {
        // Buscar usuários do tenant
        const usersRef = collection(db, `tenants/${tenantId}/users`);
        let usersSnapshot;
        
        try {
          // Tentar com orderBy primeiro
          const usersQuery = query(usersRef, orderBy('createdAt', 'desc'), limit(100));
          usersSnapshot = await getDocs(usersQuery);
        } catch (orderError) {
          console.log(`⚠️ Erro com orderBy para tenant ${tenantId}, tentando sem ordenação:`, orderError);
          // Se falhar, buscar sem orderBy
          usersSnapshot = await getDocs(usersRef);
        }
        
        console.log(`📊 [Admin Debug] Tenant ${tenantId}: ${usersSnapshot.docs.length} usuários encontrados`);
        
        // Buscar contagem de propriedades para cada usuário
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          let propertyCount = 0;
          try {
            const propertiesRef = collection(db, `tenants/${tenantId}/properties`);
            const propertiesSnapshot = await getDocs(propertiesRef);
            // Contar propriedades do usuário (se tiver filtro por owner)
            propertyCount = propertiesSnapshot.docs.filter(doc => {
              const prop = doc.data();
              return prop.ownerId === userDoc.id || prop.userId === userDoc.id;
            }).length;
            
            // Se não tiver filtro específico, contar todas as propriedades do tenant
            if (propertyCount === 0) {
              propertyCount = propertiesSnapshot.docs.length;
            }
          } catch (err) {
            console.error('Erro ao contar propriedades:', err);
          }
          
          // Determinar status do usuário
          let status = 'active';
          if (userData.disabled) status = 'suspended';
          else if (userData.inactive) status = 'inactive';
          
          // Determinar plano (se existir)
          let plan = userData.plan || userData.subscription?.plan || 'Free';
          
          allUsers.push({
            id: userDoc.id,
            tenantId,
            tenantName: tenantData.name || tenantData.companyName || tenantId,
            email: userData.email || '',
            name: userData.name || userData.displayName || 'Usuário',
            phoneNumber: userData.phoneNumber || userData.phone || '',
            plan,
            status,
            propertyCount,
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin || userData.lastAccess,
            metadata: {
              emailVerified: userData.emailVerified || false,
              provider: userData.provider || 'email',
              role: userData.role || 'user',
              lastIP: userData.lastIP || '',
              totalLogins: userData.totalLogins || 0
            }
          });
        }
      } catch (error) {
        console.error(`Erro ao buscar usuários do tenant ${tenantId}:`, error);
      }
    }
    
    // Ordenar usuários por data de criação (mais recentes primeiro)
    allUsers.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    logger.info(`✅ [Admin API] ${allUsers.length} usuários encontrados`, {
      component: 'Admin',
      adminId: user?.uid,
      userCount: allUsers.length
    });
    
    return NextResponse.json({
      success: true,
      users: allUsers,
      total: allUsers.length,
      stats: {
        activeUsers: allUsers.filter(u => u.status === 'active').length,
        suspendedUsers: allUsers.filter(u => u.status === 'suspended').length,
        inactiveUsers: allUsers.filter(u => u.status === 'inactive').length,
        paidUsers: allUsers.filter(u => u.plan !== 'Free').length
      }
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