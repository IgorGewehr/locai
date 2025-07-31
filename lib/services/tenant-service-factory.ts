// lib/services/tenant-service-factory.ts
// Factory for creating tenant-scoped services

import { propertyService } from './property-service';
import { clientServiceWrapper } from './client-service';
import { reservationService } from './reservation-service';
import { crmService } from './crm-service';
import { visitService } from './visit-service';
import { transactionService } from './transaction-service';
import { goalService } from './goal-service';

export interface TenantServices {
  property: typeof propertyService;
  client: typeof clientServiceWrapper;
  reservation: typeof reservationService;
  crm: typeof crmService;
  visit: typeof visitService;
  transaction: typeof transactionService;
  goal: typeof goalService;
}

export class TenantServiceFactory {
  private static services: Map<string, TenantServices> = new Map();

  static getServices(tenantId: string = 'default-tenant'): TenantServices {
    if (!this.services.has(tenantId)) {
      // Create tenant-scoped services
      this.services.set(tenantId, {
        property: propertyService,
        client: clientServiceWrapper,
        reservation: reservationService,
        crm: crmService,
        visit: visitService,
        transaction: transactionService,
        goal: goalService,
      });
    }
    
    return this.services.get(tenantId)!;
  }

  static getService<K extends keyof TenantServices>(
    serviceName: K,
    tenantId: string = 'default-tenant'
  ): TenantServices[K] {
    return this.getServices(tenantId)[serviceName];
  }

  static clearCache(tenantId?: string) {
    if (tenantId) {
      this.services.delete(tenantId);
    } else {
      this.services.clear();
    }
  }
}

export default TenantServiceFactory;