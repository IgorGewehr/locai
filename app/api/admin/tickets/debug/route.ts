// app/api/admin/tickets/debug/route.ts
// API de debug para verificar estrutura de tickets

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    logger.info('🔍 [Admin Debug] Iniciando busca debug de tickets', {
      component: 'AdminDebug',
      adminId: user?.uid,
      searchingForUserId: userId
    });
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      searchedUserId: userId,
      structures: {
        root: {
          path: '/tickets',
          tickets: [],
          count: 0
        },
        tenants: {}
      }
    };
    
    // 1. Buscar tickets na raiz
    try {
      const rootTicketsSnapshot = await getDocs(collection(db, 'tickets'));
      debugInfo.structures.root.count = rootTicketsSnapshot.docs.length;
      
      for (const ticketDoc of rootTicketsSnapshot.docs) {
        const data = ticketDoc.data();
        const ticketInfo = {
          id: ticketDoc.id,
          userId: data.userId,
          userName: data.userName,
          tenantId: data.tenantId || 'none',
          subject: data.subject,
          status: data.status,
          createdAt: data.createdAt,
          matchesSearch: userId ? data.userId === userId : false
        };
        
        debugInfo.structures.root.tickets.push(ticketInfo);
        
        if (userId && data.userId === userId) {
          logger.info('✅ [Debug] Ticket encontrado na raiz!', {
            ticketId: ticketDoc.id,
            userId: data.userId
          });
        }
      }
    } catch (error) {
      debugInfo.structures.root.error = (error as Error).message;
    }
    
    // 2. Buscar todos os tenants e seus tickets
    try {
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const tenantData = tenantDoc.data();
        
        debugInfo.structures.tenants[tenantId] = {
          name: tenantData.name || tenantData.companyName,
          path: `/tenants/${tenantId}/tickets`,
          tickets: [],
          count: 0
        };
        
        try {
          const tenantTicketsSnapshot = await getDocs(
            collection(db, `tenants/${tenantId}/tickets`)
          );
          
          debugInfo.structures.tenants[tenantId].count = tenantTicketsSnapshot.docs.length;
          
          for (const ticketDoc of tenantTicketsSnapshot.docs) {
            const data = ticketDoc.data();
            const ticketInfo = {
              id: ticketDoc.id,
              userId: data.userId,
              userName: data.userName,
              subject: data.subject,
              status: data.status,
              createdAt: data.createdAt,
              matchesSearch: userId ? data.userId === userId : false
            };
            
            debugInfo.structures.tenants[tenantId].tickets.push(ticketInfo);
            
            if (userId && data.userId === userId) {
              logger.info('✅ [Debug] Ticket encontrado no tenant!', {
                ticketId: ticketDoc.id,
                userId: data.userId,
                tenantId
              });
            }
          }
        } catch (error) {
          debugInfo.structures.tenants[tenantId].error = (error as Error).message;
        }
      }
    } catch (error) {
      debugInfo.tenantsError = (error as Error).message;
    }
    
    // 3. Se foi fornecido um userId, buscar informações do usuário
    if (userId) {
      debugInfo.userInfo = {};
      
      // Buscar na coleção users raiz
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          debugInfo.userInfo.rootUser = {
            exists: true,
            email: userData.email,
            name: userData.name || userData.displayName,
            tenantId: userData.tenantId,
            free: userData.free,
            plan: userData.free === 7 ? 'Free' : 'Pro'
          };
        } else {
          debugInfo.userInfo.rootUser = { exists: false };
        }
      } catch (error) {
        debugInfo.userInfo.rootUserError = (error as Error).message;
      }
      
      // Buscar em cada tenant
      for (const tenantId of Object.keys(debugInfo.structures.tenants)) {
        try {
          const userDoc = await getDoc(doc(db, `tenants/${tenantId}/users`, userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            debugInfo.userInfo[`tenant_${tenantId}`] = {
              exists: true,
              email: userData.email,
              name: userData.name || userData.displayName
            };
          }
        } catch (error) {
          // Ignorar erro
        }
      }
    }
    
    // 4. Resumo
    debugInfo.summary = {
      totalTicketsInRoot: debugInfo.structures.root.count,
      totalTicketsInTenants: Object.values(debugInfo.structures.tenants).reduce(
        (sum: number, tenant: any) => sum + (tenant.count || 0), 
        0
      ),
      totalTicketsOverall: 0,
      ticketsMatchingSearch: userId ? [] : null
    };
    
    debugInfo.summary.totalTicketsOverall = 
      debugInfo.summary.totalTicketsInRoot + 
      debugInfo.summary.totalTicketsInTenants;
    
    if (userId) {
      // Coletar todos os tickets que correspondem
      const matchingTickets = [];
      
      // Da raiz
      for (const ticket of debugInfo.structures.root.tickets) {
        if (ticket.matchesSearch) {
          matchingTickets.push({
            ...ticket,
            location: 'root'
          });
        }
      }
      
      // Dos tenants
      for (const [tenantId, tenantData] of Object.entries(debugInfo.structures.tenants)) {
        for (const ticket of (tenantData as any).tickets) {
          if (ticket.matchesSearch) {
            matchingTickets.push({
              ...ticket,
              location: `tenant:${tenantId}`
            });
          }
        }
      }
      
      debugInfo.summary.ticketsMatchingSearch = matchingTickets;
    }
    
    logger.info('📊 [Admin Debug] Busca debug concluída', {
      component: 'AdminDebug',
      summary: debugInfo.summary
    });
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    logger.error('❌ [Admin Debug] Erro na busca debug', error as Error, {
      component: 'AdminDebug'
    });
    
    return NextResponse.json(
      { error: 'Erro na busca debug', details: (error as Error).message },
      { status: 500 }
    );
  }
}