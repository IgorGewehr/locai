// lib/services/availability-service.ts
import { 
  AvailabilityPeriod, 
  AvailabilityStatus, 
  AvailabilityQuery,
  AvailabilityResponse,
  AvailabilityCalendarDay,
  BulkAvailabilityUpdate,
  AvailabilityUpdate
} from '@/lib/types/availability';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { startOfDay, endOfDay, addDays, isWeekend, isToday, isPast, eachDayOfInterval, isSameDay, format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Reservation } from '@/lib/types/reservation';
import { isHoliday } from '@/lib/utils/holidays';

export class AvailabilityService {
  private tenantId: string;
  private factory: TenantServiceFactory;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.factory = new TenantServiceFactory(tenantId);
  }

  /**
   * Get availability for a property within a date range
   */
  async getAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    try {
      logger.info('📅 Getting property availability', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        propertyIdType: typeof query.propertyId,
        queryKeys: Object.keys(query),
        dateRange: `${format(query.startDate, 'yyyy-MM-dd')} to ${format(query.endDate, 'yyyy-MM-dd')}`
      });

      logger.info('🔧 Creating services', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        hasFactory: !!this.factory
      });

      const availabilityService = this.factory.createService<AvailabilityPeriod>('availability');
      const reservationService = this.factory.createService<Reservation>('reservations');

      logger.info('📊 Getting availability periods', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        queryFilters: [
          { field: 'propertyId', operator: '==', value: query.propertyId },
          { field: 'startDate', operator: '<=', value: query.endDate },
          { field: 'endDate', operator: '>=', value: query.startDate }
        ]
      });

      // Get all availability periods for this property
      const availabilityPeriods = await availabilityService.getMany([
        { field: 'propertyId', operator: '==', value: query.propertyId },
        { field: 'startDate', operator: '<=', value: query.endDate },
        { field: 'endDate', operator: '>=', value: query.startDate }
      ]);

      logger.info('✅ Got availability periods', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        periodsCount: availabilityPeriods ? availabilityPeriods.length : 'undefined'
      });

      // Get reservations if requested
      let reservations: Reservation[] = [];
      if (query.includeReservations) {
        logger.info('🏨 Getting reservations', {
          tenantId: this.tenantId,
          propertyId: query.propertyId,
          includeReservations: true
        });

        reservations = await reservationService.getMany([
          { field: 'propertyId', operator: '==', value: query.propertyId },
          { field: 'checkIn', operator: '<=', value: query.endDate },
          { field: 'checkOut', operator: '>=', value: query.startDate },
          { field: 'status', operator: 'in', value: ['confirmed', 'pending'] }
        ]);

        logger.info('✅ Got reservations', {
          tenantId: this.tenantId,
          propertyId: query.propertyId,
          reservationsCount: reservations ? reservations.length : 'undefined'
        });
      }

      // Generate calendar days
      logger.info('📅 Generating calendar days', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        dateRange: `${query.startDate?.toISOString()} to ${query.endDate?.toISOString()}`,
        periodsCount: availabilityPeriods?.length || 0,
        reservationsCount: reservations?.length || 0
      });

      const calendar = await this.generateCalendarDays(
        query.propertyId,
        query.startDate,
        query.endDate,
        availabilityPeriods,
        reservations
      );

      logger.info('✅ Calendar days generated', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        calendarDays: calendar ? calendar.length : 'undefined'
      });

      // Calculate summary statistics
      const totalDays = calendar?.length || 0;
      const availableDays = calendar?.filter(day => day?.status === AvailabilityStatus.AVAILABLE).length || 0;
      const reservedDays = calendar?.filter(day => day?.status === AvailabilityStatus.RESERVED).length || 0;
      const blockedDays = calendar?.filter(day => 
        day?.status === AvailabilityStatus.BLOCKED || day?.status === AvailabilityStatus.MAINTENANCE
      ).length || 0;
      const occupancyRate = totalDays > 0 ? ((reservedDays / totalDays) * 100) : 0;

      const response: AvailabilityResponse = {
        propertyId: query.propertyId,
        periods: availabilityPeriods,
        calendar,
        summary: {
          totalDays,
          availableDays,
          reservedDays,
          blockedDays,
          occupancyRate
        }
      };

      logger.info('✅ Availability retrieved successfully', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        summary: response.summary
      });

      return response;

    } catch (error) {
      logger.error('❌ Error getting availability', {
        tenantId: this.tenantId,
        propertyId: query.propertyId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
        fullError: error
      });
      throw error;
    }
  }

  /**
   * Update availability for a date range
   */
  async updateAvailability(update: AvailabilityUpdate, createdBy: string): Promise<void> {
    try {
      logger.info('📝 Updating property availability', {
        tenantId: this.tenantId,
        propertyId: update.propertyId,
        dateRange: `${format(update.startDate, 'yyyy-MM-dd')} to ${format(update.endDate, 'yyyy-MM-dd')}`,
        status: update.status
      });

      const availabilityService = this.factory.createService<AvailabilityPeriod>('availability');

      // Remove existing overlapping periods
      await this.removeOverlappingPeriods(update.propertyId, update.startDate, update.endDate);

      // Create new availability period with cleaned data
      const newPeriod: Omit<AvailabilityPeriod, 'id'> = {
        propertyId: update.propertyId,
        startDate: startOfDay(update.startDate),
        endDate: endOfDay(update.endDate),
        status: update.status,
        reason: update.reason || null,
        notes: update.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      // Filter out undefined values before saving
      const cleanPeriod = this.filterUndefinedValues(newPeriod);

      await availabilityService.create(cleanPeriod);

      logger.info('✅ Availability updated successfully', {
        tenantId: this.tenantId,
        propertyId: update.propertyId,
        status: update.status
      });

    } catch (error) {
      logger.error('❌ Error updating availability', {
        tenantId: this.tenantId,
        propertyId: update.propertyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Bulk update availability for multiple dates
   */
  async bulkUpdateAvailability(updates: BulkAvailabilityUpdate, createdBy: string): Promise<void> {
    try {
      logger.info('📝 Bulk updating property availability', {
        tenantId: this.tenantId,
        propertyId: updates.propertyId,
        updatesCount: updates.updates.length
      });

      // Group consecutive dates with same status
      const groupedUpdates = this.groupConsecutiveDates(updates.updates);

      // Apply each group as a date range update
      for (const group of groupedUpdates) {
        await this.updateAvailability({
          propertyId: updates.propertyId,
          startDate: group.startDate,
          endDate: group.endDate,
          status: group.status,
          reason: group.reason
        }, createdBy);
      }

      logger.info('✅ Bulk availability update completed', {
        tenantId: this.tenantId,
        propertyId: updates.propertyId,
        groupsCreated: groupedUpdates.length
      });

    } catch (error) {
      logger.error('❌ Error in bulk availability update', {
        tenantId: this.tenantId,
        propertyId: updates.propertyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Filter out undefined values to prevent Firestore errors
   */
  private filterUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.filterUndefinedValues(item));
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const filtered: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          filtered[key] = this.filterUndefinedValues(value);
        }
      }
      return filtered;
    }
    
    return obj;
  }

  /**
   * Check if dates are available for booking
   */
  async checkAvailability(propertyId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    try {
      const query: AvailabilityQuery = {
        propertyId,
        startDate: checkIn,
        endDate: checkOut,
        includeReservations: true
      };

      const availability = await this.getAvailability(query);
      
      // Check if all days in the range are available
      const unavailableDays = availability.calendar.filter(day => 
        day.status !== AvailabilityStatus.AVAILABLE
      );

      const isAvailable = unavailableDays.length === 0;

      logger.info('🔍 Availability check completed', {
        tenantId: this.tenantId,
        propertyId,
        dateRange: `${format(checkIn, 'yyyy-MM-dd')} to ${format(checkOut, 'yyyy-MM-dd')}`,
        isAvailable,
        unavailableDaysCount: unavailableDays.length
      });

      return isAvailable;

    } catch (error) {
      logger.error('❌ Error checking availability', {
        tenantId: this.tenantId,
        propertyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Sync availability with reservation changes
   */
  async syncWithReservation(reservationId: string, propertyId: string, checkIn: Date, checkOut: Date, action: 'create' | 'cancel'): Promise<void> {
    try {
      logger.info('🔄 Syncing availability with reservation', {
        tenantId: this.tenantId,
        reservationId,
        propertyId,
        action
      });

      if (action === 'create') {
        // Block dates for confirmed reservation
        await this.updateAvailability({
          propertyId,
          startDate: checkIn,
          endDate: checkOut,
          status: AvailabilityStatus.RESERVED,
          reason: `Reserva ${reservationId.slice(-8)}`
        }, 'system');

        // Update the availability period with reservation ID
        const availabilityService = this.factory.createService<AvailabilityPeriod>('availability');
        const periods = await availabilityService.getMany([
          { field: 'propertyId', operator: '==', value: propertyId },
          { field: 'startDate', operator: '<=', value: checkOut },
          { field: 'endDate', operator: '>=', value: checkIn },
          { field: 'status', operator: '==', value: AvailabilityStatus.RESERVED }
        ]);

        // Update the period with reservation ID
        for (const period of periods) {
          await availabilityService.update(period.id, {
            reservationId,
            updatedAt: new Date()
          });
        }

      } else if (action === 'cancel') {
        // Free up dates when reservation is cancelled
        await this.updateAvailability({
          propertyId,
          startDate: checkIn,
          endDate: checkOut,
          status: AvailabilityStatus.AVAILABLE,
          reason: 'Reserva cancelada'
        }, 'system');
      }

      logger.info('✅ Availability synced with reservation', {
        tenantId: this.tenantId,
        reservationId,
        action
      });

    } catch (error) {
      logger.error('❌ Error syncing availability with reservation', {
        tenantId: this.tenantId,
        reservationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate calendar days for a date range (OPTIMIZED with O(1) lookup)
   */
  private async generateCalendarDays(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    availabilityPeriods: AvailabilityPeriod[],
    reservations: Reservation[]
  ): Promise<AvailabilityCalendarDay[]> {
    const startTime = Date.now();

    logger.info('🔍 Generating calendar days (optimized)', {
      propertyId: propertyId,
      propertyIdType: typeof propertyId,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      periodsCount: availabilityPeriods?.length,
      reservationsCount: reservations?.length
    });

    try {
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      logger.info('✅ Date range created', {
        daysCount: dateRange?.length,
        firstDay: dateRange?.[0]?.toISOString(),
        lastDay: dateRange?.[dateRange.length - 1]?.toISOString()
      });
    } catch (error) {
      logger.error('❌ Error creating date range', {
        error: error instanceof Error ? error.message : 'Unknown error',
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      });
      throw error;
    }

    // OPTIMIZATION: Create index maps for O(1) lookup instead of O(n*m) nested loops
    const periodsByDate = new Map<string, AvailabilityPeriod>();
    const reservationsByDate = new Map<string, Reservation>();

    // Build period index (O(m) - only once)
    for (const period of availabilityPeriods || []) {
      if (!period?.startDate || !period?.endDate) {
        logger.warn('⚠️ Invalid period found, skipping', {
          periodId: period?.id,
          hasStartDate: !!period?.startDate,
          hasEndDate: !!period?.endDate
        });
        continue;
      }

      try {
        const periodDays = eachDayOfInterval({
          start: startOfDay(period.startDate),
          end: endOfDay(period.endDate)
        });

        for (const day of periodDays) {
          const key = format(day, 'yyyy-MM-dd');
          // Store only if not already set (first period wins)
          if (!periodsByDate.has(key)) {
            periodsByDate.set(key, period);
          }
        }
      } catch (error) {
        logger.error('❌ Error indexing period', {
          error: error instanceof Error ? error.message : 'Unknown error',
          periodId: period.id,
          periodStartDate: period.startDate,
          periodEndDate: period.endDate
        });
      }
    }

    // Build reservation index (O(m) - only once)
    for (const reservation of reservations || []) {
      if (!reservation?.checkIn || !reservation?.checkOut) {
        logger.warn('⚠️ Invalid reservation found, skipping', {
          reservationId: reservation?.id,
          hasCheckIn: !!reservation?.checkIn,
          hasCheckOut: !!reservation?.checkOut
        });
        continue;
      }

      try {
        const reservationDays = eachDayOfInterval({
          start: startOfDay(reservation.checkIn as Date),
          end: addDays(startOfDay(reservation.checkOut as Date), -1) // Exclude checkout day
        });

        for (const day of reservationDays) {
          const key = format(day, 'yyyy-MM-dd');
          // Store only if not already set (first reservation wins)
          if (!reservationsByDate.has(key)) {
            reservationsByDate.set(key, reservation);
          }
        }
      } catch (error) {
        logger.error('❌ Error indexing reservation', {
          error: error instanceof Error ? error.message : 'Unknown error',
          reservationId: reservation.id,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut
        });
      }
    }

    logger.info('✅ Indexes built', {
      periodsDatesIndexed: periodsByDate.size,
      reservationDatesIndexed: reservationsByDate.size,
      indexBuildTime: `${Date.now() - startTime}ms`
    });

    // Generate calendar with O(1) lookups per day (O(n) total)
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const days: AvailabilityCalendarDay[] = [];

    for (const date of dateRange) {
      try {
        const key = format(date, 'yyyy-MM-dd');

        // O(1) lookup instead of O(m) find!
        const availabilityPeriod = periodsByDate.get(key);
        const reservation = reservationsByDate.get(key);

        let status = AvailabilityStatus.AVAILABLE;
        let reservationId: string | undefined;
        let reason: string | undefined;

        if (availabilityPeriod) {
          status = availabilityPeriod.status;
          reservationId = availabilityPeriod.reservationId;
          reason = availabilityPeriod.reason || undefined;
        } else if (reservation) {
          status = AvailabilityStatus.RESERVED;
          reservationId = reservation.id;
          reason = `Reserva #${reservation.id.slice(-8)}`;
        }

        const calendarDay: AvailabilityCalendarDay = {
          date,
          status,
          isWeekend: isWeekend(date),
          isHoliday: isHoliday(date),
          isToday: isToday(date),
          isPast: isPast(date),
          reservationId,
          reason
        };

        days.push(calendarDay);

      } catch (dayError) {
        logger.error('❌ Error processing calendar day', {
          error: dayError instanceof Error ? dayError.message : 'Unknown error',
          date: date?.toISOString(),
          stack: dayError instanceof Error ? dayError.stack?.substring(0, 500) : undefined
        });
        continue;
      }
    }

    const totalTime = Date.now() - startTime;
    logger.info('✅ Calendar generation completed', {
      daysGenerated: days.length,
      totalTime: `${totalTime}ms`,
      avgTimePerDay: `${(totalTime / days.length).toFixed(2)}ms`,
      performanceImprovement: 'O(n+m) instead of O(n*m)'
    });

    return days;
  }

  /**
   * Remove overlapping availability periods
   */
  private async removeOverlappingPeriods(propertyId: string, startDate: Date, endDate: Date): Promise<void> {
    const availabilityService = this.factory.createService<AvailabilityPeriod>('availability');
    
    const overlappingPeriods = await availabilityService.getMany([
      { field: 'propertyId', operator: '==', value: propertyId },
      { field: 'startDate', operator: '<=', value: endDate },
      { field: 'endDate', operator: '>=', value: startDate }
    ]);

    // Delete overlapping periods
    for (const period of overlappingPeriods) {
      await availabilityService.delete(period.id);
    }
  }

  /**
   * Group consecutive dates with same status
   */
  private groupConsecutiveDates(updates: Array<{ date: Date; status: AvailabilityStatus; reason?: string }>) {
    if (updates.length === 0) return [];

    // Sort by date
    updates.sort((a, b) => a.date.getTime() - b.date.getTime());

    const groups = [];
    let currentGroup = {
      startDate: updates[0].date,
      endDate: updates[0].date,
      status: updates[0].status,
      reason: updates[0].reason
    };

    for (let i = 1; i < updates.length; i++) {
      const update = updates[i];
      const prevUpdate = updates[i - 1];
      
      // Check if consecutive date with same status
      const isConsecutive = differenceInDays(update.date, prevUpdate.date) === 1;
      const isSameStatus = update.status === prevUpdate.status;
      const isSameReason = update.reason === prevUpdate.reason;

      if (isConsecutive && isSameStatus && isSameReason) {
        // Extend current group
        currentGroup.endDate = update.date;
      } else {
        // Start new group
        groups.push(currentGroup);
        currentGroup = {
          startDate: update.date,
          endDate: update.date,
          status: update.status,
          reason: update.reason
        };
      }
    }

    // Add last group
    groups.push(currentGroup);

    return groups;
  }

  /**
   * Get availability summary for multiple properties
   */
  async getPropertiesAvailabilitySummary(propertyIds: string[], dateRange: { start: Date; end: Date }) {
    try {
      const summaries = await Promise.all(
        propertyIds.map(async (propertyId) => {
          const availability = await this.getAvailability({
            propertyId,
            startDate: dateRange.start,
            endDate: dateRange.end,
            includeReservations: true
          });
          
          return {
            propertyId,
            ...availability.summary
          };
        })
      );

      return summaries;
    } catch (error) {
      logger.error('❌ Error getting properties availability summary', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}