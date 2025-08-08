// lib/services/tenant-aware-property-service.ts
// NOVA VERSÃO - Serviço de propriedades com estrutura multi-tenant correta

import { Property } from '@/lib/types/property';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

export class TenantAwarePropertyService {
  private tenantId: string;
  private serviceFactory: TenantServiceFactory;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.serviceFactory = new TenantServiceFactory(tenantId);
  }

  /**
   * Buscar propriedades com filtros
   * NOVA IMPLEMENTAÇÃO - usando tenants/{tenantId}/properties
   */
  async searchProperties(filters: {
    location?: string;
    checkIn?: Date;
    checkOut?: Date;
    guests?: number;
    maxPrice?: number;
    amenities?: string[];
    propertyType?: string;
  }): Promise<Property[]> {
    try {
      logger.info('🔍 [TenantPropertyService] Buscando propriedades', {
        tenantId: this.tenantId,
        filters: {
          location: filters.location,
          guests: filters.guests,
          maxPrice: filters.maxPrice,
          propertyType: filters.propertyType,
          amenitiesCount: filters.amenities?.length || 0
        }
      });

      // Usar o serviço tenant-aware
      const propertyService = this.serviceFactory.properties;
      
      // Buscar apenas propriedades do tenant
      let properties = await propertyService.getAll() as Property[];
      
      logger.info('📊 [TenantPropertyService] Propriedades encontradas', {
        tenantId: this.tenantId,
        totalProperties: properties.length,
        activeProperties: properties.filter(p => p.isActive).length
      });

      // Filtrar apenas propriedades ativas
      properties = properties.filter(p => p.isActive);
      
      // Aplicar filtros
      properties = this.applyFilters(properties, filters);

      logger.info('✅ [TenantPropertyService] Busca concluída', {
        tenantId: this.tenantId,
        resultCount: properties.length
      });

      return properties;
    } catch (error) {
      logger.error('❌ [TenantPropertyService] Erro ao buscar propriedades', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Obter todas as propriedades ativas do tenant
   */
  async getActiveProperties(): Promise<Property[]> {
    try {
      const propertyService = this.serviceFactory.properties;
      const properties = await propertyService.getAll() as Property[];
      
      return properties.filter(p => p.isActive);
    } catch (error) {
      logger.error('❌ [TenantPropertyService] Erro ao obter propriedades ativas', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Obter propriedade por ID
   */
  async getById(propertyId: string): Promise<Property | null> {
    try {
      const propertyService = this.serviceFactory.properties;
      const property = await propertyService.getById(propertyId) as Property | null;
      
      if (property) {
        logger.info('✅ [TenantPropertyService] Propriedade encontrada', {
          tenantId: this.tenantId,
          propertyId,
          propertyName: property.name
        });
      }
      
      return property;
    } catch (error) {
      logger.error('❌ [TenantPropertyService] Erro ao obter propriedade', {
        tenantId: this.tenantId,
        propertyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Aplicar filtros às propriedades
   */
  private applyFilters(properties: Property[], filters: {
    location?: string;
    guests?: number;
    maxPrice?: number;
    amenities?: string[];
    propertyType?: string;
  }): Property[] {
    let filtered = properties;

    // Filtro por localização
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter(p => 
        p.city?.toLowerCase().includes(locationLower) ||
        p.neighborhood?.toLowerCase().includes(locationLower) ||
        p.address?.toLowerCase().includes(locationLower) ||
        p.state?.toLowerCase().includes(locationLower)
      );
    }

    // Filtro por capacidade de hóspedes
    if (filters.guests) {
      filtered = filtered.filter(p => p.maxGuests >= filters.guests!);
    }

    // Filtro por preço máximo
    if (filters.maxPrice) {
      filtered = filtered.filter(p => {
        const basePrice = p.pricing?.basePrice || 0;
        return basePrice <= filters.maxPrice!;
      });
    }

    // Filtro por comodidades
    if (filters.amenities && filters.amenities.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.amenities || p.amenities.length === 0) return false;
        return filters.amenities!.every(amenity => 
          p.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
        );
      });
    }

    // Filtro por tipo de propriedade
    if (filters.propertyType) {
      filtered = filtered.filter(p => 
        p.propertyType?.toLowerCase() === filters.propertyType!.toLowerCase()
      );
    }

    return filtered;
  }
}

// Factory function para criar o serviço
export function createTenantPropertyService(tenantId: string): TenantAwarePropertyService {
  return new TenantAwarePropertyService(tenantId);
}

// Instância padrão (será removida após migração completa)
export const tenantAwarePropertyService = {
  forTenant: (tenantId: string) => createTenantPropertyService(tenantId)
};