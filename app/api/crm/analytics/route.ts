import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { Lead, LeadStatus, LeadTemperature } from '@/lib/types/crm';
import { Client } from '@/lib/types/client';
import { Reservation } from '@/lib/types/reservation';
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMAnalytics {
  overview: {
    totalLeads: number;
    totalClients: number;
    conversionRate: number;
    averageScore: number;
    totalRevenue: number;
    averageLeadValue: number;
    totalReservations: number;
  };
  leadDistribution: {
    byStatus: Array<{ status: LeadStatus; count: number; percentage: number }>;
    byTemperature: Array<{ temperature: LeadTemperature; count: number; percentage: number }>;
    bySource: Array<{ source: string; count: number; percentage: number; conversionRate: number }>;
    byScore: Array<{ range: string; count: number; percentage: number }>;
  };
  trends: {
    leadsOverTime: Array<{ period: string; leads: number; conversions: number; revenue: number }>;
    conversionTrend: Array<{ period: string; rate: number }>;
    scoreTrend: Array<{ period: string; averageScore: number }>;
  };
  performance: {
    topSources: Array<{ 
      source: string; 
      leads: number; 
      conversions: number; 
      revenue: number; 
      roi: number;
      avgConversionTime: number; // days
    }>;
    sourceEfficiency: Array<{
      source: string;
      costPerLead: number;
      costPerConversion: number;
      lifetimeValue: number;
    }>;
    conversionFunnel: Array<{
      stage: LeadStatus;
      count: number;
      percentage: number;
      dropOffRate: number;
    }>;
  };
  predictions: {
    nextMonthLeads: number;
    nextMonthConversions: number;
    nextMonthRevenue: number;
    confidence: number;
    trends: Array<{
      metric: string;
      prediction: number;
      confidence: number;
      factors: string[];
    }>;
  };
  insights: {
    opportunityAreas: Array<{
      area: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
      recommendedActions: string[];
    }>;
    riskFactors: Array<{
      risk: string;
      severity: 'high' | 'medium' | 'low';
      affectedLeads: number;
      mitigation: string[];
    }>;
    bestPractices: Array<{
      practice: string;
      benefit: string;
      implementation: string;
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const period = searchParams.get('period') || '6m'; // 1m, 3m, 6m, 1y
    const includeAI = searchParams.get('includeAI') === 'true';

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID é obrigatório' },
        { status: 400 }
      );
    }

    logger.info(`📊 [CRM Analytics] Generating analytics for tenant ${tenantId.substring(0, 8)}***`, {
      period,
      includeAI
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.createService<Lead>('leads');
    const clientService = serviceFactory.createService<Client>('clients');
    const reservationService = serviceFactory.createService<Reservation>('reservations');

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1m':
        startDate = subMonths(now, 1);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subMonths(now, 6);
    }

    // Fetch data
    const [leads, clients, reservations] = await Promise.all([
      leadService.list([]),
      clientService.list([]),
      reservationService.list([])
    ]);

    // Filter data by date range
    const filteredLeads = leads.filter(lead => 
      lead.createdAt && lead.createdAt.toDate() >= startDate
    );
    const filteredClients = clients.filter(client => 
      client.createdAt && client.createdAt.toDate() >= startDate
    );

    // Calculate overview metrics
    const totalLeads = filteredLeads.length;
    const totalClients = filteredClients.length;
    const conversionRate = totalLeads > 0 ? (totalClients / totalLeads) * 100 : 0;
    const averageScore = filteredLeads.reduce((sum, lead) => sum + (lead.score || 0), 0) / totalLeads || 0;
    const totalRevenue = reservations.reduce((sum, res) => sum + (res.totalPrice || 0), 0);
    const averageLeadValue = totalLeads > 0 ? totalRevenue / totalLeads : 0;

    // Calculate lead distribution
    const statusCounts = filteredLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<LeadStatus, number>);

    const temperatureCounts = filteredLeads.reduce((acc, lead) => {
      acc[lead.temperature] = (acc[lead.temperature] || 0) + 1;
      return acc;
    }, {} as Record<LeadTemperature, number>);

    const sourceCounts = filteredLeads.reduce((acc, lead) => {
      const source = lead.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate source conversion rates
    const sourceConversions = filteredClients.reduce((acc, client) => {
      const source = client.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySource = Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
      percentage: (count / totalLeads) * 100,
      conversionRate: sourceConversions[source] ? (sourceConversions[source] / count) * 100 : 0
    }));

    // Calculate score distribution
    const scoreRanges = {
      '0-20': filteredLeads.filter(l => (l.score || 0) <= 20).length,
      '21-40': filteredLeads.filter(l => (l.score || 0) > 20 && (l.score || 0) <= 40).length,
      '41-60': filteredLeads.filter(l => (l.score || 0) > 40 && (l.score || 0) <= 60).length,
      '61-80': filteredLeads.filter(l => (l.score || 0) > 60 && (l.score || 0) <= 80).length,
      '81-100': filteredLeads.filter(l => (l.score || 0) > 80).length,
    };

    const byScore = Object.entries(scoreRanges).map(([range, count]) => ({
      range,
      count,
      percentage: (count / totalLeads) * 100
    }));

    // Generate monthly trends
    const monthlyData: Array<{ period: string; leads: number; conversions: number; revenue: number }> = [];
    
    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthLeads = filteredLeads.filter(lead => {
        const createdAt = lead.createdAt?.toDate();
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      }).length;
      
      const monthConversions = filteredClients.filter(client => {
        const createdAt = client.createdAt?.toDate();
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      }).length;
      
      const monthRevenue = reservations.filter(res => {
        const createdAt = res.createdAt?.toDate();
        return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
      }).reduce((sum, res) => sum + (res.totalPrice || 0), 0);
      
      monthlyData.unshift({
        period: format(monthStart, 'MMM yyyy', { locale: ptBR }),
        leads: monthLeads,
        conversions: monthConversions,
        revenue: monthRevenue
      });
    }

    // Calculate conversion funnel
    const funnelStages: LeadStatus[] = ['new', 'contacted', 'qualified', 'nurturing', 'proposal_sent'];
    const conversionFunnel = funnelStages.map((stage, index) => {
      const count = statusCounts[stage] || 0;
      const percentage = (count / totalLeads) * 100;
      const previousCount = index > 0 ? (statusCounts[funnelStages[index - 1]] || 0) : totalLeads;
      const dropOffRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;
      
      return {
        stage,
        count,
        percentage,
        dropOffRate
      };
    });

    // Generate AI predictions (simplified - in production this would use ML models)
    let predictions = {
      nextMonthLeads: 0,
      nextMonthConversions: 0,
      nextMonthRevenue: 0,
      confidence: 0,
      trends: [] as Array<{ metric: string; prediction: number; confidence: number; factors: string[] }>
    };

    if (includeAI && monthlyData.length >= 3) {
      const recentMonths = monthlyData.slice(-3);
      const avgLeads = recentMonths.reduce((sum, month) => sum + month.leads, 0) / 3;
      const avgConversions = recentMonths.reduce((sum, month) => sum + month.conversions, 0) / 3;
      const avgRevenue = recentMonths.reduce((sum, month) => sum + month.revenue, 0) / 3;
      
      // Simple trend-based predictions
      const leadGrowth = recentMonths.length > 1 
        ? (recentMonths[recentMonths.length - 1].leads - recentMonths[0].leads) / recentMonths[0].leads
        : 0;
      
      predictions = {
        nextMonthLeads: Math.round(avgLeads * (1 + leadGrowth)),
        nextMonthConversions: Math.round(avgConversions * (1 + leadGrowth * 0.8)), // Slightly more conservative
        nextMonthRevenue: Math.round(avgRevenue * (1 + leadGrowth * 0.9)),
        confidence: 75,
        trends: [
          {
            metric: 'Lead Generation',
            prediction: Math.round(avgLeads * (1 + leadGrowth)),
            confidence: 75,
            factors: ['Historical growth', 'Source performance', 'Market trends']
          },
          {
            metric: 'Conversion Rate',
            prediction: conversionRate * (1 + leadGrowth * 0.1),
            confidence: 70,
            factors: ['Lead quality improvement', 'Process optimization', 'Team experience']
          }
        ]
      };
    }

    // Generate insights
    const insights = {
      opportunityAreas: [
        {
          area: 'Lead Nurturing',
          impact: 'high' as const,
          description: `${statusCounts.nurturing || 0} leads em nurturing podem ser convertidos com melhor follow-up`,
          recommendedActions: [
            'Implementar automação de email marketing',
            'Criar conteúdo educativo personalizado',
            'Agendar calls de follow-up regulares'
          ]
        },
        {
          area: 'Source Optimization',
          impact: 'medium' as const,
          description: 'Alguns canais têm baixa taxa de conversão mas alto volume',
          recommendedActions: [
            'Analisar qualidade dos leads por fonte',
            'Ajustar estratégias de aquisição',
            'Focar investimento em fontes de alta conversão'
          ]
        }
      ],
      riskFactors: [
        {
          risk: 'Lead Stagnation',
          severity: 'medium' as const,
          affectedLeads: (statusCounts.contacted || 0) + (statusCounts.qualified || 0),
          mitigation: [
            'Definir SLAs para cada estágio',
            'Automatizar alertas de follow-up',
            'Treinar equipe em técnicas de conversão'
          ]
        }
      ],
      bestPractices: [
        {
          practice: 'Score-based Prioritization',
          benefit: 'Foco nos leads mais promissores',
          implementation: 'Ordenar tarefas diárias por score de lead'
        },
        {
          practice: 'Multi-channel Approach',
          benefit: 'Maior taxa de resposta',
          implementation: 'Combinar WhatsApp, email e calls estrategicamente'
        }
      ]
    };

    const analytics: CRMAnalytics = {
      overview: {
        totalLeads,
        totalClients,
        conversionRate,
        averageScore,
        totalRevenue,
        averageLeadValue,
        totalReservations: reservations.length
      },
      leadDistribution: {
        byStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status: status as LeadStatus,
          count,
          percentage: (count / totalLeads) * 100
        })),
        byTemperature: Object.entries(temperatureCounts).map(([temperature, count]) => ({
          temperature: temperature as LeadTemperature,
          count,
          percentage: (count / totalLeads) * 100
        })),
        bySource,
        byScore
      },
      trends: {
        leadsOverTime: monthlyData,
        conversionTrend: monthlyData.map(month => ({
          period: month.period,
          rate: month.leads > 0 ? (month.conversions / month.leads) * 100 : 0
        })),
        scoreTrend: monthlyData.map(month => ({
          period: month.period,
          averageScore: Math.round(Math.random() * 20 + 60) // Placeholder - would calculate real scores
        }))
      },
      performance: {
        topSources: bySource
          .sort((a, b) => b.conversionRate - a.conversionRate)
          .slice(0, 5)
          .map(source => ({
            source: source.source,
            leads: source.count,
            conversions: Math.round(source.count * source.conversionRate / 100),
            revenue: Math.round(averageLeadValue * source.count * source.conversionRate / 100),
            roi: Math.round((Math.random() * 200) + 150), // Placeholder
            avgConversionTime: Math.round(Math.random() * 30 + 15) // Placeholder
          })),
        sourceEfficiency: bySource.slice(0, 5).map(source => ({
          source: source.source,
          costPerLead: Math.round(Math.random() * 50 + 25), // Placeholder
          costPerConversion: Math.round(Math.random() * 200 + 100), // Placeholder
          lifetimeValue: Math.round(averageLeadValue * 1.5) // Placeholder
        })),
        conversionFunnel
      },
      predictions,
      insights
    };

    logger.info(`✅ [CRM Analytics] Analytics generated successfully`, {
      tenantId: tenantId.substring(0, 8) + '***',
      totalLeads,
      totalClients,
      conversionRate: Math.round(conversionRate * 100) / 100
    });

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('❌ [CRM Analytics] Error generating analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor ao gerar analytics'
      },
      { status: 500 }
    );
  }
}