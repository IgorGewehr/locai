import { Property, normalizePropertyMedia, extractPhotoUrls, extractVideoUrls } from '@/lib/types/property';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { reservationService } from './reservation-service';
import { logger } from '@/lib/utils/logger';
import { AvailabilityService } from './availability-service';
import { AvailabilityStatus } from '@/lib/types/availability';
import { startOfDay, endOfDay, eachDayOfInterval, isSameDay } from 'date-fns';

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
    const rawProperty = await tenantPropertyService.get(id);
    
    if (!rawProperty) return null;
    
    // ✅ NORMALIZAÇÃO: Compatibilidade entre estruturas antiga e nova
    const normalizedProperty = normalizePropertyMedia(rawProperty as any);
    
    logger.info('Property normalized', {
      tenantId,
      propertyId: id,
      photosCount: normalizedProperty.photos?.length || 0,
      videosCount: normalizedProperty.videos?.length || 0
    });
    
    return normalizedProperty as Property;
  }

  /**
   * Group consecutive dates into date ranges for efficient storage
   */
  private groupConsecutiveDates(dates: Date[]): Array<{ startDate: Date; endDate: Date }> {
    if (dates.length === 0) return [];
    
    // Sort dates
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    
    const groups: Array<{ startDate: Date; endDate: Date }> = [];
    let currentGroupStart = sortedDates[0];
    let currentGroupEnd = sortedDates[0];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const prevDate = sortedDates[i - 1];
      
      // Check if dates are consecutive (1 day apart)
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Extend current group
        currentGroupEnd = currentDate;
      } else {
        // Save current group and start new one
        groups.push({
          startDate: startOfDay(currentGroupStart),
          endDate: endOfDay(currentGroupEnd)
        });
        currentGroupStart = currentDate;
        currentGroupEnd = currentDate;
      }
    }
    
    // Save last group
    groups.push({
      startDate: startOfDay(currentGroupStart),
      endDate: endOfDay(currentGroupEnd)
    });
    
    return groups;
  }

  async create(property: Omit<Property, 'id'>, tenantId: string): Promise<string> {
    try {
      logger.info('🏠 [PropertyService] Creating new property', {
        tenantId,
        title: property.title,
        photosCount: property.photos?.length || 0,
        videosCount: property.videos?.length || 0,
        hasPhotos: !!(property.photos && property.photos.length > 0)
      });

      // Log photo URLs to debug persistence
      if (property.photos && property.photos.length > 0) {
        logger.info('📸 [PropertyService] Property photos being saved', {
          photosData: property.photos.map((photo, index) => {
            const photoUrl = typeof photo === 'string' ? photo : (photo?.url || '');
            return {
              index,
              isString: typeof photo === 'string',
              isFirebaseUrl: photoUrl.includes('firebasestorage.googleapis.com'),
              isBlobUrl: photoUrl.startsWith('blob:'),
              urlPreview: photoUrl.substring(0, 50) + '...'
            };
          })
        });
      }

      const tenantPropertyService = this.getTenantService(tenantId);
      const propertyData = { ...property, tenantId };
      const propertyId = await tenantPropertyService.create(propertyData);

      logger.info('✅ [PropertyService] Property created successfully', {
        propertyId,
        tenantId
      });

      // Sync unavailableDates to availability collection if provided
      if (property.unavailableDates && property.unavailableDates.length > 0) {
        try {
          logger.info('📅 [PropertyService] Syncing unavailable dates to availability collection', {
            propertyId,
            datesCount: property.unavailableDates.length
          });

          const availabilityService = new AvailabilityService(tenantId);
          
          // Group consecutive dates for efficiency
          const groupedDates = this.groupConsecutiveDates(property.unavailableDates);
          
          // Create availability periods for each group
          for (const group of groupedDates) {
            await availabilityService.updateAvailability({
              propertyId,
              startDate: group.startDate,
              endDate: group.endDate,
              status: AvailabilityStatus.BLOCKED,
              reason: 'Bloqueado durante criação do imóvel'
            }, 'system');
          }

          logger.info('✅ [PropertyService] Unavailable dates synced successfully', {
            propertyId,
            periodsCreated: groupedDates.length
          });
        } catch (syncError) {
          // Don't fail property creation if sync fails
          logger.warn('⚠️ [PropertyService] Failed to sync unavailable dates', {
            propertyId,
            error: syncError instanceof Error ? syncError.message : 'Unknown error'
          });
        }
      }

      return propertyId;
    } catch (error) {
      logger.error('❌ [PropertyService] Error creating property', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        photosCount: property.photos?.length || 0
      });
      throw error;
    }
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
    const rawProperties = await tenantPropertyService.getMany([
      { field: 'isActive', operator: '==', value: true }
    ]) as Property[];
    
    // ✅ NORMALIZAÇÃO: Aplicar a todas as propriedades
    const normalizedProperties = rawProperties.map(property => 
      normalizePropertyMedia(property as any)
    ) as Property[];
    
    logger.info('🏠 [PropertyService] Propriedades ativas obtidas e normalizadas', {
      tenantId,
      count: normalizedProperties.length,
      totalPhotos: normalizedProperties.reduce((sum, p) => sum + (p.photos?.length || 0), 0)
    });
    
    return normalizedProperties;
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