import { useState, useMemo, useCallback } from 'react';

export interface SearchableItem {
  id: string;
  [key: string]: any;
}

export interface SearchConfig {
  searchFields: string[];
  sortOptions: {
    field: string;
    label: string;
    direction: 'asc' | 'desc';
  }[];
  filterOptions: {
    field: string;
    label: string;
    type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean';
    options?: Array<{ value: any; label: string }>;
  }[];
}

export interface SearchState {
  searchTerm: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, any>;
  page: number;
  pageSize: number;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  filteredCount: number;
  hasMore: boolean;
  isEmpty: boolean;
}

export interface SearchActions {
  setSearchTerm: (term: string) => void;
  setSortBy: (field: string, direction?: 'asc' | 'desc') => void;
  setFilter: (field: string, value: any) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

const initialState: SearchState = {
  searchTerm: '',
  sortBy: '',
  sortDirection: 'desc',
  filters: {},
  page: 1,
  pageSize: 10,
};

export function useUnifiedSearch<T extends SearchableItem>(
  data: T[],
  config: SearchConfig,
  initialFilters?: Record<string, any>
): SearchResult<T> & SearchActions {
  const [state, setState] = useState<SearchState>({
    ...initialState,
    filters: initialFilters || {},
  });

  // Search functionality
  const searchedData = useMemo(() => {
    if (!state.searchTerm) return data;

    const lowercaseSearchTerm = state.searchTerm.toLowerCase();
    
    return data.filter(item =>
      config.searchFields.some(field => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(lowercaseSearchTerm);
      })
    );
  }, [data, state.searchTerm, config.searchFields]);

  // Filter functionality
  const filteredData = useMemo(() => {
    return searchedData.filter(item => {
      return Object.entries(state.filters).every(([field, filterValue]) => {
        if (filterValue === undefined || filterValue === null || filterValue === '') {
          return true;
        }

        const itemValue = getNestedValue(item, field);
        const filterConfig = config.filterOptions.find(opt => opt.field === field);

        if (!filterConfig) return true;

        switch (filterConfig.type) {
          case 'select':
            return itemValue === filterValue;
          
          case 'multiselect':
            if (!Array.isArray(filterValue)) return true;
            return filterValue.length === 0 || filterValue.includes(itemValue);
          
          case 'boolean':
            return itemValue === filterValue;
          
          case 'date':
            if (!filterValue) return true;
            const itemDate = new Date(itemValue);
            const filterDate = new Date(filterValue);
            return itemDate.toDateString() === filterDate.toDateString();
          
          case 'daterange':
            if (!filterValue?.start || !filterValue?.end) return true;
            const itemDateValue = new Date(itemValue);
            const startDate = new Date(filterValue.start);
            const endDate = new Date(filterValue.end);
            return itemDateValue >= startDate && itemDateValue <= endDate;
          
          case 'number':
            if (typeof filterValue === 'object' && filterValue !== null) {
              const { min, max } = filterValue;
              const numValue = Number(itemValue);
              if (min !== undefined && numValue < min) return false;
              if (max !== undefined && numValue > max) return false;
              return true;
            }
            return Number(itemValue) === Number(filterValue);
          
          default:
            return true;
        }
      });
    });
  }, [searchedData, state.filters, config.filterOptions]);

  // Sort functionality
  const sortedData = useMemo(() => {
    if (!state.sortBy) return filteredData;

    const sortConfig = config.sortOptions.find(opt => opt.field === state.sortBy);
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, state.sortBy);
      const bValue = getNestedValue(b, state.sortBy);

      let comparison = 0;
      
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;

      return state.sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [filteredData, state.sortBy, state.sortDirection, config.sortOptions]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (state.page - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, state.page, state.pageSize]);

  // Actions
  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term, page: 1 }));
  }, []);

  const setSortBy = useCallback((field: string, direction: 'asc' | 'desc' = 'desc') => {
    setState(prev => ({ ...prev, sortBy: field, sortDirection: direction }));
  }, []);

  const setFilter = useCallback((field: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [field]: value },
      page: 1,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: {}, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...initialState, filters: initialFilters || {} });
  }, [initialFilters]);

  // Results
  const totalCount = data.length;
  const filteredCount = sortedData.length;
  const hasMore = state.page * state.pageSize < filteredCount;
  const isEmpty = filteredCount === 0;

  return {
    items: paginatedData,
    totalCount,
    filteredCount,
    hasMore,
    isEmpty,
    setSearchTerm,
    setSortBy,
    setFilter,
    clearFilters,
    setPage,
    setPageSize,
    reset,
  };
}

// Helper function to get nested values from objects
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Hook for managing search state across components
export function useSearchState(initialState?: Partial<SearchState>) {
  const [state, setState] = useState<SearchState>({
    ...initialState,
    ...initialState,
  });

  const updateState = useCallback((updates: Partial<SearchState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return { state, updateState };
}

// Hook for common search configurations
export function useSearchConfig() {
  const clientSearchConfig: SearchConfig = {
    searchFields: ['name', 'email', 'phone', 'company'],
    sortOptions: [
      { field: 'name', label: 'Nome', direction: 'asc' },
      { field: 'createdAt', label: 'Data de Criação', direction: 'desc' },
      { field: 'lastContact', label: 'Último Contato', direction: 'desc' },
    ],
    filterOptions: [
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' },
          { value: 'pending', label: 'Pendente' },
        ],
      },
      {
        field: 'source',
        label: 'Origem',
        type: 'multiselect',
        options: [
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'website', label: 'Website' },
          { value: 'referral', label: 'Indicação' },
        ],
      },
      {
        field: 'createdAt',
        label: 'Data de Criação',
        type: 'daterange',
      },
    ],
  };

  const propertySearchConfig: SearchConfig = {
    searchFields: ['name', 'location.address', 'location.city', 'description'],
    sortOptions: [
      { field: 'name', label: 'Nome', direction: 'asc' },
      { field: 'pricing.basePrice', label: 'Preço', direction: 'desc' },
      { field: 'createdAt', label: 'Data de Criação', direction: 'desc' },
    ],
    filterOptions: [
      {
        field: 'isActive',
        label: 'Status',
        type: 'boolean',
      },
      {
        field: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: 'apartment', label: 'Apartamento' },
          { value: 'house', label: 'Casa' },
          { value: 'condo', label: 'Condomínio' },
        ],
      },
      {
        field: 'bedrooms',
        label: 'Quartos',
        type: 'number',
      },
      {
        field: 'pricing.basePrice',
        label: 'Preço',
        type: 'number',
      },
    ],
  };

  const reservationSearchConfig: SearchConfig = {
    searchFields: ['clientName', 'propertyName', 'confirmationCode'],
    sortOptions: [
      { field: 'checkIn', label: 'Check-in', direction: 'desc' },
      { field: 'createdAt', label: 'Data de Criação', direction: 'desc' },
      { field: 'totalAmount', label: 'Valor Total', direction: 'desc' },
    ],
    filterOptions: [
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'confirmed', label: 'Confirmada' },
          { value: 'pending', label: 'Pendente' },
          { value: 'cancelled', label: 'Cancelada' },
        ],
      },
      {
        field: 'checkIn',
        label: 'Check-in',
        type: 'daterange',
      },
      {
        field: 'paymentStatus',
        label: 'Status do Pagamento',
        type: 'select',
        options: [
          { value: 'paid', label: 'Pago' },
          { value: 'pending', label: 'Pendente' },
          { value: 'overdue', label: 'Vencido' },
        ],
      },
    ],
  };

  return {
    clientSearchConfig,
    propertySearchConfig,
    reservationSearchConfig,
  };
}