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
    
    logger.info('👥 [Admin API] Nova implementação: usando estrutura users/{userId}', {
      component: 'Admin',
      adminId: user?.uid
    });
    
    const allUsers: any[] = [];
    
    // NOVA ABORDAGEM: Usar a collection users/{userId} como base
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    logger.info(`📊 [Admin Debug] Encontrados ${usersSnapshot.docs.length} usuários na estrutura users/`, {
      component: 'Admin',
      userCount: usersSnapshot.docs.length
    });
    
    // Lista temporária de userIds para processar
    const userIdsList: string[] = [];
    const usersDataMap: { [key: string]: any } = {};
    
    // Primeiro passo: mapear todos os usuários
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      userIdsList.push(userId);
      usersDataMap[userId] = {
        id: userId,
        email: userData.email || '',
        name: userData.name || userData.displayName || 'Usuário',
        phoneNumber: userData.phoneNumber || userData.phone || '',
        plan: userData.free === 7 ? 'Free' : 'Pro', // Lógica correta do plano
        status: userData.disabled ? 'suspended' : 'active',
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt ? new Date(userData.createdAt) : new Date(),
        lastLogin: userData.lastLogin?.toDate ? userData.lastLogin.toDate() : userData.lastLogin ? new Date(userData.lastLogin) : userData.lastAccess ? new Date(userData.lastAccess) : null,
        propertyCount: 0, // Será calculado
        newTicketsCount: 0, // Será calculado
        totalTicketsCount: 0, // Será calculado
        metadata: {
          emailVerified: userData.emailVerified || false,
          provider: userData.provider || 'email',
          role: userData.role || 'user',
          lastIP: userData.lastIP || '',
          totalLogins: userData.totalLogins || 0,
          isLegacyUser: true
        }
      };
    });
    
    logger.info(`📋 [Admin Debug] Lista temporária criada com ${userIdsList.length} userIds`, {
      component: 'Admin',
      userIds: userIdsList.slice(0, 5), // Mostrar apenas os 5 primeiros
      totalUsers: userIdsList.length
    });
    
    // Segundo passo: processar cada userId (tenantId = userId)
    let processedCount = 0;
    
    for (const userId of userIdsList) {
      processedCount++;
      const tenantId = userId; // tenantId é igual ao userId
      
      logger.info(`🔄 [Admin Debug] Processando usuário ${processedCount}/${userIdsList.length}: ${userId}`, {
        component: 'Admin',
        userId,
        tenantId
      });
      
      // Buscar propriedades em tenants/{tenantId}/properties
      try {
        const propertiesRef = collection(db, `tenants/${tenantId}/properties`);
        const propertiesSnapshot = await getDocs(propertiesRef);
        
        const propertyCount = propertiesSnapshot.docs.length;
        usersDataMap[userId].propertyCount = propertyCount;
        
        if (propertyCount > 0) {
          logger.info(`🏠 [Admin Debug] Usuário ${usersDataMap[userId].name}: ${propertyCount} propriedades`, {
            component: 'Admin',
            userId,
            tenantId,
            propertyCount,
            userName: usersDataMap[userId].name
          });
        }
      } catch (propertiesError) {
        // Se não existe a collection de propriedades, o usuário fica com 0
        logger.info(`📝 [Admin Debug] Usuário ${usersDataMap[userId].name}: sem collection de propriedades`, {
          component: 'Admin',
          userId,
          tenantId,
          userName: usersDataMap[userId].name
        });
        usersDataMap[userId].propertyCount = 0;
      }
      
      // Buscar tickets em tenants/{tenantId}/tickets
      try {
        const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
        const ticketsSnapshot = await getDocs(ticketsRef);
        
        const totalTicketsCount = ticketsSnapshot.docs.length;
        usersDataMap[userId].totalTicketsCount = totalTicketsCount;
        
        // Contar tickets novos (status 'open' ou criados nos últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const newTicketsCount = ticketsSnapshot.docs.filter(doc => {
          const ticketData = doc.data();
          const createdAt = ticketData.createdAt?.toDate?.() || new Date(ticketData.createdAt || 0);
          return ticketData.status === 'open' || createdAt > sevenDaysAgo;
        }).length;
        
        usersDataMap[userId].newTicketsCount = newTicketsCount;
        
        if (totalTicketsCount > 0) {
          logger.info(`🎫 [Admin Debug] Usuário ${usersDataMap[userId].name}: ${totalTicketsCount} tickets (${newTicketsCount} novos)`, {
            component: 'Admin',
            userId,
            tenantId,
            totalTicketsCount,
            newTicketsCount,
            userName: usersDataMap[userId].name
          });
        }
      } catch (ticketsError) {
        // Se não existe a collection de tickets, o usuário fica com 0
        logger.info(`📝 [Admin Debug] Usuário ${usersDataMap[userId].name}: sem collection de tickets`, {
          component: 'Admin',
          userId,
          tenantId,
          userName: usersDataMap[userId].name
        });
        usersDataMap[userId].totalTicketsCount = 0;
        usersDataMap[userId].newTicketsCount = 0;
      }
      
      // Adicionar tenantId e tenantName ao usuário
      usersDataMap[userId].tenantId = tenantId;
      usersDataMap[userId].tenantName = usersDataMap[userId].name; // Nome da empresa = nome do usuário
    }
    
    // Converter o map em array
    Object.values(usersDataMap).forEach(userData => {
      allUsers.push(userData);
    });
    
    logger.info(`✅ [Admin Debug] Processamento concluído: ${processedCount} usuários processados`, {
      component: 'Admin',
      totalProcessed: processedCount,
      totalInArray: allUsers.length,
      usersWithProperties: allUsers.filter(u => u.propertyCount > 0).length,
      usersWithTickets: allUsers.filter(u => u.totalTicketsCount > 0).length
    });
    
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