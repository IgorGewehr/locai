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

    // Make request to hasdata.com API
    const response = await fetch(hasdataApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

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

  // Build standardized response
  return {
    id: listing.id || propertyId,
    title: listing.title || listing.name || listing.publicAddress || 'Propriedade Importada do Airbnb',
    description: listing.description || listing.summary || '',
    address,
    photos,
    amenities,
    guestCapacity,
    propertyType: listing.roomType || listing.propertyType || 'Entire home/apt',
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
 * Extract photos from hasdata.com response
 */
function extractPhotos(listing: any): Array<{ url: string; caption?: string; sort_order: number }> {
  const photos: Array<{ url: string; caption?: string; sort_order: number }> = [];

  // Try different possible photo field names
  const photoSources = [
    listing.photos,
    listing.images,
    listing.pictureUrls,
    listing.listingExpectations?.photos,
  ];

  for (const source of photoSources) {
    if (Array.isArray(source) && source.length > 0) {
      source.forEach((photo: any, index: number) => {
        if (typeof photo === 'string') {
          photos.push({ url: photo, sort_order: index });
        } else if (photo.url || photo.picture || photo.baseUrl) {
          photos.push({
            url: photo.url || photo.picture || photo.baseUrl,
            caption: photo.caption || photo.description || '',
            sort_order: photo.sortOrder || photo.order || index,
          });
        }
      });
      break; // Use first valid source
    }
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
