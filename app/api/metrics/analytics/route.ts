// app/api/metrics/analytics/route.ts
// Endpoint para analytics avançados do dashboard

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

// Helper to calculate period dates
function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  return { startDate, endDate };
}

// Generate heatmap data from conversations
function generateHeatmapData(conversations: any[]): any[] {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const heatmap: any[] = [];

  // Initialize heatmap with zeros
  for (let hour = 0; hour < 24; hour++) {
    for (const day of days) {
      heatmap.push({
        hour,
        day,
        conversations: 0,
        conversions: 0,
        avgResponse: 0,
      });
    }
  }

  // Aggregate conversation data
  conversations.forEach((conv) => {
    const date = conv.createdAt?.toDate?.() || new Date(conv.createdAt);
    const hour = date.getHours();
    const dayIndex = date.getDay();
    const day = days[dayIndex];

    const idx = heatmap.findIndex((h) => h.hour === hour && h.day === day);
    if (idx !== -1) {
      heatmap[idx].conversations++;
      if (conv.status === 'converted' || conv.leadStatus === 'won') {
        heatmap[idx].conversions++;
      }
    }
  });

  return heatmap;
}

// Generate trend data
function generateTrendData(conversations: any[], period: string): any[] {
  const { startDate } = getPeriodDates(period);
  const trends: Map<string, any> = new Map();

  // Initialize dates
  const currentDate = new Date(startDate);
  const endDate = new Date();

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    trends.set(dateKey, {
      date: dateKey,
      conversions: 0,
      conversations: 0,
      qualificationTime: 0,
      avgTime: 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate data
  conversations.forEach((conv) => {
    const date = conv.createdAt?.toDate?.() || new Date(conv.createdAt);
    const dateKey = date.toISOString().split('T')[0];

    if (trends.has(dateKey)) {
      const trend = trends.get(dateKey)!;
      trend.conversations++;
      if (conv.status === 'converted' || conv.leadStatus === 'won') {
        trend.conversions++;
      }
    }
  });

  return Array.from(trends.values());
}

export async function GET(request: NextRequest) {
  const requestId = `analytics_${Date.now()}`;

  try {
    // Validate authentication
    const authContext = await validateFirebaseAuth(request);
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const tenantId = authContext.tenantId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    logger.info('[Analytics API] Request received', {
      requestId,
      tenantId: tenantId.substring(0, 8) + '***',
      period,
    });

    const { startDate, endDate } = getPeriodDates(period);
    const services = new TenantServiceFactory(tenantId);

    // Fetch conversations for the period
    let conversations: any[] = [];
    let leads: any[] = [];

    try {
      conversations = await services.conversations.getAll(500);
      // Filter by date
      conversations = conversations.filter((conv) => {
        const date = conv.createdAt?.toDate?.() || new Date(conv.createdAt);
        return date >= startDate && date <= endDate;
      });
    } catch (e) {
      logger.warn('[Analytics API] Could not fetch conversations', { error: e });
    }

    try {
      leads = await services.leads.getAll(500);
      // Filter by date
      leads = leads.filter((lead) => {
        const date = lead.createdAt?.toDate?.() || new Date(lead.createdAt);
        return date >= startDate && date <= endDate;
      });
    } catch (e) {
      logger.warn('[Analytics API] Could not fetch leads', { error: e });
    }

    // Calculate metrics
    const totalConversations = conversations.length;
    const convertedConversations = conversations.filter(
      (c) => c.status === 'converted' || c.leadStatus === 'won'
    ).length;

    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === 'won').length;
    const qualifiedLeads = leads.filter(
      (l) => l.status === 'qualified' || l.status === 'won'
    ).length;

    // Calculate conversion rates
    const leadToVisit = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
    const conversionRate = totalConversations > 0 ? (convertedConversations / totalConversations) * 100 : 0;

    // Calculate average times (in minutes)
    const avgQualificationTime = leads.reduce((acc, lead) => {
      if (lead.qualifiedAt && lead.createdAt) {
        const created = lead.createdAt?.toDate?.() || new Date(lead.createdAt);
        const qualified = lead.qualifiedAt?.toDate?.() || new Date(lead.qualifiedAt);
        return acc + (qualified.getTime() - created.getTime()) / (1000 * 60);
      }
      return acc;
    }, 0) / (qualifiedLeads || 1);

    // Response rate (conversations with at least one response)
    const respondedConversations = conversations.filter(
      (c) => c.messageCount > 1 || c.hasResponse
    ).length;
    const responseRate = totalConversations > 0 ? (respondedConversations / totalConversations) * 100 : 0;

    // Generate heatmap and trend data
    const heatmap = generateHeatmapData(conversations);
    const trends = generateTrendData(conversations, period);

    const analyticsData = {
      conversions: {
        leadToVisit: Math.round(leadToVisit * 10) / 10,
        total: convertedConversations,
        change: 0, // Would need historical data to calculate
      },
      qualificationTimes: {
        avg: Math.round(avgQualificationTime),
        change: 0,
      },
      engagement: {
        totalConversations,
        responseRate: Math.round(responseRate * 10) / 10,
        change: 0,
      },
      avgConversationTime: {
        avg: 5, // Placeholder - would need message timestamps
        change: 0,
      },
      heatmap,
      trends,
      summary: {
        totalLeads,
        wonLeads,
        qualifiedLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
    };

    logger.info('[Analytics API] Response generated', {
      requestId,
      totalConversations,
      totalLeads,
    });

    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        requestId,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error('[Analytics API] Error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        requestId,
      },
      { status: 500 }
    );
  }
}
