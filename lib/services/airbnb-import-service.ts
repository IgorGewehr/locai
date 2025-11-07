/**
 * Airbnb Import Service
 *
 * Handles extraction of property IDs from Airbnb URLs and API integration
 * for importing property data.
 */

import { logger } from '@/lib/utils/logger';

export interface AirbnbPropertyData {
  id: string;
  title: string;
  description: string;
  address: {
    street?: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  photos: Array<{
    url: string;
    caption?: string;
    sort_order?: number;
  }>;
  amenities: Array<{
    id: string;
    type: string;
    name: string;
    category?: string;
  }>;
  guestCapacity: {
    guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
  };
  propertyType?: string;
  checkIn?: {
    time?: string;
    instructions?: string;
  };
  checkOut?: {
    time?: string;
  };
  houseRules?: string[];
  safetyInfo?: string[];
}

/**
 * Extract Airbnb property ID from URL
 *
 * Supports various Airbnb URL formats:
 * - https://www.airbnb.com/rooms/1537685406266226838
 * - https://www.airbnb.com.br/rooms/1537685406266226838?source_impression_id=...
 * - https://airbnb.com/rooms/1537685406266226838
 */
export function extractAirbnbPropertyId(url: string): string | null {
  try {
    // Remove whitespace and validate URL
    const cleanUrl = url.trim();

    // Pattern to match Airbnb property ID
    // Matches: /rooms/{id} or /rooms/{id}?...
    const patterns = [
      /\/rooms\/(\d+)/i,
      /roomId=(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If no pattern matches but it's a pure number, return it
    if (/^\d+$/.test(cleanUrl)) {
      return cleanUrl;
    }

    return null;
  } catch (error) {
    logger.error('Error extracting Airbnb property ID', { url, error });
    return null;
  }
}

/**
 * Fetch property data from Airbnb API via hasdata.com
 *
 * Uses the hasdata.com scraping API to fetch Airbnb property data
 * API: https://api.hasdata.com/scrape/airbnb/property
 */
export async function fetchAirbnbPropertyData(
  propertyId: string
): Promise<AirbnbPropertyData | null> {
  try {
    logger.info('Fetching Airbnb property data via hasdata.com', { propertyId });

    // Use our proxy endpoint which handles the hasdata.com API call
    const apiEndpoint = `/api/airbnb/property/${propertyId}`;

    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error('Failed to fetch Airbnb property data', {
        propertyId,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();

    logger.info('Successfully fetched Airbnb property data', {
      propertyId,
      hasPhotos: data.photos?.length > 0,
      hasAmenities: data.amenities?.length > 0,
    });

    return data;
  } catch (error) {
    logger.error('Error fetching Airbnb property data', { propertyId, error });
    return null;
  }
}

/**
 * Import property from Airbnb URL
 *
 * Complete workflow: URL → ID extraction → API fetch → Property data
 */
export async function importFromAirbnbUrl(
  url: string
): Promise<{ success: boolean; data?: AirbnbPropertyData; error?: string }> {
  try {
    // Step 1: Extract property ID
    const propertyId = extractAirbnbPropertyId(url);

    if (!propertyId) {
      return {
        success: false,
        error: 'URL inválida do Airbnb. Não foi possível extrair o ID da propriedade.',
      };
    }

    logger.info('Extracted Airbnb property ID', { propertyId, url });

    // Step 2: Fetch data from API
    const data = await fetchAirbnbPropertyData(propertyId);

    if (!data) {
      return {
        success: false,
        error: 'Não foi possível obter os dados da propriedade do Airbnb. Verifique o URL e tente novamente.',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    logger.error('Error importing from Airbnb URL', { url, error });
    return {
      success: false,
      error: 'Erro ao importar propriedade. Tente novamente mais tarde.',
    };
  }
}

/**
 * Validate Airbnb URL format
 */
export function isValidAirbnbUrl(url: string): boolean {
  try {
    const cleanUrl = url.trim().toLowerCase();

    // Check if it's an Airbnb domain
    const hasAirbnbDomain = cleanUrl.includes('airbnb.com');

    // Check if it has a room ID
    const hasRoomId = /\/rooms\/\d+/.test(cleanUrl) || /roomId=\d+/.test(cleanUrl);

    // Or if it's just a number (property ID)
    const isNumeric = /^\d+$/.test(url.trim());

    return (hasAirbnbDomain && hasRoomId) || isNumeric;
  } catch {
    return false;
  }
}
