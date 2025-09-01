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
      
      // Primeiro, vamos mapear os usuários e depois contar propriedades
      const legacyUsers = [];
      for (const userDoc of rootUsersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Verificar se é conta Free (free == 7)
        const isFreeAccount = userData.free === 7;
        let plan = 'Pro'; // Default é Pro
        if (isFreeAccount) {
          plan = 'Free';
        }
        
        // Tentar identificar o tenant do usuário através de algum campo
        let actualTenantId = 'root';
        let actualTenantName = 'Sistema Antigo';
        
        // Se o userId corresponder ao tenantId (padrão do sistema)
        if (tenantsSnapshot.docs.some(t => t.id === userDoc.id)) {
          actualTenantId = userDoc.id;
          const tenantDoc = tenantsSnapshot.docs.find(t => t.id === userDoc.id);
          const tenantData = tenantDoc?.data();
          actualTenantName = tenantData?.name || tenantData?.companyName || userDoc.id;
        }
        
        legacyUsers.push({
          id: userDoc.id,
          tenantId: actualTenantId,
          tenantName: actualTenantName,
          email: userData.email || '',
          name: userData.name || userData.displayName || 'Usuário',
          phoneNumber: userData.phoneNumber || userData.phone || '',
          plan: plan, // Usar a lógica correta de Free
          status: userData.disabled ? 'suspended' : 'active',
          propertyCount: 0, // Será calculado agora
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
      
      // Agora contar propriedades para cada usuário legacy
      for (const user of legacyUsers) {
        if (user.tenantId !== 'root') {
          try {
            const propertiesRef = collection(db, `tenants/${user.tenantId}/properties`);
            const propertiesSnapshot = await getDocs(propertiesRef);
            user.propertyCount = propertiesSnapshot.docs.length;
            logger.info(`📊 [Admin Debug] Usuário ${user.name} (${user.tenantId}): ${user.propertyCount} propriedades`, {
              component: 'Admin',
              userId: user.id,
              tenantId: user.tenantId,
              propertyCount: user.propertyCount
            });
          } catch (err) {
            logger.error(`Erro ao contar propriedades para usuário ${user.id}:`, err as Error, {
              component: 'Admin',
              userId: user.id,
              tenantId: user.tenantId
            });
          }
        }
      }
      
      // Adicionar usuários legacy à lista
      allUsers.push(...legacyUsers);
    } catch (error) {
      logger.info('⚠️ [Admin Debug] Nenhum usuário encontrado na estrutura antiga', {
        component: 'Admin'
      });
    }
    
    // Para cada tenant, buscar seus usuários
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      logger.info(`🔍 [Admin Debug] Processando tenant: ${tenantId}`, {
        component: 'Admin',
        tenantId,
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
          logger.warn(`⚠️ Erro com orderBy para tenant ${tenantId}, tentando sem ordenação`, orderError as Error, {
            component: 'Admin',
            tenantId
          });
          // Se falhar, buscar sem orderBy
          usersSnapshot = await getDocs(usersRef);
        }
        
        logger.info(`📊 [Admin Debug] Tenant ${tenantId}: ${usersSnapshot.docs.length} usuários encontrados`, {
          component: 'Admin',
          tenantId,
          userCount: usersSnapshot.docs.length
        });
        
        // Buscar contagem de propriedades para cada usuário
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          // Verificar se é conta Free no root (free == 7)
          let plan = 'Pro'; // Default é Pro para novos usuários
          try {
            const rootUserRef = collection(db, 'users');
            const rootUserSnapshot = await getDocs(rootUserRef);
            const rootUserDoc = rootUserSnapshot.docs.find(doc => doc.id === userDoc.id);
            if (rootUserDoc) {
              const rootUserData = rootUserDoc.data();
              if (rootUserData.free === 7) {
                plan = 'Free';
              }
            }
          } catch (err) {
            logger.warn(`Não foi possível verificar plano do usuário ${userDoc.id} no root`, err as Error, {
              component: 'Admin',
              userId: userDoc.id
            });
          }
          
          let propertyCount = 0;
          try {
            const propertiesRef = collection(db, `tenants/${tenantId}/properties`);
            const propertiesSnapshot = await getDocs(propertiesRef);
            
            // Contar propriedades criadas pelo usuário específico
            propertyCount = propertiesSnapshot.docs.filter(doc => {
              const propData = doc.data();
              return propData.userId === userDoc.id || propData.createdBy === userDoc.id;
            }).length;
            
            // Se não encontrou propriedades específicas do usuário,
            // e é o único usuário do tenant, contar todas as propriedades
            if (propertyCount === 0 && usersSnapshot.docs.length === 1) {
              propertyCount = propertiesSnapshot.docs.length;
            }
            
            logger.info(`📊 [Admin Debug] Usuário ${userData.name || userDoc.id} do tenant ${tenantId}: ${propertyCount} propriedades`, {
              component: 'Admin',
              userId: userDoc.id,
              tenantId,
              propertyCount,
              plan
            });
          } catch (err) {
            logger.error('Erro ao contar propriedades:', err as Error, {
              component: 'Admin',
              userId: userDoc.id,
              tenantId
            });
          }
          
          // Determinar status do usuário
          let status = 'active';
          if (userData.disabled) status = 'suspended';
          else if (userData.inactive) status = 'inactive';
          
          // O plano já foi determinado acima com base no free == 7
          
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
        logger.error(`Erro ao buscar usuários do tenant ${tenantId}:`, error as Error, {
          component: 'Admin',
          tenantId
        });
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
        freeUsers: allUsers.filter(u => u.plan === 'Free').length,
        proUsers: allUsers.filter(u => u.plan !== 'Free').length
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