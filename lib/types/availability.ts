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