'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';

// Types
interface ConversationMetrics {
  conversionRate: number;
  conversionTrend: number;
  qualificationTime: number;
  qualificationTrend: number;
  totalConversations: number;
  conversationsTrend: number;
  avgConversationTime: number;
  avgTimeTrend: number;
  responseRate: number;
  responseRateTrend: number;
}

interface HeatmapData {
  hour: number;
  day: string;
  conversations: number;
  conversions: number;
  avgResponse: number;
}

interface TrendData {
  date: string;
  conversions: number;
  conversations: number;
  qualificationTime: number;
  avgTime: number;
}

interface MetricsData {
  metrics: ConversationMetrics;
  heatmapData: HeatmapData[];
  trendData: TrendData[];
  lastUpdate: Date;
}

interface UseMetricsReturn {
  data: MetricsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  trackMetric: (metric: any) => Promise<boolean>;
}

export function useMetrics(period: string = '7d'): UseMetricsReturn {
  const { tenantId, isReady } = useTenant();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!isReady || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/metrics/analytics?period=${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch metrics');
      }

      const analyticsData = result.data;

      // Transform API data to component format
      const metrics: ConversationMetrics = {
        conversionRate: analyticsData.conversions.leadToVisit,
        conversionTrend: analyticsData.conversions.change,
        qualificationTime: analyticsData.qualificationTimes.avg,
        qualificationTrend: analyticsData.qualificationTimes.change,
        totalConversations: analyticsData.engagement.totalConversations,
        conversationsTrend: analyticsData.engagement.change,
        avgConversationTime: analyticsData.avgConversationTime.avg,
        avgTimeTrend: analyticsData.avgConversationTime.change,
        responseRate: analyticsData.engagement.responseRate,
        responseRateTrend: analyticsData.engagement.change,
      };

      const metricsData: MetricsData = {
        metrics,
        heatmapData: analyticsData.heatmap,
        trendData: analyticsData.trends,
        lastUpdate: new Date(),
      };

      setData(metricsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching metrics:', errorMessage);
      setError(errorMessage);

      // Set fallback data if there's an error
      setData({
        metrics: {
          conversionRate: 0,
          conversionTrend: 0,
          qualificationTime: 0,
          qualificationTrend: 0,
          totalConversations: 0,
          conversationsTrend: 0,
          avgConversationTime: 0,
          avgTimeTrend: 0,
          responseRate: 0,
          responseRateTrend: 0,
        },
        heatmapData: [],
        trendData: [],
        lastUpdate: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [isReady, tenantId, period]);

  const trackMetric = useCallback(async (metric: any): Promise<boolean> => {
    if (!isReady || !tenantId) return false;

    try {
      const response = await fetch('/api/metrics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(metric),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success;

    } catch (err) {
      console.error('Error tracking metric:', err);
      return false;
    }
  }, [isReady, tenantId]);

  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    data,
    loading,
    error,
    refresh,
    trackMetric,
  };
}