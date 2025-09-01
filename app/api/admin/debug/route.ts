// app/api/admin/debug/route.ts
// Debug da estrutura do Firebase

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

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
    
    console.log('🔍 [Debug] Iniciando investigação da estrutura Firebase');
    
    const debug: any = {
      rootLevel: {},
      tenants: {},
      totalFound: {
        rootUsers: 0,
        tenantUsers: 0,
        rootTickets: 0,
        tenantTickets: 0
      }
    };
    
    // 1. Verificar usuários no root level (estrutura antiga)
    try {
      const rootUsersSnapshot = await getDocs(query(collection(db, 'users'), limit(10)));
      debug.rootLevel.users = {
        count: rootUsersSnapshot.docs.length,
        sample: rootUsersSnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name || doc.data().displayName
        }))
      };
      debug.totalFound.rootUsers = rootUsersSnapshot.docs.length;
      console.log(`📊 [Debug] Root users: ${rootUsersSnapshot.docs.length}`);
    } catch (error) {
      console.log('⚠️ [Debug] Erro ao buscar usuários root:', error);
      debug.rootLevel.users = { error: 'Collection não encontrada' };
    }
    
    // 2. Verificar tickets no root level (estrutura antiga)
    try {
      const rootTicketsSnapshot = await getDocs(query(collection(db, 'tickets'), limit(10)));
      debug.rootLevel.tickets = {
        count: rootTicketsSnapshot.docs.length,
        sample: rootTicketsSnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          subject: doc.data().subject,
          status: doc.data().status
        }))
      };
      debug.totalFound.rootTickets = rootTicketsSnapshot.docs.length;
      console.log(`📊 [Debug] Root tickets: ${rootTicketsSnapshot.docs.length}`);
    } catch (error) {
      console.log('⚠️ [Debug] Erro ao buscar tickets root:', error);
      debug.rootLevel.tickets = { error: 'Collection não encontrada' };
    }
    
    // 3. Verificar estrutura multi-tenant
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    console.log(`📊 [Debug] Tenants encontrados: ${tenantsSnapshot.docs.length}`);
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      debug.tenants[tenantId] = {
        name: tenantData.name || tenantData.companyName || 'sem nome',
        users: { count: 0, sample: [] },
        tickets: { count: 0, sample: [] },
        properties: { count: 0 }
      };
      
      // Verificar usuários do tenant
      try {
        const tenantUsersSnapshot = await getDocs(query(collection(db, `tenants/${tenantId}/users`), limit(10)));
        debug.tenants[tenantId].users = {
          count: tenantUsersSnapshot.docs.length,
          sample: tenantUsersSnapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            email: doc.data().email,
            name: doc.data().name || doc.data().displayName
          }))
        };
        debug.totalFound.tenantUsers += tenantUsersSnapshot.docs.length;
        console.log(`📊 [Debug] Tenant ${tenantId} users: ${tenantUsersSnapshot.docs.length}`);
      } catch (error) {
        console.log(`⚠️ [Debug] Erro ao buscar usuários do tenant ${tenantId}:`, error);
        debug.tenants[tenantId].users = { error: 'Erro na query' };
      }
      
      // Verificar tickets do tenant
      try {
        const tenantTicketsSnapshot = await getDocs(query(collection(db, `tenants/${tenantId}/tickets`), limit(10)));
        debug.tenants[tenantId].tickets = {
          count: tenantTicketsSnapshot.docs.length,
          sample: tenantTicketsSnapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            subject: doc.data().subject,
            status: doc.data().status
          }))
        };
        debug.totalFound.tenantTickets += tenantTicketsSnapshot.docs.length;
        console.log(`📊 [Debug] Tenant ${tenantId} tickets: ${tenantTicketsSnapshot.docs.length}`);
      } catch (error) {
        console.log(`⚠️ [Debug] Erro ao buscar tickets do tenant ${tenantId}:`, error);
        debug.tenants[tenantId].tickets = { error: 'Erro na query' };
      }
      
      // Verificar propriedades do tenant
      try {
        const tenantPropertiesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/properties`));
        debug.tenants[tenantId].properties = {
          count: tenantPropertiesSnapshot.docs.length
        };
        console.log(`📊 [Debug] Tenant ${tenantId} properties: ${tenantPropertiesSnapshot.docs.length}`);
      } catch (error) {
        console.log(`⚠️ [Debug] Erro ao buscar propriedades do tenant ${tenantId}:`, error);
        debug.tenants[tenantId].properties = { error: 'Erro na query' };
      }
    }
    
    console.log('✅ [Debug] Investigação concluída:', debug.totalFound);
    
    return NextResponse.json({
      success: true,
      debug,
      summary: debug.totalFound
    });
    
  } catch (error) {
    console.error('❌ [Debug] Erro na investigação:', error);
    
    return NextResponse.json(
      { error: 'Erro na investigação' },
      { status: 500 }
    );
  }
}