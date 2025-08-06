import { Property } from '@/lib/types/property';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { reservationService } from './reservation-service';
import { logger } from '@/lib/utils/logger';

export class PropertyService {
  private getTenantService(tenantId: string) {
    return new TenantServiceFactory(tenantId).properties;
  }
  async searchProperties(filters: {
    location?: string;
    checkIn?: Date;
    checkOut?: Date;
    guests?: number;
    maxPrice?: number;
    amenities?: string[];
    propertyType?: string;
    tenantId: string; // Agora obrigatório
  }): Promise<Property[]> {
    try {
      logger.info('🔍 [PropertyService] Buscando propriedades', {
        tenantId: filters.tenantId,
        location: filters.location,
        guests: filters.guests,
        hasDateRange: !!(filters.checkIn && filters.checkOut)
      });

      // Usar serviço específico do tenant
      const tenantPropertyService = this.getTenantService(filters.tenantId);
      let properties = await tenantPropertyService.getAll() as Property[];
      
      // Filter by active status
      properties = properties.filter(p => p.isActive);
      
      // Filter by location
      if (filters.location) {
        const locationLower = filters.location.toLowerCase();
        properties = properties.filter(p => 
          p.city?.toLowerCase().includes(locationLower) ||
          p.neighborhood?.toLowerCase().includes(locationLower) ||
          p.address?.toLowerCase().includes(locationLower)
        );
      }
      
      // Filter by guests capacity
      if (filters.guests) {
        properties = properties.filter(p => p.maxGuests >= filters.guests);
      }
      
      // Filter by amenities
      if (filters.amenities && filters.amenities.length > 0) {
        properties = properties.filter(p => {
          if (!p.amenities || p.amenities.length === 0) return false;
          return filters.amenities!.every(amenity => 
            p.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
          );
        });
      }
      
      // Filter by property type
      if (filters.propertyType) {
        properties = properties.filter(p => 
          p.type?.toLowerCase() === filters.propertyType!.toLowerCase()
        );
      }
      
      // Filter by availability if dates are provided
      if (filters.checkIn && filters.checkOut) {
        const availableProperties = [];
        for (const property of properties) {
          const isAvailable = await reservationService.checkAvailability({
            propertyId: property.id,
            checkIn: filters.checkIn,
            checkOut: filters.checkOut
          });
          if (isAvailable) {
            availableProperties.push(property);
          }
        }
        properties = availableProperties;
      }
      
      // Filter by max price (this would need pricing calculation for accurate filtering)
      // For now, filter by base price
      if (filters.maxPrice) {
        properties = properties.filter(p => {
          const price = p.basePrice || p.pricing?.basePrice || 999999;
          return price <= filters.maxPrice;
        });
      }
      
      // Sort by price (CRESCENTE - mais baratas primeiro)
      properties.sort((a, b) => {
        const priceA = a.basePrice || a.pricing?.basePrice || 999999;
        const priceB = b.basePrice || b.pricing?.basePrice || 999999;
        return priceA - priceB;
      });
      
      logger.info('✅ [PropertyService] Busca concluída', {
        tenantId: filters.tenantId,
        totalFound: properties.length,
        topPrices: properties.slice(0, 3).map(p => p.basePrice || p.pricing?.basePrice || 0)
      });
      
      return properties;
    } catch (error) {
      logger.error('❌ [PropertyService] Erro na busca', {
        tenantId: filters.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  async getById(id: string, tenantId: string): Promise<Property | null> {
    const tenantPropertyService = this.getTenantService(tenantId);
    return await tenantPropertyService.get(id) as Property | null;
  }

  async create(property: Omit<Property, 'id'>, tenantId: string): Promise<string> {
    const tenantPropertyService = this.getTenantService(tenantId);
    const propertyData = { ...property, tenantId };
    return await tenantPropertyService.create(propertyData);
  }

  async update(id: string, property: Partial<Property>, tenantId: string): Promise<void> {
    const tenantPropertyService = this.getTenantService(tenantId);
    return await tenantPropertyService.update(id, property);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tenantPropertyService = this.getTenantService(tenantId);
    return await tenantPropertyService.delete(id);
  }

  async getActiveProperties(tenantId: string): Promise<Property[]> {
    const tenantPropertyService = this.getTenantService(tenantId);
    const properties = await tenantPropertyService.getMany([
      { field: 'isActive', operator: '==', value: true }
    ]) as Property[];
    
    logger.info('🏠 [PropertyService] Propriedades ativas obtidas', {
      tenantId,
      count: properties.length
    });
    
    return properties;
  }

  async findSimilar(propertyId: string, options: {
    budget?: number;
    locations?: string[];
    tenantId: string; // Agora obrigatório
  }): Promise<Property[]> {
    try {
      // Get the original property
      const originalProperty = await this.getById(propertyId, options.tenantId);
      if (!originalProperty) {
        return [];
      }
      
      // Get all properties from tenant
      const tenantPropertyService = this.getTenantService(options.tenantId);
      let properties = await tenantPropertyService.getAll() as Property[];
      
      // Filter by active status and exclude original
      properties = properties.filter(p => p.isActive && p.id !== propertyId);
      
      // Filter by locations if provided
      if (options.locations && options.locations.length > 0) {
        properties = properties.filter(p => 
          options.locations!.some(loc => 
            p.city?.toLowerCase().includes(loc.toLowerCase()) ||
            p.neighborhood?.toLowerCase().includes(loc.toLowerCase())
          )
        );
      } else {
        // If no locations specified, find properties in same city
        properties = properties.filter(p => 
          p.city?.toLowerCase() === originalProperty.city?.toLowerCase()
        );
      }
      
      // Filter by budget (within 30% range)
      if (options.budget) {
        const minPrice = options.budget * 0.7;
        const maxPrice = options.budget * 1.3;
        properties = properties.filter(p => 
          p.basePrice >= minPrice && p.basePrice <= maxPrice
        );
      }
      
      // Score properties by similarity
      const scoredProperties = properties.map(property => {
        let score = 0;
        
        // Similar number of bedrooms (weight: 30%)
        const bedroomDiff = Math.abs(property.bedrooms - originalProperty.bedrooms);
        score += (5 - bedroomDiff) * 6; // Max 30 points
        
        // Similar number of guests (weight: 20%)
        const guestDiff = Math.abs(property.maxGuests - originalProperty.maxGuests);
        score += (10 - guestDiff) * 2; // Max 20 points
        
        // Similar price (weight: 20%)
        const priceDiff = Math.abs(property.basePrice - originalProperty.basePrice);
        const priceRatio = priceDiff / originalProperty.basePrice;
        score += Math.max(0, 20 - (priceRatio * 100)); // Max 20 points
        
        // Similar amenities (weight: 30%)
        if (property.amenities && originalProperty.amenities) {
          const commonAmenities = property.amenities.filter(a => 
            originalProperty.amenities.includes(a)
          ).length;
          const totalAmenities = new Set([...property.amenities, ...originalProperty.amenities]).size;
          score += (commonAmenities / totalAmenities) * 30; // Max 30 points
        }
        
        return { property, score };
      });
      
      // Sort by score and return top matches
      scoredProperties.sort((a, b) => b.score - a.score);
      
      return scoredProperties.slice(0, 5).map(item => item.property);
    } catch (error) {
      logger.error('❌ [PropertyService] Erro ao buscar propriedades similares', {
        propertyId,
        tenantId: options.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
}

export const propertyService = new PropertyService();