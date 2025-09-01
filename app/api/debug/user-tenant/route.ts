// app/api/debug/user-tenant/route.ts
// Debug para verificar tenantId de um usuário específico

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
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }
    
    logger.info('🔍 [Debug] Analisando usuário e tenantId', {
      component: 'DebugUserTenant',
      userId
    });
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      userId,
      userInfo: {},
      tenantsFound: [],
      ticketsByLocation: {
        root: [],
        tenants: {}
      }
    };
    
    // 1. Verificar usuário na coleção /users
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
          plan: userData.free === 7 ? 'Free' : 'Pro',
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        };
      } else {
        debugInfo.userInfo.rootUser = { exists: false };
      }
    } catch (error) {
      debugInfo.userInfo.rootUserError = (error as Error).message;
    }
    
    // 2. Buscar em quais tenants o usuário existe
    try {
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      
      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const tenantData = tenantDoc.data();
        
        try {
          const userInTenantDoc = await getDoc(doc(db, `tenants/${tenantId}/users`, userId));
          if (userInTenantDoc.exists()) {
            const userData = userInTenantDoc.data();
            debugInfo.tenantsFound.push({
              tenantId,
              tenantName: tenantData.name || tenantData.companyName,
              userData: {
                email: userData.email,
                name: userData.name || userData.displayName,
                role: userData.role,
                createdAt: userData.createdAt
              }
            });
          }
        } catch (error) {
          // Ignorar erros
        }
      }
    } catch (error) {
      debugInfo.tenantsError = (error as Error).message;
    }
    
    // 3. Buscar tickets do usuário na raiz
    try {
      const rootTicketsSnapshot = await getDocs(collection(db, 'tickets'));
      for (const ticketDoc of rootTicketsSnapshot.docs) {
        const data = ticketDoc.data();
        if (data.userId === userId) {
          debugInfo.ticketsByLocation.root.push({
            id: ticketDoc.id,
            subject: data.subject,
            status: data.status,
            tenantId: data.tenantId || 'none',
            createdAt: data.createdAt
          });
        }
      }
    } catch (error) {
      debugInfo.ticketsByLocation.rootError = (error as Error).message;
    }
    
    // 4. Buscar tickets do usuário em cada tenant
    for (const tenantInfo of debugInfo.tenantsFound) {
      const tenantId = tenantInfo.tenantId;
      debugInfo.ticketsByLocation.tenants[tenantId] = [];
      
      try {
        const tenantTicketsSnapshot = await getDocs(
          collection(db, `tenants/${tenantId}/tickets`)
        );
        
        for (const ticketDoc of tenantTicketsSnapshot.docs) {
          const data = ticketDoc.data();
          if (data.userId === userId) {
            debugInfo.ticketsByLocation.tenants[tenantId].push({
              id: ticketDoc.id,
              subject: data.subject,
              status: data.status,
              createdAt: data.createdAt
            });
          }
        }
      } catch (error) {
        debugInfo.ticketsByLocation.tenants[tenantId + '_error'] = (error as Error).message;
      }
    }
    
    // 5. Resumo e recomendações
    const totalTicketsInRoot = debugInfo.ticketsByLocation.root.length;
    const totalTicketsInTenants = Object.values(debugInfo.ticketsByLocation.tenants)
      .filter(tickets => Array.isArray(tickets))
      .reduce((sum: number, tickets: any) => sum + tickets.length, 0);
    
    debugInfo.summary = {
      userExistsInRoot: debugInfo.userInfo.rootUser?.exists || false,
      userTenantId: debugInfo.userInfo.rootUser?.tenantId || null,
      userFoundInTenants: debugInfo.tenantsFound.length,
      totalTicketsInRoot,
      totalTicketsInTenants,
      totalTickets: totalTicketsInRoot + totalTicketsInTenants,
      recommendations: []
    };
    
    // Análise e recomendações
    if (debugInfo.summary.totalTickets === 0) {
      debugInfo.summary.recommendations.push('❌ Nenhum ticket encontrado para este usuário');
    }
    
    if (totalTicketsInRoot > 0 && debugInfo.userInfo.rootUser?.tenantId) {
      debugInfo.summary.recommendations.push(
        `⚠️ ${totalTicketsInRoot} ticket(s) na raiz mas usuário tem tenantId: ${debugInfo.userInfo.rootUser.tenantId}`
      );
    }
    
    if (debugInfo.summary.userFoundInTenants === 0 && debugInfo.userInfo.rootUser?.tenantId) {
      debugInfo.summary.recommendations.push(
        `⚠️ Usuário tem tenantId mas não foi encontrado no tenant: ${debugInfo.userInfo.rootUser.tenantId}`
      );
    }
    
    if (debugInfo.summary.userFoundInTenants > 1) {
      debugInfo.summary.recommendations.push(
        `⚠️ Usuário encontrado em ${debugInfo.summary.userFoundInTenants} tenants (possível duplicação)`
      );
    }
    
    logger.info('📊 [Debug] Análise de usuário concluída', {
      component: 'DebugUserTenant',
      userId,
      summary: debugInfo.summary
    });
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    logger.error('❌ [Debug] Erro na análise de usuário', error as Error, {
      component: 'DebugUserTenant'
    });
    
    return NextResponse.json(
      { error: 'Erro na análise', details: (error as Error).message },
      { status: 500 }
    );
  }
}