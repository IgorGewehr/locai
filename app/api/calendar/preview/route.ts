/**
 * Calendar Preview API
 *
 * POST /api/calendar/preview
 * Fetches iCal and returns preview of reservations that would be created
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';
import { iCalParserService } from '@/lib/services/ical-parser-service';
import { logger } from '@/lib/utils/logger';
import { startOfDay, endOfDay, isAfter, differenceInDays } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { tenantId } = authResult.user;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { iCalUrl } = body;

    // Validate iCal URL
    if (!iCalUrl) {
      return NextResponse.json(
        { error: 'iCal URL é obrigatória' },
        { status: 400 }
      );
    }

    if (!iCalUrl.includes('.ics')) {
      return NextResponse.json(
        { error: 'URL de iCal inválida. Deve conter .ics' },
        { status: 400 }
      );
    }

    logger.info('Fetching iCal preview', {
      tenantId,
      iCalUrl: iCalUrl.substring(0, 50) + '...',
    });

    // Fetch and parse iCal
    const events = await iCalParserService.fetchAndParse(iCalUrl);

    // Log first event for debugging
    if (events.length > 0) {
      logger.info('First event structure for debugging', {
        event: {
          uid: events[0].uid,
          summary: events[0].summary,
          status: events[0].status,
          startDate: events[0].startDate,
          endDate: events[0].endDate,
        },
      });
    }

    // Filter to blocked events only and future dates
    const now = new Date();
    const futureBlockedEvents = events.filter((event) => {
      // Airbnb events may not have status field, so we check summary instead
      const hasBlockingSummary =
        event.summary &&
        (event.summary.toLowerCase().includes('reserved') ||
          event.summary.toLowerCase().includes('not available') ||
          event.summary.toLowerCase().includes('airbnb'));

      // Also accept CONFIRMED status if present
      const isConfirmed = event.status === 'CONFIRMED';

      // Event is blocked if it has blocking summary OR confirmed status
      const isBlocked = hasBlockingSummary || isConfirmed;

      const isFuture = isAfter(event.endDate, now);

      return isBlocked && isFuture;
    });

    // Transform events into reservation previews
    const reservationPreviews = futureBlockedEvents.map((event) => {
      const startDate = startOfDay(event.startDate);
      const endDate = endOfDay(event.endDate);
      const nights = differenceInDays(endDate, startDate);

      return {
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        checkIn: startDate.toISOString(),
        checkOut: endDate.toISOString(),
        nights,
        source: 'airbnb',
      };
    });

    logger.info('iCal preview generated', {
      tenantId,
      totalEvents: events.length,
      blockedEvents: futureBlockedEvents.length,
      futureReservations: reservationPreviews.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalEvents: events.length,
        blockedEvents: futureBlockedEvents.length,
        futureReservations: reservationPreviews.length,
        reservations: reservationPreviews,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Error in calendar preview API', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar preview do calendário',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
