import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import { 
  Ticket, 
  TicketFilters, 
  TicketStats, 
  CreateTicketRequest,
  TicketsResponse 
} from '@/lib/types/ticket';

interface UseTicketsOptions {
  filters?: TicketFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTicketsReturn {
  tickets: Ticket[];
  stats: TicketStats | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  createTicket: (data: CreateTicketRequest) => Promise<Ticket>;
  refreshTickets: () => Promise<void>;
  updateFilters: (filters: TicketFilters) => void;
  markAsRead: (ticketId: string) => Promise<void>;
}

export function useTickets(options: UseTicketsOptions = {}): UseTicketsReturn {
  const { 
    filters: initialFilters = {}, 
    autoRefresh = false, 
    refreshInterval = 30000 
  } = options;

  const { tenantId } = useTenant();
  const apiClient = new ApiClient();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<TicketFilters>(initialFilters);

  const fetchTickets = useCallback(async () => {
    if (!tenantId) {
      logger.warn('[useTickets] No tenantId available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());

      const response = await apiClient.get<TicketsResponse>(
        `/api/tickets?${queryParams.toString()}`
      );

      if (response.success && response.data) {
        setTickets(response.data.tickets);
        setStats(response.data.stats || null);
        setTotalCount(response.data.total);
      } else {
        throw new Error(response.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tickets';
      logger.error('[useTickets] Error fetching tickets:', err);
      setError(errorMessage);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters, apiClient]);

  const createTicket = useCallback(async (data: CreateTicketRequest): Promise<Ticket> => {
    try {
      setError(null);
      
      const response = await apiClient.post<Ticket>('/api/tickets', data);
      
      if (response.success && response.data) {
        await fetchTickets();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create ticket');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ticket';
      logger.error('[useTickets] Error creating ticket:', err);
      setError(errorMessage);
      throw err;
    }
  }, [apiClient, fetchTickets]);

  const markAsRead = useCallback(async (ticketId: string): Promise<void> => {
    try {
      const response = await apiClient.post(`/api/tickets/${ticketId}/read`, {});
      
      if (response.success) {
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket.id === ticketId 
              ? { ...ticket, unreadCount: 0 } 
              : ticket
          )
        );
      } else {
        throw new Error(response.error || 'Failed to mark as read');
      }
    } catch (err) {
      logger.error('[useTickets] Error marking ticket as read:', err);
      throw err;
    }
  }, [apiClient]);

  const refreshTickets = useCallback(async () => {
    await fetchTickets();
  }, [fetchTickets]);

  const updateFilters = useCallback((newFilters: TicketFilters) => {
    setFilters(newFilters);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchTickets();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchTickets]);

  return {
    tickets,
    stats,
    loading,
    error,
    totalCount,
    createTicket,
    refreshTickets,
    updateFilters,
    markAsRead
  };
}