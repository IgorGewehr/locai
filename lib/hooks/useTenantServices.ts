import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Hook to get tenant-specific Firebase services
 * Automatically uses the current user's tenant ID
 */
export function useTenantServices() {
  const { user } = useAuth();
  
  const services = useMemo(() => {
    if (!user?.tenantId && !user?.uid) {
      return null;
    }
    
    // Use tenantId if available, otherwise use uid as tenantId
    const tenantId = user.tenantId || user.uid;
    return new TenantServiceFactory(tenantId);
  }, [user]);

  return services;
}

/**
 * Hook to get a specific tenant service
 */
export function useTenantService<T extends { id?: string }>(collectionName: string) {
  const { user } = useAuth();
  
  const service = useMemo(() => {
    if (!user?.tenantId && !user?.uid) {
      return null;
    }
    
    const tenantId = user.tenantId || user.uid;
    const factory = new TenantServiceFactory(tenantId);
    return factory.createService<T>(collectionName);
  }, [user, collectionName]);

  return service;
}