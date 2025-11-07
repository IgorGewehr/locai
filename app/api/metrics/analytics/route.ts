import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getTenantId } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { subDays, subHours, format, startOfDay, endOfDay } from 'date-fns';

// Analytics calculation functions
interface AnalyticsResult {
  conversions: {
    leadToVisit: number;
    leadToReservation: number;
    change: number;
  };
  qualificationTimes: {
    avg: number;
    median: number;
    change: number;
  };
  engagement: {
    totalConversations: number;
    responseRate: number;
    change: number;
  };
  avgConversationTime: {
    avg: number;
    change: number;
  };
  heatmap: Array<{
    hour: number;
    day: string;
    conversations: number;
    conversions: number;
    avgResponse: number;
  }>;
  trends: Array<{
    date: string;
    conversions: number;
    conversations: number;
    qualificationTime: number;
    avgTime: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get tenant ID from auth or header
    let tenantId: string;

    try {
      // Try to get from Firebase auth first
      tenantId = await getTenantId(request);
    } catch (authError) {
      // Fallback to x-tenant-id header for internal calls
      const headerTenantId = request.headers.get('x-tenant-id');
      if (!headerTenantId) {
        logger.warn('⚠️ No tenant ID found in auth or headers');
        return NextResponse.json(
          { success: false, error: 'Tenant ID required' },
          { status: 401 }
        );
      }
      tenantId = headerTenantId;
    }

    const period = searchParams.get('period') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    switch (period) {
      case '24h':
        startDate = subHours(now, 24);
        previousStartDate = subHours(startDate, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        previousStartDate = subDays(startDate, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        previousStartDate = subDays(startDate, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        previousStartDate = subDays(startDate, 90);
        break;
      default:
        startDate = subDays(now, 7);
        previousStartDate = subDays(startDate, 7);
    }

    logger.info('📊 Calculating analytics', {
      tenantId,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    });

    // Get metrics data
    const metricsRef = collection(db, `tenants/${tenantId}/metrics`);
    const currentPeriodQuery = query(
      metricsRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(now)),
      orderBy('timestamp', 'desc')
    );

    const previousPeriodQuery = query(
      metricsRef,
      where('timestamp', '>=', Timestamp.fromDate(previousStartDate)),
      where('timestamp', '<', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    );

    const [currentSnapshot, previousSnapshot] = await Promise.all([
      getDocs(currentPeriodQuery),
      getDocs(previousPeriodQuery)
    ]);

    const currentMetrics = currentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const previousMetrics = previousSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('📈 Metrics retrieved', {
      tenantId,
      currentCount: currentMetrics.length,
      previousCount: previousMetrics.length
    });

    // Calculate conversion rates
    const currentConversions = calculateConversions(currentMetrics);
    const previousConversions = calculateConversions(previousMetrics);
    const conversionChange = calculateChange(
      currentConversions.leadToVisit,
      previousConversions.leadToVisit
    );

    // Calculate qualification times
    const currentQualification = calculateQualificationTimes(currentMetrics);
    const previousQualification = calculateQualificationTimes(previousMetrics);
    const qualificationChange = calculateChange(
      currentQualification.avg,
      previousQualification.avg
    );

    // Calculate engagement metrics
    const currentEngagement = calculateEngagement(currentMetrics);
    const previousEngagement = calculateEngagement(previousMetrics);
    const engagementChange = calculateChange(
      currentEngagement.responseRate,
      previousEngagement.responseRate
    );

    // Calculate conversation times
    const currentConvTime = calculateConversationTimes(currentMetrics);
    const previousConvTime = calculateConversationTimes(previousMetrics);
    const convTimeChange = calculateChange(
      currentConvTime.avg,
      previousConvTime.avg
    );

    // Generate heatmap
    const heatmap = generateHeatmap(currentMetrics);

    // Generate trends
    const trends = generateTrends(currentMetrics, startDate, now);

    const result: AnalyticsResult = {
      conversions: {
        leadToVisit: currentConversions.leadToVisit,
        leadToReservation: currentConversions.leadToReservation,
        change: conversionChange
      },
      qualificationTimes: {
        avg: currentQualification.avg,
        median: currentQualification.median,
        change: qualificationChange
      },
      engagement: {
        totalConversations: currentEngagement.totalConversations,
        responseRate: currentEngagement.responseRate,
        change: engagementChange
      },
      avgConversationTime: {
        avg: currentConvTime.avg,
        change: convTimeChange
      },
      heatmap,
      trends
    };

    logger.info('✅ Analytics calculated successfully', {
      tenantId,
      metricsCount: currentMetrics.length,
      processingTime: Date.now()
    });

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        metricsProcessed: currentMetrics.length
      }
    });

  } catch (error) {
    logger.error('❌ Failed to calculate analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { success: false, error: 'Failed to calculate analytics' },
      { status: 500 }
    );
  }
}

// Helper functions for calculations
function calculateConversions(metrics: any[]) {
  const conversionEvents = metrics.filter(m => m.eventType === 'conversion_step');
  const totalLeads = new Set(conversionEvents.map(e => e.leadId)).size;

  const visitConversions = conversionEvents.filter(e =>
    e.eventData.to === 'visit_scheduled' || e.eventData.to === 'qualified'
  ).length;

  const reservationConversions = conversionEvents.filter(e =>
    e.eventData.to === 'reservation_created' || e.eventData.to === 'won'
  ).length;

  return {
    leadToVisit: totalLeads > 0 ? (visitConversions / totalLeads) * 100 : 0,
    leadToReservation: totalLeads > 0 ? (reservationConversions / totalLeads) * 100 : 0
  };
}

function calculateQualificationTimes(metrics: any[]) {
  const qualificationEvents = metrics.filter(m =>
    m.eventType === 'qualification_milestone' && m.eventData.milestone === 'qualified'
  );

  if (qualificationEvents.length === 0) {
    return { avg: 0, median: 0 };
  }

  // Group by leadId to get qualification time per lead
  const leadTimes: { [leadId: string]: number } = {};

  qualificationEvents.forEach(event => {
    const leadId = event.leadId;
    const timeToQualify = event.eventData.timeToMilestone || 0;

    if (!leadTimes[leadId] || timeToQualify < leadTimes[leadId]) {
      leadTimes[leadId] = timeToQualify;
    }
  });

  const times = Object.values(leadTimes).map(t => t / 60); // Convert to minutes
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const sorted = times.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  return { avg, median };
}

function calculateEngagement(metrics: any[]) {
  const engagementEvents = metrics.filter(m => m.eventType === 'message_engagement');
  const totalMessages = engagementEvents.length;
  const respondedMessages = engagementEvents.filter(e => e.eventData.clientResponded).length;
  const totalConversations = new Set(engagementEvents.map(e => e.sessionId)).size;

  return {
    totalConversations,
    responseRate: totalMessages > 0 ? (respondedMessages / totalMessages) * 100 : 0
  };
}

function calculateConversationTimes(metrics: any[]) {
  const sessionEvents = metrics.filter(m => m.eventType === 'conversation_session');

  if (sessionEvents.length === 0) {
    return { avg: 0 };
  }

  const durations = sessionEvents
    .map(e => e.eventData.duration || 0)
    .filter(d => d > 0)
    .map(d => d / 60); // Convert to minutes

  const avg = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  return { avg };
}

function generateHeatmap(metrics: any[]) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const heatmap: any[] = [];

  days.forEach((day, dayIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const dayMetrics = metrics.filter(m =>
        m.dayOfWeek === dayIndex && m.hour === hour
      );

      const conversations = dayMetrics.filter(m =>
        m.eventType === 'message_engagement'
      ).length;

      const conversions = dayMetrics.filter(m =>
        m.eventType === 'conversion_step'
      ).length;

      const responseTimes = dayMetrics
        .filter(m => m.eventType === 'message_engagement' && m.eventData.responseTime)
        .map(m => m.eventData.responseTime);

      const avgResponse = responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

      heatmap.push({
        hour,
        day,
        conversations,
        conversions,
        avgResponse
      });
    }
  });

  return heatmap;
}

function generateTrends(metrics: any[], startDate: Date, endDate: Date) {
  const trends: any[] = [];
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < Math.min(daysDiff, 7); i++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dayMetrics = metrics.filter(m => {
      const metricDate = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
      return metricDate >= dayStart && metricDate <= dayEnd;
    });

    const conversions = dayMetrics.filter(m => m.eventType === 'conversion_step').length;
    const conversations = new Set(
      dayMetrics
        .filter(m => m.eventType === 'message_engagement')
        .map(m => m.sessionId)
    ).size;

    const qualificationEvents = dayMetrics.filter(m =>
      m.eventType === 'qualification_milestone'
    );
    const avgQualificationTime = qualificationEvents.length > 0
      ? qualificationEvents.reduce((sum, e) => sum + (e.eventData.timeToMilestone || 0), 0)
        / qualificationEvents.length / 60
      : 0;

    const sessionEvents = dayMetrics.filter(m => m.eventType === 'conversation_session');
    const avgTime = sessionEvents.length > 0
      ? sessionEvents.reduce((sum, e) => sum + (e.eventData.duration || 0), 0)
        / sessionEvents.length / 60
      : 0;

    trends.unshift({
      date: format(date, 'dd/MM'),
      conversions,
      conversations,
      qualificationTime: avgQualificationTime,
      avgTime
    });
  }

  return trends;
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}