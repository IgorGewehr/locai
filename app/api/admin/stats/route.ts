// app/api/admin/stats/route.ts
// Estatísticas agregadas de todos os tenants

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime para usar firebase-admin
export const runtime = 'nodejs';
import { verifyAdminAccess } from '@/lib/middleware/admin-auth';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
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
    
    logger.info('📊 [Admin API] Gerando estatísticas de todos os tenants', {
      component: 'Admin',
      adminId: user?.uid
    });
    
    // Buscar todos os tenants
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    const stats: any[] = [];
    
    // Para cada tenant, coletar estatísticas
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      try {
        let userCount = 0;
        let propertyCount = 0;
        let ticketCount = 0;
        let activeTickets = 0;
        let reservationCount = 0;
        let revenue = 0;
        
        // Contar usuários
        try {
          const usersSnapshot = await getDocs(collection(db, `tenants/${tenantId}/users`));
          userCount = usersSnapshot.size;
        } catch (err) {
          console.error('Erro ao contar usuários:', err);
        }
        
        // Contar propriedades
        try {
          const propertiesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/properties`));
          propertyCount = propertiesSnapshot.size;
        } catch (err) {
          console.error('Erro ao contar propriedades:', err);
        }
        
        // Contar tickets
        try {
          const ticketsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/tickets`));
          ticketCount = ticketsSnapshot.size;
          
          // Contar tickets ativos (abertos ou em progresso)
          activeTickets = ticketsSnapshot.docs.filter(doc => {
            const status = doc.data().status;
            return status === 'open' || status === 'in_progress';
          }).length;
        } catch (err) {
          console.error('Erro ao contar tickets:', err);
        }
        
        // Contar reservas
        try {
          const reservationsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/reservations`));
          reservationCount = reservationsSnapshot.size;
        } catch (err) {
          console.error('Erro ao contar reservas:', err);
        }
        
        // Calcular receita (soma de transactions)
        try {
          const transactionsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/transactions`));
          revenue = transactionsSnapshot.docs.reduce((total, doc) => {
            const transaction = doc.data();
            if (transaction.status === 'completed' && transaction.amount) {
              return total + (transaction.amount || 0);
            }
            return total;
          }, 0);
        } catch (err) {
          console.error('Erro ao calcular receita:', err);
        }
        
        // Calcular métricas adicionais
        const avgPropertiesPerUser = userCount > 0 ? (propertyCount / userCount).toFixed(1) : '0';
        const ticketResolutionRate = ticketCount > 0 ? 
          (((ticketCount - activeTickets) / ticketCount) * 100).toFixed(1) : '100';
        
        // Determinar nível de atividade
        let activityLevel = 'low';
        if (userCount >= 10 && propertyCount >= 20) activityLevel = 'high';
        else if (userCount >= 5 && propertyCount >= 10) activityLevel = 'medium';
        
        // Determinar status do tenant
        let tenantStatus = 'active';
        if (userCount === 0) tenantStatus = 'inactive';
        else if (activeTickets > 5) tenantStatus = 'attention';
        
        stats.push({
          tenantId,
          tenantName: tenantData.name || tenantData.companyName || tenantId,
          userCount,
          propertyCount,
          ticketCount,
          activeTickets,
          reservationCount,
          revenue,
          metrics: {
            avgPropertiesPerUser: parseFloat(avgPropertiesPerUser),
            ticketResolutionRate: parseFloat(ticketResolutionRate),
            revenuePerUser: userCount > 0 ? (revenue / userCount).toFixed(2) : '0',
            activityLevel,
            tenantStatus
          },
          lastUpdated: new Date().toISOString(),
          tenantInfo: {
            createdAt: tenantData.createdAt,
            plan: tenantData.plan || 'free',
            domain: tenantData.customDomain || null,
            features: tenantData.features || [],
            contacts: {
              email: tenantData.email || tenantData.contactEmail,
              phone: tenantData.phone || tenantData.contactPhone
            }
          }
        });
        
      } catch (error) {
        console.error(`Erro ao gerar stats do tenant ${tenantId}:`, error);
        
        // Adicionar tenant com dados básicos mesmo com erro
        stats.push({
          tenantId,
          tenantName: tenantData.name || tenantData.companyName || tenantId,
          userCount: 0,
          propertyCount: 0,
          ticketCount: 0,
          activeTickets: 0,
          reservationCount: 0,
          revenue: 0,
          metrics: {
            avgPropertiesPerUser: 0,
            ticketResolutionRate: 0,
            revenuePerUser: 0,
            activityLevel: 'error',
            tenantStatus: 'error'
          },
          error: 'Erro ao carregar dados',
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    // Ordenar por nível de atividade e número de usuários
    stats.sort((a, b) => {
      // Primeiro por status de erro
      if (a.metrics.activityLevel === 'error' && b.metrics.activityLevel !== 'error') return 1;
      if (b.metrics.activityLevel === 'error' && a.metrics.activityLevel !== 'error') return -1;
      
      // Depois por usuários (mais ativo primeiro)
      return b.userCount - a.userCount;
    });
    
    // Calcular totais globais
    const globalStats = {
      totalTenants: stats.length,
      totalUsers: stats.reduce((sum, s) => sum + s.userCount, 0),
      totalProperties: stats.reduce((sum, s) => sum + s.propertyCount, 0),
      totalTickets: stats.reduce((sum, s) => sum + s.ticketCount, 0),
      totalActiveTickets: stats.reduce((sum, s) => sum + s.activeTickets, 0),
      totalRevenue: stats.reduce((sum, s) => sum + s.revenue, 0),
      avgUsersPerTenant: stats.length > 0 ? 
        (stats.reduce((sum, s) => sum + s.userCount, 0) / stats.length).toFixed(1) : 0,
      tenantsWithIssues: stats.filter(s => s.activeTickets > 0).length
    };
    
    logger.info(`✅ [Admin API] Estatísticas geradas para ${stats.length} tenants`, {
      component: 'Admin',
      adminId: user?.uid,
      tenantCount: stats.length,
      globalStats
    });
    
    return NextResponse.json({
      success: true,
      stats,
      globalStats,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ [Admin API] Erro ao gerar estatísticas', error as Error, {
      component: 'Admin'
    });
    
    return NextResponse.json(
      { error: 'Erro ao gerar estatísticas' },
      { status: 500 }
    );
  }
}