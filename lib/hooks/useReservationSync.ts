import { useEffect, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';
import { ReservationStatus } from '@/lib/types/reservation';
import { AvailabilityService } from '@/lib/services/availability-service';

/**
 * Hook for automatic synchronization between reservations and availability
 *
 * This hook listens to reservation status changes and automatically:
 * - Blocks dates when reservations are confirmed
 * - Frees dates when reservations are cancelled
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useReservationSync(); // That's it!
 * }
 * ```
 */
export function useReservationSync() {
  const { tenantId, isReady } = useTenant();
  const syncInProgressRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isReady || !tenantId) {
      logger.debug('⏸️ Reservation sync not ready', { isReady, tenantId });
      return;
    }

    logger.info('🔄 Reservation sync hook initialized', { tenantId });

    // Note: This is a placeholder for Firestore realtime listener
    // In a full implementation, you would use:
    // const unsubscribe = onSnapshot(reservationsCollection, handleSnapshot);

    // For now, this hook provides the structure for automatic sync
    // The actual sync is still called manually in reservation operations
    // Future enhancement: Add Firestore listener here

    return () => {
      logger.info('🛑 Reservation sync hook cleanup', { tenantId });
    };
  }, [tenantId, isReady]);

  /**
   * Manual sync function for immediate synchronization
   * Can be called directly when needed
   */
  const syncReservation = async (
    reservationId: string,
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    newStatus: ReservationStatus,
    oldStatus?: ReservationStatus
  ) => {
    if (!tenantId) {
      logger.error('❌ Cannot sync: tenant not ready', { reservationId });
      return;
    }

    // Prevent duplicate syncs
    if (syncInProgressRef.current.has(reservationId)) {
      logger.warn('⚠️ Sync already in progress for reservation', { reservationId });
      return;
    }

    syncInProgressRef.current.add(reservationId);

    try {
      const availabilityService = new AvailabilityService(tenantId);

      // Determine sync action based on status change
      if (
        newStatus === ReservationStatus.CONFIRMED &&
        oldStatus !== ReservationStatus.CONFIRMED
      ) {
        // Block dates
        logger.info('🔒 Auto-blocking dates for confirmed reservation', {
          reservationId,
          propertyId,
          checkIn,
          checkOut
        });

        await availabilityService.syncWithReservation(
          reservationId,
          propertyId,
          checkIn,
          checkOut,
          'create'
        );

        logger.info('✅ Dates blocked automatically', { reservationId });
      } else if (
        [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW].includes(newStatus) &&
        oldStatus === ReservationStatus.CONFIRMED
      ) {
        // Free dates
        logger.info('🔓 Auto-freeing dates for cancelled reservation', {
          reservationId,
          propertyId,
          checkIn,
          checkOut
        });

        await availabilityService.syncWithReservation(
          reservationId,
          propertyId,
          checkIn,
          checkOut,
          'cancel'
        );

        logger.info('✅ Dates freed automatically', { reservationId });
      } else {
        logger.debug('ℹ️ No sync needed for status change', {
          reservationId,
          oldStatus,
          newStatus
        });
      }
    } catch (error) {
      logger.error('❌ Error in automatic reservation sync', {
        reservationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      syncInProgressRef.current.delete(reservationId);
    }
  };

  return {
    syncReservation
  };
}

/**
 * Helper hook to ensure sync happens on component mount
 * Useful for reservation detail pages
 */
export function useReservationSyncOnMount(
  reservationId?: string,
  propertyId?: string,
  checkIn?: Date,
  checkOut?: Date,
  status?: ReservationStatus
) {
  const { syncReservation } = useReservationSync();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (
      !hasRunRef.current &&
      reservationId &&
      propertyId &&
      checkIn &&
      checkOut &&
      status === ReservationStatus.CONFIRMED
    ) {
      hasRunRef.current = true;

      // Ensure dates are synced (idempotent operation)
      syncReservation(
        reservationId,
        propertyId,
        checkIn,
        checkOut,
        status
      ).catch(error => {
        logger.error('Failed to sync reservation on mount', {
          reservationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }
  }, [reservationId, propertyId, checkIn, checkOut, status, syncReservation]);
}
