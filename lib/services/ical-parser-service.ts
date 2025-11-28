/**
 * iCal Parser Service
 *
 * Parses iCal (.ics) files and extracts calendar events
 */

import { ExternalCalendarEvent } from '@/lib/types/calendar-sync';
import { logger } from '@/lib/utils/logger';

export class ICalParserService {
  // ✅ BAIXO 13: Exponential backoff configuration
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_DELAY_MS = 1000; // 1 second
  private readonly MAX_DELAY_MS = 10000; // 10 seconds

  /**
   * Sleep utility for exponential backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.INITIAL_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * 500; // Add random jitter up to 500ms
    return Math.min(exponentialDelay + jitter, this.MAX_DELAY_MS);
  }

  /**
   * Fetch and parse iCal from URL with exponential backoff retry
   */
  async fetchAndParse(iCalUrl: string): Promise<ExternalCalendarEvent[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        logger.info('Fetching iCal from URL', {
          iCalUrl: this.sanitizeUrl(iCalUrl),
          attempt: attempt + 1,
          maxAttempts: this.MAX_RETRIES,
        });

        const response = await fetch(iCalUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'LocAI Calendar Sync/1.0',
            'Accept': 'text/calendar, application/ics, text/plain',
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          // Retry on 5xx errors (server errors) and 429 (rate limit)
          if (response.status >= 500 || response.status === 429) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
          // Don't retry on 4xx client errors (except 429)
          throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
        }

        const iCalContent = await response.text();

        if (!iCalContent || iCalContent.trim() === '') {
          throw new Error('Empty iCal content received');
        }

        // Success - parse and return
        return this.parse(iCalContent);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if we should retry
        const isRetryable =
          lastError.message.includes('Server error') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('network') ||
          lastError.message.includes('ECONNREFUSED') ||
          lastError.message.includes('ETIMEDOUT') ||
          lastError.message.includes('fetch failed');

        if (isRetryable && attempt < this.MAX_RETRIES - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn('iCal fetch failed, retrying with backoff', {
            url: this.sanitizeUrl(iCalUrl),
            attempt: attempt + 1,
            nextRetryInMs: delay,
            error: lastError.message,
          });
          await this.sleep(delay);
          continue;
        }

        // No more retries - throw
        break;
      }
    }

    logger.error('Error fetching iCal after all retries', {
      url: this.sanitizeUrl(iCalUrl),
      attempts: this.MAX_RETRIES,
      error: lastError?.message || 'Unknown error',
    });
    throw lastError || new Error('Failed to fetch iCal');
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
   *
   * ✅ MÉDIO 6: Corrigido parsing de DATE-ONLY para usar UTC e evitar problemas de timezone
   * DATE-ONLY (YYYYMMDD) é tratado como UTC para consistência entre fusos horários
   */
  private parseDate(dateString: string): Date {
    // Remove timezone identifier if present (e.g., ";TZID=America/Sao_Paulo")
    const cleanDateString = dateString.replace(/;.*$/, '');

    // Format: YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const year = parseInt(cleanDateString.substring(0, 4), 10);
    const month = parseInt(cleanDateString.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(cleanDateString.substring(6, 8), 10);

    let hour = 0;
    let minute = 0;
    let second = 0;

    // Check if it has time component
    const hasTime = cleanDateString.includes('T');

    if (hasTime) {
      const timeStart = cleanDateString.indexOf('T') + 1;
      hour = parseInt(cleanDateString.substring(timeStart, timeStart + 2), 10) || 0;
      minute = parseInt(cleanDateString.substring(timeStart + 2, timeStart + 4), 10) || 0;
      second = parseInt(cleanDateString.substring(timeStart + 4, timeStart + 6), 10) || 0;
    }

    // Use UTC if:
    // 1. dateString ends with Z (explicit UTC)
    // 2. DATE-ONLY format (no time component) - ✅ FIX: always use UTC for date-only
    //    This prevents timezone issues where check-in could be wrong day
    if (cleanDateString.endsWith('Z') || !hasTime) {
      // For DATE-ONLY, set time to noon UTC to avoid edge cases
      // This ensures the date is correct regardless of timezone
      if (!hasTime) {
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    // Has time but no Z suffix - assume local timezone
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
