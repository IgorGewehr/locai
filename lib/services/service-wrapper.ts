/**
 * Service Wrapper for smooth migration
 * Automatically uses the appropriate service based on configuration
 */

import { PropertyServiceV2 } from './property-service-v2';
import { propertyService as oldPropertyService } from '@/lib/firebase/firestore';
import { Property } from '@/lib/types';

// Flag to control which version to use
const USE_MULTI_TENANT = process.env.NEXT_PUBLIC_USE_MULTI_TENANT === 'true' || true; // Default to true for new structure

export class PropertyServiceWrapper {
  private v2Service: PropertyServiceV2 | null = null;
  private tenantId: string | null = null;

  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
    if (USE_MULTI_TENANT) {
      this.v2Service = new PropertyServiceV2(tenantId);
    }
  }

  private getService() {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService;
    }

    if (!this.v2Service) {
      throw new Error('PropertyServiceWrapper: tenantId not set. Call setTenantId() first.');
    }

    return this.v2Service;
  }

  async getActiveProperties(): Promise<Property[]> {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService.getWhere('isActive', '==', true, 'createdAt');
    }
    return this.getService().getActiveProperties();
  }

  async getPropertyById(id: string): Promise<Property | null> {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService.get(id);
    }
    return this.getService().getPropertyById(id);
  }

  async createProperty(property: Omit<Property, 'id'>): Promise<string> {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService.create(property);
    }
    return this.getService().createProperty(property);
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<void> {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService.update(id, updates);
    }
    return this.getService().updateProperty(id, updates);
  }

  async deleteProperty(id: string): Promise<void> {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService.delete(id);
    }
    return this.getService().deleteProperty(id);
  }

  async getAllProperties(): Promise<Property[]> {
    if (!USE_MULTI_TENANT) {
      return oldPropertyService.getAll();
    }
    return this.getService().getAllProperties();
  }

  async searchProperties(filters: any): Promise<Property[]> {
    if (!USE_MULTI_TENANT) {
      // Use old search logic
      const properties = await oldPropertyService.getWhere('isActive', '==', true);
      // Apply filters...
      return properties;
    }
    return this.getService().searchProperties(filters);
  }
}

// Create a singleton instance
export const propertyServiceWrapper = new PropertyServiceWrapper();

/**
 * Hook-like function to get property service with tenant context
 */
export function getPropertyService(tenantId: string): PropertyServiceWrapper {
  const wrapper = new PropertyServiceWrapper();
  wrapper.setTenantId(tenantId);
  return wrapper;
}