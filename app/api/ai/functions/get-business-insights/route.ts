import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `insights_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const {
      tenantId,
      insightType = 'all', // all, performance, opportunities, alerts
      period = '7d',
      includeRecommendations = true,
      focusArea = 'general' // general, conversion, engagement, efficiency
    } = body;

    logger.info('🔍 [GET-BUSINESS-INSIGHTS] Iniciando análise', {
      requestId,
      tenantId: tenantId?.substring(0, 8) + '***',
      params: {
        insightType,
        period,
        includeRecommendations,
        focusArea
      },
      userAgent: request.headers.get('user-agent'),
      source: request.headers.get('x-source') || 'unknown'
    });

    if (!tenantId) {
      logger.warn('⚠️ [GET-BUSINESS-INSIGHTS] TenantId não fornecido', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'TenantId is required',
          requestId
        },
        { status: 400 }
      );
    }

    // Get analytics data first
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

    if (!analyticsResult.success) {
      throw new Error(analyticsResult.error || 'Failed to fetch analytics data');
    }

    const analyticsData = analyticsResult.data;
    const processingTime = Date.now() - startTime;

    // Generate intelligent insights
    const insights = generateBusinessInsights(analyticsData, focusArea, period);
    const alerts = generateAlerts(analyticsData);
    const opportunities = generateOpportunities(analyticsData);
    const recommendations = includeRecommendations ? generateRecommendations(analyticsData, insights) : [];

    // Filter insights based on type
    let filteredInsights = insights;
    if (insightType !== 'all') {
      filteredInsights = insights.filter(insight => insight.category === insightType);
    }

    const response = {
      summary: {
        totalInsights: filteredInsights.length,
        alertsCount: alerts.length,
        opportunitiesCount: opportunities.length,
        recommendationsCount: recommendations.length,
        overallHealth: calculateBusinessHealth(analyticsData),
        period
      },
      insights: filteredInsights,
      alerts: insightType === 'all' || insightType === 'alerts' ? alerts : [],
      opportunities: insightType === 'all' || insightType === 'opportunities' ? opportunities : [],
      recommendations,
      actionableItems: generateActionableItems(analyticsData, alerts, opportunities),
      benchmarks: generateBenchmarks(analyticsData),
      nextSteps: generateNextSteps(analyticsData, alerts, opportunities)
    };

    logger.info('✅ [GET-BUSINESS-INSIGHTS] Análise concluída', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      results: {
        totalInsights: response.summary.totalInsights,
        alertsCount: response.summary.alertsCount,
        opportunitiesCount: response.summary.opportunitiesCount,
        overallHealth: response.summary.overallHealth,
        hasRecommendations: recommendations.length > 0
      },
      performance: {
        processingTime: `${processingTime}ms`,
        period
      }
    });

    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString(),
        period,
        focusArea,
        dataPoints: analyticsData.engagement.totalConversations
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ [GET-BUSINESS-INSIGHTS] Erro na análise', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      processingTime: `${processingTime}ms`,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate business insights',
        requestId,
        details: process.env.NODE_ENV === 'development' ?
          error instanceof Error ? error.message : 'Unknown error' :
          undefined
      },
      { status: 500 }
    );
  }
}

// Helper functions for generating insights
function generateBusinessInsights(analyticsData: any, focusArea: string, period: string) {
  const insights = [];

  // Conversion insights
  const conversionRate = analyticsData.conversions.leadToVisit;
  const conversionChange = analyticsData.conversions.change;

  if (conversionChange > 15) {
    insights.push({
      category: 'performance',
      type: 'positive',
      title: 'Conversão em alta',
      description: `Taxa de conversão aumentou ${conversionChange.toFixed(1)}% no período`,
      impact: 'high',
      value: conversionRate,
      change: conversionChange
    });
  } else if (conversionChange < -15) {
    insights.push({
      category: 'alerts',
      type: 'negative',
      title: 'Queda na conversão',
      description: `Taxa de conversão caiu ${Math.abs(conversionChange).toFixed(1)}% - atenção necessária`,
      impact: 'high',
      value: conversionRate,
      change: conversionChange
    });
  }

  // Qualification insights
  const qualificationTime = analyticsData.qualificationTimes.avg;
  if (qualificationTime < 2) {
    insights.push({
      category: 'performance',
      type: 'positive',
      title: 'Qualificação ultra-rápida',
      description: `Sofia está qualificando leads em apenas ${qualificationTime.toFixed(1)} minutos`,
      impact: 'medium',
      value: qualificationTime,
      efficiency: 'excellent'
    });
  } else if (qualificationTime > 8) {
    insights.push({
      category: 'opportunities',
      type: 'improvement',
      title: 'Otimizar qualificação',
      description: `Qualificação levando ${qualificationTime.toFixed(1)} minutos - pode ser otimizada`,
      impact: 'medium',
      value: qualificationTime,
      efficiency: 'needs_improvement'
    });
  }

  // Engagement insights
  const responseRate = analyticsData.engagement.responseRate;
  if (responseRate > 85) {
    insights.push({
      category: 'performance',
      type: 'positive',
      title: 'Excelente engajamento',
      description: `${responseRate.toFixed(1)}% dos clientes respondem - Sofia está conectando bem`,
      impact: 'high',
      value: responseRate,
      trend: 'excellent'
    });
  } else if (responseRate < 60) {
    insights.push({
      category: 'opportunities',
      type: 'improvement',
      title: 'Melhorar engajamento',
      description: `Apenas ${responseRate.toFixed(1)}% de taxa de resposta - revisar abordagem`,
      impact: 'high',
      value: responseRate,
      trend: 'concerning'
    });
  }

  // Volume insights
  const totalConversations = analyticsData.engagement.totalConversations;
  if (totalConversations > 200) {
    insights.push({
      category: 'performance',
      type: 'positive',
      title: 'Alto volume de conversas',
      description: `${totalConversations} conversas no período - Sofia está ativa`,
      impact: 'medium',
      value: totalConversations,
      volume: 'high'
    });
  } else if (totalConversations < 20) {
    insights.push({
      category: 'opportunities',
      type: 'improvement',
      title: 'Aumentar volume',
      description: `Apenas ${totalConversations} conversas - considerar mais canais ou campanhas`,
      impact: 'medium',
      value: totalConversations,
      volume: 'low'
    });
  }

  return insights;
}

function generateAlerts(analyticsData: any) {
  const alerts = [];

  // Critical conversion drop
  if (analyticsData.conversions.change < -20) {
    alerts.push({
      severity: 'critical',
      type: 'conversion_drop',
      title: 'Conversão em queda crítica',
      description: `Taxa de conversão caiu ${Math.abs(analyticsData.conversions.change).toFixed(1)}%`,
      action: 'Revisar estratégia de qualificação e abordagem',
      urgency: 'immediate'
    });
  }

  // Low engagement
  if (analyticsData.engagement.responseRate < 40) {
    alerts.push({
      severity: 'warning',
      type: 'low_engagement',
      title: 'Engajamento muito baixo',
      description: `Apenas ${analyticsData.engagement.responseRate.toFixed(1)}% de resposta`,
      action: 'Otimizar mensagens e horários de contato',
      urgency: 'high'
    });
  }

  // Slow qualification
  if (analyticsData.qualificationTimes.avg > 15) {
    alerts.push({
      severity: 'warning',
      type: 'slow_qualification',
      title: 'Qualificação muito lenta',
      description: `Levando ${analyticsData.qualificationTimes.avg.toFixed(1)} minutos para qualificar`,
      action: 'Simplificar processo de qualificação',
      urgency: 'medium'
    });
  }

  return alerts;
}

function generateOpportunities(analyticsData: any) {
  const opportunities = [];

  // Good conversion trend
  if (analyticsData.conversions.change > 5 && analyticsData.conversions.change < 15) {
    opportunities.push({
      type: 'growth',
      title: 'Acelerar crescimento da conversão',
      description: `Conversão crescendo ${analyticsData.conversions.change.toFixed(1)}% - momento de intensificar`,
      potential: 'high',
      effort: 'medium',
      action: 'Aumentar volume de leads ou otimizar ainda mais o processo'
    });
  }

  // Fast qualification
  if (analyticsData.qualificationTimes.avg < 4) {
    opportunities.push({
      type: 'efficiency',
      title: 'Replicar eficiência de qualificação',
      description: `Qualificação rápida (${analyticsData.qualificationTimes.avg.toFixed(1)}min) - estudar padrão`,
      potential: 'medium',
      effort: 'low',
      action: 'Documentar melhores práticas e aplicar em outros contextos'
    });
  }

  // High engagement potential
  if (analyticsData.engagement.responseRate > 70 && analyticsData.engagement.responseRate < 85) {
    opportunities.push({
      type: 'engagement',
      title: 'Alcançar engajamento premium',
      description: `${analyticsData.engagement.responseRate.toFixed(1)}% está bom - pode chegar a 90%+`,
      potential: 'medium',
      effort: 'low',
      action: 'Refinar timing e personalização das mensagens'
    });
  }

  return opportunities;
}

function generateRecommendations(analyticsData: any, insights: any[]) {
  const recommendations = [];

  // Based on conversion performance
  if (analyticsData.conversions.leadToVisit < 20) {
    recommendations.push({
      category: 'conversion',
      priority: 'high',
      title: 'Melhorar taxa de conversão',
      actions: [
        'Revisar script de qualificação da Sofia',
        'Implementar follow-ups mais direcionados',
        'Analisar objeções mais comuns'
      ],
      expectedImpact: '15-25% aumento na conversão',
      timeframe: '2-3 semanas'
    });
  }

  // Based on qualification time
  if (analyticsData.qualificationTimes.avg > 6) {
    recommendations.push({
      category: 'efficiency',
      priority: 'medium',
      title: 'Otimizar processo de qualificação',
      actions: [
        'Simplificar perguntas de qualificação',
        'Implementar qualificação progressiva',
        'Treinar Sofia com melhores práticas'
      ],
      expectedImpact: '30-40% redução no tempo',
      timeframe: '1-2 semanas'
    });
  }

  // Based on engagement
  if (analyticsData.engagement.responseRate < 75) {
    recommendations.push({
      category: 'engagement',
      priority: 'high',
      title: 'Aumentar engajamento dos clientes',
      actions: [
        'Otimizar horários de contato via heatmap',
        'Personalizar abordagem por perfil de cliente',
        'Implementar conteúdo mais interativo'
      ],
      expectedImpact: '20-30% aumento na taxa de resposta',
      timeframe: '1-2 semanas'
    });
  }

  return recommendations;
}

function generateActionableItems(analyticsData: any, alerts: any[], opportunities: any[]) {
  const items = [];

  // From alerts
  alerts.forEach(alert => {
    if (alert.urgency === 'immediate' || alert.urgency === 'high') {
      items.push({
        type: 'urgent',
        title: alert.title,
        action: alert.action,
        deadline: alert.urgency === 'immediate' ? '24 horas' : '3 dias'
      });
    }
  });

  // From opportunities
  opportunities.forEach(opp => {
    if (opp.potential === 'high' && opp.effort === 'low') {
      items.push({
        type: 'quick_win',
        title: opp.title,
        action: opp.action,
        deadline: '1 semana'
      });
    }
  });

  return items;
}

function generateBenchmarks(analyticsData: any) {
  return {
    conversionRate: {
      current: analyticsData.conversions.leadToVisit,
      industry: 25, // Industry average
      excellent: 35,
      status: analyticsData.conversions.leadToVisit > 30 ? 'excellent' :
               analyticsData.conversions.leadToVisit > 20 ? 'good' : 'needs_improvement'
    },
    responseRate: {
      current: analyticsData.engagement.responseRate,
      industry: 70,
      excellent: 85,
      status: analyticsData.engagement.responseRate > 80 ? 'excellent' :
               analyticsData.engagement.responseRate > 65 ? 'good' : 'needs_improvement'
    },
    qualificationTime: {
      current: analyticsData.qualificationTimes.avg,
      industry: 8, // minutes
      excellent: 4,
      status: analyticsData.qualificationTimes.avg < 5 ? 'excellent' :
               analyticsData.qualificationTimes.avg < 10 ? 'good' : 'needs_improvement'
    }
  };
}

function generateNextSteps(analyticsData: any, alerts: any[], opportunities: any[]) {
  const steps = [];

  // Priority based on alerts
  if (alerts.length > 0) {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      steps.push({
        priority: 1,
        action: 'Resolver alertas críticos',
        description: 'Focar nos problemas mais urgentes primeiro',
        timeline: 'Imediato'
      });
    }
  }

  // Growth opportunities
  if (opportunities.length > 0) {
    const quickWins = opportunities.filter(o => o.effort === 'low' && o.potential === 'high');
    if (quickWins.length > 0) {
      steps.push({
        priority: 2,
        action: 'Implementar quick wins',
        description: 'Aproveitar oportunidades de baixo esforço e alto impacto',
        timeline: '1-2 semanas'
      });
    }
  }

  // Continuous improvement
  steps.push({
    priority: 3,
    action: 'Monitoramento contínuo',
    description: 'Acompanhar métricas semanalmente e ajustar estratégias',
    timeline: 'Contínuo'
  });

  return steps;
}

function calculateBusinessHealth(analyticsData: any) {
  const scores = {
    conversion: analyticsData.conversions.leadToVisit > 25 ? 100 : (analyticsData.conversions.leadToVisit / 25) * 100,
    engagement: analyticsData.engagement.responseRate > 80 ? 100 : (analyticsData.engagement.responseRate / 80) * 100,
    efficiency: analyticsData.qualificationTimes.avg < 5 ? 100 : Math.max(0, 100 - (analyticsData.qualificationTimes.avg - 5) * 10)
  };

  const overall = (scores.conversion + scores.engagement + scores.efficiency) / 3;

  return {
    score: Math.round(overall),
    level: overall > 80 ? 'excellent' : overall > 60 ? 'good' : overall > 40 ? 'fair' : 'poor',
    breakdown: scores
  };
}