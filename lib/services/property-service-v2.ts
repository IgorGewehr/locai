/**
 * Property Service V2 - Multi-tenant version
 * Uses tenant-based subcollections for proper data isolation
 */

import { MultiTenantFirestoreService } from '@/lib/firebase/firestore-v2';
import { Property } from '@/lib/types';
import { where, orderBy } from 'firebase/firestore';

export class PropertyServiceV2 {
  private service: MultiTenantFirestoreService<Property>;

  constructor(tenantId: string) {
    this.service = new MultiTenantFirestoreService<Property>(tenantId, 'properties');
  }

  /**
   * Get all active properties
   */
  async getActiveProperties(): Promise<Property[]> {
    return this.service.getWhere('isActive', '==', true, 'createdAt');
  }

  /**
   * Search properties with filters
   */
  async searchProperties(filters: {
    location?: string;
    bedrooms?: number;
    maxGuests?: number;
    amenities?: string[];
    priceRange?: { min: number; max: number };
  }): Promise<Property[]> {
    // Start with active properties
    let properties = await this.getActiveProperties();

    // Apply filters
    if (filters.location) {
      properties = properties.filter(p => 
        p.city?.toLowerCase().includes(filters.location!.toLowerCase()) ||
        p.neighborhood?.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.bedrooms) {
      properties = properties.filter(p => p.bedrooms >= filters.bedrooms!);
    }

    if (filters.maxGuests) {
      properties = properties.filter(p => p.maxGuests >= filters.maxGuests!);
    }

    if (filters.amenities?.length) {
      properties = properties.filter(p =>
        filters.amenities!.every(amenity => p.amenities.includes(amenity))
      );
    }

    if (filters.priceRange) {
      properties = properties.filter(p =>
        p.basePrice >= filters.priceRange!.min &&
        p.basePrice <= filters.priceRange!.max
      );
    }

    return properties;
  }

  /**
   * Get property by ID
   */
  async getPropertyById(id: string): Promise<Property | null> {
    return this.service.get(id);
  }

  /**
   * Create a new property
   */
  async createProperty(property: Omit<Property, 'id'>): Promise<string> {
    return this.service.create(property);
  }

  /**
   * Update a property
   */
  async updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    return this.service.update(id, updates);
  }

  /**
   * Delete a property
   */
  async deleteProperty(id: string): Promise<void> {
    return this.service.delete(id);
  }

  /**
   * Get all properties (including inactive)
   */
  async getAllProperties(): Promise<Property[]> {
    return this.service.getAll();
  }

  /**
   * Get featured properties
   */
  async getFeaturedProperties(): Promise<Property[]> {
    return this.service.getMany([
      { field: 'isActive', operator: '==', value: true },
      { field: 'isFeatured', operator: '==', value: true }
    ], {
      orderBy: 'createdAt',
      orderDirection: 'desc'
    });
  }

  /**
   * Update property availability
   */
  async updateAvailability(propertyId: string, dates: string[]): Promise<void> {
    return this.service.update(propertyId, {
      unavailableDates: dates
    });
  }

  /**
   * Get properties by price range
   */
  async getPropertiesByPriceRange(min: number, max: number): Promise<Property[]> {
    const properties = await this.getActiveProperties();
    return properties.filter(p => p.basePrice >= min && p.basePrice <= max);
  }

  /**
   * Subscribe to property changes
   */
  subscribeToProperties(callback: (properties: Property[]) => void): () => void {
    return this.service.onSnapshot(callback, [
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    ]);
  }

  /**
   * Subscribe to a specific property
   */
  subscribeToProperty(propertyId: string, callback: (property: Property | null) => void): () => void {
    return this.service.subscribeToDocument(propertyId, callback);
  }
}