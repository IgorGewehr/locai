// app/api/admin/tickets/route.ts
// Lista todos os tickets de todos os tenants

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
    
    logger.info('📋 [Admin API] Buscando tickets de todos os tenants', {
      component: 'Admin',
      adminId: user?.uid
    });
    
    // Buscar todos os tenants
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    
    // Log total de tenants
    logger.info(`🏢 [Admin Debug] Total de tenants encontrados: ${tenantsSnapshot.docs.length}`, {
        component: 'Admin'
    });
    const allTickets: any[] = [];
    
    // PRIMEIRO: Tentar buscar tickets na estrutura antiga (root level)
    try {
      const rootTicketsSnapshot = await getDocs(collection(db, 'tickets'));
      logger.info(`📊 [Admin Debug] Estrutura antiga: ${rootTicketsSnapshot.docs.length} tickets encontrados`, {
        component: 'Admin'
      });
      
      // Log detalhado de cada ticket encontrado
      rootTicketsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        logger.info(`   🎫 Ticket na raiz: ${doc.id}`, {
          userId: data.userId,
          userName: data.userName,
          tenantId: data.tenantId,
          subject: data.subject
        });
      });
      
      for (const ticketDoc of rootTicketsSnapshot.docs) {
        const ticketData = ticketDoc.data();
        
        // Buscar respostas do ticket na estrutura antiga
        let responses: any[] = [];
        try {
          const responsesRef = collection(db, `tickets/${ticketDoc.id}/responses`);
          const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
          responses = responsesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (err) {
          // Ignorar erro de respostas
        }
        
        // Mapear ticket da estrutura antiga para formato admin
        allTickets.push({
          id: ticketDoc.id,
          tenantId: ticketData.tenantId || 'root', // Usar tenantId se existir
          tenantName: 'Sistema Principal',
          userName: ticketData.userName || 'Usuário',
          userEmail: ticketData.userEmail || '',
          userId: ticketData.userId,
          userPlan: 'Pro', // Default para tickets antigos
          subject: ticketData.subject || 'Sem assunto',
          description: ticketData.description || '',
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || 'general',
          createdAt: ticketData.createdAt,
          updatedAt: ticketData.updatedAt,
          responses,
          metadata: {
            ...ticketData.metadata,
            isLegacyTicket: true
          }
        });
      }
    } catch (error) {
      logger.info('⚠️ [Admin Debug] Nenhum ticket encontrado na estrutura antiga', {
        component: 'Admin',
        error: (error as Error).message
      });
    }
    
    // Para cada tenant, buscar seus tickets
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      logger.info(`🔍 [Admin Debug] Processando tickets do tenant: ${tenantId}`, {
        component: 'Admin',
        tenantId,
        tenantName: tenantData.name || tenantData.companyName || 'sem nome'
      });
      
      // TAMBÉM buscar tickets que tenham tenantId mas estejam na raiz
      // (estrutura de transição)
      try {
        const rootTicketsWithTenantQuery = query(
          collection(db, 'tickets'),
          // Não podemos usar where com Firestore client SDK sem índice
          // então vamos filtrar depois
        );
        const rootTicketsWithTenant = await getDocs(rootTicketsWithTenantQuery);
        
        for (const doc of rootTicketsWithTenant.docs) {
          const data = doc.data();
          if (data.tenantId === tenantId) {
            // Este ticket pertence a este tenant mas está na raiz
            let responses: any[] = [];
            try {
              const responsesRef = collection(db, `tickets/${doc.id}/responses`);
              const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
              responses = responsesSnapshot.docs.map(respDoc => ({
                id: respDoc.id,
                ...respDoc.data()
              }));
            } catch (err) {
              // Ignorar erro
            }
            
            allTickets.push({
              id: doc.id,
              tenantId,
              tenantName: tenantData.name || tenantData.companyName || tenantId,
              userName: data.userName || 'Usuário',
              userEmail: data.userEmail || '',
              userId: data.userId,
              userPlan: 'Pro',
              subject: data.subject || 'Sem assunto',
              description: data.description || '',
              status: data.status || 'open',
              priority: data.priority || 'medium',
              category: data.category || 'general',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              responses,
              metadata: {
                ...data.metadata,
                isTransitionTicket: true
              }
            });
          }
        }
      } catch (error) {
        logger.warn(`Erro ao buscar tickets de transição para tenant ${tenantId}`, error as Error);
      }
      
      try {
        // Buscar tickets do tenant na estrutura nova
        const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
        let ticketsSnapshot;
        
        try {
          // Tentar com orderBy primeiro, mas sem limit para pegar todos
          const ticketsQuery = query(ticketsRef, orderBy('createdAt', 'desc'));
          ticketsSnapshot = await getDocs(ticketsQuery);
        } catch (orderError) {
          logger.warn(`⚠️ Erro com orderBy para tenant ${tenantId}, tentando sem ordenação`, orderError as Error, {
            component: 'Admin',
            tenantId
          });
          // Se falhar, buscar sem orderBy
          ticketsSnapshot = await getDocs(ticketsRef);
        }
        
        logger.info(`📊 [Admin Debug] Tenant ${tenantId}: ${ticketsSnapshot.docs.length} tickets encontrados`, {
          component: 'Admin',
          tenantId,
          ticketCount: ticketsSnapshot.docs.length
        });
        
        // Log detalhado de cada ticket do tenant
        ticketsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          logger.info(`   🎫 Ticket do tenant: ${doc.id}`, {
            userId: data.userId,
            userName: data.userName,
            subject: data.subject,
            status: data.status,
            tenantId: data.tenantId
          });
        });
        
        // Buscar informações dos usuários para cada ticket
        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticketData = ticketDoc.data();
          
          // Buscar dados do usuário que criou o ticket
          let userData = null;
          let userPlan = 'Pro'; // Default
          
          if (ticketData.userId) {
            try {
              // Buscar no tenant
              const userRef = collection(db, `tenants/${tenantId}/users`);
              const userSnapshot = await getDocs(userRef);
              const userDoc = userSnapshot.docs.find(doc => doc.id === ticketData.userId);
              if (userDoc) {
                userData = userDoc.data();
              }
              
              // Buscar informações do plano no root
              try {
                const rootUserRef = collection(db, 'users');
                const rootUserSnapshot = await getDocs(rootUserRef);
                const rootUserDoc = rootUserSnapshot.docs.find(doc => doc.id === ticketData.userId);
                if (rootUserDoc) {
                  const rootUserData = rootUserDoc.data();
                  if (rootUserData.free === 7) {
                    userPlan = 'Free';
                  }
                }
              } catch (rootErr) {
                logger.warn(`Não foi possível verificar plano do usuário ${ticketData.userId} no root`, rootErr as Error);
              }
            } catch (err) {
              logger.error('Erro ao buscar usuário:', err as Error, {
                component: 'Admin',
                tenantId,
                userId: ticketData.userId
              });
            }
          }
          
          // Buscar respostas do ticket
          let responses: any[] = [];
          try {
            const responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketDoc.id}/responses`);
            const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
            responses = responsesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
          } catch (err) {
            logger.error('Erro ao buscar respostas do ticket:', err as Error, {
              component: 'Admin',
              tenantId,
              ticketId: ticketDoc.id
            });
          }
          
          allTickets.push({
            id: ticketDoc.id,
            tenantId,
            tenantName: tenantData.name || tenantData.companyName || tenantId,
            userName: userData?.name || ticketData.userName || 'Usuário',
            userEmail: userData?.email || ticketData.userEmail || '',
            userId: ticketData.userId,
            userPlan: userPlan,
            subject: ticketData.subject || 'Sem assunto',
            description: ticketData.description || '',
            status: ticketData.status || 'open',
            priority: ticketData.priority || 'medium',
            category: ticketData.category || 'general',
            createdAt: ticketData.createdAt,
            updatedAt: ticketData.updatedAt,
            responses,
            metadata: ticketData.metadata || {}
          });
        }
      } catch (error) {
        logger.error(`Erro ao buscar tickets do tenant ${tenantId}:`, error as Error, {
          component: 'Admin',
          tenantId
        });
      }
    }
    
    // Ordenar tickets por data de criação (mais recentes primeiro)
    allTickets.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Log detalhado do resultado final
    const ticketsByLocation = {
      root: allTickets.filter(t => t.metadata?.isLegacyTicket).length,
      transition: allTickets.filter(t => t.metadata?.isTransitionTicket).length,
      tenants: allTickets.filter(t => !t.metadata?.isLegacyTicket && !t.metadata?.isTransitionTicket).length
    };
    
    logger.info(`✅ [Admin API] ${allTickets.length} tickets encontrados`, {
      component: 'Admin',
      adminId: user?.uid,
      ticketCount: allTickets.length,
      breakdown: ticketsByLocation,
      userIds: [...new Set(allTickets.map(t => t.userId))]
    });
    
    return NextResponse.json({
      success: true,
      tickets: allTickets,
      total: allTickets.length
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro ao buscar tickets', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao buscar tickets' },
      { status: 500 }
    );
  }
}