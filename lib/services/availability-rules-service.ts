import {
  AvailabilityRule,
  AvailabilityRuleType,
  AvailabilityRuleAction,
  AvailabilityRuleMatch
} from '@/lib/types/availability';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { eachDayOfInterval, getDay, getDate, isWithinInterval, format } from 'date-fns';

export class AvailabilityRulesService {
  private tenantId: string;
  private factory: TenantServiceFactory;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.factory = new TenantServiceFactory(tenantId);
  }

  /**
   * Get all active rules for a property
   */
  async getActiveRules(propertyId: string): Promise<AvailabilityRule[]> {
    try {
      const rulesService = this.factory.createService<AvailabilityRule>('availability_rules');

      const rules = await rulesService.getMany([
        { field: 'propertyId', operator: '==', value: propertyId },
        { field: 'isActive', operator: '==', value: true }
      ]);

      // Sort by priority (highest first)
      return rules.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('❌ Error getting active rules', {
        tenantId: this.tenantId,
        propertyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Create a new availability rule
   */
  async createRule(rule: Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>): Promise<string> {
    try {
      const rulesService = this.factory.createService<AvailabilityRule>('availability_rules');

      const newRule: Omit<AvailabilityRule, 'id'> = {
        ...rule,
        tenantId: this.tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const id = await rulesService.create(newRule);

      logger.info('✅ Availability rule created', {
        tenantId: this.tenantId,
        ruleId: id,
        ruleName: rule.name,
        ruleType: rule.type,
        action: rule.action
      });

      return id;
    } catch (error) {
      logger.error('❌ Error creating rule', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update an existing rule
   */
  async updateRule(ruleId: string, updates: Partial<AvailabilityRule>): Promise<void> {
    try {
      const rulesService = this.factory.createService<AvailabilityRule>('availability_rules');

      await rulesService.update(ruleId, {
        ...updates,
        updatedAt: new Date()
      });

      logger.info('✅ Availability rule updated', {
        tenantId: this.tenantId,
        ruleId,
        updates: Object.keys(updates)
      });
    } catch (error) {
      logger.error('❌ Error updating rule', {
        tenantId: this.tenantId,
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      const rulesService = this.factory.createService<AvailabilityRule>('availability_rules');
      await rulesService.delete(ruleId);

      logger.info('✅ Availability rule deleted', {
        tenantId: this.tenantId,
        ruleId
      });
    } catch (error) {
      logger.error('❌ Error deleting rule', {
        tenantId: this.tenantId,
        ruleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if a rule applies to a specific date
   */
  doesRuleApplyToDate(rule: AvailabilityRule, date: Date): boolean {
    // Check if rule is within valid date range
    if (rule.validFrom && date < rule.validFrom) return false;
    if (rule.validUntil && date > rule.validUntil) return false;

    switch (rule.type) {
      case AvailabilityRuleType.WEEKLY:
        // Check if day of week matches
        const dayOfWeek = getDay(date); // 0 = Sunday, 6 = Saturday
        return rule.pattern.dayIndexes?.includes(dayOfWeek) || false;

      case AvailabilityRuleType.MONTHLY:
        // Check if day of month matches
        const dayOfMonth = getDate(date); // 1-31
        return rule.pattern.dayIndexes?.includes(dayOfMonth) || false;

      case AvailabilityRuleType.SEASONAL:
        // Check if date is within seasonal range
        if (!rule.validFrom || !rule.validUntil) return false;
        return isWithinInterval(date, { start: rule.validFrom, end: rule.validUntil });

      case AvailabilityRuleType.CUSTOM:
        // Custom logic would go here
        // For now, return false
        return false;

      default:
        return false;
    }
  }

  /**
   * Get all rules that apply to a specific date
   */
  async getRulesForDate(propertyId: string, date: Date): Promise<AvailabilityRuleMatch[]> {
    const rules = await this.getActiveRules(propertyId);
    const matches: AvailabilityRuleMatch[] = [];

    for (const rule of rules) {
      if (this.doesRuleApplyToDate(rule, date)) {
        matches.push({
          rule,
          date,
          appliedValue: rule.actionValue
        });
      }
    }

    return matches;
  }

  /**
   * Get rules for a date range (useful for calendar generation)
   */
  async getRulesForDateRange(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, AvailabilityRuleMatch[]>> {
    const rules = await this.getActiveRules(propertyId);
    const dateRulesMap = new Map<string, AvailabilityRuleMatch[]>();

    const dates = eachDayOfInterval({ start: startDate, end: endDate });

    for (const date of dates) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const matches: AvailabilityRuleMatch[] = [];

      for (const rule of rules) {
        if (this.doesRuleApplyToDate(rule, date)) {
          matches.push({
            rule,
            date,
            appliedValue: rule.actionValue
          });
        }
      }

      if (matches.length > 0) {
        dateRulesMap.set(dateKey, matches);
      }
    }

    logger.info('📋 Rules calculated for date range', {
      tenantId: this.tenantId,
      propertyId,
      totalDays: dates.length,
      daysWithRules: dateRulesMap.size,
      totalRulesApplied: Array.from(dateRulesMap.values()).flat().length
    });

    return dateRulesMap;
  }

  /**
   * Get effective price for a date considering all price rules
   */
  async getEffectivePrice(propertyId: string, date: Date, basePrice: number): Promise<number> {
    const matches = await this.getRulesForDate(propertyId, date);

    // Filter only price rules
    const priceRules = matches.filter(m => m.rule.action === AvailabilityRuleAction.PRICE);

    if (priceRules.length === 0) {
      return basePrice;
    }

    // Return highest priority price rule
    // (rules are already sorted by priority in getActiveRules)
    return priceRules[0].appliedValue as number;
  }

  /**
   * Check if dates should be blocked based on rules
   */
  async areDatesBlockedByRules(propertyId: string, startDate: Date, endDate: Date): Promise<{
    isBlocked: boolean;
    blockedDates: Date[];
    blockingRules: AvailabilityRuleMatch[];
  }> {
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    const blockedDates: Date[] = [];
    const blockingRules: AvailabilityRuleMatch[] = [];

    for (const date of dates) {
      const matches = await this.getRulesForDate(propertyId, date);
      const blockRules = matches.filter(m => m.rule.action === AvailabilityRuleAction.BLOCK);

      if (blockRules.length > 0) {
        blockedDates.push(date);
        blockingRules.push(...blockRules);
      }
    }

    return {
      isBlocked: blockedDates.length > 0,
      blockedDates,
      blockingRules
    };
  }

  /**
   * Get minimum nights requirement based on rules
   */
  async getMinimumNights(propertyId: string, date: Date, defaultMinNights: number): Promise<number> {
    const matches = await this.getRulesForDate(propertyId, date);

    const minNightRules = matches.filter(m => m.rule.action === AvailabilityRuleAction.MIN_NIGHTS);

    if (minNightRules.length === 0) {
      return defaultMinNights;
    }

    // Return highest minimum nights requirement
    return Math.max(
      defaultMinNights,
      ...minNightRules.map(m => m.appliedValue as number)
    );
  }
}
