/**
 * Query Optimizer for Firestore Operations
 * Implements intelligent query planning and optimization strategies
 */

import { logger } from './logger';

export interface QueryFilter {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
  value: any;
}

export interface OptimizedQuery {
  filters: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  estimatedCost: number;
  reasoning: string;
}

class QueryOptimizer {
  private readonly INDEX_PRIORITIES = {
    '==': 1,        // Equality filters are most efficient
    'in': 2,        // IN filters with limited values
    '>=': 3,        // Range filters
    '<=': 3,
    '>': 4,
    '<': 4,
    '!=': 5,        // Inequality filters
    'array-contains': 6,
    'array-contains-any': 7,
    'not-in': 8     // Least efficient
  };

  /**
   * Optimize query filters for best Firestore performance
   */
  optimizeQuery(filters: QueryFilter[], options: {
    limit?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  } = {}): OptimizedQuery {
    logger.info('Optimizing query', { 
      filterCount: filters.length, 
      hasLimit: !!options.limit,
      hasOrderBy: !!options.orderBy?.length 
    });

    // Sort filters by efficiency (most efficient first)
    const sortedFilters = [...filters].sort((a, b) => {
      const priorityA = this.INDEX_PRIORITIES[a.operator] || 10;
      const priorityB = this.INDEX_PRIORITIES[b.operator] || 10;
      return priorityA - priorityB;
    });

    // Detect and optimize common patterns
    const optimizedFilters = this.optimizeFilterPatterns(sortedFilters);
    
    // Calculate estimated query cost
    const estimatedCost = this.calculateQueryCost(optimizedFilters, options);
    
    // Generate optimization reasoning
    const reasoning = this.generateOptimizationReasoning(filters, optimizedFilters, options);

    return {
      filters: optimizedFilters,
      orderBy: options.orderBy,
      limit: options.limit,
      estimatedCost,
      reasoning
    };
  }

  /**
   * Optimize common filter patterns
   */
  private optimizeFilterPatterns(filters: QueryFilter[]): QueryFilter[] {
    const optimized: QueryFilter[] = [];
    const processedFields = new Set<string>();

    for (const filter of filters) {
      if (processedFields.has(filter.field)) {
        continue; // Skip duplicate field filters (keep the first/most efficient one)
      }

      // Optimize date range queries
      if (this.isDateField(filter.field)) {
        const dateRangeFilters = filters.filter(f => f.field === filter.field);
        const optimizedDateFilter = this.optimizeDateRange(dateRangeFilters);
        if (optimizedDateFilter.length > 0) {
          optimized.push(...optimizedDateFilter);
          processedFields.add(filter.field);
          continue;
        }
      }

      // Optimize array filters
      if (filter.operator === 'array-contains' || filter.operator === 'array-contains-any') {
        const optimizedArrayFilter = this.optimizeArrayFilter(filter);
        optimized.push(optimizedArrayFilter);
        processedFields.add(filter.field);
        continue;
      }

      // Optimize IN filters
      if (filter.operator === 'in' && Array.isArray(filter.value)) {
        const optimizedInFilter = this.optimizeInFilter(filter);
        optimized.push(optimizedInFilter);
        processedFields.add(filter.field);
        continue;
      }

      optimized.push(filter);
      processedFields.add(filter.field);
    }

    return optimized;
  }

  /**
   * Optimize date range queries by combining multiple filters
   */
  private optimizeDateRange(dateFilters: QueryFilter[]): QueryFilter[] {
    if (dateFilters.length <= 1) return dateFilters;

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    for (const filter of dateFilters) {
      if (filter.operator === '>=' || filter.operator === '>') {
        startDate = filter.value;
      } else if (filter.operator === '<=' || filter.operator === '<') {
        endDate = filter.value;
      }
    }

    const optimized: QueryFilter[] = [];
    if (startDate) {
      optimized.push({
        field: dateFilters[0].field,
        operator: '>=',
        value: startDate
      });
    }

    if (endDate) {
      optimized.push({
        field: dateFilters[0].field,
        operator: '<=',
        value: endDate
      });
    }

    return optimized.length > 0 ? optimized : dateFilters;
  }

  /**
   * Optimize array contains filters
   */
  private optimizeArrayFilter(filter: QueryFilter): QueryFilter {
    if (filter.operator === 'array-contains-any' && Array.isArray(filter.value)) {
      // Limit array-contains-any to 10 items max (Firestore limit)
      if (filter.value.length > 10) {
        logger.warn('array-contains-any limited to 10 items', { 
          field: filter.field, 
          originalCount: filter.value.length 
        });
        
        return {
          ...filter,
          value: filter.value.slice(0, 10)
        };
      }
    }

    return filter;
  }

  /**
   * Optimize IN filters
   */
  private optimizeInFilter(filter: QueryFilter): QueryFilter {
    if (Array.isArray(filter.value)) {
      // Limit IN filters to 10 items max (Firestore limit)
      if (filter.value.length > 10) {
        logger.warn('IN filter limited to 10 items', { 
          field: filter.field, 
          originalCount: filter.value.length 
        });
        
        return {
          ...filter,
          value: filter.value.slice(0, 10)
        };
      }

      // Remove duplicates and null values
      const cleanedValues = [...new Set(filter.value)].filter(v => v != null);
      
      return {
        ...filter,
        value: cleanedValues
      };
    }

    return filter;
  }

  /**
   * Calculate estimated query cost based on complexity
   */
  private calculateQueryCost(filters: QueryFilter[], options: any): number {
    let cost = 0;

    // Base cost for each filter
    filters.forEach(filter => {
      cost += this.INDEX_PRIORITIES[filter.operator] || 10;
    });

    // Additional cost for complex operations
    const complexFilters = filters.filter(f => 
      ['array-contains', 'array-contains-any', 'not-in', '!='].includes(f.operator)
    );
    cost += complexFilters.length * 5;

    // Reduce cost if limit is small
    if (options.limit && options.limit <= 50) {
      cost = Math.max(1, cost - 2);
    }

    // Increase cost for large IN arrays
    filters.forEach(filter => {
      if (filter.operator === 'in' && Array.isArray(filter.value) && filter.value.length > 5) {
        cost += Math.floor(filter.value.length / 5);
      }
    });

    return cost;
  }

  /**
   * Generate human-readable optimization reasoning
   */
  private generateOptimizationReasoning(
    originalFilters: QueryFilter[], 
    optimizedFilters: QueryFilter[], 
    options: any
  ): string {
    const reasons: string[] = [];

    if (optimizedFilters.length < originalFilters.length) {
      reasons.push(`Merged ${originalFilters.length - optimizedFilters.length} redundant filters`);
    }

    const hasEqualityFilters = optimizedFilters.some(f => f.operator === '==');
    if (hasEqualityFilters) {
      reasons.push('Prioritized equality filters for better index usage');
    }

    const hasRangeFilters = optimizedFilters.some(f => ['>=', '<=', '>', '<'].includes(f.operator));
    if (hasRangeFilters) {
      reasons.push('Optimized range queries for efficient scanning');
    }

    if (options.limit && options.limit <= 100) {
      reasons.push(`Applied limit of ${options.limit} for faster results`);
    }

    const complexFilters = optimizedFilters.filter(f => 
      ['array-contains-any', 'not-in', '!='].includes(f.operator)
    );
    if (complexFilters.length > 0) {
      reasons.push(`${complexFilters.length} complex filters may require composite indexes`);
    }

    return reasons.length > 0 ? reasons.join('; ') : 'No optimizations applied';
  }

  /**
   * Check if field is likely a date field
   */
  private isDateField(fieldName: string): boolean {
    const dateFieldPatterns = [
      /date/i,
      /time/i,
      /created/i,
      /updated/i,
      /scheduled/i,
      /expires?/i,
      /start/i,
      /end/i
    ];

    return dateFieldPatterns.some(pattern => pattern.test(fieldName));
  }

  /**
   * Suggest composite indexes based on query patterns
   */
  suggestIndexes(queries: OptimizedQuery[]): string[] {
    const indexSuggestions = new Set<string>();

    queries.forEach(query => {
      if (query.filters.length > 1) {
        // Suggest composite index for multiple filters
        const fields = query.filters.map(f => f.field);
        const uniqueFields = [...new Set(fields)];
        
        if (uniqueFields.length > 1) {
          indexSuggestions.add(`Composite index: [${uniqueFields.join(', ')}]`);
        }
      }

      // Suggest indexes for array operations
      query.filters.forEach(filter => {
        if (['array-contains', 'array-contains-any'].includes(filter.operator)) {
          indexSuggestions.add(`Array index: ${filter.field}`);
        }
      });
    });

    return Array.from(indexSuggestions);
  }
}

export const queryOptimizer = new QueryOptimizer();