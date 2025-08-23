// lib/firebase/hooks/useVisits.ts
// Hook corrigido para usar estrutura multi-tenant e API REST
import { useState, useEffect } from 'react';
import { VisitAppointment } from '@/lib/types/visit-appointment';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';
import { ApiClient } from '@/lib/utils/api-client';

export function useVisits() {
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenantId } = useTenant();

  const fetchVisits = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.info('🔄 [useVisits] Fetching visits via API', { tenantId });
      
      const response = await ApiClient.get('/api/visits');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setVisits(result.data || []);
        logger.info('✅ [useVisits] Visits fetched successfully', { 
          tenantId, 
          count: result.data?.length || 0 
        });
      } else {
        throw new Error(result.error || 'Failed to fetch visits');
      }

    } catch (err) {
      logger.error('❌ [useVisits] Error fetching visits', { 
        tenantId, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
      setError(err as Error);
      setVisits([]); // Clear visits on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [tenantId]);

  // Return refetch function for manual refresh
  return { 
    data: visits, 
    loading, 
    error, 
    refetch: fetchVisits 
  };
}

export function useUpcomingVisits(days: number = 7) {
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenantId } = useTenant();

  const fetchUpcomingVisits = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.info('🔄 [useUpcomingVisits] Fetching upcoming visits via API', { tenantId, days });

      const response = await ApiClient.get(`/api/visits?days=${days}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Filter for only upcoming visits with appropriate status
        const upcomingVisits = (result.data || []).filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          const now = new Date();
          return visitDate >= now && ['scheduled', 'confirmed'].includes(visit.status);
        });

        setVisits(upcomingVisits);
        logger.info('✅ [useUpcomingVisits] Upcoming visits fetched successfully', { 
          tenantId, 
          days,
          count: upcomingVisits.length 
        });
      } else {
        throw new Error(result.error || 'Failed to fetch upcoming visits');
      }

    } catch (err) {
      logger.error('❌ [useUpcomingVisits] Error fetching upcoming visits', { 
        tenantId, 
        days,
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
      setError(err as Error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingVisits();
  }, [tenantId, days]);

  return { 
    data: visits, 
    loading, 
    error, 
    refetch: fetchUpcomingVisits 
  };
}

export function useTodayVisits() {
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenantId } = useTenant();

  const fetchTodayVisits = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.info('🔄 [useTodayVisits] Fetching today visits via API', { tenantId });

      const response = await ApiClient.get('/api/visits?days=1');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Filter for only today's visits
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayVisits = (result.data || []).filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          return visitDate >= today && visitDate < tomorrow;
        });

        setVisits(todayVisits);
        logger.info('✅ [useTodayVisits] Today visits fetched successfully', { 
          tenantId, 
          count: todayVisits.length 
        });
      } else {
        throw new Error(result.error || 'Failed to fetch today visits');
      }

    } catch (err) {
      logger.error('❌ [useTodayVisits] Error fetching today visits', { 
        tenantId, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
      setError(err as Error);
      setVisits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayVisits();
  }, [tenantId]);

  return { 
    data: visits, 
    loading, 
    error, 
    refetch: fetchTodayVisits 
  };
}