'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { propertyServiceWrapper } from '@/lib/services/service-wrapper';

interface TenantContextType {
  tenantId: string | null;
  services: TenantServiceFactory | null;
  isReady: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  services: null,
  isReady: false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [services, setServices] = useState<TenantServiceFactory | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (user) {
      // Use tenantId if available, otherwise use uid as tenantId
      const id = user.tenantId || user.uid || user.id;
      setTenantId(id);
      
      // Create service factory
      const factory = new TenantServiceFactory(id);
      setServices(factory);
      
      // Set tenant ID in service wrappers
      propertyServiceWrapper.setTenantId(id);
      
      setIsReady(true);
    } else {
      setTenantId(null);
      setServices(null);
      setIsReady(false);
    }
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenantId, services, isReady }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}