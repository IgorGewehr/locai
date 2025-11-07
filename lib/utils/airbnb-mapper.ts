/**
 * Airbnb Data Mapper
 *
 * Converts Airbnb API response to our internal Property structure
 */

import {
  Property,
  PropertyCategory,
  PropertyStatus,
  PropertyType,
  COMMON_AMENITIES,
} from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';
import { AirbnbPropertyData } from '@/lib/services/airbnb-import-service';
import { logger } from '@/lib/utils/logger';

/**
 * Map Airbnb property type to our PropertyCategory
 */
function mapPropertyCategory(airbnbType?: string): PropertyCategory {
  if (!airbnbType) return PropertyCategory.APARTMENT;

  const type = airbnbType.toLowerCase();

  if (type.includes('apartment') || type.includes('apartamento')) {
    return PropertyCategory.APARTMENT;
  }
  if (type.includes('house') || type.includes('casa')) {
    return PropertyCategory.HOUSE;
  }
  if (type.includes('studio') || type.includes('estúdio')) {
    return PropertyCategory.STUDIO;
  }
  if (type.includes('villa')) {
    return PropertyCategory.VILLA;
  }
  if (type.includes('condo') || type.includes('condomínio')) {
    return PropertyCategory.CONDO;
  }

  // Default
  return PropertyCategory.APARTMENT;
}

/**
 * Map Airbnb amenity to our internal amenity string
 *
 * Airbnb uses system codes like "SYSTEM_AIR_CONDITIONING"
 * We map them to user-friendly Portuguese names
 */
function mapAmenity(airbnbAmenity: {
  id: string;
  type: string;
  name: string;
  category?: string;
}): string | null {
  const type = airbnbAmenity.type.toUpperCase();
  const name = airbnbAmenity.name;

  // Map common Airbnb amenity types to our amenities
  const amenityMap: Record<string, string> = {
    // Internet & Communication
    SYSTEM_WIFI: 'Wi-Fi',
    SYSTEM_WIRELESS_INTERNET: 'Wi-Fi',
    SYSTEM_TV: 'TV a Cabo',
    SYSTEM_CABLE_TV: 'TV a Cabo',
    SYSTEM_NETFLIX: 'Netflix',

    // Climate Control
    SYSTEM_AIR_CONDITIONING: 'Ar Condicionado',
    SYSTEM_AC: 'Ar Condicionado',
    SYSTEM_HEATING: 'Aquecedor',
    SYSTEM_FAN: 'Ventilador',

    // Outdoor & Recreation
    SYSTEM_POOL: 'Piscina',
    SYSTEM_SWIMMING_POOL: 'Piscina',
    SYSTEM_BBQ: 'Churrasqueira',
    SYSTEM_GRILL: 'Churrasqueira',
    SYSTEM_BACKYARD: 'Jardim',
    SYSTEM_GARDEN: 'Jardim',
    SYSTEM_BALCONY: 'Varanda',
    SYSTEM_PATIO: 'Varanda',
    SYSTEM_TERRACE: 'Sacada',

    // Parking & Security
    SYSTEM_PARKING: 'Estacionamento',
    SYSTEM_FREE_PARKING: 'Estacionamento',
    SYSTEM_GARAGE: 'Estacionamento',
    SYSTEM_DOORMAN: 'Portaria 24h',
    SYSTEM_SECURITY: 'Portaria 24h',
    SYSTEM_ELEVATOR: 'Elevador',
    SYSTEM_SAFE: 'Cofre',

    // Kitchen Appliances
    SYSTEM_KITCHEN: 'Cozinha Equipada',
    SYSTEM_REFRIGERATOR: 'Geladeira',
    SYSTEM_FRIDGE: 'Geladeira',
    SYSTEM_MICROWAVE: 'Micro-ondas',
    SYSTEM_STOVE: 'Fogão',
    SYSTEM_OVEN: 'Fogão',

    // Laundry
    SYSTEM_WASHER: 'Máquina de Lavar',
    SYSTEM_WASHING_MACHINE: 'Máquina de Lavar',
    SYSTEM_DRYER: 'Secadora',
    SYSTEM_IRON: 'Ferro de Passar',
    SYSTEM_IRONING_BOARD: 'Ferro de Passar',

    // Comfort & Entertainment
    SYSTEM_GYM: 'Academia',
    SYSTEM_FITNESS: 'Academia',
    SYSTEM_HOT_TUB: 'Banheira',
    SYSTEM_BATHTUB: 'Banheira',
    SYSTEM_FIREPLACE: 'Lareira',
    SYSTEM_GAMES: 'Jogos',
    SYSTEM_BOOKS: 'Livros',

    // Family-Friendly
    SYSTEM_CRIB: 'Berço',
    SYSTEM_BABY_COT: 'Berço',
    SYSTEM_HIGH_CHAIR: 'Cadeira de Bebê',
    SYSTEM_BABY_CHAIR: 'Cadeira de Bebê',

    // Safety
    SYSTEM_FIRE_EXTINGUISHER: 'Extintor',
    SYSTEM_SMOKE_DETECTOR: 'Detector de Fumaça',
    SYSTEM_FIRST_AID: 'Kit Primeiro Socorros',
    SYSTEM_FIRST_AID_KIT: 'Kit Primeiro Socorros',

    // Other
    SYSTEM_GOURMET_AREA: 'Área Gourmet',
    SYSTEM_LAUNDRY_ROOM: 'Área de Serviço',
    SYSTEM_SERVICE_AREA: 'Área de Serviço',
  };

  // Try to find exact match
  if (amenityMap[type]) {
    return amenityMap[type];
  }

  // Try to find partial match in name
  const nameLower = name.toLowerCase();
  for (const [key, value] of Object.entries(amenityMap)) {
    const keyLower = key.toLowerCase().replace('system_', '');
    if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) {
      return value;
    }
  }

  // Check if the name itself is in our common amenities list
  const commonMatch = COMMON_AMENITIES.find(
    (a) => a.toLowerCase() === nameLower
  );
  if (commonMatch) {
    return commonMatch;
  }

  // Return the name as-is if no mapping found
  logger.warn('Unmapped Airbnb amenity', { type, name });
  return name;
}

/**
 * Extract address components from Airbnb address object
 */
function formatAddress(address: AirbnbPropertyData['address']): {
  fullAddress: string;
  neighborhood: string;
  city: string;
} {
  const parts: string[] = [];

  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zipCode) parts.push(address.zipCode);
  if (address.country) parts.push(address.country);

  return {
    fullAddress: parts.join(', '),
    neighborhood: address.street || address.city || '',
    city: address.city || '',
  };
}

/**
 * Convert Airbnb property data to our Property interface
 *
 * @param airbnbData - Data from Airbnb API
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @returns Partial property object ready for import
 */
export function mapAirbnbToProperty(
  airbnbData: AirbnbPropertyData,
  tenantId: string
): Omit<Property, 'id' | 'createdAt' | 'updatedAt'> {
  try {
    // Map address
    const addressInfo = formatAddress(airbnbData.address);

    // Map amenities
    const amenities = airbnbData.amenities
      .map(mapAmenity)
      .filter((a): a is string => a !== null)
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    // Map photos - sort by order if available
    const photos = (airbnbData.photos || [])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((p) => p.url);

    // Create default payment method surcharges
    const paymentMethodSurcharges: Record<PaymentMethod, number> = {
      [PaymentMethod.PIX]: 0,
      [PaymentMethod.CREDIT_CARD]: 5, // 5% surcharge for credit card
      [PaymentMethod.DEBIT_CARD]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.CASH]: 0,
    };

    // Build property object
    const property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
      // Basic Info
      title: airbnbData.title || 'Propriedade Importada do Airbnb',
      description: airbnbData.description || '',
      address: addressInfo.fullAddress,
      location: `${addressInfo.fullAddress} ${addressInfo.neighborhood} ${addressInfo.city}`,
      neighborhood: addressInfo.neighborhood,
      city: addressInfo.city,

      // Category & Type
      category: mapPropertyCategory(airbnbData.propertyType),
      type: PropertyType.VACATION, // Airbnb is primarily vacation rentals
      status: PropertyStatus.ACTIVE,

      // Capacity
      bedrooms: airbnbData.guestCapacity.bedrooms || 1,
      bathrooms: airbnbData.guestCapacity.bathrooms || 1,
      maxGuests: airbnbData.guestCapacity.guests || 2,
      capacity: airbnbData.guestCapacity.guests || 2,

      // Pricing (defaults - user should adjust)
      basePrice: 0, // Must be set manually
      pricePerExtraGuest: 0,
      minimumNights: 2,
      cleaningFee: 0,

      // Payment Configuration
      paymentMethodSurcharges,
      advancePaymentPercentage: 30, // 30% advance payment by default

      // Media
      photos,
      videos: [], // Airbnb API rarely provides video URLs directly

      // Amenities
      amenities,

      // Features
      isFeatured: false,
      allowsPets: false, // Check house rules if needed

      // Availability & Pricing
      unavailableDates: [],
      customPricing: {},

      // Surcharges (defaults)
      weekendSurcharge: 20, // 20%
      holidaySurcharge: 30, // 30%
      decemberSurcharge: 40, // 40%
      highSeasonSurcharge: 25, // 25%
      highSeasonMonths: [12, 1, 2, 7], // December, Jan, Feb, July

      // Metadata
      isActive: true,
      tenantId,
    };

    logger.info('Successfully mapped Airbnb property to internal format', {
      airbnbId: airbnbData.id,
      title: property.title,
      photosCount: photos.length,
      amenitiesCount: amenities.length,
    });

    return property;
  } catch (error) {
    logger.error('Error mapping Airbnb property', {
      airbnbId: airbnbData.id,
      error,
    });
    throw error;
  }
}

/**
 * Validate that required fields are present in mapped property
 */
export function validateMappedProperty(
  property: Partial<Property>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!property.title || property.title.trim() === '') {
    errors.push('Título é obrigatório');
  }

  if (!property.address || property.address.trim() === '') {
    errors.push('Endereço é obrigatório');
  }

  if (!property.bedrooms || property.bedrooms < 0) {
    errors.push('Número de quartos inválido');
  }

  if (!property.bathrooms || property.bathrooms < 0) {
    errors.push('Número de banheiros inválido');
  }

  if (!property.maxGuests || property.maxGuests < 1) {
    errors.push('Capacidade de hóspedes inválida');
  }

  if (!property.photos || property.photos.length === 0) {
    errors.push('Pelo menos uma foto é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
