import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import { Lead, LeadStatus, InteractionType, LeadTemperature } from '@/lib/types/crm';

interface LeadFilters {
  status?: LeadStatus[];
  temperature?: LeadTemperature[];
  source?: string[];
  scoreRange?: { min: number; max: number };
  dateRange?: { start: string; end: string };
  tags?: string[];
  assignedTo?: string[];
  search?: string;
  sortBy?: 'score' | 'createdAt' | 'updatedAt' | 'lastContact';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface LeadInsights {
  conversionProbability: number;
  recommendedActions: string[];
  nextBestContact: {
    channel: 'whatsapp' | 'email' | 'phone' | 'visit';
    timing: string;
    message?: string;
  };
  similarLeads: Lead[];
  riskFactors: string[];
  opportunities: string[];
  predictedValue: number;
  timeToConversion: number; // days
}

interface LeadActivityLog {
  id: string;
  leadId: string;
  type: 'interaction' | 'status_change' | 'score_change' | 'assignment' | 'note';
  description: string;
  details: any;
  createdAt: Date;
  createdBy: string;
}

interface UseLeadsReturn {
  // Data
  leads: Lead[];
  selectedLead: Lead | null;
  totalCount: number;
  
  // Insights & Analytics
  insights: LeadInsights | null;
  activityLog: LeadActivityLog[];
  
  // Loading states
  loading: boolean;
  insightsLoading: boolean;
  activityLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Lead operations
  getLead: (id: string) => Promise<Lead | null>;
  createLead: (leadData: Partial<Lead>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  duplicateLead: (id: string) => Promise<Lead>;
  
  // Lead management
  assignLead: (id: string, assignedTo: string) => Promise<void>;
  changeLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  updateLeadTemperature: (id: string, temperature: LeadTemperature) => Promise<void>;
  addLeadNote: (id: string, note: string, isPrivate?: boolean) => Promise<void>;
  addLeadTag: (id: string, tag: string) => Promise<void>;
  removeLeadTag: (id: string, tag: string) => Promise<void>;
  
  // Interactions
  addInteraction: (leadId: string, interaction: {
    type: InteractionType;
    channel: 'whatsapp' | 'email' | 'phone' | 'visit' | 'website';
    description: string;
    outcome?: 'positive' | 'negative' | 'neutral';
    duration?: number; // minutes
    cost?: number;
    scheduledFollowUp?: Date;
    attachments?: string[];
  }) => Promise<void>;
  
  // Lead scoring & AI
  recalculateLeadScore: (id: string) => Promise<number>;
  getLeadInsights: (id: string) => Promise<LeadInsights>;
  getAIRecommendations: (id: string) => Promise<string[]>;
  predictConversion: (id: string) => Promise<{ probability: number; confidence: number }>;
  
  // Bulk operations
  bulkAssign: (leadIds: string[], assignedTo: string) => Promise<void>;
  bulkStatusChange: (leadIds: string[], status: LeadStatus) => Promise<void>;
  bulkTemperatureChange: (leadIds: string[], temperature: LeadTemperature) => Promise<void>;
  bulkAddTags: (leadIds: string[], tags: string[]) => Promise<void>;
  bulkDelete: (leadIds: string[]) => Promise<void>;
  
  // Activity tracking
  getLeadActivity: (id: string) => Promise<LeadActivityLog[]>;
  
  // Filters & search
  updateFilters: (filters: Partial<LeadFilters>) => void;
  clearFilters: () => void;
  applyQuickFilter: (filter: 'hot' | 'warm' | 'cold' | 'new' | 'qualified' | 'contacted' | 'nurturing') => void;
  
  // Selection
  selectLead: (lead: Lead | null) => void;
  
  // Refresh
  refreshLeads: () => Promise<void>;
  refreshSelectedLead: () => Promise<void>;
}

export function useLeads(options: {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilters?: LeadFilters;
  preloadInsights?: boolean;
} = {}): UseLeadsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    initialFilters = {},
    preloadInsights = false
  } = options;

  const { tenantId } = useTenant();
  const apiClient = new ApiClient();

  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [insights, setInsights] = useState<LeadInsights | null>(null);
  const [activityLog, setActivityLog] = useState<LeadActivityLog[]>([]);
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leads with filters
  const fetchLeads = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      
      if (filters.status?.length) queryParams.append('status', filters.status.join(','));
      if (filters.temperature?.length) queryParams.append('temperature', filters.temperature.join(','));
      if (filters.source?.length) queryParams.append('source', filters.source.join(','));
      if (filters.assignedTo?.length) queryParams.append('assignedTo', filters.assignedTo.join(','));
      if (filters.tags?.length) queryParams.append('tags', filters.tags.join(','));
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
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

      const response = await apiClient.get<{ leads: Lead[]; total: number }>(`/api/crm/leads?${queryParams.toString()}`);
      
      if (response.success && response.data) {
        setLeads(response.data.leads);
        setTotalCount(response.data.total);
      } else {
        throw new Error(response.error || 'Failed to fetch leads');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leads';
      logger.error('[useLeads] Error fetching leads:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters, apiClient]);

  // Get single lead
  const getLead = useCallback(async (id: string): Promise<Lead | null> => {
    try {
      const response = await apiClient.get<Lead>(`/api/crm/leads/${id}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err) {
      logger.error('[useLeads] Error fetching lead:', err);
      return null;
    }
  }, [apiClient]);

  // Create lead
  const createLead = useCallback(async (leadData: Partial<Lead>): Promise<Lead> => {
    try {
      const response = await apiClient.post<Lead>('/api/crm/leads', leadData);
      
      if (response.success && response.data) {
        await fetchLeads(); // Refresh leads list
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create lead');
      }
    } catch (err) {
      logger.error('[useLeads] Error creating lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  // Update lead
  const updateLead = useCallback(async (id: string, updates: Partial<Lead>): Promise<void> => {
    try {
      const response = await apiClient.put(`/api/crm/leads/${id}`, updates);
      
      if (response.success) {
        await fetchLeads(); // Refresh leads list
        
        // Update selected lead if it's the one being updated
        if (selectedLead?.id === id) {
          const updatedLead = await getLead(id);
          if (updatedLead) setSelectedLead(updatedLead);
        }
      } else {
        throw new Error(response.error || 'Failed to update lead');
      }
    } catch (err) {
      logger.error('[useLeads] Error updating lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, selectedLead, getLead]);

  // Delete lead
  const deleteLead = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await apiClient.delete(`/api/crm/leads/${id}`);
      
      if (response.success) {
        await fetchLeads(); // Refresh leads list
        
        // Clear selected lead if it was deleted
        if (selectedLead?.id === id) {
          setSelectedLead(null);
          setInsights(null);
          setActivityLog([]);
        }
      } else {
        throw new Error(response.error || 'Failed to delete lead');
      }
    } catch (err) {
      logger.error('[useLeads] Error deleting lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, selectedLead]);

  // Duplicate lead
  const duplicateLead = useCallback(async (id: string): Promise<Lead> => {
    try {
      const response = await apiClient.post<Lead>(`/api/crm/leads/${id}/duplicate`);
      
      if (response.success && response.data) {
        await fetchLeads(); // Refresh leads list
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to duplicate lead');
      }
    } catch (err) {
      logger.error('[useLeads] Error duplicating lead:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  // Assign lead
  const assignLead = useCallback(async (id: string, assignedTo: string): Promise<void> => {
    await updateLead(id, { assignedTo });
  }, [updateLead]);

  // Change lead status
  const changeLeadStatus = useCallback(async (id: string, status: LeadStatus): Promise<void> => {
    await updateLead(id, { status });
  }, [updateLead]);

  // Update lead temperature
  const updateLeadTemperature = useCallback(async (id: string, temperature: LeadTemperature): Promise<void> => {
    await updateLead(id, { temperature });
  }, [updateLead]);

  // Add note to lead
  const addLeadNote = useCallback(async (id: string, note: string, isPrivate = false): Promise<void> => {
    try {
      const response = await apiClient.post(`/api/crm/leads/${id}/notes`, { note, isPrivate });
      
      if (response.success) {
        await fetchLeads(); // Refresh to show new note
        
        if (selectedLead?.id === id) {
          const updatedLead = await getLead(id);
          if (updatedLead) setSelectedLead(updatedLead);
        }
      } else {
        throw new Error(response.error || 'Failed to add note');
      }
    } catch (err) {
      logger.error('[useLeads] Error adding note:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, selectedLead, getLead]);

  // Add tag to lead
  const addLeadTag = useCallback(async (id: string, tag: string): Promise<void> => {
    const lead = leads.find(l => l.id === id) || selectedLead;
    if (!lead) return;

    const currentTags = lead.tags || [];
    if (!currentTags.includes(tag)) {
      await updateLead(id, { tags: [...currentTags, tag] });
    }
  }, [leads, selectedLead, updateLead]);

  // Remove tag from lead
  const removeLeadTag = useCallback(async (id: string, tag: string): Promise<void> => {
    const lead = leads.find(l => l.id === id) || selectedLead;
    if (!lead) return;

    const currentTags = lead.tags || [];
    const updatedTags = currentTags.filter(t => t !== tag);
    await updateLead(id, { tags: updatedTags });
  }, [leads, selectedLead, updateLead]);

  // Add interaction
  const addInteraction = useCallback(async (
    leadId: string,
    interaction: {
      type: InteractionType;
      channel: 'whatsapp' | 'email' | 'phone' | 'visit' | 'website';
      description: string;
      outcome?: 'positive' | 'negative' | 'neutral';
      duration?: number;
      cost?: number;
      scheduledFollowUp?: Date;
      attachments?: string[];
    }
  ): Promise<void> => {
    try {
      const response = await apiClient.post(`/api/crm/leads/${leadId}/interactions`, interaction);
      
      if (response.success) {
        await fetchLeads(); // Refresh to show updated interaction data
        
        if (selectedLead?.id === leadId) {
          const updatedLead = await getLead(leadId);
          if (updatedLead) setSelectedLead(updatedLead);
        }
      } else {
        throw new Error(response.error || 'Failed to add interaction');
      }
    } catch (err) {
      logger.error('[useLeads] Error adding interaction:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, selectedLead, getLead]);

  // Recalculate lead score
  const recalculateLeadScore = useCallback(async (id: string): Promise<number> => {
    try {
      const response = await apiClient.post<{ score: number }>(`/api/crm/leads/${id}/recalculate-score`);
      
      if (response.success && response.data) {
        await fetchLeads(); // Refresh to show updated score
        
        if (selectedLead?.id === id) {
          const updatedLead = await getLead(id);
          if (updatedLead) setSelectedLead(updatedLead);
        }
        
        return response.data.score;
      } else {
        throw new Error(response.error || 'Failed to recalculate score');
      }
    } catch (err) {
      logger.error('[useLeads] Error recalculating score:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, selectedLead, getLead]);

  // Get lead insights
  const getLeadInsights = useCallback(async (id: string): Promise<LeadInsights> => {
    try {
      setInsightsLoading(true);
      
      const response = await apiClient.get<LeadInsights>(`/api/crm/leads/${id}/insights`);
      
      if (response.success && response.data) {
        if (selectedLead?.id === id) {
          setInsights(response.data);
        }
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to get insights');
      }
    } catch (err) {
      logger.error('[useLeads] Error getting insights:', err);
      throw err;
    } finally {
      setInsightsLoading(false);
    }
  }, [apiClient, selectedLead]);

  // Get AI recommendations
  const getAIRecommendations = useCallback(async (id: string): Promise<string[]> => {
    try {
      const response = await apiClient.get<{ recommendations: string[] }>(`/api/crm/leads/${id}/ai-recommendations`);
      
      if (response.success && response.data) {
        return response.data.recommendations;
      }
      return [];
    } catch (err) {
      logger.error('[useLeads] Error getting AI recommendations:', err);
      return [];
    }
  }, [apiClient]);

  // Predict conversion
  const predictConversion = useCallback(async (id: string): Promise<{ probability: number; confidence: number }> => {
    try {
      const response = await apiClient.get<{ probability: number; confidence: number }>(`/api/crm/leads/${id}/predict-conversion`);
      
      if (response.success && response.data) {
        return response.data;
      }
      return { probability: 0, confidence: 0 };
    } catch (err) {
      logger.error('[useLeads] Error predicting conversion:', err);
      return { probability: 0, confidence: 0 };
    }
  }, [apiClient]);

  // Bulk operations
  const bulkAssign = useCallback(async (leadIds: string[], assignedTo: string): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-assign', { leadIds, assignedTo });
      
      if (response.success) {
        await fetchLeads();
      } else {
        throw new Error(response.error || 'Failed to bulk assign leads');
      }
    } catch (err) {
      logger.error('[useLeads] Error bulk assigning leads:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  const bulkStatusChange = useCallback(async (leadIds: string[], status: LeadStatus): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-status-change', { leadIds, status });
      
      if (response.success) {
        await fetchLeads();
      } else {
        throw new Error(response.error || 'Failed to bulk change status');
      }
    } catch (err) {
      logger.error('[useLeads] Error bulk changing status:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  const bulkTemperatureChange = useCallback(async (leadIds: string[], temperature: LeadTemperature): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-temperature-change', { leadIds, temperature });
      
      if (response.success) {
        await fetchLeads();
      } else {
        throw new Error(response.error || 'Failed to bulk change temperature');
      }
    } catch (err) {
      logger.error('[useLeads] Error bulk changing temperature:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  const bulkAddTags = useCallback(async (leadIds: string[], tags: string[]): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-add-tags', { leadIds, tags });
      
      if (response.success) {
        await fetchLeads();
      } else {
        throw new Error(response.error || 'Failed to bulk add tags');
      }
    } catch (err) {
      logger.error('[useLeads] Error bulk adding tags:', err);
      throw err;
    }
  }, [apiClient, fetchLeads]);

  const bulkDelete = useCallback(async (leadIds: string[]): Promise<void> => {
    try {
      const response = await apiClient.post('/api/crm/leads/bulk-delete', { leadIds });
      
      if (response.success) {
        await fetchLeads();
        
        // Clear selected lead if it was deleted
        if (selectedLead && leadIds.includes(selectedLead.id)) {
          setSelectedLead(null);
          setInsights(null);
          setActivityLog([]);
        }
      } else {
        throw new Error(response.error || 'Failed to bulk delete leads');
      }
    } catch (err) {
      logger.error('[useLeads] Error bulk deleting leads:', err);
      throw err;
    }
  }, [apiClient, fetchLeads, selectedLead]);

  // Get lead activity
  const getLeadActivity = useCallback(async (id: string): Promise<LeadActivityLog[]> => {
    try {
      setActivityLoading(true);
      
      const response = await apiClient.get<LeadActivityLog[]>(`/api/crm/leads/${id}/activity`);
      
      if (response.success && response.data) {
        if (selectedLead?.id === id) {
          setActivityLog(response.data);
        }
        return response.data;
      }
      return [];
    } catch (err) {
      logger.error('[useLeads] Error getting lead activity:', err);
      return [];
    } finally {
      setActivityLoading(false);
    }
  }, [apiClient, selectedLead]);

  // Filter management
  const updateFilters = useCallback((newFilters: Partial<LeadFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const applyQuickFilter = useCallback((filter: string) => {
    switch (filter) {
      case 'hot':
        updateFilters({ temperature: ['hot'] });
        break;
      case 'warm':
        updateFilters({ temperature: ['warm'] });
        break;
      case 'cold':
        updateFilters({ temperature: ['cold'] });
        break;
      case 'new':
        updateFilters({ status: ['new'] });
        break;
      case 'qualified':
        updateFilters({ status: ['qualified'] });
        break;
      case 'contacted':
        updateFilters({ status: ['contacted'] });
        break;
      case 'nurturing':
        updateFilters({ status: ['nurturing'] });
        break;
    }
  }, [updateFilters]);

  // Selection management
  const selectLead = useCallback((lead: Lead | null) => {
    setSelectedLead(lead);
    
    if (lead) {
      // Load insights and activity when a lead is selected
      if (preloadInsights) {
        getLeadInsights(lead.id);
      }
      getLeadActivity(lead.id);
    } else {
      setInsights(null);
      setActivityLog([]);
    }
  }, [getLeadInsights, getLeadActivity, preloadInsights]);

  // Refresh functions
  const refreshLeads = useCallback(async () => {
    await fetchLeads();
  }, [fetchLeads]);

  const refreshSelectedLead = useCallback(async () => {
    if (selectedLead) {
      const updatedLead = await getLead(selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [selectedLead, getLead]);

  // Initial data loading
  useEffect(() => {
    if (tenantId) {
      fetchLeads();
    }
  }, [tenantId, fetchLeads]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !tenantId) return;

    const interval = setInterval(() => {
      fetchLeads();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, tenantId, fetchLeads]);

  return {
    // Data
    leads,
    selectedLead,
    totalCount,
    
    // Insights & Analytics
    insights,
    activityLog,
    
    // Loading states
    loading,
    insightsLoading,
    activityLoading,
    
    // Error states
    error,
    
    // Lead operations
    getLead,
    createLead,
    updateLead,
    deleteLead,
    duplicateLead,
    
    // Lead management
    assignLead,
    changeLeadStatus,
    updateLeadTemperature,
    addLeadNote,
    addLeadTag,
    removeLeadTag,
    
    // Interactions
    addInteraction,
    
    // Lead scoring & AI
    recalculateLeadScore,
    getLeadInsights,
    getAIRecommendations,
    predictConversion,
    
    // Bulk operations
    bulkAssign,
    bulkStatusChange,
    bulkTemperatureChange,
    bulkAddTags,
    bulkDelete,
    
    // Activity tracking
    getLeadActivity,
    
    // Filters & search
    updateFilters,
    clearFilters,
    applyQuickFilter,
    
    // Selection
    selectLead,
    
    // Refresh
    refreshLeads,
    refreshSelectedLead
  };
}