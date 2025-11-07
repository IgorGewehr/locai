import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import { 
  Ticket, 
  TicketResponse, 
  UpdateTicketRequest,
  CreateTicketResponseRequest,
  TicketDetailResponse 
} from '@/lib/types/ticket';

interface UseTicketOptions {
  ticketId: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTicketReturn {
  ticket: Ticket | null;
  responses: TicketResponse[];
  loading: boolean;
  error: string | null;
  updating: boolean;
  addingResponse: boolean;
  updateTicket: (data: UpdateTicketRequest) => Promise<void>;
  addResponse: (data: CreateTicketResponseRequest) => Promise<void>;
  deleteTicket: () => Promise<void>;
  refreshTicket: () => Promise<void>;
  markAsRead: () => Promise<void>;
}

export function useTicket(options: UseTicketOptions): UseTicketReturn {
  const { 
    ticketId, 
    autoRefresh = false, 
    refreshInterval = 10000 
  } = options;

  const { tenantId } = useTenant();
  const apiClient = new ApiClient();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [addingResponse, setAddingResponse] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!tenantId || !ticketId) {
      logger.warn('[useTicket] Missing tenantId or ticketId');
      setTicket(null);
      setResponses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<TicketDetailResponse>(
        `/api/tickets/${ticketId}`
      );

      if (response.success && response.data) {
        setTicket(response.data.ticket);
        setResponses(response.data.responses || []);
      } else {
        throw new Error(response.error || 'Failed to fetch ticket');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch ticket';
      logger.error('[useTicket] Error fetching ticket:', err);
      setError(errorMessage);
      setTicket(null);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, ticketId, apiClient]);

  const updateTicket = useCallback(async (data: UpdateTicketRequest): Promise<void> => {
    if (!ticketId) {
      throw new Error('No ticket ID provided');
    }

    try {
      setUpdating(true);
      setError(null);
      
      const response = await apiClient.put<Ticket>(
        `/api/tickets/${ticketId}`, 
        data
      );
      
      if (response.success && response.data) {
        setTicket(response.data);
      } else {
        throw new Error(response.error || 'Failed to update ticket');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ticket';
      logger.error('[useTicket] Error updating ticket:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [ticketId, apiClient]);

  const addResponse = useCallback(async (data: CreateTicketResponseRequest): Promise<void> => {
    if (!ticketId) {
      throw new Error('No ticket ID provided');
    }

    try {
      setAddingResponse(true);
      setError(null);
      
      const response = await apiClient.post<TicketResponse>(
        `/api/tickets/${ticketId}/responses`, 
        data
      );
      
      if (response.success && response.data) {
        setResponses(prev => [...prev, response.data!]);
        
        // Update ticket status if changed
        if (data.newStatus && ticket) {
          setTicket({ ...ticket, status: data.newStatus });
        }
      } else {
        throw new Error(response.error || 'Failed to add response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add response';
      logger.error('[useTicket] Error adding response:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setAddingResponse(false);
    }
  }, [ticketId, ticket, apiClient]);

  const deleteTicket = useCallback(async (): Promise<void> => {
    if (!ticketId) {
      throw new Error('No ticket ID provided');
    }

    try {
      setError(null);
      
      const response = await apiClient.delete(`/api/tickets/${ticketId}`);
      
      if (response.success) {
        setTicket(null);
        setResponses([]);
      } else {
        throw new Error(response.error || 'Failed to delete ticket');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete ticket';
      logger.error('[useTicket] Error deleting ticket:', err);
      setError(errorMessage);
      throw err;
    }
  }, [ticketId, apiClient]);

  const markAsRead = useCallback(async (): Promise<void> => {
    if (!ticketId) return;

    try {
      const response = await apiClient.post(`/api/tickets/${ticketId}/read`, {});
      
      if (response.success && ticket) {
        setTicket({ ...ticket, unreadCount: 0 });
      }
    } catch (err) {
      logger.error('[useTicket] Error marking ticket as read:', err);
    }
  }, [ticketId, ticket, apiClient]);

  const refreshTicket = useCallback(async () => {
    await fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (!autoRefresh || !ticketId) return;

    const interval = setInterval(() => {
      fetchTicket();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, ticketId, fetchTicket]);

  // Mark as read when ticket is viewed
  useEffect(() => {
    if (ticket && ticket.unreadCount > 0) {
      markAsRead();
    }
  }, [ticket, markAsRead]);

  return {
    ticket,
    responses,
    loading,
    error,
    updating,
    addingResponse,
    updateTicket,
    addResponse,
    deleteTicket,
    refreshTicket,
    markAsRead
  };
}