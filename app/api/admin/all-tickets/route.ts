// app/api/admin/all-tickets/route.ts
// Lista TODOS os tickets usando a estrutura users -> tenants/tickets

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { logger } from '@/lib/utils/logger';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  plan: 'Free' | 'Pro';
  createdAt: any;
  lastLogin?: any;
  isActive: boolean;
}

interface TicketInfo {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPlan: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: any;
  updatedAt: any;
  responses?: any[];
}

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
    
    logger.info('🎫 [Admin API] Iniciando busca otimizada de tickets', {
      component: 'Admin',
      adminId: user?.uid
    });
    
    // PASSO 1: Buscar TODOS os usuários da estrutura root
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers: UserInfo[] = [];
    const userIdList: string[] = [];
    
    logger.info(`👥 [Admin] Total de usuários encontrados: ${usersSnapshot.docs.length}`, {
      component: 'Admin'
    });
    
    // Mapear usuários e criar lista de IDs
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Adicionar à lista de IDs
      userIdList.push(userId);
      
      // Determinar plano
      const plan = userData.free === 7 ? 'Free' : 'Pro';
      
      // Determinar se está ativo
      const isActive = !userData.disabled && userData.isActive !== false;
      
      allUsers.push({
        id: userId,
        email: userData.email || '',
        name: userData.name || userData.displayName || userData.fullName || 'Usuário',
        plan,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin || userData.lastAccess,
        isActive
      });
    });
    
    logger.info(`📋 [Admin] Processando tickets para ${userIdList.length} usuários`, {
      component: 'Admin',
      totalUsers: userIdList.length
    });
    
    // PASSO 2: Para cada userId, buscar tickets em tenants/{userId}/tickets
    const allTickets: TicketInfo[] = [];
    let tenantsWithTickets = 0;
    let totalTicketsFound = 0;
    
    for (const userId of userIdList) {
      try {
        // Tentar acessar a coleção de tickets do tenant
        const ticketsRef = collection(db, `tenants/${userId}/tickets`);
        const ticketsSnapshot = await getDocs(ticketsRef);
        
        if (ticketsSnapshot.docs.length > 0) {
          tenantsWithTickets++;
          totalTicketsFound += ticketsSnapshot.docs.length;
          
          // Buscar informações do usuário
          const userInfo = allUsers.find(u => u.id === userId);
          
          logger.info(`   ✅ Tenant ${userId}: ${ticketsSnapshot.docs.length} tickets encontrados`, {
            component: 'Admin',
            tenantId: userId,
            ticketCount: ticketsSnapshot.docs.length,
            userName: userInfo?.name,
            userEmail: userInfo?.email
          });
          
          // Processar cada ticket
          for (const ticketDoc of ticketsSnapshot.docs) {
            const ticketData = ticketDoc.data();
            
            // Buscar respostas do ticket
            let responses: any[] = [];
            try {
              const responsesRef = collection(db, `tenants/${userId}/tickets/${ticketDoc.id}/responses`);
              const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
              responses = responsesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  // ✅ Normalizar campos para compatibilidade
                  content: data.content || data.message || '',
                  message: data.content || data.message || '',  // Manter ambos
                  isAdmin: data.isAdmin !== undefined ? data.isAdmin : data.authorRole === 'admin'
                };
              });
            } catch (err) {
              // Ignorar erro de respostas (pode não ter índice ou não ter respostas)
            }
            
            const ticketWithTenant = {
              id: ticketDoc.id,
              tenantId: userId, // IMPORTANTE: incluir tenantId (userId = tenantId)
              tenantName: userInfo?.name || 'Usuário',
              userId: ticketData.userId || userId,
              userName: ticketData.userName || userInfo?.name || 'Usuário',
              userEmail: ticketData.userEmail || userInfo?.email || '',
              userPlan: userInfo?.plan || 'Pro',
              subject: ticketData.subject || 'Sem assunto',
              description: ticketData.description || ticketData.content || '',
              status: ticketData.status || 'open',
              priority: ticketData.priority || 'medium',
              category: ticketData.category || 'general',
              createdAt: ticketData.createdAt,
              updatedAt: ticketData.updatedAt || ticketData.createdAt,
              responses,
              metadata: ticketData.metadata || {}
            };
            
            logger.info(`   🎫 Ticket adicionado: ${ticketDoc.id}`, {
              component: 'Admin',
              ticketId: ticketDoc.id,
              tenantId: userId,
              subject: ticketWithTenant.subject,
              hasTenantId: !!ticketWithTenant.tenantId
            });
            
            allTickets.push(ticketWithTenant);
          }
        }
      } catch (error) {
        // Tenant não tem coleção de tickets (normal para usuários que nunca criaram tickets)
        // Não logar como erro, apenas continuar
      }
    }
    
    // PASSO 3: Também buscar tickets na estrutura antiga (root level) para compatibilidade
    try {
      const rootTicketsSnapshot = await getDocs(collection(db, 'tickets'));
      logger.info(`📊 [Admin] Estrutura antiga: ${rootTicketsSnapshot.docs.length} tickets encontrados`, {
        component: 'Admin'
      });
      
      for (const ticketDoc of rootTicketsSnapshot.docs) {
        const ticketData = ticketDoc.data();
        
        // Buscar informações do usuário que criou o ticket
        const userInfo = allUsers.find(u => u.id === ticketData.userId);
        
        // Buscar respostas
        let responses: any[] = [];
        try {
          const responsesRef = collection(db, `tickets/${ticketDoc.id}/responses`);
          const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
          responses = responsesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // ✅ Normalizar campos para compatibilidade
              content: data.content || data.message || '',
              message: data.content || data.message || '',  // Manter ambos
              isAdmin: data.isAdmin !== undefined ? data.isAdmin : data.authorRole === 'admin'
            };
          });
        } catch (err) {
          // Ignorar erro
        }
        
        allTickets.push({
          id: ticketDoc.id,
          tenantId: ticketData.tenantId || ticketData.userId || 'root', // Para tickets antigos
          tenantName: userInfo?.name || 'Sistema Antigo',
          userId: ticketData.userId,
          userName: ticketData.userName || userInfo?.name || 'Usuário',
          userEmail: ticketData.userEmail || userInfo?.email || '',
          userPlan: userInfo?.plan || 'Pro',
          subject: ticketData.subject || 'Sem assunto',
          description: ticketData.description || '',
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || 'general',
          createdAt: ticketData.createdAt,
          updatedAt: ticketData.updatedAt || ticketData.createdAt,
          responses,
          metadata: {
            ...ticketData.metadata,
            isLegacyTicket: true
          }
        });
      }
    } catch (error) {
      logger.info('⚠️ [Admin] Nenhum ticket encontrado na estrutura antiga', {
        component: 'Admin'
      });
    }
    
    // Ordenar tickets por data de atualização (mais recentes primeiro)
    allTickets.sort((a, b) => {
      const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt || a.createdAt || 0);
      const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt || b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Estatísticas finais
    const ticketsWithTenantId = allTickets.filter(t => t.tenantId).length;
    const ticketsWithoutTenantId = allTickets.length - ticketsWithTenantId;
    
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.isActive).length,
      freeUsers: allUsers.filter(u => u.plan === 'Free').length,
      proUsers: allUsers.filter(u => u.plan === 'Pro').length,
      tenantsWithTickets,
      totalTickets: allTickets.length,
      ticketsWithTenantId,
      ticketsWithoutTenantId,
      openTickets: allTickets.filter(t => t.status === 'open').length,
      inProgressTickets: allTickets.filter(t => t.status === 'in_progress').length,
      resolvedTickets: allTickets.filter(t => t.status === 'resolved').length,
      closedTickets: allTickets.filter(t => t.status === 'closed').length
    };
    
    logger.info(`✅ [Admin API] Busca completa finalizada`, {
      component: 'Admin',
      totalTickets: allTickets.length,
      ticketsWithTenantId,
      ticketsWithoutTenantId,
      tenantsProcessed: userIdList.length,
      tenantsWithTickets
    });
    
    // Log adicional para debug do tenantId
    if (ticketsWithoutTenantId > 0) {
      logger.warn(`⚠️ [Admin API] ${ticketsWithoutTenantId} tickets sem tenantId!`, {
        component: 'Admin',
        ticketsWithoutTenantId: allTickets.filter(t => !t.tenantId).map(t => ({ id: t.id, userId: t.userId }))
      });
    } else {
      logger.info('✅ [Admin API] Todos os tickets têm tenantId', {
        component: 'Admin',
        adminId: user?.uid,
        stats
      });
    }
    
    return NextResponse.json({
      success: true,
      users: allUsers,
      tickets: allTickets,
      stats
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro na busca otimizada', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}