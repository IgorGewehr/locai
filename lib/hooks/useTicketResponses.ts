import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import { 
  TicketResponse, 
  CreateTicketResponseRequest 
} from '@/lib/types/ticket';

interface UseTicketResponsesOptions {
  ticketId: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTicketResponsesReturn {
  responses: TicketResponse[];
  loading: boolean;
  error: string | null;
  addingResponse: boolean;
  addResponse: (data: Omit<CreateTicketResponseRequest, 'ticketId'>) => Promise<TicketResponse>;
  refreshResponses: () => Promise<void>;
  deleteResponse: (responseId: string) => Promise<void>;
}

export function useTicketResponses(options: UseTicketResponsesOptions): UseTicketResponsesReturn {
  const { 
    ticketId, 
    autoRefresh = false, 
    refreshInterval = 10000 
  } = options;

  const { tenantId } = useTenant();
  const apiClient = new ApiClient();

  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingResponse, setAddingResponse] = useState(false);

  const fetchResponses = useCallback(async () => {
    if (!tenantId || !ticketId) {
      logger.warn('[useTicketResponses] Missing tenantId or ticketId');
      setResponses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<TicketResponse[]>(
        `/api/tickets/${ticketId}/responses`
      );

      if (response.success && response.data) {
        setResponses(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch responses');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch responses';
      logger.error('[useTicketResponses] Error fetching responses:', err);
      setError(errorMessage);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, ticketId, apiClient]);

  const addResponse = useCallback(async (
    data: Omit<CreateTicketResponseRequest, 'ticketId'>
  ): Promise<TicketResponse> => {
    if (!ticketId) {
      throw new Error('No ticket ID provided');
    }

    try {
      setAddingResponse(true);
      setError(null);
      
      const requestData: CreateTicketResponseRequest = {
        ...data,
        ticketId
      };
      
      const response = await apiClient.post<TicketResponse>(
        `/api/tickets/${ticketId}/responses`, 
        requestData
      );
      
      if (response.success && response.data) {
        const newResponse = response.data;
        setResponses(prev => [...prev, newResponse]);
        return newResponse;
      } else {
        throw new Error(response.error || 'Failed to add response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add response';
      logger.error('[useTicketResponses] Error adding response:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setAddingResponse(false);
    }
  }, [ticketId, apiClient]);

  const deleteResponse = useCallback(async (responseId: string): Promise<void> => {
    if (!ticketId) {
      throw new Error('No ticket ID provided');
    }

    try {
      setError(null);
      
      const response = await apiClient.delete(
        `/api/tickets/${ticketId}/responses/${responseId}`
      );
      
      if (response.success) {
        setResponses(prev => prev.filter(r => r.id !== responseId));
      } else {
        throw new Error(response.error || 'Failed to delete response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete response';
      logger.error('[useTicketResponses] Error deleting response:', err);
      setError(errorMessage);
      throw err;
    }
  }, [ticketId, apiClient]);

  const refreshResponses = useCallback(async () => {
    await fetchResponses();
  }, [fetchResponses]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  useEffect(() => {
    if (!autoRefresh || !ticketId) return;

    const interval = setInterval(() => {
      fetchResponses();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, ticketId, fetchResponses]);

  return {
    responses,
    loading,
    error,
    addingResponse,
    addResponse,
    refreshResponses,
    deleteResponse
  };
}