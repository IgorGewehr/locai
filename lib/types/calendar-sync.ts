/**
 * Calendar Synchronization Types
 *
 * Types for iCal/calendar synchronization with external platforms
 */

export enum CalendarSyncSource {
  AIRBNB = 'airbnb',
  BOOKING = 'booking',
  VRBO = 'vrbo',
  GOOGLE_CALENDAR = 'google_calendar',
  OUTLOOK = 'outlook',
  ICAL_URL = 'ical_url',
}

export enum CalendarSyncStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  SYNCING = 'syncing',
}

export interface CalendarSyncConfiguration {
  id: string;
  propertyId: string;
  tenantId: string;
  source: CalendarSyncSource;
  iCalUrl: string;

  // Sync settings
  syncFrequency: 'hourly' | 'daily' | 'manual';
  lastSyncAt?: Date;
  nextSyncAt?: Date;

  // Status
  status: CalendarSyncStatus;
  isActive: boolean;

  // Error handling
  lastError?: string;
  errorCount: number;
  lastSuccessAt?: Date;

  // Metadata
  externalPropertyId?: string; // ID na plataforma externa (se disponível)
  externalPropertyName?: string;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ExternalCalendarEvent {
  uid: string; // Unique identifier from iCal
  summary: string; // Event title
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  organizer?: string;
  location?: string;
  created?: Date;
  lastModified?: Date;
  sequence?: number;
}

export interface CalendarSyncResult {
  success: boolean;
  propertyId: string;
  source: CalendarSyncSource;
  eventsProcessed: number;
  eventsImported: number;
  eventsSkipped: number;
  periodsCreated: number;
  periodsUpdated: number;
  errors: string[];
  syncedAt: Date;
  duration: number; // milliseconds
}

export interface CalendarSyncJobStatus {
  isRunning: boolean;
  currentProperty?: string;
  totalProperties: number;
  processedProperties: number;
  successfulSyncs: number;
  failedSyncs: number;
  startedAt?: Date;
  estimatedCompletion?: Date;
}
