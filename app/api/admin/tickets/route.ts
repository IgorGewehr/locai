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
    const allTickets: any[] = [];
    
    // Para cada tenant, buscar seus tickets
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      try {
        // Buscar tickets do tenant
        const ticketsRef = collection(db, `tenants/${tenantId}/tickets`);
        const ticketsQuery = query(ticketsRef, orderBy('createdAt', 'desc'), limit(100));
        const ticketsSnapshot = await getDocs(ticketsQuery);
        
        // Buscar informações dos usuários para cada ticket
        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticketData = ticketDoc.data();
          
          // Buscar dados do usuário que criou o ticket
          let userData = null;
          if (ticketData.userId) {
            try {
              const userRef = collection(db, `tenants/${tenantId}/users`);
              const userSnapshot = await getDocs(userRef);
              const userDoc = userSnapshot.docs.find(doc => doc.id === ticketData.userId);
              if (userDoc) {
                userData = userDoc.data();
              }
            } catch (err) {
              console.error('Erro ao buscar usuário:', err);
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
            console.error('Erro ao buscar respostas:', err);
          }
          
          allTickets.push({
            id: ticketDoc.id,
            tenantId,
            tenantName: tenantData.name || tenantData.companyName || tenantId,
            userName: userData?.name || ticketData.userName || 'Usuário',
            userEmail: userData?.email || ticketData.userEmail || '',
            userId: ticketData.userId,
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
        console.error(`Erro ao buscar tickets do tenant ${tenantId}:`, error);
      }
    }
    
    // Ordenar tickets por data de criação (mais recentes primeiro)
    allTickets.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    logger.info(`✅ [Admin API] ${allTickets.length} tickets encontrados`, {
      component: 'Admin',
      adminId: user?.uid,
      ticketCount: allTickets.length
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