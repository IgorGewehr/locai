/**
 * iCal Parser Service
 *
 * Parses iCal (.ics) files and extracts calendar events
 */

import { ExternalCalendarEvent } from '@/lib/types/calendar-sync';
import { logger } from '@/lib/utils/logger';

export class ICalParserService {
  /**
   * Fetch and parse iCal from URL
   */
  async fetchAndParse(iCalUrl: string): Promise<ExternalCalendarEvent[]> {
    try {
      logger.info('Fetching iCal from URL', { iCalUrl: this.sanitizeUrl(iCalUrl) });

      const response = await fetch(iCalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'LocAI Calendar Sync/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
      }

      const iCalContent = await response.text();

      if (!iCalContent || iCalContent.trim() === '') {
        throw new Error('Empty iCal content received');
      }

      return this.parse(iCalContent);
    } catch (error) {
      logger.error('Error fetching iCal', {
        url: this.sanitizeUrl(iCalUrl),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse iCal content string
   */
  parse(iCalContent: string): ExternalCalendarEvent[] {
    try {
      const events: ExternalCalendarEvent[] = [];
      const lines = iCalContent.split(/\r?\n/);

      let currentEvent: Partial<ExternalCalendarEvent> | null = null;
      let currentField: string | null = null;
      let currentValue = '';

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Handle line continuation (lines starting with space or tab)
        if (line.match(/^[ \t]/) && currentField) {
          currentValue += line.trim();
          continue;
        }

        // Process previous field if exists
        if (currentField && currentEvent) {
          this.processField(currentEvent, currentField, currentValue);
          currentField = null;
          currentValue = '';
        }

        // Skip empty lines
        if (!line.trim()) continue;

        // Start of event
        if (line === 'BEGIN:VEVENT') {
          currentEvent = {};
          continue;
        }

        // End of event
        if (line === 'END:VEVENT' && currentEvent) {
          if (this.isValidEvent(currentEvent)) {
            events.push(currentEvent as ExternalCalendarEvent);
          }
          currentEvent = null;
          continue;
        }

        // Parse field
        if (currentEvent) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            currentField = line.substring(0, colonIndex);
            currentValue = line.substring(colonIndex + 1);
          }
        }
      }

      // Process last field if exists
      if (currentField && currentEvent) {
        this.processField(currentEvent, currentField, currentValue);
      }

      logger.info('iCal parsed successfully', {
        eventsFound: events.length,
      });

      return events;
    } catch (error) {
      logger.error('Error parsing iCal', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to parse iCal content');
    }
  }

  /**
   * Process individual iCal field
   */
  private processField(
    event: Partial<ExternalCalendarEvent>,
    field: string,
    value: string
  ): void {
    // Remove parameters (e.g., "DTSTART;VALUE=DATE:20250101" -> "DTSTART")
    const fieldName = field.split(';')[0];

    switch (fieldName) {
      case 'UID':
        event.uid = value;
        break;

      case 'SUMMARY':
        event.summary = this.unescapeText(value);
        break;

      case 'DESCRIPTION':
        event.description = this.unescapeText(value);
        break;

      case 'DTSTART':
        event.startDate = this.parseDate(value);
        break;

      case 'DTEND':
        event.endDate = this.parseDate(value);
        break;

      case 'STATUS':
        event.status = value as 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
        break;

      case 'ORGANIZER':
        // Extract email from "mailto:email@example.com"
        event.organizer = value.replace(/^mailto:/i, '');
        break;

      case 'LOCATION':
        event.location = this.unescapeText(value);
        break;

      case 'CREATED':
        event.created = this.parseDate(value);
        break;

      case 'LAST-MODIFIED':
        event.lastModified = this.parseDate(value);
        break;

      case 'SEQUENCE':
        event.sequence = parseInt(value, 10);
        break;
    }
  }

  /**
   * Parse iCal date format
   * Supports: 20250101, 20250101T120000, 20250101T120000Z
   */
  private parseDate(dateString: string): Date {
    // Remove timezone identifier if present
    dateString = dateString.replace(/;.*$/, '');

    // Format: YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateString.substring(6, 8), 10);

    let hour = 0;
    let minute = 0;
    let second = 0;

    if (dateString.includes('T')) {
      const timeStart = dateString.indexOf('T') + 1;
      hour = parseInt(dateString.substring(timeStart, timeStart + 2), 10);
      minute = parseInt(dateString.substring(timeStart + 2, timeStart + 4), 10);
      second = parseInt(dateString.substring(timeStart + 4, timeStart + 6), 10);
    }

    // Use UTC if dateString ends with Z
    if (dateString.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Unescape iCal text (remove backslashes)
   */
  private unescapeText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Validate event has required fields
   */
  private isValidEvent(event: Partial<ExternalCalendarEvent>): boolean {
    return !!(
      event.uid &&
      event.summary &&
      event.startDate &&
      event.endDate
    );
  }

  /**
   * Sanitize URL for logging (hide sensitive tokens)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      // Hide 's' parameter (secret token)
      if (params.has('s')) {
        params.set('s', '***');
      }

      return urlObj.toString();
    } catch {
      return url.substring(0, 50) + '...';
    }
  }
}

// Singleton instance
export const iCalParserService = new ICalParserService();
