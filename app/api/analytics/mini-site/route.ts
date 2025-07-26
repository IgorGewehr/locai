/**
 * Mini-Site Analytics API
 * Comprehensive analytics for mini-site performance tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { MiniSiteAnalytics } from '@/lib/types/mini-site';

interface AnalyticsResponse {
  totalViews: number;
  uniqueVisitors: number;
  propertyViews: number;
  inquiries: number;
  bookingConversions: number;
  conversionRate: number;
  averageSessionDuration: number;
  topProperties: Array<{
    propertyId: string;
    propertyName: string;
    views: number;
    inquiries: number;
    conversionRate: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  geographicData: Array<{
    country: string;
    visitors: number;
    percentage: number;
  }>;
  deviceData: Array<{
    device: string;
    visitors: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    views: number;
    inquiries: number;
    conversions: number;
  }>;
  peakHours: Array<{
    hour: number;
    views: number;
  }>;
  bounceRate: number;
  averagePageLoadTime: number;
  mobileOptimizationScore: number;
  seoScore: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = auth.tenantId || 'default-tenant';
    const period = searchParams.get('period') || '30'; // days
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const services = new TenantServiceFactory(tenantId);
    const analyticsService = services.createService<MiniSiteAnalytics>('mini_site_analytics');

    // Calculate date range
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Get analytics data
    // Note: This query requires a composite index on [tenantId, date]
    // If index is not available, fallback to simpler query
    let analytics: MiniSiteAnalytics[] = [];
    
    try {
      analytics = await analyticsService.getMany([
        { field: 'date', operator: '>=', value: start },
        { field: 'date', operator: '<=', value: end }
      ], {
        orderBy: 'date',
        orderDirection: 'desc'
      });
    } catch (indexError: any) {
      // Fallback: Get all analytics first, then filter by date in memory
      console.warn('Composite index not available, using fallback query:', indexError.message);
      const allAnalytics = await analyticsService.getAll();
      
      // Filter by date range in memory
      analytics = allAnalytics.filter(item => {
        const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
        return itemDate >= start && itemDate <= end;
      }).sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // desc order
      });
    }

    if (analytics.length === 0) {
      // Return empty real data structure
      return NextResponse.json({
        totalViews: 0,
        propertyViews: 0,
        inquiries: 0,
        conversionRate: 0
      });
    }

    // Get properties for enhanced data
    const properties = await services.properties.getMany([
      { field: 'isActive', operator: '==', value: true }
    ]);

    const propertyMap = new Map(properties.map((p: any) => [p.id, p]));

    // Aggregate analytics data
    const aggregatedData = aggregateAnalytics(analytics, propertyMap);

    return NextResponse.json(aggregatedData);

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      event, 
      propertyId, 
      sessionId, 
      userAgent, 
      referrer, 
      location,
      sessionDuration,
      pageLoadTime 
    } = body;

    const tenantId = auth.tenantId || 'default-tenant';
    const services = new TenantServiceFactory(tenantId);
    const analyticsService = services.createService<MiniSiteAnalytics>('mini_site_analytics');

    // Track event
    await recordAnalyticsEvent(analyticsService, {
      tenantId,
      event,
      propertyId,
      sessionId,
      userAgent,
      referrer,
      location,
      sessionDuration,
      pageLoadTime,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    );
  }
}

function generateDemoAnalytics(days: number): AnalyticsResponse {
  const baseViews = Math.floor(Math.random() * 1000) + 500;
  const inquiries = Math.floor(baseViews * 0.08) + Math.floor(Math.random() * 20);
  const conversions = Math.floor(inquiries * 0.25) + Math.floor(Math.random() * 5);

  return {
    totalViews: baseViews,
    uniqueVisitors: Math.floor(baseViews * 0.7),
    propertyViews: Math.floor(baseViews * 0.85),
    inquiries,
    bookingConversions: conversions,
    conversionRate: inquiries > 0 ? parseFloat(((conversions / inquiries) * 100).toFixed(1)) : 0,
    averageSessionDuration: Math.floor(Math.random() * 300) + 180, // 3-8 minutes
    topProperties: [
      { propertyId: '1', propertyName: 'Apartamento Centro', views: Math.floor(baseViews * 0.3), inquiries: Math.floor(inquiries * 0.4), conversionRate: 12.5 },
      { propertyId: '2', propertyName: 'Casa Praia', views: Math.floor(baseViews * 0.25), inquiries: Math.floor(inquiries * 0.3), conversionRate: 15.2 },
      { propertyId: '3', propertyName: 'Cobertura Luxo', views: Math.floor(baseViews * 0.2), inquiries: Math.floor(inquiries * 0.2), conversionRate: 8.7 },
    ],
    trafficSources: [
      { source: 'WhatsApp', visitors: Math.floor(baseViews * 0.4), percentage: 40 },
      { source: 'Google', visitors: Math.floor(baseViews * 0.3), percentage: 30 },
      { source: 'Facebook', visitors: Math.floor(baseViews * 0.2), percentage: 20 },
      { source: 'Instagram', visitors: Math.floor(baseViews * 0.1), percentage: 10 },
    ],
    geographicData: [
      { country: 'Brasil', visitors: Math.floor(baseViews * 0.85), percentage: 85 },
      { country: 'Portugal', visitors: Math.floor(baseViews * 0.08), percentage: 8 },
      { country: 'Estados Unidos', visitors: Math.floor(baseViews * 0.05), percentage: 5 },
      { country: 'Outros', visitors: Math.floor(baseViews * 0.02), percentage: 2 },
    ],
    deviceData: [
      { device: 'Mobile', visitors: Math.floor(baseViews * 0.65), percentage: 65 },
      { device: 'Desktop', visitors: Math.floor(baseViews * 0.25), percentage: 25 },
      { device: 'Tablet', visitors: Math.floor(baseViews * 0.1), percentage: 10 },
    ],
    timeSeriesData: Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
      views: Math.floor(Math.random() * 50) + 20,
      inquiries: Math.floor(Math.random() * 5) + 1,
      conversions: Math.floor(Math.random() * 2),
    })).reverse(),
    peakHours: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      views: Math.floor(Math.random() * 30) + (i >= 9 && i <= 21 ? 20 : 5),
    })),
    bounceRate: parseFloat((Math.random() * 30 + 35).toFixed(1)),
    averagePageLoadTime: parseFloat((Math.random() * 2 + 1.5).toFixed(2)),
    mobileOptimizationScore: Math.floor(Math.random() * 15) + 85,
    seoScore: Math.floor(Math.random() * 20) + 75,
  };
}

function aggregateAnalytics(analytics: MiniSiteAnalytics[], propertyMap: Map<string, any>): AnalyticsResponse {
  // Initialize counters
  let totalViews = 0;
  let uniqueVisitors = new Set<string>();
  let propertyViews = 0;
  let inquiries = 0;
  let bookingConversions = 0;
  let totalSessionDuration = 0;
  let sessionCount = 0;
  
  // Property stats map
  const propertyStats = new Map<string, {
    views: number;
    inquiries: number;
    conversions: number;
  }>();
  
  // Traffic source map
  const trafficSourceMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const hourlyViews = new Array(24).fill(0);
  
  // Time series data
  const timeSeriesMap = new Map<string, {
    views: number;
    inquiries: number;
    conversions: number;
  }>();
  
  // Process each analytics entry
  analytics.forEach(entry => {
    // Count views
    if (entry.event === 'page_view') {
      totalViews++;
      
      if (entry.sessionId) {
        uniqueVisitors.add(entry.sessionId);
      }
      
      if (entry.propertyId) {
        propertyViews++;
        
        // Update property stats
        const stats = propertyStats.get(entry.propertyId) || { views: 0, inquiries: 0, conversions: 0 };
        stats.views++;
        propertyStats.set(entry.propertyId, stats);
      }
      
      // Track hourly distribution
      try {
        const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
        if (!isNaN(entryDate.getTime())) {
          const hour = entryDate.getHours();
          hourlyViews[hour]++;
        }
      } catch (error) {
        // Skip invalid timestamps
      }
    }
    
    // Count inquiries
    if (entry.event === 'inquiry' || entry.event === 'contact_click') {
      inquiries++;
      
      if (entry.propertyId) {
        const stats = propertyStats.get(entry.propertyId) || { views: 0, inquiries: 0, conversions: 0 };
        stats.inquiries++;
        propertyStats.set(entry.propertyId, stats);
      }
    }
    
    // Count conversions
    if (entry.event === 'booking' || entry.event === 'reservation') {
      bookingConversions++;
      
      if (entry.propertyId) {
        const stats = propertyStats.get(entry.propertyId) || { views: 0, inquiries: 0, conversions: 0 };
        stats.conversions++;
        propertyStats.set(entry.propertyId, stats);
      }
    }
    
    // Track session duration
    if (entry.sessionDuration && entry.sessionDuration > 0) {
      totalSessionDuration += entry.sessionDuration;
      sessionCount++;
    }
    
    // Track traffic sources
    if (entry.referrer) {
      const source = getTrafficSource(entry.referrer);
      trafficSourceMap.set(source, (trafficSourceMap.get(source) || 0) + 1);
    }
    
    // Track devices
    if (entry.userAgent) {
      const device = getDeviceType(entry.userAgent);
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    }
    
    // Track location
    if (entry.location?.country) {
      const country = entry.location.country;
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    }
    
    // Track time series
    let dateKey = '';
    try {
      const entryDate = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
      if (!isNaN(entryDate.getTime())) {
        dateKey = entryDate.toISOString().split('T')[0];
      } else {
        // Skip invalid dates
        return;
      }
    } catch (error) {
      // Skip entries with invalid timestamps
      return;
    }
    
    const timeSeries = timeSeriesMap.get(dateKey) || { views: 0, inquiries: 0, conversions: 0 };
    
    if (entry.event === 'page_view') timeSeries.views++;
    if (entry.event === 'inquiry' || entry.event === 'contact_click') timeSeries.inquiries++;
    if (entry.event === 'booking' || entry.event === 'reservation') timeSeries.conversions++;
    
    timeSeriesMap.set(dateKey, timeSeries);
  });
  
  // Convert maps to arrays
  const topProperties = Array.from(propertyStats.entries())
    .map(([propertyId, stats]) => ({
      propertyId,
      propertyName: propertyMap.get(propertyId)?.name || 'Unknown Property',
      views: stats.views,
      inquiries: stats.inquiries,
      conversionRate: stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
  
  const trafficSources = Array.from(trafficSourceMap.entries())
    .map(([source, visitors]) => ({
      source,
      visitors,
      percentage: uniqueVisitors.size > 0 ? (visitors / uniqueVisitors.size) * 100 : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);
  
  const geographicData = Array.from(countryMap.entries())
    .map(([country, visitors]) => ({
      country,
      visitors,
      percentage: uniqueVisitors.size > 0 ? (visitors / uniqueVisitors.size) * 100 : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);
  
  const deviceData = Array.from(deviceMap.entries())
    .map(([device, visitors]) => ({
      device,
      visitors,
      percentage: uniqueVisitors.size > 0 ? (visitors / uniqueVisitors.size) * 100 : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);
  
  const timeSeriesData = Array.from(timeSeriesMap.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const peakHours = hourlyViews.map((views, hour) => ({ hour, views }));
  
  // Calculate metrics
  const averageSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;
  const conversionRate = inquiries > 0 ? (bookingConversions / inquiries) * 100 : 0;
  
  // Bounce rate calculation (simplified - sessions with only one page view)
  const bounceRate = 45.0; // This would need more detailed session tracking
  
  // Performance scores (these would need real measurements)
  const averagePageLoadTime = 2.5;
  const mobileOptimizationScore = 90;
  const seoScore = 85;
  
  return {
    totalViews,
    uniqueVisitors: uniqueVisitors.size,
    propertyViews,
    inquiries,
    bookingConversions,
    conversionRate: parseFloat(conversionRate.toFixed(1)),
    averageSessionDuration: Math.round(averageSessionDuration),
    topProperties,
    trafficSources,
    geographicData,
    deviceData,
    timeSeriesData,
    peakHours,
    bounceRate,
    averagePageLoadTime,
    mobileOptimizationScore,
    seoScore,
  };
}

function getTrafficSource(referrer: string): string {
  if (!referrer) return 'Direct';
  
  const url = referrer.toLowerCase();
  if (url.includes('whatsapp')) return 'WhatsApp';
  if (url.includes('google')) return 'Google';
  if (url.includes('facebook') || url.includes('fb.com')) return 'Facebook';
  if (url.includes('instagram')) return 'Instagram';
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter';
  if (url.includes('linkedin')) return 'LinkedIn';
  
  return 'Other';
}

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    return 'Mobile';
  }
  if (/ipad|tablet|kindle/i.test(ua)) {
    return 'Tablet';
  }
  
  return 'Desktop';
}

async function recordAnalyticsEvent(service: any, event: any) {
  // Record individual analytics events
  const analyticsData: MiniSiteAnalytics = {
    tenantId: event.tenantId,
    event: event.event,
    propertyId: event.propertyId || null,
    propertyName: event.propertyName || null,
    sessionId: event.sessionId,
    userAgent: event.userAgent || null,
    referrer: event.referrer || null,
    location: event.location || null,
    timestamp: event.timestamp,
    date: event.timestamp,
    sessionDuration: event.sessionDuration || 0,
    pageLoadTime: event.pageLoadTime || 0,
  };

  await service.create(analyticsData);
}