// app/api/admin/tenant-tickets/route.ts
// Busca tickets de um tenant específico

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
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
    
    // Pegar tenantId da query
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      );
    }
    
    logger.info(`🎫 [Admin API] Buscando tickets do tenant ${tenantId}`, {
      component: 'Admin',
      adminId: user?.uid,
      tenantId
    });
    
    // Buscar informações do usuário/tenant
    let userInfo = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', tenantId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userInfo = {
          id: tenantId,
          email: userData.email,
          name: userData.name || userData.displayName || 'Usuário',
          plan: userData.free === 7 ? 'Free' : 'Pro',
          createdAt: userData.createdAt,
          phoneNumber: userData.phoneNumber || userData.phone
        };
      }
    } catch (error) {
      logger.warn(`⚠️ [Admin] Não foi possível buscar info do usuário ${tenantId}`, error as Error);
    }
    
    const tickets: any[] = [];
    
    // Buscar tickets na estrutura multi-tenant
    try {
      const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
      let ticketsSnapshot;
      
      try {
        // Tentar com ordenação
        const ticketsQuery = query(ticketsRef, orderBy('createdAt', 'desc'));
        ticketsSnapshot = await getDocs(ticketsQuery);
      } catch (error) {
        // Se falhar, buscar sem ordenação
        logger.warn(`⚠️ [Admin] Buscando tickets sem ordenação para tenant ${tenantId}`, error as Error);
        ticketsSnapshot = await getDocs(ticketsRef);
      }
      
      logger.info(`📊 [Admin] Tenant ${tenantId}: ${ticketsSnapshot.docs.length} tickets encontrados`, {
        component: 'Admin',
        tenantId,
        ticketCount: ticketsSnapshot.docs.length
      });
      
      // Processar cada ticket
      for (const ticketDoc of ticketsSnapshot.docs) {
        const ticketData = ticketDoc.data();
        
        // Buscar respostas do ticket
        let responses: any[] = [];
        let responseCount = 0;
        let lastResponseAt = null;
        
        try {
          const responsesRef = collection(db, `tenants/${tenantId}/tickets/${ticketDoc.id}/responses`);
          const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
          
          responses = responsesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          responseCount = responses.length;
          
          if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            lastResponseAt = lastResponse.createdAt;
          }
        } catch (err) {
          // Ignorar erro de respostas
        }
        
        tickets.push({
          id: ticketDoc.id,
          tenantId,
          userId: ticketData.userId || tenantId,
          userName: ticketData.userName || userInfo?.name || 'Usuário',
          userEmail: ticketData.userEmail || userInfo?.email || '',
          userPlan: userInfo?.plan || 'Pro',
          subject: ticketData.subject || 'Sem assunto',
          description: ticketData.description || ticketData.content || '',
          status: ticketData.status || 'open',
          priority: ticketData.priority || 'medium',
          category: ticketData.category || ticketData.type || 'general',
          createdAt: ticketData.createdAt,
          updatedAt: ticketData.updatedAt || ticketData.createdAt,
          responseCount,
          lastResponseAt,
          responses,
          hasUnreadAdminResponses: ticketData.hasUnreadAdminResponses || false,
          hasUnreadUserResponses: ticketData.hasUnreadUserResponses || false
        });
      }
    } catch (error) {
      // Tenant não tem tickets ou erro ao acessar
      logger.info(`⚠️ [Admin] Tenant ${tenantId} não tem tickets ou erro ao acessar`, {
        component: 'Admin',
        tenantId,
        error: (error as Error).message
      });
    }
    
    // Também verificar tickets na estrutura antiga com este tenantId
    try {
      const rootTicketsRef = collection(db, 'tickets');
      const rootTicketsSnapshot = await getDocs(rootTicketsRef);
      
      for (const ticketDoc of rootTicketsSnapshot.docs) {
        const ticketData = ticketDoc.data();
        
        // Verificar se pertence a este tenant
        if (ticketData.tenantId === tenantId || ticketData.userId === tenantId) {
          // Buscar respostas
          let responses: any[] = [];
          let responseCount = 0;
          
          try {
            const responsesRef = collection(db, `tickets/${ticketDoc.id}/responses`);
            const responsesSnapshot = await getDocs(query(responsesRef, orderBy('createdAt', 'asc')));
            responses = responsesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            responseCount = responses.length;
          } catch (err) {
            // Ignorar erro
          }
          
          tickets.push({
            id: ticketDoc.id,
            tenantId,
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
            responseCount,
            responses,
            isLegacyTicket: true
          });
        }
      }
    } catch (error) {
      logger.warn(`⚠️ [Admin] Erro ao buscar tickets legacy para tenant ${tenantId}`, error as Error);
    }
    
    // Ordenar tickets por data de criação (mais recentes primeiro)
    tickets.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Estatísticas
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      withResponses: tickets.filter(t => t.responseCount > 0).length,
      legacy: tickets.filter(t => t.isLegacyTicket).length
    };
    
    logger.info(`✅ [Admin API] Tickets do tenant ${tenantId} carregados`, {
      component: 'Admin',
      adminId: user?.uid,
      tenantId,
      stats
    });
    
    return NextResponse.json({
      success: true,
      userInfo,
      tickets,
      stats
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro ao buscar tickets do tenant', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao buscar tickets' },
      { status: 500 }
    );
  }
}