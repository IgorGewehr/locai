import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { Lead, LeadStatus, LeadTemperature } from '@/lib/types/crm';
import { Client } from '@/lib/types/client';
import { Reservation } from '@/lib/types/reservation';
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { computeCrmInsightsFromLeads, toMillis } from '@/lib/analytics/crm-insights-core';

/**
 * CRM analytics endpoint.
 *
 * Funnel/conversion/revenue numbers come from the shared, fully-real
 * `computeCrmInsightsFromLeads` core (no fabricated values: cost-based metrics
 * are `null` with `costDataAvailable: false`). This route only adds the
 * lead-distribution buckets and headline counts the dashboard chart shape
 * expects, all derived in-memory from a SINGLE leads read (no duplicate fetch).
 */
interface CRMAnalytics {
  costDataAvailable: false;
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
      roi: number | null;
      avgConversionTime: number | null; // days
    }>;
    sourceEfficiency: Array<{
      source: string;
      costPerLead: number | null;
      costPerConversion: number | null;
      lifetimeValue: number | null;
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
    trends: Array<{ metric: string; prediction: number; confidence: number; factors: string[] }>;
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
    bestPractices: Array<{ practice: string; benefit: string; implementation: string }>;
  };
}

function monthLabel(key: string): string {
  // key is 'YYYY-MM'
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return format(new Date(y, m - 1, 1), 'MMM yyyy', { locale: ptBR });
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

    const periodMonths = period === '1m' ? 1 : period === '3m' ? 3 : period === '1y' ? 12 : 6;

    logger.info(`📊 [CRM Analytics] Generating analytics for tenant ${tenantId.substring(0, 8)}***`, {
      period,
      includeAI,
    });

    const serviceFactory = new TenantServiceFactory(tenantId);
    // Single read per collection. Leads power the funnel insights AND the
    // distribution buckets below — no second leads fetch.
    const [leads, clients, reservations] = await Promise.all([
      serviceFactory.createService<Lead>('leads').getAll(),
      serviceFactory.createService<Client>('clients').getAll(),
      serviceFactory.createService<Reservation>('reservations').getAll(),
    ]);

    // Real funnel / conversion / revenue analysis (shared core, no fabrication).
    const insights = computeCrmInsightsFromLeads(leads, { periodMonths });

    // Window the leads the same way the core does, for the distribution buckets.
    const windowStartMs = subMonths(new Date(), periodMonths).getTime();
    const windowLeads = leads.filter((l) => {
      const ms = toMillis(l.createdAt);
      return ms !== null && ms >= windowStartMs;
    });
    const totalLeads = windowLeads.length;
    const pct = (n: number) => (totalLeads > 0 ? (n / totalLeads) * 100 : 0);

    // ---- Overview ----
    const totalRevenue = insights.overview.totalRevenue;
    const overview = {
      totalLeads,
      totalClients: clients.length,
      conversionRate: insights.overview.conversionRate,
      averageScore: insights.overview.averageScore,
      totalRevenue,
      averageLeadValue: totalLeads > 0 ? totalRevenue / totalLeads : 0,
      totalReservations: reservations.length,
    };

    // ---- Lead distribution ----
    const statusCounts = windowLeads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<LeadStatus, number>);

    const temperatureCounts = windowLeads.reduce((acc, l) => {
      acc[l.temperature] = (acc[l.temperature] || 0) + 1;
      return acc;
    }, {} as Record<LeadTemperature, number>);

    const scoreRanges = {
      '0-20': windowLeads.filter((l) => (l.score || 0) <= 20).length,
      '21-40': windowLeads.filter((l) => (l.score || 0) > 20 && (l.score || 0) <= 40).length,
      '41-60': windowLeads.filter((l) => (l.score || 0) > 40 && (l.score || 0) <= 60).length,
      '61-80': windowLeads.filter((l) => (l.score || 0) > 60 && (l.score || 0) <= 80).length,
      '81-100': windowLeads.filter((l) => (l.score || 0) > 80).length,
    };

    const leadDistribution = {
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({
        status: status as LeadStatus,
        count,
        percentage: pct(count),
      })),
      byTemperature: Object.entries(temperatureCounts).map(([temperature, count]) => ({
        temperature: temperature as LeadTemperature,
        count,
        percentage: pct(count),
      })),
      // Source distribution comes from the insights core (real conversion per source).
      bySource: insights.conversionBySource.map((s) => ({
        source: s.source,
        count: s.leads,
        percentage: pct(s.leads),
        conversionRate: s.conversionRate,
      })),
      byScore: Object.entries(scoreRanges).map(([range, count]) => ({
        range,
        count,
        percentage: pct(count),
      })),
    };

    // ---- Trends (from the real monthly trend) ----
    const monthly = insights.revenue.monthlyTrend;
    const trends = {
      leadsOverTime: monthly.map((m) => ({
        period: monthLabel(m.month),
        leads: m.leads,
        conversions: m.won,
        revenue: m.revenue,
      })),
      conversionTrend: monthly.map((m) => ({
        period: monthLabel(m.month),
        rate: m.leads > 0 ? (m.won / m.leads) * 100 : 0,
      })),
      scoreTrend: monthly.map((m) => ({
        period: monthLabel(m.month),
        averageScore: Math.round(m.averageScore),
      })),
    };

    // ---- Performance (cost-based metrics are null — never fabricated) ----
    const topSources = [...insights.conversionBySource]
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5)
      .map((s) => ({
        source: s.source,
        leads: s.leads,
        conversions: s.won,
        revenue: s.revenue,
        roi: null, // requires acquisition cost / ad-spend, not stored
        avgConversionTime: s.avgConversionTimeDays,
      }));

    const sourceEfficiency = insights.conversionBySource.slice(0, 5).map((s) => ({
      source: s.source,
      costPerLead: null, // requires ad-spend
      costPerConversion: null, // requires ad-spend
      lifetimeValue: null, // requires longitudinal client revenue, not available here
    }));

    const conversionFunnel = insights.funnel.map((f) => ({
      stage: f.status,
      count: f.count,
      percentage: f.pctOfTotal,
      dropOffRate: f.dropOffRate,
    }));

    // ---- Predictions (simple trend extrapolation over the real last 3 months) ----
    let predictions: CRMAnalytics['predictions'] = {
      nextMonthLeads: 0,
      nextMonthConversions: 0,
      nextMonthRevenue: 0,
      confidence: 0,
      trends: [],
    };

    if (includeAI && monthly.length >= 3) {
      const recent = monthly.slice(-3);
      const avgLeads = recent.reduce((s, m) => s + m.leads, 0) / 3;
      const avgConversions = recent.reduce((s, m) => s + m.won, 0) / 3;
      const avgRevenue = recent.reduce((s, m) => s + m.revenue, 0) / 3;
      const leadGrowth = recent[0].leads > 0 ? (recent[2].leads - recent[0].leads) / recent[0].leads : 0;

      predictions = {
        nextMonthLeads: Math.round(avgLeads * (1 + leadGrowth)),
        nextMonthConversions: Math.round(avgConversions * (1 + leadGrowth * 0.8)),
        nextMonthRevenue: Math.round(avgRevenue * (1 + leadGrowth * 0.9)),
        confidence: 70,
        trends: [
          {
            metric: 'Geração de leads',
            prediction: Math.round(avgLeads * (1 + leadGrowth)),
            confidence: 70,
            factors: ['Tendência dos últimos 3 meses', 'Crescimento observado'],
          },
        ],
      };
    }

    // ---- Qualitative insights, grounded in the real numbers ----
    const topLost = insights.winLoss.topLostReasons[0];
    const hotStuck = insights.hotLeadsNoFollowUp;
    const insightsBlock: CRMAnalytics['insights'] = {
      opportunityAreas: [
        ...(hotStuck.count > 0
          ? [
              {
                area: 'Leads quentes sem retorno',
                impact: 'high' as const,
                description: `${hotStuck.count} lead(s) quente(s) sem retorno há mais de ${hotStuck.slaHours}h — risco direto de perda de receita.`,
                recommendedActions: [
                  'Priorizar o retorno aos leads quentes parados ainda hoje',
                  'Definir um SLA de primeira resposta e alertar quando estourar',
                ],
              },
            ]
          : []),
        {
          area: 'Conversão por fonte',
          impact: 'medium' as const,
          description: 'Concentrar esforço nas fontes com maior taxa de conversão real.',
          recommendedActions: [
            'Comparar conversão por fonte e realocar esforço para as melhores',
            'Investigar fontes de alto volume e baixa conversão',
          ],
        },
      ],
      riskFactors: [
        ...(topLost
          ? [
              {
                risk: `Maior motivo de perda: "${topLost.reason}"`,
                severity: 'medium' as const,
                affectedLeads: topLost.count,
                mitigation: [
                  'Tratar a objeção mais comum no script de atendimento',
                  'Acompanhar a evolução desse motivo ao longo do tempo',
                ],
              },
            ]
          : []),
      ],
      bestPractices: [
        {
          practice: 'Resposta rápida a leads quentes',
          benefit: 'Maior taxa de conversão',
          implementation: 'Responder leads quentes dentro do SLA definido',
        },
      ],
    };

    const analytics: CRMAnalytics = {
      costDataAvailable: false,
      overview,
      leadDistribution,
      trends,
      performance: { topSources, sourceEfficiency, conversionFunnel },
      predictions,
      insights: insightsBlock,
    };

    logger.info(`✅ [CRM Analytics] Analytics generated successfully`, {
      tenantId: tenantId.substring(0, 8) + '***',
      totalLeads,
      totalClients: clients.length,
      conversionRate: Math.round(overview.conversionRate * 100) / 100,
    });

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('❌ [CRM Analytics] Error generating analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor ao gerar analytics' },
      { status: 500 }
    );
  }
}
