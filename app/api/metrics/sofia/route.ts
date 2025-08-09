// app/api/metrics/sofia/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sofiaAnalytics } from '@/lib/services/sofia-analytics-service';
import { getAnalytics } from '@/lib/services/analytics-service';
import { logger } from '@/lib/utils/logger';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Obter tenantId do header ou query param
    const tenantId = request.headers.get('x-tenant-id') || 
                     request.nextUrl.searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Obter período da query
    const period = request.nextUrl.searchParams.get('period') || 'daily';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '7');
    
    // Buscar métricas em paralelo
    const [
      realTimeMetrics,
      aggregatedMetrics,
      businessInsights,
      monthlyAnalytics,
      weeklyAnalytics
    ] = await Promise.all([
      sofiaAnalytics.getRealTimeMetrics(tenantId),
      sofiaAnalytics.getAggregatedMetrics(tenantId, period as any, limit),
      sofiaAnalytics.getBusinessInsights(tenantId, limit),
      getAnalytics(tenantId, {
        period: {
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date())
        }
      }),
      getAnalytics(tenantId, {
        period: {
          startDate: startOfWeek(new Date()),
          endDate: endOfWeek(new Date())
        }
      })
    ]);

    // Calcular métricas adicionais
    const totalConversations = aggregatedMetrics.reduce(
      (sum, m) => sum + m.totalConversations, 
      0
    );
    
    const avgConversionRate = aggregatedMetrics.length > 0
      ? aggregatedMetrics.reduce((sum, m) => sum + m.overallConversionRate, 0) / aggregatedMetrics.length
      : 0;
    
    const totalMessages = aggregatedMetrics.reduce(
      (sum, m) => sum + m.totalMessages, 
      0
    );

    // Compilar resposta
    const response = {
      success: true,
      tenantId,
      timestamp: new Date().toISOString(),
      metrics: {
        realTime: {
          ...realTimeMetrics,
          status: 'operational'
        },
        summary: {
          totalConversations,
          avgConversionRate: Math.round(avgConversionRate * 10) / 10,
          totalMessages,
          periodDays: limit
        },
        monthly: {
          revenue: monthlyAnalytics.totalRevenue,
          netRevenue: monthlyAnalytics.netRevenue,
          occupancyRate: monthlyAnalytics.occupancyRate,
          adr: monthlyAnalytics.adr,
          mrr: monthlyAnalytics.mrr,
          conversions: monthlyAnalytics.totalReservations
        },
        weekly: {
          revenue: weeklyAnalytics.totalRevenue,
          occupancyRate: weeklyAnalytics.occupancyRate,
          conversions: weeklyAnalytics.totalReservations
        },
        aggregated: aggregatedMetrics,
        insights: businessInsights,
        performance: {
          avgResponseTime: realTimeMetrics.avgResponseTime,
          errorRate: aggregatedMetrics[0]?.errorRate || 0,
          uptime: 99.9 // Placeholder - could be calculated from monitoring
        }
      }
    };

    logger.info('📊 [API] Sofia metrics fetched', {
      tenantId,
      period,
      limit,
      conversationsToday: realTimeMetrics.todayConversations
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('❌ [API] Error fetching Sofia metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}