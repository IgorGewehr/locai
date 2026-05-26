/**
 * Airbnb Helper Utilities
 *
 * Utilities for working with Airbnb URLs and data extraction
 */

import { logger } from './logger';

/**
 * Extract property ID from Airbnb URL
 *
 * Supports various Airbnb URL formats:
 * - https://www.airbnb.com.br/rooms/1537685406266226838
 * - https://www.airbnb.com/rooms/1537685406266226838?adults=2&guests=2...
 * - https://airbnb.com/rooms/1537685406266226838
 *
 * @param url - Airbnb property URL
 * @returns Property ID or null if not found
 */
export function extractAirbnbPropertyId(url: string): string | null {
  try {
    // Clean the URL
    const cleanUrl = url.trim();

    // Patterns: /rooms/[ID], /rooms/plus/[ID] or roomId=[ID] query param
    const patterns = [/\/rooms\/(?:plus\/)?(\d+)/i, /[?&]roomId=(\d+)/i];
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        const propertyId = match[1];
        logger.info('Extracted Airbnb property ID', {
          url: url.substring(0, 50) + '...',
          propertyId,
        });
        return propertyId;
      }
    }

    // Accept a bare numeric ID pasted directly
    if (/^\d+$/.test(cleanUrl)) {
      return cleanUrl;
    }

    logger.warn('Could not extract property ID from Airbnb URL', {
      url: url.substring(0, 50) + '...',
    });

    return null;
  } catch (error) {
    logger.error('Error extracting Airbnb property ID', {
      url: url.substring(0, 50) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Validate Airbnb URL format
 *
 * @param url - URL to validate
 * @returns true if URL appears to be a valid Airbnb property URL
 */
export function isValidAirbnbUrl(url: string): boolean {
  try {
    const cleanUrl = url.trim();

    // Accept a bare numeric ID pasted directly
    if (/^\d+$/.test(cleanUrl)) {
      return true;
    }

    // Otherwise must be an Airbnb URL from which we can extract an ID
    if (!cleanUrl.toLowerCase().includes('airbnb.com')) {
      return false;
    }

    return extractAirbnbPropertyId(cleanUrl) !== null;
  } catch {
    return false;
  }
}

/**
 * Generate Airbnb calendar settings URL
 *
 * This URL directs the user to the Airbnb calendar import/export settings
 * where they can get their iCal export URL
 *
 * @param propertyId - Airbnb property ID
 * @returns URL to Airbnb calendar settings
 */
export function generateAirbnbCalendarSettingsUrl(propertyId: string): string {
  return `https://www.airbnb.com.br/multicalendar/${propertyId}/availability-settings/sharing-settings/import-calendar`;
}

/**
 * Generate Airbnb property URL
 *
 * @param propertyId - Airbnb property ID
 * @returns Direct URL to property page
 */
export function generateAirbnbPropertyUrl(propertyId: string): string {
  return `https://www.airbnb.com.br/rooms/${propertyId}`;
}

/**
 * Extract property ID from iCal URL
 *
 * Some iCal URLs from Airbnb contain the property ID
 *
 * @param iCalUrl - iCal export URL
 * @returns Property ID or null if not found
 */
export function extractPropertyIdFromICalUrl(iCalUrl: string): string | null {
  try {
    // Airbnb iCal URLs sometimes have format:
    // https://www.airbnb.com/calendar/ical/[PROPERTY_ID].ics?s=[TOKEN]
    const pattern = /\/calendar\/ical\/(\d+)\.ics/;
    const match = iCalUrl.match(pattern);

    if (match && match[1]) {
      return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate iCal URL format
 *
 * @param url - URL to validate
 * @returns true if URL appears to be a valid iCal URL
 */
export function isValidICalUrl(url: string): boolean {
  try {
    const cleanUrl = url.trim();

    // Must be a valid URL
    const urlObj = new URL(cleanUrl);

    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    // Check if contains .ics in the path (not just at the end due to query params)
    // Examples:
    // - https://www.airbnb.com.br/calendar/ical/1537685406266226838.ics?s=xxx ✓
    // - https://www.airbnb.com/calendar/ical/123.ics ✓
    // - https://calendar.google.com/ical/xyz.ics ✓
    const pathname = urlObj.pathname.toLowerCase();

    return (
      pathname.includes('.ics') ||
      pathname.includes('/calendar/ical/') ||
      pathname.includes('/ical/')
    );
  } catch {
    return false;
  }
}

/**
 * Parse Airbnb URL and extract all useful information
 *
 * @param url - Airbnb property URL
 * @returns Parsed information
 */
export interface AirbnbUrlInfo {
  propertyId: string | null;
  propertyUrl: string | null;
  calendarSettingsUrl: string | null;
  isValid: boolean;
}

export function parseAirbnbUrl(url: string): AirbnbUrlInfo {
  const propertyId = extractAirbnbPropertyId(url);
  const isValid = isValidAirbnbUrl(url);

  return {
    propertyId,
    propertyUrl: propertyId ? generateAirbnbPropertyUrl(propertyId) : null,
    calendarSettingsUrl: propertyId
      ? generateAirbnbCalendarSettingsUrl(propertyId)
      : null,
    isValid,
  };
}

/**
 * Sanitize Airbnb URL for logging (hide tokens)
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL safe for logging
 */
export function sanitizeAirbnbUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // Hide sensitive parameters
    const sensitiveParams = ['s', 'token', 'auth', 'key'];
    sensitiveParams.forEach((param) => {
      if (params.has(param)) {
        params.set(param, '***');
      }
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, just truncate
    return url.substring(0, 50) + '...';
  }
}
