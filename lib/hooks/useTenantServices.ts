import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Hook to get tenant-specific Firebase services
 * Automatically uses the current user's tenant ID
 */
export function useTenantServices() {
  const { user } = useAuth();
  const tenantId = user?.tenantId || user?.uid;

  const services = useMemo(() => {
    if (!tenantId) {
      return null;
    }

    return new TenantServiceFactory(tenantId);
  }, [tenantId]);

  return services;
}

/**
 * Hook to get a specific tenant service
 */
export function useTenantService<T extends { id?: string }>(collectionName: string) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || user?.uid;

  const service = useMemo(() => {
    if (!tenantId) {
      return null;
    }

    const factory = new TenantServiceFactory(tenantId);
    return factory.createService<T>(collectionName);
  }, [tenantId, collectionName]);

  return service;
}