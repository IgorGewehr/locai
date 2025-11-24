/**
 * Calendar Synchronization Service
 *
 * Orchestrates calendar synchronization from external platforms (Airbnb, Booking, etc.)
 * to internal availability system
 */

import {
  CalendarSyncConfiguration,
  CalendarSyncResult,
  CalendarSyncSource,
  CalendarSyncStatus,
  ExternalCalendarEvent,
} from '@/lib/types/calendar-sync';
import { iCalParserService } from './ical-parser-service';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { AvailabilityStatus } from '@/lib/types/availability';
import {
  startOfDay,
  endOfDay,
  addDays,
  isBefore,
  isAfter,
} from 'date-fns';

export class CalendarSyncService {
  /**
   * Sync a single property's calendar
   */
  async syncProperty(
    propertyId: string,
    tenantId: string
  ): Promise<CalendarSyncResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting calendar sync for property', { propertyId, tenantId });

      // Get sync configuration
      const syncConfig = await this.getSyncConfiguration(propertyId, tenantId);

      if (!syncConfig) {
        throw new Error('No sync configuration found for property');
      }

      if (!syncConfig.isActive) {
        throw new Error('Sync configuration is inactive');
      }

      // Update status to syncing
      await this.updateSyncStatus(
        syncConfig.id,
        tenantId,
        CalendarSyncStatus.SYNCING
      );

      // Fetch and parse iCal
      logger.info('📥 [ICAL-SYNC] Fetching iCal feed', {
        propertyId,
        iCalUrl: syncConfig.iCalUrl.substring(0, 50) + '...',
      });

      const events = await iCalParserService.fetchAndParse(syncConfig.iCalUrl);

      logger.info('📊 [ICAL-SYNC] iCal events parsed', {
        propertyId,
        totalEvents: events.length,
        eventsPreview: events.slice(0, 3).map(e => ({
          summary: e.summary,
          start: e.startDate,
          end: e.endDate,
        })),
      });

      // Filter to blocked events only
      const blockedEvents = events.filter((event) => {
        // Airbnb events may not have status field, check summary instead
        const hasBlockingSummary =
          event.summary &&
          (event.summary.toLowerCase().includes('reserved') ||
            event.summary.toLowerCase().includes('not available') ||
            event.summary.toLowerCase().includes('airbnb'));

        // Also accept CONFIRMED status if present
        const isConfirmed = event.status === 'CONFIRMED';

        // Event is blocked if it has blocking summary OR confirmed status
        return hasBlockingSummary || isConfirmed;
      });

      logger.info('🔍 [ICAL-SYNC] Filtered blocked events', {
        propertyId,
        totalEvents: events.length,
        blockedEvents: blockedEvents.length,
        skippedEvents: events.length - blockedEvents.length,
      });

      // Import events to availability
      logger.info('💾 [ICAL-SYNC] Starting reservation creation', {
        propertyId,
        eventsToImport: blockedEvents.length,
      });

      const importResult = await this.importEvents(
        propertyId,
        tenantId,
        blockedEvents,
        syncConfig.source
      );

      // Update sync configuration
      await this.updateSyncConfiguration(syncConfig.id, tenantId, {
        lastSyncAt: new Date(),
        lastSuccessAt: new Date(),
        status: CalendarSyncStatus.ACTIVE,
        errorCount: 0,
        lastError: undefined,
      });

      const duration = Date.now() - startTime;

      const result: CalendarSyncResult = {
        success: true,
        propertyId,
        source: syncConfig.source,
        eventsProcessed: events.length,
        eventsImported: blockedEvents.length,
        eventsSkipped: events.length - blockedEvents.length,
        periodsCreated: importResult.created,
        periodsUpdated: importResult.updated,
        errors: [],
        syncedAt: new Date(),
        duration,
      };

      logger.info('🎉 [ICAL-SYNC] Sync completed successfully', {
        propertyId,
        eventsProcessed: events.length,
        reservationsCreated: importResult.created,
        reservationsUpdated: importResult.updated,
        totalDuration: `${duration}ms`,
        source: syncConfig.source,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Calendar sync failed', {
        propertyId,
        tenantId,
        error: errorMessage,
      });

      // Update sync configuration with error
      try {
        const syncConfig = await this.getSyncConfiguration(propertyId, tenantId);
        if (syncConfig) {
          await this.updateSyncConfiguration(syncConfig.id, tenantId, {
            status: CalendarSyncStatus.ERROR,
            lastError: errorMessage,
            errorCount: (syncConfig.errorCount || 0) + 1,
          });
        }
      } catch (updateError) {
        logger.error('Failed to update sync configuration after error', {
          propertyId,
          updateError,
        });
      }

      return {
        success: false,
        propertyId,
        source: CalendarSyncSource.ICAL_URL,
        eventsProcessed: 0,
        eventsImported: 0,
        eventsSkipped: 0,
        periodsCreated: 0,
        periodsUpdated: 0,
        errors: [errorMessage],
        syncedAt: new Date(),
        duration,
      };
    }
  }

  /**
   * Import events to availability periods and create reservations
   */
  private async importEvents(
    propertyId: string,
    tenantId: string,
    events: ExternalCalendarEvent[],
    source: CalendarSyncSource
  ): Promise<{ created: number; updated: number }> {
    const serviceFactory = new TenantServiceFactory(tenantId);
    const availabilityService = serviceFactory.availability;
    const reservationsService = serviceFactory.reservations;
    const clientsService = serviceFactory.clients;

    let created = 0;
    let updated = 0;

    for (const event of events) {
      try {
        // Normalize dates to start/end of day
        const startDate = startOfDay(event.startDate);
        const endDate = endOfDay(event.endDate);

        // Check if reservation already exists for this event UID
        const allReservations = await reservationsService.getAll();
        const existingReservation = allReservations.find(
          (r: any) => r.externalEventUid === event.uid
        );

        if (existingReservation) {
          // Reservation already exists, skip
          updated++;
          logger.info('Reservation already exists for external event', {
            propertyId,
            eventUid: event.uid,
            reservationId: existingReservation.id,
          });
          continue;
        }

        // Create or get generic external client
        let externalClient = await this.getOrCreateExternalClient(
          tenantId,
          source,
          clientsService
        );

        // Create reservation for external booking with all required fields
        // Note: 'nights' will be calculated automatically by the API
        const reservationData = {
          propertyId,
          clientId: externalClient.id,
          checkIn: startDate,
          checkOut: endDate,
          guests: 1, // Default, as we don't have this info from iCal
          totalAmount: 0, // External reservation, amount not tracked
          paidAmount: 0,
          pendingAmount: 0, // ✅ Add pendingAmount
          status: 'confirmed' as const,
          paymentStatus: 'pending' as const,
          paymentMethod: 'pix' as const, // ✅ Add required paymentMethod
          source: this.mapSourceToReservationSource(source),
          specialRequests: event.description || '',
          observations: `Imported from ${source} via iCal sync.\nEvent: ${event.summary}\nUID: ${event.uid}`,
          guestDetails: [], // ✅ Add empty array for guest details
          extraServices: [], // ✅ Add empty array for extra services
          payments: [], // ✅ Add empty array for payments
          paymentPlan: { // ✅ Add default payment plan
            totalAmount: 0,
            installments: [],
            paymentMethod: 'pix' as const,
            feePercentage: 0,
            totalFees: 0,
            description: 'External reservation - no payment plan'
          },
          externalEventUid: event.uid, // Store UID to prevent duplicates
          externalSource: source,
          tenantId, // ✅ Add tenantId for proper isolation
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const reservationId = await reservationsService.create(reservationData as any);

        created++;

        logger.info('✅ [ICAL-SYNC] Reservation created from external event', {
          propertyId,
          reservationId,
          checkIn: startDate.toISOString(),
          checkOut: endDate.toISOString(),
          eventSummary: event.summary,
          eventUid: event.uid,
          source,
        });

        // Also create blocked period in availability
        await availabilityService.updateAvailability(
          propertyId,
          startDate,
          endDate,
          AvailabilityStatus.BLOCKED,
          `External calendar sync from ${source}`,
          `Imported from ${source}: ${event.summary}`
        );
      } catch (error) {
        logger.error('Failed to import event', {
          propertyId,
          event: event.uid,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created, updated };
  }

  /**
   * Get or create generic external client for imported reservations
   */
  private async getOrCreateExternalClient(
    tenantId: string,
    source: CalendarSyncSource,
    clientsService: any
  ): Promise<any> {
    try {
      // Try to find existing external client
      const allClients = await clientsService.getAll();
      const existingClient = allClients.find(
        (c: any) => c.email === `external-${source}@locai.app`
      );

      if (existingClient) {
        return existingClient;
      }

      // Create new external client
      const clientData = {
        name: `Reserva Externa - ${source.toUpperCase()}`,
        email: `external-${source}@locai.app`,
        phone: '+00000000000',
        source: 'other' as const,
        notes: `Cliente genérico para reservas importadas de ${source}`,
        isActive: true,
        totalSpent: 0,
        totalReservations: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const clientId = await clientsService.create(clientData);
      logger.info('Created external client', { source, clientId });

      return { id: clientId, ...clientData };
    } catch (error) {
      logger.error('Error getting/creating external client', {
        tenantId,
        source,
        error,
      });
      throw error;
    }
  }

  /**
   * Map CalendarSyncSource to ReservationSource
   */
  private mapSourceToReservationSource(source: CalendarSyncSource): string {
    const sourceMap: Record<CalendarSyncSource, string> = {
      [CalendarSyncSource.AIRBNB]: 'airbnb',
      [CalendarSyncSource.BOOKING]: 'booking',
      [CalendarSyncSource.VRBO]: 'vrbo',
      [CalendarSyncSource.GOOGLE_CALENDAR]: 'other',
      [CalendarSyncSource.OUTLOOK]: 'other',
      [CalendarSyncSource.ICAL_URL]: 'other',
    };
    return sourceMap[source] || 'other';
  }

  /**
   * Get sync configuration for property
   */
  private async getSyncConfiguration(
    propertyId: string,
    tenantId: string
  ): Promise<CalendarSyncConfiguration | null> {
    try {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const syncConfigService = serviceFactory.createService<CalendarSyncConfiguration>(
        'calendar_sync_configurations'
      );

      // Get all configs and filter in memory
      const allConfigs = await syncConfigService.getAll();
      const activeConfig = allConfigs.find(
        (config) => config.propertyId === propertyId && config.isActive
      );

      if (!activeConfig) {
        return null;
      }

      return activeConfig;
    } catch (error) {
      logger.error('Error getting sync configuration', {
        propertyId,
        tenantId,
        error,
      });
      return null;
    }
  }

  /**
   * Update sync configuration
   */
  private async updateSyncConfiguration(
    configId: string,
    tenantId: string,
    updates: Partial<CalendarSyncConfiguration>
  ): Promise<void> {
    try {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const syncConfigService = serviceFactory.createService<CalendarSyncConfiguration>(
        'calendar_sync_configurations'
      );

      await syncConfigService.update(configId, {
        ...updates,
        updatedAt: new Date(),
      } as any);

      logger.info('Sync configuration updated', { configId, updates });
    } catch (error) {
      logger.error('Error updating sync configuration', {
        configId,
        tenantId,
        error,
      });
      throw error;
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    configId: string,
    tenantId: string,
    status: CalendarSyncStatus
  ): Promise<void> {
    await this.updateSyncConfiguration(configId, tenantId, { status });
  }

  /**
   * Create sync configuration
   */
  async createSyncConfiguration(
    propertyId: string,
    tenantId: string,
    userId: string,
    iCalUrl: string,
    source: CalendarSyncSource = CalendarSyncSource.AIRBNB,
    syncFrequency: 'hourly' | 'daily' | 'manual' = 'daily'
  ): Promise<string> {
    try {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const syncConfigService = serviceFactory.createService<CalendarSyncConfiguration>(
        'calendar_sync_configurations'
      );

      const config: Omit<CalendarSyncConfiguration, 'id'> = {
        propertyId,
        tenantId,
        source,
        iCalUrl,
        syncFrequency,
        status: CalendarSyncStatus.ACTIVE,
        isActive: true,
        errorCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      const configId = await syncConfigService.create(config as any);

      logger.info('Sync configuration created', {
        configId,
        propertyId,
        source,
      });

      return configId;
    } catch (error) {
      logger.error('Error creating sync configuration', {
        propertyId,
        tenantId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get all active sync configurations for tenant
   */
  async getActiveSyncConfigurations(
    tenantId: string
  ): Promise<CalendarSyncConfiguration[]> {
    try {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const syncConfigService = serviceFactory.createService<CalendarSyncConfiguration>(
        'calendar_sync_configurations'
      );

      const allConfigs = await syncConfigService.getAll();
      return allConfigs.filter((config) => config.isActive);
    } catch (error) {
      logger.error('Error getting active sync configurations', {
        tenantId,
        error,
      });
      return [];
    }
  }
}

// Singleton instance
export const calendarSyncService = new CalendarSyncService();
