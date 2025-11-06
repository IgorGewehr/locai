// app/api/admin/diagnose/route.ts
// API route para diagnosticar problemas de dados no admin

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
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

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // TEST 1: Verificar users collection
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(5)));
      diagnostics.tests.push({
        name: 'Users Collection',
        status: 'success',
        count: usersSnapshot.size,
        sample: usersSnapshot.docs.map(doc => ({
          id: doc.id,
          email: doc.data().email,
          idog: doc.data().idog || false
        }))
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Users Collection',
        status: 'error',
        error: error.message,
        code: error.code
      });
    }

    // TEST 2: Verificar tenants collection
    try {
      const tenantsSnapshot = await getDocs(query(collection(db, 'tenants'), limit(5)));
      const tenantData = [];

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        const subCollections: any = {};

        // Verificar sub-collections
        const collections = ['properties', 'reservations', 'clients', 'tickets', 'conversations'];

        for (const collectionName of collections) {
          try {
            const snapshot = await getDocs(
              query(collection(db, `tenants/${tenantId}/${collectionName}`), limit(1))
            );
            subCollections[collectionName] = snapshot.size;
          } catch (error: any) {
            subCollections[collectionName] = `Error: ${error.code}`;
          }
        }

        tenantData.push({
          id: tenantId,
          subCollections
        });
      }

      diagnostics.tests.push({
        name: 'Tenants Collection',
        status: 'success',
        count: tenantsSnapshot.size,
        tenants: tenantData
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Tenants Collection',
        status: 'error',
        error: error.message,
        code: error.code
      });
    }

    // TEST 3: Contar total de tickets
    try {
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      let totalTickets = 0;
      const ticketsByTenant: any = {};

      for (const tenantDoc of tenantsSnapshot.docs) {
        const tenantId = tenantDoc.id;
        try {
          const ticketsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/tickets`));
          const count = ticketsSnapshot.size;
          if (count > 0) {
            totalTickets += count;
            ticketsByTenant[tenantId] = count;
          }
        } catch (error: any) {
          ticketsByTenant[tenantId] = `Error: ${error.code}`;
        }
      }

      diagnostics.tests.push({
        name: 'Total Tickets',
        status: 'success',
        totalTickets,
        byTenant: ticketsByTenant
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Total Tickets',
        status: 'error',
        error: error.message,
        code: error.code
      });
    }

    // TEST 4: Verificar índices (tentando query complexa)
    try {
      await getDocs(
        query(
          collection(db, 'users'),
          where('idog', '==', true),
          limit(1)
        )
      );

      diagnostics.tests.push({
        name: 'Index Test (idog query)',
        status: 'success',
        message: 'Query com índice funcionou'
      });
    } catch (error: any) {
      const needsIndex = error.code === 9 || error.code === 'failed-precondition';

      diagnostics.tests.push({
        name: 'Index Test (idog query)',
        status: needsIndex ? 'needs_index' : 'error',
        error: error.message,
        code: error.code,
        indexLink: needsIndex ? error.message.match(/https?:\/\/[^\s]+/)?.[0] : null
      });
    }

    // TEST 5: Verificar dados do usuário admin atual
    try {
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('email', '==', user?.email), limit(1))
      );

      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        diagnostics.tests.push({
          name: 'Current Admin User',
          status: 'success',
          user: {
            id: userDoc.docs[0].id,
            email: userData.email,
            idog: userData.idog || false,
            name: userData.name || userData.displayName
          }
        });
      } else {
        diagnostics.tests.push({
          name: 'Current Admin User',
          status: 'warning',
          message: 'Usuário admin não encontrado no Firestore'
        });
      }
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'Current Admin User',
        status: 'error',
        error: error.message
      });
    }

    // Resumo
    const successCount = diagnostics.tests.filter((t: any) => t.status === 'success').length;
    const errorCount = diagnostics.tests.filter((t: any) => t.status === 'error').length;
    const warningCount = diagnostics.tests.filter((t: any) =>
      t.status === 'warning' || t.status === 'needs_index'
    ).length;

    diagnostics.summary = {
      total: diagnostics.tests.length,
      success: successCount,
      errors: errorCount,
      warnings: warningCount,
      overallStatus: errorCount > 0 ? 'issues_found' :
                     warningCount > 0 ? 'needs_attention' :
                     'healthy'
    };

    // Recomendações
    diagnostics.recommendations = [];

    if (diagnostics.tests.find((t: any) => t.name === 'Users Collection' && t.count === 0)) {
      diagnostics.recommendations.push({
        priority: 'high',
        message: 'Nenhum usuário encontrado. Crie usuários de teste.',
        action: 'create_users'
      });
    }

    if (diagnostics.tests.find((t: any) => t.name === 'Total Tickets' && t.totalTickets === 0)) {
      diagnostics.recommendations.push({
        priority: 'medium',
        message: 'Nenhum ticket encontrado. Crie tickets de teste.',
        action: 'create_tickets'
      });
    }

    const indexTest = diagnostics.tests.find((t: any) => t.name === 'Index Test (idog query)');
    if (indexTest && indexTest.status === 'needs_index') {
      diagnostics.recommendations.push({
        priority: 'high',
        message: 'Índice necessário para queries no Firebase',
        action: 'create_index',
        link: indexTest.indexLink
      });
    }

    logger.info('✅ [Admin Diagnose] Diagnóstico completo', {
      component: 'AdminDiagnose',
      adminId: user?.uid,
      summary: diagnostics.summary
    });

    return NextResponse.json({
      success: true,
      data: diagnostics
    });

  } catch (error) {
    logger.error('❌ [Admin Diagnose] Erro no diagnóstico', {
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'AdminDiagnose'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao executar diagnóstico',
        details: process.env.NODE_ENV === 'development'
          ? error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}
