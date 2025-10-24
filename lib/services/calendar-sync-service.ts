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
import { TenantServiceFactory } from './tenant-service-factory';
import { AvailabilityStatus } from '@/lib/types/availability';
import {
  startOfDay,
  endOfDay,
  differenceInDays,
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
      const events = await iCalParserService.fetchAndParse(syncConfig.iCalUrl);

      logger.info('iCal events fetched', {
        propertyId,
        eventsCount: events.length,
      });

      // Filter to blocked events only
      const blockedEvents = events.filter(
        (event) =>
          event.status === 'CONFIRMED' &&
          event.summary &&
          !event.summary.toLowerCase().includes('available')
      );

      // Import events to availability
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

      logger.info('Calendar sync completed successfully', {
        propertyId,
        result,
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
   * Import events to availability periods
   */
  private async importEvents(
    propertyId: string,
    tenantId: string,
    events: ExternalCalendarEvent[],
    source: CalendarSyncSource
  ): Promise<{ created: number; updated: number }> {
    const serviceFactory = new TenantServiceFactory(tenantId);
    const availabilityService = serviceFactory.availability;

    let created = 0;
    let updated = 0;

    for (const event of events) {
      try {
        // Normalize dates to start/end of day
        const startDate = startOfDay(event.startDate);
        const endDate = endOfDay(event.endDate);

        // Check if period already exists for these dates
        const existingPeriods = await availabilityService.getAvailability(
          propertyId,
          startDate,
          endDate
        );

        // Check if there's already a blocked period from external sync
        const hasExternalBlock = existingPeriods.some(
          (period) =>
            period.status === AvailabilityStatus.BLOCKED &&
            period.reason?.includes('External calendar')
        );

        if (hasExternalBlock) {
          // Period already exists, skip
          updated++;
          continue;
        }

        // Create new blocked period
        await availabilityService.updateAvailability(
          propertyId,
          startDate,
          endDate,
          AvailabilityStatus.BLOCKED,
          `External calendar sync from ${source}`,
          `Imported from ${source}: ${event.summary}`
        );

        created++;

        logger.info('Created blocked period from external event', {
          propertyId,
          event: event.uid,
          startDate,
          endDate,
        });
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
   * Get sync configuration for property
   */
  private async getSyncConfiguration(
    propertyId: string,
    tenantId: string
  ): Promise<CalendarSyncConfiguration | null> {
    try {
      const serviceFactory = new TenantServiceFactory(tenantId);
      const db = serviceFactory.db;

      const configDoc = await db
        .collection('calendar_sync_configurations')
        .where('propertyId', '==', propertyId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (configDoc.empty) {
        return null;
      }

      const data = configDoc.docs[0].data();
      return {
        ...data,
        id: configDoc.docs[0].id,
        lastSyncAt: data.lastSyncAt?.toDate(),
        nextSyncAt: data.nextSyncAt?.toDate(),
        lastSuccessAt: data.lastSuccessAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as CalendarSyncConfiguration;
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
      const db = serviceFactory.db;

      await db
        .collection('calendar_sync_configurations')
        .doc(configId)
        .update({
          ...updates,
          updatedAt: new Date(),
        });

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
      const db = serviceFactory.db;

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

      const docRef = await db
        .collection('calendar_sync_configurations')
        .add(config);

      logger.info('Sync configuration created', {
        configId: docRef.id,
        propertyId,
        source,
      });

      return docRef.id;
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
      const db = serviceFactory.db;

      const snapshot = await db
        .collection('calendar_sync_configurations')
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          lastSyncAt: data.lastSyncAt?.toDate(),
          nextSyncAt: data.nextSyncAt?.toDate(),
          lastSuccessAt: data.lastSuccessAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as CalendarSyncConfiguration;
      });
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
