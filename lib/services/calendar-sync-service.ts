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
import { ReservationSource } from '@/lib/types/reservation';
import { iCalParserService } from './ical-parser-service';
import { iCalGeneratorService } from './ical-generator-service';
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
        periodsCancelled: importResult.cancelled,
        periodsSoftDeleted: importResult.softDeleted,
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
   * Also handles soft-delete of reservations that no longer exist in external calendar
   */
  private async importEvents(
    propertyId: string,
    tenantId: string,
    events: ExternalCalendarEvent[],
    source: CalendarSyncSource
  ): Promise<{ created: number; updated: number; cancelled: number; softDeleted: number }> {
    const serviceFactory = new TenantServiceFactory(tenantId);
    const availabilityService = serviceFactory.availability;
    const reservationsService = serviceFactory.reservations;
    const clientsService = serviceFactory.clients;

    let created = 0;
    let updated = 0;
    let cancelled = 0;
    let softDeleted = 0;

    const now = new Date();

    // ✅ CRÍTICO 10: Filtrar eventos passados - não importar eventos que já terminaram
    const futureEvents = events.filter(event => isAfter(event.endDate, now));
    const skippedPastEvents = events.length - futureEvents.length;

    if (skippedPastEvents > 0) {
      logger.info('🕐 [ICAL-SYNC] Skipped past events', {
        propertyId,
        skippedCount: skippedPastEvents,
        futureCount: futureEvents.length,
      });
    }

    // Get all external reservations for this property to detect soft-deletes
    const allReservations = await reservationsService.getAll();
    const externalReservations = allReservations.filter(
      (r: any) => r.propertyId === propertyId &&
                  r.externalEventUid &&
                  !r.externalDeletedAt // Não processar já deletados
    );

    // Build set of current event UIDs for soft-delete detection
    const currentEventUids = new Set(futureEvents.map(e => e.uid));

    // ✅ CRÍTICO 3: Soft-delete reservations that no longer exist in external calendar
    for (const reservation of externalReservations) {
      const resAny = reservation as any;

      // Skip if this reservation's UID is still in the calendar
      if (currentEventUids.has(resAny.externalEventUid)) {
        continue;
      }

      // Check if the reservation is for a future date (don't touch past ones)
      const checkOut = resAny.checkOut instanceof Date ? resAny.checkOut : new Date(resAny.checkOut);
      if (isBefore(checkOut, now)) {
        continue; // Don't soft-delete past reservations
      }

      // Soft-delete: mark as deleted externally, don't actually delete
      try {
        await reservationsService.update(resAny.id, {
          externalDeletedAt: new Date(),
          status: 'cancelled',
          observations: `${resAny.observations || ''}\n\n⚠️ Reserva removida do calendário externo em ${new Date().toISOString()}`,
          updatedAt: new Date(),
        } as any);

        softDeleted++;

        logger.info('🗑️ [ICAL-SYNC] External reservation soft-deleted (no longer in calendar)', {
          propertyId,
          reservationId: resAny.id,
          externalEventUid: resAny.externalEventUid,
          checkIn: resAny.checkIn,
          checkOut: resAny.checkOut,
        });

        // Invalidate iCal cache since availability changed
        iCalGeneratorService.invalidateCache(propertyId, tenantId);
      } catch (error) {
        logger.error('Failed to soft-delete external reservation', {
          propertyId,
          reservationId: resAny.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Process current events
    for (const event of futureEvents) {
      try {
        // ✅ CRÍTICO 4: Handle cancelled events from external calendar
        if (event.status === 'CANCELLED') {
          const existingReservation = externalReservations.find(
            (r: any) => r.externalEventUid === event.uid
          );

          if (existingReservation) {
            const resAny = existingReservation as any;
            // Cancel the reservation
            await reservationsService.update(resAny.id, {
              status: 'cancelled',
              observations: `${resAny.observations || ''}\n\n⚠️ Cancelado pelo calendário externo em ${new Date().toISOString()}`,
              externalLastSync: new Date(),
              updatedAt: new Date(),
            } as any);

            cancelled++;

            logger.info('❌ [ICAL-SYNC] External reservation cancelled (STATUS=CANCELLED)', {
              propertyId,
              reservationId: resAny.id,
              eventUid: event.uid,
            });

            // Invalidate iCal cache
            iCalGeneratorService.invalidateCache(propertyId, tenantId);
          }
          continue; // Don't create new reservation for cancelled event
        }

        // Normalize dates to start/end of day
        const startDate = startOfDay(event.startDate);
        const endDate = endOfDay(event.endDate);

        // Check if reservation already exists for this event UID
        const existingReservation = externalReservations.find(
          (r: any) => r.externalEventUid === event.uid
        );

        if (existingReservation) {
          // Update last sync timestamp
          const resAny = existingReservation as any;
          await reservationsService.update(resAny.id, {
            externalLastSync: new Date(),
            updatedAt: new Date(),
          } as any);

          updated++;
          logger.debug('Reservation already exists for external event', {
            propertyId,
            eventUid: event.uid,
            reservationId: resAny.id,
          });
          continue;
        }

        // Create or get generic external client
        let externalClient = await this.getOrCreateExternalClient(
          tenantId,
          source,
          clientsService
        );

        // Calculate nights
        const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Create reservation for external booking with all required fields
        const reservationData = {
          propertyId,
          clientId: externalClient.id,
          checkIn: startDate,
          checkOut: endDate,
          nights, // ✅ Calculate nights
          guests: 1, // Default, as we don't have this info from iCal
          totalAmount: 0, // External reservation, amount not tracked
          paidAmount: 0,
          pendingAmount: 0,
          status: 'confirmed' as const,
          paymentStatus: 'pending' as const,
          paymentMethod: 'pix' as const,
          source: this.mapSourceToReservationSource(source),
          specialRequests: event.description || '',
          observations: `Importado de ${source} via sincronização iCal.\nEvento: ${event.summary}\nUID: ${event.uid}`,
          guestDetails: [],
          extraServices: [],
          payments: [],
          paymentPlan: {
            totalAmount: 0,
            installments: [],
            paymentMethod: 'pix' as const,
            feePercentage: 0,
            totalFees: 0,
            description: 'Reserva externa - sem plano de pagamento'
          },
          // ✅ External reservation fields
          externalEventUid: event.uid,
          externalSource: this.mapSourceToExternalSource(source),
          isExternalReservation: true,
          externalLastSync: new Date(),
          tenantId,
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
          nights,
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
          `Sincronização de calendário externo: ${source}`,
          `Importado de ${source}: ${event.summary}`
        );

        // Invalidate iCal cache since availability changed
        iCalGeneratorService.invalidateCache(propertyId, tenantId);
      } catch (error) {
        logger.error('Failed to import event', {
          propertyId,
          event: event.uid,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { created, updated, cancelled, softDeleted };
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
   * Map CalendarSyncSource to ReservationSource enum
   */
  private mapSourceToReservationSource(source: CalendarSyncSource): ReservationSource {
    const sourceMap: Record<CalendarSyncSource, ReservationSource> = {
      [CalendarSyncSource.AIRBNB]: ReservationSource.AIRBNB,
      [CalendarSyncSource.BOOKING]: ReservationSource.BOOKING,
      [CalendarSyncSource.VRBO]: ReservationSource.VRBO,
      [CalendarSyncSource.GOOGLE_CALENDAR]: ReservationSource.EXTERNAL_ICAL,
      [CalendarSyncSource.OUTLOOK]: ReservationSource.EXTERNAL_ICAL,
      [CalendarSyncSource.ICAL_URL]: ReservationSource.EXTERNAL_ICAL,
    };
    return sourceMap[source] || ReservationSource.OTHER;
  }

  /**
   * Map CalendarSyncSource to external source string for reservation fields
   */
  private mapSourceToExternalSource(source: CalendarSyncSource): 'airbnb' | 'booking' | 'vrbo' | 'google_calendar' | 'outlook' | 'other' {
    const sourceMap: Record<CalendarSyncSource, 'airbnb' | 'booking' | 'vrbo' | 'google_calendar' | 'outlook' | 'other'> = {
      [CalendarSyncSource.AIRBNB]: 'airbnb',
      [CalendarSyncSource.BOOKING]: 'booking',
      [CalendarSyncSource.VRBO]: 'vrbo',
      [CalendarSyncSource.GOOGLE_CALENDAR]: 'google_calendar',
      [CalendarSyncSource.OUTLOOK]: 'outlook',
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
