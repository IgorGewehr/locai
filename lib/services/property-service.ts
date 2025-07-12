import { Property } from '@/lib/types/property';
import { propertyService as firebasePropertyService } from '@/lib/firebase/firestore';
import { reservationService } from './reservation-service';

export class PropertyService {
  async searchProperties(filters: {
    location?: string;
    checkIn?: Date;
    checkOut?: Date;
    guests?: number;
    maxPrice?: number;
    amenities?: string[];
    propertyType?: string;
    tenantId?: string;
  }): Promise<Property[]> {
    try {
      // Get all properties first
      let properties = await firebasePropertyService.getAll();
      
      // Filter by tenant if provided
      if (filters.tenantId) {
        properties = properties.filter(p => p.tenantId === filters.tenantId);
      }
      
      // Filter by active status
      properties = properties.filter(p => p.isActive);
      
      // Filter by location
      if (filters.location) {
        const locationLower = filters.location.toLowerCase();
        properties = properties.filter(p => 
          p.location.toLowerCase().includes(locationLower) ||
          p.city?.toLowerCase().includes(locationLower) ||
          p.state?.toLowerCase().includes(locationLower)
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
        properties = properties.filter(p => p.basePrice <= filters.maxPrice);
      }
      
      // Sort by price
      properties.sort((a, b) => a.basePrice - b.basePrice);
      
      return properties;
    } catch (error) {
      console.error('Error searching properties:', error);
      return [];
    }
  }

  async getById(id: string): Promise<Property | null> {
    return firebasePropertyService.getById(id);
  }

  async create(property: Omit<Property, 'id'>): Promise<string> {
    return firebasePropertyService.create(property);
  }

  async update(id: string, property: Partial<Property>): Promise<void> {
    return firebasePropertyService.update(id, property);
  }

  async delete(id: string): Promise<void> {
    return firebasePropertyService.delete(id);
  }

  async findSimilar(propertyId: string, options: {
    budget?: number;
    locations?: string[];
    tenantId?: string;
  }): Promise<Property[]> {
    try {
      // Get the original property
      const originalProperty = await this.getById(propertyId);
      if (!originalProperty) {
        return [];
      }
      
      // Get all properties
      let properties = await firebasePropertyService.getAll();
      
      // Filter by tenant if provided
      if (options.tenantId) {
        properties = properties.filter(p => p.tenantId === options.tenantId);
      }
      
      // Filter by active status and exclude original
      properties = properties.filter(p => p.isActive && p.id !== propertyId);
      
      // Filter by locations if provided
      if (options.locations && options.locations.length > 0) {
        properties = properties.filter(p => 
          options.locations!.some(loc => 
            p.location.toLowerCase().includes(loc.toLowerCase()) ||
            p.city?.toLowerCase().includes(loc.toLowerCase())
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
      console.error('Error finding similar properties:', error);
      return [];
    }
  }
}

export const propertyService = new PropertyService();