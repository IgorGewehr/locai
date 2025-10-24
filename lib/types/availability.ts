// lib/types/availability.ts

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  BLOCKED = 'blocked',
  MAINTENANCE = 'maintenance',
  PENDING = 'pending' // For reservations being processed
}

export interface AvailabilityPeriod {
  id: string;
  propertyId: string;
  startDate: Date;
  endDate: Date;
  status: AvailabilityStatus;
  reservationId?: string; // Link to reservation if status is RESERVED
  reason?: string; // Reason for BLOCKED or MAINTENANCE
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AvailabilityCalendarDay {
  date: Date;
  status: AvailabilityStatus;
  price?: number;
  isWeekend: boolean;
  isHoliday: boolean;
  isToday: boolean;
  isPast: boolean;
  reservationId?: string;
  reason?: string;
}

export interface AvailabilityUpdate {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  status: AvailabilityStatus;
  reason?: string;
  notes?: string;
}

export interface AvailabilityQuery {
  propertyId: string;
  startDate: Date;
  endDate: Date;
  includeReservations?: boolean;
  includePricing?: boolean;
}

export interface AvailabilityResponse {
  propertyId: string;
  periods: AvailabilityPeriod[];
  calendar: AvailabilityCalendarDay[];
  summary: {
    totalDays: number;
    availableDays: number;
    reservedDays: number;
    blockedDays: number;
    occupancyRate: number;
  };
}

export interface BulkAvailabilityUpdate {
  propertyId: string;
  updates: Array<{
    date: Date;
    status: AvailabilityStatus;
    reason?: string;
  }>;
}

// Sync status for calendar state management
export enum CalendarSyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface CalendarState {
  selectedDates: Date[];
  viewMonth: Date;
  syncStatus: CalendarSyncStatus;
  lastSyncTime?: Date;
  error?: string;
}

// Availability Rules for recurring patterns
export enum AvailabilityRuleType {
  WEEKLY = 'weekly',         // Repeat every week on specific days
  MONTHLY = 'monthly',       // Repeat every month on specific days
  SEASONAL = 'seasonal',     // Specific date range
  CUSTOM = 'custom'          // Custom pattern
}

export enum AvailabilityRuleAction {
  BLOCK = 'block',           // Block dates
  PRICE = 'price',           // Set custom price
  MIN_NIGHTS = 'min_nights', // Set minimum nights requirement
  MAX_NIGHTS = 'max_nights'  // Set maximum nights allowed
}

export interface AvailabilityRulePattern {
  // For WEEKLY: [0,6] = Sunday and Saturday (0-6)
  // For MONTHLY: [1,15] = 1st and 15th of each month (1-31)
  // For SEASONAL: Not used (dates in main rule)
  dayIndexes?: number[];

  // For custom patterns
  customExpression?: string;
}

export interface AvailabilityRule {
  id: string;
  propertyId: string;
  tenantId: string;

  // Rule identification
  name: string;
  description?: string;

  // Rule type and pattern
  type: AvailabilityRuleType;
  pattern: AvailabilityRulePattern;

  // What to do when rule matches
  action: AvailabilityRuleAction;
  actionValue: any; // Number for price/nights, AvailabilityStatus for block

  // Date range for rule validity (optional)
  validFrom?: Date;
  validUntil?: Date;

  // Priority (higher number = higher priority)
  priority: number;

  // Active status
  isActive: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AvailabilityRuleMatch {
  rule: AvailabilityRule;
  date: Date;
  appliedValue: any;
}

// Enhanced calendar day with rule information
export interface EnhancedAvailabilityCalendarDay extends AvailabilityCalendarDay {
  appliedRules?: AvailabilityRuleMatch[];
  suggestedPrice?: number;
  minNights?: number;
  maxNights?: number;
}