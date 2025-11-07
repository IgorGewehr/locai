import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `analytics_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, period = '7d', includeHeatmap = true, includeTrends = true } = body;

    logger.info('📊 [GET-ANALYTICS-DASHBOARD] Iniciando consulta', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        period,
        includeHeatmap,
        includeTrends
      },
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [GET-ANALYTICS-DASHBOARD] TenantId não fornecido', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    // Validate period
    const validPeriods = ['24h', '7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      logger.warn('⚠️ [GET-ANALYTICS-DASHBOARD] Período inválido', { requestId, period });
      return NextResponse.json(
        {
          success: false,
          error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
          requestId
        },
        { status: 400 }
      );
    }

    // Call internal analytics API
    const analyticsResponse = await fetch(`${request.nextUrl.origin}/api/metrics/analytics?period=${period}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
      }
    });

    if (!analyticsResponse.ok) {
      throw new Error(`Analytics API returned ${analyticsResponse.status}`);
    }

    const analyticsResult = await analyticsResponse.json();
    const processingTime = Date.now() - startTime;

    if (!analyticsResult.success) {
      throw new Error(analyticsResult.error || 'Analytics API failed');
    }

    const analyticsData = analyticsResult.data;

    // Format data for Sofia (simplified structure)
    const sofiaFriendlyData = {
      summary: {
        totalConversations: analyticsData.engagement.totalConversations,
        conversionRate: Math.round(analyticsData.conversions.leadToVisit * 10) / 10,
        avgQualificationTime: Math.round(analyticsData.qualificationTimes.avg * 10) / 10,
        avgConversationTime: Math.round(analyticsData.avgConversationTime.avg * 10) / 10,
        responseRate: Math.round(analyticsData.engagement.responseRate * 10) / 10
      },
      trends: {
        conversions: {
          current: analyticsData.conversions.leadToVisit,
          change: analyticsData.conversions.change,
          trend: analyticsData.conversions.change > 0 ? 'up' : analyticsData.conversions.change < 0 ? 'down' : 'stable'
        },
        qualification: {
          current: analyticsData.qualificationTimes.avg,
          change: analyticsData.qualificationTimes.change,
          trend: analyticsData.qualificationTimes.change < 0 ? 'up' : analyticsData.qualificationTimes.change > 0 ? 'down' : 'stable'
        },
        engagement: {
          current: analyticsData.engagement.responseRate,
          change: analyticsData.engagement.change,
          trend: analyticsData.engagement.change > 0 ? 'up' : analyticsData.engagement.change < 0 ? 'down' : 'stable'
        }
      },
      insights: generateInsights(analyticsData),
      period,
      lastUpdate: new Date().toISOString()
    };

    // Include optional detailed data
    if (includeHeatmap && analyticsData.heatmap) {
      sofiaFriendlyData.heatmap = {
        peakHours: findPeakHours(analyticsData.heatmap),
        peakDays: findPeakDays(analyticsData.heatmap),
        totalData: analyticsData.heatmap.length
      };
    }

    if (includeTrends && analyticsData.trends) {
      sofiaFriendlyData.recentTrends = analyticsData.trends.slice(-3); // Last 3 days
    }

    logger.info('✅ [GET-ANALYTICS-DASHBOARD] Consulta concluída', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      results: {
        totalConversations: sofiaFriendlyData.summary.totalConversations,
        conversionRate: sofiaFriendlyData.summary.conversionRate,
        hasHeatmap: !!sofiaFriendlyData.heatmap,
        hasTrends: !!sofiaFriendlyData.recentTrends,
        insightsCount: sofiaFriendlyData.insights.length
      },
      performance: {
        processingTime: `${processingTime}ms`,
        period
      }
    });

    return NextResponse.json({
      success: true,
      data: sofiaFriendlyData,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        period,
        dataSource: 'conversation_metrics'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [GET-ANALYTICS-DASHBOARD] Erro na consulta', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get analytics dashboard',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

// Helper functions
function generateInsights(analyticsData: any): string[] {
  const insights: string[] = [];

  // Conversion insights
  if (analyticsData.conversions.change > 10) {
    insights.push(`🎉 Taxa de conversão aumentou ${analyticsData.conversions.change.toFixed(1)}% no período!`);
  } else if (analyticsData.conversions.change < -10) {
    insights.push(`⚠️ Taxa de conversão caiu ${Math.abs(analyticsData.conversions.change).toFixed(1)}% - revisar estratégia`);
  }

  // Qualification insights
  if (analyticsData.qualificationTimes.avg < 3) {
    insights.push(`⚡ Qualificação muito rápida! Média de ${analyticsData.qualificationTimes.avg.toFixed(1)} minutos`);
  } else if (analyticsData.qualificationTimes.avg > 10) {
    insights.push(`🐌 Qualificação lenta (${analyticsData.qualificationTimes.avg.toFixed(1)}min) - otimizar perguntas`);
  }

  // Engagement insights
  if (analyticsData.engagement.responseRate > 80) {
    insights.push(`💪 Excelente engajamento! ${analyticsData.engagement.responseRate.toFixed(1)}% de taxa de resposta`);
  } else if (analyticsData.engagement.responseRate < 50) {
    insights.push(`📱 Baixo engajamento (${analyticsData.engagement.responseRate.toFixed(1)}%) - revisar abordagem`);
  }

  // Volume insights
  if (analyticsData.engagement.totalConversations > 100) {
    insights.push(`📈 Alto volume: ${analyticsData.engagement.totalConversations} conversas no período`);
  } else if (analyticsData.engagement.totalConversations < 10) {
    insights.push(`📉 Baixo volume: apenas ${analyticsData.engagement.totalConversations} conversas no período`);
  }

  return insights.length > 0 ? insights : ['📊 Aguardando mais dados para gerar insights relevantes'];
}

function findPeakHours(heatmapData: any[]): string {
  const hourStats = heatmapData.reduce((acc, item) => {
    acc[item.hour] = (acc[item.hour] || 0) + item.conversations;
    return acc;
  }, {} as Record<number, number>);

  const peakHour = Object.entries(hourStats)
    .sort(([,a], [,b]) => b - a)[0];

  return `${peakHour[0]}h-${parseInt(peakHour[0]) + 1}h`;
}

function findPeakDays(heatmapData: any[]): string {
  const dayStats = heatmapData.reduce((acc, item) => {
    acc[item.day] = (acc[item.day] || 0) + item.conversations;
    return acc;
  }, {} as Record<string, number>);

  const peakDay = Object.entries(dayStats)
    .sort(([,a], [,b]) => b - a)[0];

  return peakDay[0];
}