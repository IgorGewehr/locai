import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import { Lead, LeadStatus, InteractionType } from '@/lib/types/crm';
import { Client } from '@/lib/types/client';

interface CRMFilters {
  status?: LeadStatus;
  temperature?: 'cold' | 'warm' | 'hot';
  source?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  scoreRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

interface CRMStats {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageScore: number;
  totalClients: number;
  newLeadsThisMonth: number;
  pipelineValue: number;
  topSources: Array<{ source: string; count: number; conversionRate: number }>;
  monthlyConversions: Array<{ month: string; conversions: number; revenue: number }>;
}

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  leads: Lead[];
  value: number;
}

interface UseCRMReturn {
  // Data
  leads: Lead[];
  clients: Client[];
  stats: CRMStats | null;
  pipeline: PipelineStage[];
  
  // Loading states
  loading: boolean;
  statsLoading: boolean;
  pipelineLoading: boolean;
  
  // Error states
  error: string | null;
  
  // CRUD operations
  createLead: (leadData: Partial<Lead>) => Promise<Lead>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  convertLead: (leadId: string, clientData?: Partial<Client>) => Promise<Client>;
  
  // Lead management
  moveLeadToStage: (leadId: string, stage: LeadStatus) => Promise<void>;
  updateLeadScore: (leadId: string) => Promise<number>;
  addInteraction: (leadId: string, interaction: {
    type: InteractionType;
    description: string;
    outcome?: string;
    scheduledFollowUp?: string;
  }) => Promise<void>;
  
  // Bulk operations
  bulkUpdateLeads: (leadIds: string[], updates: Partial<Lead>) => Promise<void>;
  bulkDeleteLeads: (leadIds: string[]) => Promise<void>;
  
  // Analytics & insights
  getLeadInsights: (leadId: string) => Promise<any>;
  getPredictiveAnalytics: () => Promise<any>;
  getROIAnalysis: () => Promise<any>;
  
  // Filters & search
  updateFilters: (filters: CRMFilters) => void;
  clearFilters: () => void;
  
  // Real-time updates
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshPipeline: () => Promise<void>;
}

export function useCRM(options: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilters?: CRMFilters;
} = {}): UseCRMReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    initialFilters = {}
  } = options;

  const { tenantId } = useTenant();
  const apiClient = new ApiClient();

  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [filters, setFilters] = useState<CRMFilters>(initialFilters);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads with filters
  const fetchLeads = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.temperature) queryParams.append('temperature', filters.temperature);
      if (filters.source) queryParams.append('source', filters.source);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());
      
      if (filters.scoreRange) {
        queryParams.append('minScore', filters.scoreRange.min.toString());
        queryParams.append('maxScore', filters.scoreRange.max.toString());
      }
      
      if (filters.dateRange) {
        queryParams.append('startDate', filters.dateRange.start);
        queryParams.append('endDate', filters.dateRange.end);
      }

      if (filters.tags && filters.tags.length > 0) {
        queryParams.append('tags', filters.tags.join(','));
      }

      const response = await apiClient.get<Lead[]>(`/api/crm/leads?${queryParams.toString()}`);
      
      if (response.success && response.data) {
        setLeads(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch leads');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads';
      logger.error('[useCRM] Error fetching leads:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters, apiClient]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    if (!tenantId) return;

    try {
      const response = await apiClient.get<Client[]>('/api/crm/clients');
      
      if (response.success && response.data) {
        setClients(response.data);
      }
    } catch (err) {
      logger.error('[useCRM] Error fetching clients:', err);
    }
  }, [tenantId, apiClient]);

  // Fetch CRM statistics
  const fetchStats = useCallback(async () => {
    if (!tenantId) return;

    try {
      setStatsLoading(true);
      
      const response = await apiClient.get<CRMStats>('/api/crm/stats');
      
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      logger.error('[useCRM] Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [tenantId, apiClient]);

  // Fetch pipeline data
  const fetchPipeline = useCallback(async () => {
    if (!tenantId) return;

    try {
      setPipelineLoading(true);
      
      const response = await apiClient.get<PipelineStage[]>('/api/crm/pipeline');
      
      if (response.success && response.data) {
        setPipeline(response.data);
      }
    } catch (err) {
      logger.error('[useCRM] Error fetching pipeline:', err);
    } finally {
      setPipelineLoading(false);
    }
  }, [tenantId, apiClient]);

  // Create lead
  const createLead = useCallback(async (leadData: Partial<Lead>): Promise<Lead> => {
    try {
      const response = await apiClient.post<Lead>('/api/crm/leads', leadData);
      
      if (response.success && response.data) {
        await fetchLeads(); // Refresh leads
        await fetchStats(); // Refresh stats
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create lead');
      }
    } catch (err) {
      logger.error('[useCRM] Error creating lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, fetchStats]);

  // Update lead
  const updateLead = useCallback(async (leadId: string, updates: Partial<Lead>): Promise<void> => {
    try {
      const response = await apiClient.put(`/api/crm/leads/${leadId}`, updates);
      
      if (response.success) {
        await fetchLeads(); // Refresh leads
        await fetchStats(); // Refresh stats if status changed
      } else {
        throw new Error(response.error || 'Failed to update lead');
      }
    } catch (err) {
      logger.error('[useCRM] Error updating lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, fetchStats]);

  // Delete lead
  const deleteLead = useCallback(async (leadId: string): Promise<void> => {
    try {
      const response = await apiClient.delete(`/api/crm/leads/${leadId}`);
      
      if (response.success) {
        await fetchLeads(); // Refresh leads
        await fetchStats(); // Refresh stats
      } else {
        throw new Error(response.error || 'Failed to delete lead');
      }
    } catch (err) {
      logger.error('[useCRM] Error deleting lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, fetchStats]);

  // Convert lead to client
  const convertLead = useCallback(async (leadId: string, clientData?: Partial<Client>): Promise<Client> => {
    try {
      const response = await apiClient.post<Client>(`/api/crm/leads/${leadId}/convert`, clientData || {});
      
      if (response.success && response.data) {
        await fetchLeads(); // Refresh leads
        await fetchClients(); // Refresh clients
        await fetchStats(); // Refresh stats
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to convert lead');
      }
    } catch (err) {
      logger.error('[useCRM] Error converting lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, fetchClients, fetchStats]);

  // Move lead to stage
  const moveLeadToStage = useCallback(async (leadId: string, stage: LeadStatus): Promise<void> => {
    await updateLead(leadId, { status: stage });
    await fetchPipeline(); // Refresh pipeline
  }, [updateLead, fetchPipeline]);

  // Update lead score
  const updateLeadScore = useCallback(async (leadId: string): Promise<number> => {
    try {
      const response = await apiClient.post<{ score: number }>(`/api/crm/leads/${leadId}/score`);
      
      if (response.success && response.data) {
        await fetchLeads(); // Refresh to show updated score
        return response.data.score;
      } else {
        throw new Error(response.error || 'Failed to update lead score');
      }
    } catch (err) {
      logger.error('[useCRM] Error updating lead score:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  // Add interaction
  const addInteraction = useCallback(async (
    leadId: string, 
    interaction: {
      type: InteractionType;
      description: string;
      outcome?: string;
      scheduledFollowUp?: string;
    }
  ): Promise<void> => {
    try {
      const response = await apiClient.post(`/api/crm/leads/${leadId}/interactions`, interaction);
      
      if (response.success) {
        await fetchLeads(); // Refresh to show updated interactions
      } else {
        throw new Error(response.error || 'Failed to add interaction');
      }
    } catch (err) {
      logger.error('[useCRM] Error adding interaction:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  // Bulk operations
  const bulkUpdateLeads = useCallback(async (leadIds: string[], updates: Partial<Lead>): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-update', { leadIds, updates });
      
      if (response.success) {
        await fetchLeads();
        await fetchStats();
      } else {
        throw new Error(response.error || 'Failed to bulk update leads');
      }
    } catch (err) {
      logger.error('[useCRM] Error bulk updating leads:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, fetchStats]);

  const bulkDeleteLeads = useCallback(async (leadIds: string[]): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-delete', { leadIds });
      
      if (response.success) {
        await fetchLeads();
        await fetchStats();
      } else {
        throw new Error(response.error || 'Failed to bulk delete leads');
      }
    } catch (err) {
      logger.error('[useCRM] Error bulk deleting leads:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, fetchStats]);

  // Analytics functions
  const getLeadInsights = useCallback(async (leadId: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/api/crm/leads/${leadId}/insights`);
      return response.data;
    } catch (err) {
      logger.error('[useCRM] Error getting lead insights:', err);
      throw err;
    }
  }, [apiClient]);

  const getPredictiveAnalytics = useCallback(async (): Promise<any> => {
    try {
      const response = await apiClient.get('/api/crm/analytics/predictive');
      return response.data;
    } catch (err) {
      logger.error('[useCRM] Error getting predictive analytics:', err);
      throw err;
    }
  }, [apiClient]);

  const getROIAnalysis = useCallback(async (): Promise<any> => {
    try {
      const response = await apiClient.get('/api/crm/analytics/roi');
      return response.data;
    } catch (err) {
      logger.error('[useCRM] Error getting ROI analysis:', err);
      throw err;
    }
  }, [apiClient]);

  // Filter management
  const updateFilters = useCallback((newFilters: CRMFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Refresh functions
  const refreshData = useCallback(async () => {
    await Promise.all([fetchLeads(), fetchClients()]);
  }, [fetchLeads, fetchClients]);

  const refreshStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const refreshPipeline = useCallback(async () => {
    await fetchPipeline();
  }, [fetchPipeline]);

  // Initial data loading
  useEffect(() => {
    if (tenantId) {
      Promise.all([
        fetchLeads(),
        fetchClients(),
        fetchStats(),
        fetchPipeline()
      ]);
    }
  }, [tenantId, fetchLeads, fetchClients, fetchStats, fetchPipeline]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !tenantId) return;

    const interval = setInterval(() => {
      refreshData();
      refreshStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, tenantId, refreshData, refreshStats]);

  return {
    // Data
    leads,
    clients,
    stats,
    pipeline,
    
    // Loading states
    loading,
    statsLoading,
    pipelineLoading,
    
    // Error states
    error,
    
    // CRUD operations
    createLead,
    updateLead,
    deleteLead,
    convertLead,
    
    // Lead management
    moveLeadToStage,
    updateLeadScore,
    addInteraction,
    
    // Bulk operations
    bulkUpdateLeads,
    bulkDeleteLeads,
    
    // Analytics & insights
    getLeadInsights,
    getPredictiveAnalytics,
    getROIAnalysis,
    
    // Filters & search
    updateFilters,
    clearFilters,
    
    // Real-time updates
    refreshData,
    refreshStats,
    refreshPipeline
  };
}