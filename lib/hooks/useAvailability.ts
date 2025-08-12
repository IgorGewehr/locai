// lib/hooks/useAvailability.ts
import { useState, useEffect, useCallback } from 'react';
import { AvailabilityService } from '@/lib/services/availability-service';
import { AvailabilityResponse, AvailabilityStatus } from '@/lib/types/availability';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';

interface UseAvailabilityProps {
  propertyId?: string;
  startDate?: Date;
  endDate?: Date;
  includeReservations?: boolean;
  includePricing?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useAvailability({
  propertyId,
  startDate,
  endDate,
  includeReservations = true,
  includePricing = false,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: UseAvailabilityProps = {}) {
  
  const { tenantId } = useTenant();
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const availabilityService = tenantId ? new AvailabilityService(tenantId) : null;

  const fetchAvailability = useCallback(async () => {
    if (!availabilityService || !propertyId || !startDate || !endDate) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await availabilityService.getAvailability({
        propertyId,
        startDate,
        endDate,
        includeReservations,
        includePricing
      });

      setAvailability(response);

      logger.info('Availability data fetched successfully', {
        propertyId,
        tenantId,
        dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch availability';
      setError(errorMessage);
      
      logger.error('Error fetching availability', {
        propertyId,
        tenantId,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [availabilityService, propertyId, startDate, endDate, includeReservations, includePricing, tenantId]);

  // Check if a specific date range is available
  const checkAvailability = useCallback(async (checkIn: Date, checkOut: Date): Promise<boolean> => {
    if (!availabilityService || !propertyId) {
      return false;
    }

    try {
      return await availabilityService.checkAvailability(propertyId, checkIn, checkOut);
    } catch (error) {
      logger.error('Error checking availability', {
        propertyId,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, [availabilityService, propertyId, tenantId]);

  // Update availability for date range
  const updateAvailability = useCallback(async (
    updateStartDate: Date,
    updateEndDate: Date,
    status: AvailabilityStatus,
    reason?: string
  ): Promise<boolean> => {
    if (!availabilityService || !propertyId) {
      return false;
    }

    try {
      await availabilityService.updateAvailability({
        propertyId,
        startDate: updateStartDate,
        endDate: updateEndDate,
        status,
        reason
      }, 'user');

      // Refresh data after update
      await fetchAvailability();
      
      return true;
    } catch (error) {
      logger.error('Error updating availability', {
        propertyId,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, [availabilityService, propertyId, tenantId, fetchAvailability]);

  // Bulk update availability for multiple dates
  const bulkUpdateAvailability = useCallback(async (
    updates: Array<{ date: Date; status: AvailabilityStatus; reason?: string }>
  ): Promise<boolean> => {
    if (!availabilityService || !propertyId) {
      return false;
    }

    try {
      await availabilityService.bulkUpdateAvailability({
        propertyId,
        updates
      }, 'user');

      // Refresh data after update
      await fetchAvailability();
      
      return true;
    } catch (error) {
      logger.error('Error bulk updating availability', {
        propertyId,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, [availabilityService, propertyId, tenantId, fetchAvailability]);

  // Initial fetch
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchAvailability, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAvailability]);

  return {
    availability,
    loading,
    error,
    refetch: fetchAvailability,
    checkAvailability,
    updateAvailability,
    bulkUpdateAvailability
  };
}

// Hook for checking availability without loading full calendar
export function useAvailabilityCheck(propertyId?: string) {
  const { tenantId } = useTenant();
  const [checking, setChecking] = useState(false);
  
  const availabilityService = tenantId ? new AvailabilityService(tenantId) : null;

  const checkAvailability = useCallback(async (checkIn: Date, checkOut: Date): Promise<boolean> => {
    if (!availabilityService || !propertyId) {
      return false;
    }

    try {
      setChecking(true);
      return await availabilityService.checkAvailability(propertyId, checkIn, checkOut);
    } catch (error) {
      logger.error('Error checking availability', {
        propertyId,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    } finally {
      setChecking(false);
    }
  }, [availabilityService, propertyId, tenantId]);

  return {
    checkAvailability,
    checking
  };
}