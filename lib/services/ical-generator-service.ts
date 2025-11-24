/**
 * iCal Generator Service
 *
 * Generates iCal (.ics) feeds from internal reservations
 * Used to export our availability to external platforms (Airbnb, Booking, etc.)
 */

import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';
import { format } from 'date-fns';

interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  created: Date;
  lastModified: Date;
  organizer?: string;
  location?: string;
}

export class ICalGeneratorService {
  // Simple in-memory cache (in production, use Redis)
  private cache = new Map<string, { content: string; timestamp: number }>();
  private CACHE_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Generate iCal feed for a specific property (with cache)
   */
  async generatePropertyFeed(
    propertyId: string,
    tenantId: string,
    bypassCache = false
  ): Promise<string> {
    try {
      const cacheKey = `${tenantId}:${propertyId}`;

      // Check cache first
      if (!bypassCache) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
          logger.info('Returning cached iCal feed', { propertyId, age: Date.now() - cached.timestamp });
          return cached.content;
        }
      }

      logger.info('Generating fresh iCal feed for property', { propertyId, tenantId });

      const services = new TenantServiceFactory(tenantId);

      // Get property details
      const property = await services.properties.get(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      // Get all confirmed/pending reservations for this property
      const allReservations = await services.reservations.getAll();
      const propertyReservations = allReservations.filter(
        (r: any) => r.propertyId === propertyId &&
        (r.status === 'confirmed' || r.status === 'pending') &&
        !r.externalEventUid // Don't export external reservations back (Airbnb, Booking, etc)
      );

      logger.info('Found reservations for iCal export', {
        propertyId,
        count: propertyReservations.length,
      });

      // Convert reservations to iCal events
      const events: ICalEvent[] = propertyReservations.map((reservation: any) => ({
        uid: `reservation-${reservation.id}@alugazap.com`,
        summary: 'Reserved',
        description: `Reservation from AlugaZap. Property: ${property.name}`,
        startDate: reservation.checkIn instanceof Date
          ? reservation.checkIn
          : new Date(reservation.checkIn),
        endDate: reservation.checkOut instanceof Date
          ? reservation.checkOut
          : new Date(reservation.checkOut),
        status: reservation.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE',
        created: reservation.createdAt instanceof Date
          ? reservation.createdAt
          : new Date(reservation.createdAt),
        lastModified: reservation.updatedAt instanceof Date
          ? reservation.updatedAt
          : new Date(reservation.updatedAt),
        location: property.address || property.location,
      }));

      // Generate iCal content
      const iCalContent = this.generateICalContent(
        events,
        property.name,
        `Calendar for ${property.name}`
      );

      logger.info('iCal feed generated successfully', {
        propertyId,
        eventsCount: events.length,
        size: iCalContent.length,
      });

      // Cache the result
      this.cache.set(cacheKey, {
        content: iCalContent,
        timestamp: Date.now(),
      });

      return iCalContent;
    } catch (error) {
      logger.error('Error generating iCal feed', {
        propertyId,
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Generate iCal content from events
   */
  private generateICalContent(
    events: ICalEvent[],
    calendarName: string,
    calendarDescription: string
  ): string {
    const lines: string[] = [];

    // Calendar header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//AlugaZap//Property Calendar//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push(`X-WR-CALNAME:${this.escapeText(calendarName)}`);
    lines.push(`X-WR-CALDESC:${this.escapeText(calendarDescription)}`);
    lines.push('X-WR-TIMEZONE:America/Sao_Paulo');

    // Add events
    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.uid}`);
      lines.push(`DTSTAMP:${this.formatDate(new Date())}`);
      lines.push(`DTSTART:${this.formatDate(event.startDate)}`);
      lines.push(`DTEND:${this.formatDate(event.endDate)}`);
      lines.push(`SUMMARY:${this.escapeText(event.summary)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      }

      if (event.location) {
        lines.push(`LOCATION:${this.escapeText(event.location)}`);
      }

      lines.push(`STATUS:${event.status}`);
      lines.push('TRANSP:OPAQUE');
      lines.push('SEQUENCE:0');

      if (event.created) {
        lines.push(`CREATED:${this.formatDate(event.created)}`);
      }

      if (event.lastModified) {
        lines.push(`LAST-MODIFIED:${this.formatDate(event.lastModified)}`);
      }

      if (event.organizer) {
        lines.push(`ORGANIZER;CN=Locai:mailto:${event.organizer}`);
      }

      lines.push('END:VEVENT');
    }

    // Calendar footer
    lines.push('END:VCALENDAR');

    // Join with CRLF as per iCal spec
    return lines.join('\r\n');
  }

  /**
   * Format date to iCal format (YYYYMMDDTHHMMSSZ)
   * Uses UTC timezone for consistency
   */
  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape text for iCal format
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Validate generated iCal content
   */
  validateICalContent(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.includes('BEGIN:VCALENDAR')) {
      errors.push('Missing VCALENDAR header');
    }

    if (!content.includes('END:VCALENDAR')) {
      errors.push('Missing VCALENDAR footer');
    }

    if (!content.includes('VERSION:2.0')) {
      errors.push('Missing VERSION');
    }

    if (!content.includes('PRODID:')) {
      errors.push('Missing PRODID');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Invalidate cache for a specific property
   * Call this when a reservation is created/updated/deleted
   */
  invalidateCache(propertyId: string, tenantId: string): void {
    const cacheKey = `${tenantId}:${propertyId}`;
    this.cache.delete(cacheKey);
    logger.info('iCal cache invalidated', { propertyId, tenantId });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('All iCal cache cleared');
  }
}

// Singleton instance
export const iCalGeneratorService = new ICalGeneratorService();
