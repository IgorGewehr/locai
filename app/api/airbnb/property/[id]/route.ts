/**
 * Airbnb Property API Proxy
 *
 * This endpoint fetches property data from hasdata.com scraping API
 * and returns it in a standardized format.
 *
 * Configure the API key via environment variable:
 * - AIRBNB: API key for hasdata.com
 *
 * API Documentation: https://api.hasdata.com/scrape/airbnb/property
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { translateAirbnbProperty } from '@/lib/utils/airbnb-translator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { id: propertyId } = await params;

    if (!propertyId || !/^\d+$/.test(propertyId)) {
      return NextResponse.json(
        { error: 'ID de propriedade inválido' },
        { status: 400 }
      );
    }

    logger.info('Fetching Airbnb property data via hasdata.com', { propertyId });

    // Get API key from environment
    const apiKey = process.env.AIRBNB;

    if (!apiKey) {
      logger.error('AIRBNB API key not configured');
      return NextResponse.json(
        {
          error: 'API do Airbnb não configurada',
          message:
            'Configure a variável AIRBNB no arquivo .env com sua API key do hasdata.com',
        },
        { status: 503 }
      );
    }

    // Build the Airbnb URL to scrape
    const airbnbUrl = `https://www.airbnb.com/rooms/${propertyId}`;

    // Build the hasdata.com API URL with encoded Airbnb URL
    const encodedAirbnbUrl = encodeURIComponent(airbnbUrl);
    const hasdataApiUrl = `https://api.hasdata.com/scrape/airbnb/property?url=${encodedAirbnbUrl}`;

    logger.info('Calling hasdata.com API', {
      propertyId,
      airbnbUrl,
      apiUrl: hasdataApiUrl.replace(apiKey, '***')
    });

    // Make request to hasdata.com API with a hard timeout so a hung upstream
    // never blocks the import flow indefinitely.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response: Response;
    try {
      response = await fetch(hasdataApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });
    } catch (fetchError) {
      const aborted = fetchError instanceof Error && fetchError.name === 'AbortError';
      logger.error('hasdata.com API request failed (network/timeout)', {
        propertyId,
        aborted,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      });
      return NextResponse.json(
        {
          error: aborted ? 'Tempo de resposta esgotado' : 'Erro de conexão com o Airbnb',
          message: aborted
            ? 'O Airbnb demorou muito para responder. Tente novamente em instantes.'
            : 'Não foi possível conectar ao serviço de importação. Tente novamente.',
        },
        { status: 504 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      logger.error('hasdata.com API request failed', {
        propertyId,
        status: response.status,
        statusText: response.statusText,
      });

      return NextResponse.json(
        {
          error: 'Erro ao buscar dados do Airbnb',
          message: `API retornou status ${response.status}`,
          details: response.statusText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    logger.info('Raw hasdata.com API response', {
      propertyId,
      hasProperty: !!data.property,
      hasData: !!data.data,
      topLevelKeys: Object.keys(data),
      propertyKeys: data.property ? Object.keys(data.property) : [],
    });

    // Transform the response to match our expected format
    const transformedData = transformAirbnbResponse(data, propertyId);

    logger.info('Successfully fetched and transformed Airbnb property data', {
      propertyId,
      hasPhotos: transformedData.photos?.length > 0,
      photosCount: transformedData.photos?.length || 0,
      hasAmenities: transformedData.amenities?.length > 0,
      amenitiesCount: transformedData.amenities?.length || 0,
    });

    // Translate property data to Portuguese
    const translatedData = await translateAirbnbProperty(transformedData);

    logger.info('Property translated to Portuguese', {
      propertyId,
      titleTranslated: translatedData.title !== transformedData.title,
      descriptionTranslated: translatedData.description !== transformedData.description,
    });

    return NextResponse.json(translatedData);
  } catch (error) {
    // Get propertyId safely for error logging
    const { id: propertyId } = await params;

    logger.error('Error in Airbnb property API', {
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Erro interno ao buscar dados do Airbnb',
        message:
          error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}

/**
 * Transform hasdata.com API response to our expected format
 *
 * hasdata.com returns Airbnb data with a specific structure that we need to normalize
 */
function transformAirbnbResponse(apiData: any, propertyId: string): any {
  // Check if response has error
  if (apiData.error) {
    throw new Error(apiData.error);
  }

  // hasdata.com returns data in { property: {...} } structure
  // Extract the actual listing data
  const listing = apiData.property || apiData.data || apiData.listing || apiData;

  logger.info('Transforming hasdata.com response', {
    propertyId,
    hasProperty: !!apiData.property,
    hasPhotos: !!listing.photos,
    photosCount: listing.photos?.length || 0,
    hasAmenities: !!listing.amenities,
    amenitiesCount: listing.amenities?.length || 0,
  });

  // Extract photos - hasdata.com usually provides photos in different formats
  const photos = extractPhotos(listing);

  // Extract amenities - hasdata.com provides amenities in groups
  const amenities = extractAmenities(listing);

  // Extract location/address
  const address = extractAddress(listing);

  // Extract capacity info
  const guestCapacity = extractGuestCapacity(listing);

  // Extract nightly price (so imports arrive pre-populated instead of R$0)
  const nightlyPrice = extractNightlyPrice(listing);

  // Build standardized response
  return {
    id: String(listing.id || propertyId),
    title: extractTitle(listing) || 'Propriedade Importada do Airbnb',
    description: extractDescription(listing),
    address,
    photos,
    amenities,
    guestCapacity,
    // Prefer the human-readable property type over the room type code.
    propertyType:
      listing.propertyType ||
      listing.roomTypeCategory ||
      listing.roomType ||
      listing.spaceType ||
      'Entire home/apt',
    nightlyPrice,
    checkIn: {
      time: listing.checkInTime || listing.checkIn,
      instructions: listing.checkInInstructions,
    },
    checkOut: {
      time: listing.checkOutTime || listing.checkOut,
    },
    houseRules: listing.houseRules || [],
    safetyInfo: listing.safetyInfo || listing.safetyAndPropertyInfo || [],
  };
}

/**
 * Extract a usable title from the many possible hasdata.com field names.
 */
function extractTitle(listing: any): string {
  return (
    listing.title ||
    listing.name ||
    listing.seoTitle ||
    listing.publicAddress ||
    ''
  ).toString().trim();
}

/**
 * Extract description. hasdata.com may return a plain string, an object with
 * sections, or an array of { title, value } blocks. Normalize all of them.
 */
function extractDescription(listing: any): string {
  const raw =
    listing.description ??
    listing.descriptionOriginal ??
    listing.summary ??
    listing.space ??
    '';

  if (typeof raw === 'string') return raw.trim();

  // Object with a text/value field
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const text = raw.text || raw.value || raw.html || raw.summary;
    if (typeof text === 'string') return text.trim();
  }

  // Array of sections: join their text content
  if (Array.isArray(raw)) {
    const parts = raw
      .map((s: any) =>
        typeof s === 'string' ? s : s?.value || s?.text || s?.title || ''
      )
      .filter(Boolean);
    if (parts.length) return parts.join('\n\n').trim();
  }

  return '';
}

/**
 * Extract a numeric nightly price from the assorted shapes hasdata.com returns.
 * Returns 0 when no reliable price is found (caller treats 0 as "needs setup").
 */
function extractNightlyPrice(listing: any): number {
  const candidates: any[] = [
    listing.price?.rate?.amount,
    listing.price?.rate,
    listing.price?.amount,
    listing.price?.value,
    listing.pricing?.rate?.amount,
    listing.pricing?.rate,
    listing.nightlyPrice,
    listing.ratePerNight,
    listing.basePrice,
    typeof listing.price === 'number' ? listing.price : undefined,
    typeof listing.price === 'string' ? listing.price : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate == null) continue;
    if (typeof candidate === 'number' && isFinite(candidate) && candidate > 0) {
      return Math.round(candidate);
    }
    if (typeof candidate === 'string') {
      // Strip currency symbols / thousands separators: "R$ 1.234,56" -> 1234
      const digits = candidate.replace(/[^\d.,]/g, '');
      // Heuristic: if both separators present, treat "." as thousands and "," as decimal
      const normalized =
        digits.includes(',') && digits.includes('.')
          ? digits.replace(/\./g, '').replace(',', '.')
          : digits.replace(',', '.');
      const parsed = parseFloat(normalized);
      if (isFinite(parsed) && parsed > 0) return Math.round(parsed);
    }
  }

  return 0;
}

/**
 * Upgrade an Airbnb/muscache image URL to a high resolution variant.
 *
 * Airbnb thumbnails embed resize hints (e.g. `?im_w=720`, `im_policy=...`).
 * We request a large width so imported photos look good in the gallery.
 */
function upgradePhotoResolution(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (!/muscache\.com$/.test(url.hostname) && !url.hostname.includes('muscache')) {
      return rawUrl;
    }
    // Drop low-res policies and force a large width.
    url.searchParams.delete('im_policy');
    url.searchParams.set('im_w', '1200');
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Extract photos from hasdata.com response.
 *
 * Aggregates across every known field shape (not just the first that matches),
 * deduplicates, upgrades resolution and preserves ordering.
 */
function extractPhotos(listing: any): Array<{ url: string; caption?: string; sort_order: number }> {
  const photos: Array<{ url: string; caption?: string; sort_order: number }> = [];
  const seen = new Set<string>();

  // Try different possible photo field names (collect from ALL of them)
  const photoSources = [
    listing.photos,
    listing.images,
    listing.pictureUrls,
    listing.pictures,
    listing.photoUrls,
    listing.listingExpectations?.photos,
  ];

  let order = 0;
  for (const source of photoSources) {
    if (!Array.isArray(source) || source.length === 0) continue;

    source.forEach((photo: any) => {
      let rawUrl: string | undefined;
      let caption = '';
      let sortOrder: number | undefined;

      if (typeof photo === 'string') {
        rawUrl = photo;
      } else if (photo && typeof photo === 'object') {
        // hasdata.com sometimes nests the best image under sized variants.
        rawUrl =
          photo.xlPicture ||
          photo.large ||
          photo.url ||
          photo.picture ||
          photo.baseUrl ||
          photo.src;
        caption = photo.caption || photo.description || '';
        sortOrder = photo.sortOrder ?? photo.order;
      }

      if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
        return;
      }

      const finalUrl = upgradePhotoResolution(rawUrl);
      // Dedupe by base path (ignoring resize query) to avoid duplicate variants.
      const dedupeKey = finalUrl.split('?')[0];
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      photos.push({
        url: finalUrl,
        caption,
        sort_order: sortOrder ?? order,
      });
      order++;
    });
  }

  return photos;
}

/**
 * Extract amenities from hasdata.com response
 */
function extractAmenities(listing: any): Array<{ id: string; type: string; name: string; category?: string }> {
  const amenities: Array<{ id: string; type: string; name: string; category?: string }> = [];

  // Try different possible amenity field names
  const amenitySources = [
    listing.amenities,
    listing.listingAmenities,
    listing.amenityIds,
  ];

  for (const source of amenitySources) {
    if (Array.isArray(source) && source.length > 0) {
      source.forEach((amenity: any) => {
        // Skip amenities that are not available
        if (amenity.available === false) {
          return;
        }

        if (typeof amenity === 'string') {
          amenities.push({
            id: String(Math.random()),
            type: 'SYSTEM_' + amenity.toUpperCase().replace(/\s+/g, '_'),
            name: amenity,
          });
        } else if (amenity.title || amenity.name) {
          amenities.push({
            id: String(amenity.id || Math.random()),
            type: amenity.type || 'SYSTEM_' + (amenity.title || amenity.name || '').toUpperCase().replace(/\s+/g, '_'),
            name: amenity.title || amenity.name,
            category: amenity.category || amenity.group,
          });
        }
      });
      break;
    }
  }

  return amenities;
}

/**
 * Extract address from hasdata.com response
 */
function extractAddress(listing: any): any {
  // hasdata.com returns address as a string like "Piratuba, Santa Catarina, Brazil"
  let city = '';
  let state = '';
  let country = '';

  if (typeof listing.address === 'string') {
    const parts = listing.address.split(',').map((p: string) => p.trim());
    if (parts.length >= 3) {
      city = parts[0];
      state = parts[1];
      country = parts[2];
    } else if (parts.length === 2) {
      city = parts[0];
      state = parts[1];
      country = 'BR';
    } else if (parts.length === 1) {
      city = parts[0];
      country = 'BR';
    }
  }

  // Also check for location object (fallback)
  const location = listing.location || {};

  return {
    street: location.street || listing.street || '',
    city: city || location.city || listing.city || location.localizedCity || '',
    state: state || location.state || listing.state || location.administrativeAreaLevel1 || '',
    zipCode: location.zipcode || location.zipCode || listing.zipCode || location.postalCode || '',
    country: country || location.country || listing.country || 'BR',
    latitude: listing.latitude || location.lat || location.latitude,
    longitude: listing.longitude || location.lng || location.longitude,
  };
}

/**
 * Extract guest capacity from hasdata.com response
 */
function extractGuestCapacity(listing: any): any {
  return {
    guests: listing.guestCapacity || listing.personCapacity || listing.guests || listing.maxGuests || 2,
    bedrooms: listing.bedrooms || listing.bedroomCount || 1,
    beds: listing.beds || listing.bedCount || 1,
    bathrooms: listing.bathrooms || listing.bathroomCount || 1,
  };
}
