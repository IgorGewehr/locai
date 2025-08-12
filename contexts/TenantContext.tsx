'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

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
    console.log('🌐 [TenantContext] Effect triggered', {
      hasUser: !!user,
      userTenantId: user?.tenantId,
      userUid: user?.uid,
      userId: user?.id,
      currentTenantId: tenantId
    });
    
    if (user) {
      // Use tenantId if available, otherwise use uid as tenantId
      const id = user.tenantId || user.uid || user.id;
      
      console.log('🎯 [TenantContext] Tenant ID determined', {
        determinedId: id,
        source: user.tenantId ? 'tenantId' : (user.uid ? 'uid' : 'id')
      });
      
      // Only update if tenantId actually changes
      if (tenantId !== id) {
        console.log('🔄 [TenantContext] Updating tenant', {
          oldId: tenantId,
          newId: id
        });
        
        setTenantId(id);
        
        // Create service factory
        const factory = new TenantServiceFactory(id);
        setServices(factory);
        
        setIsReady(true);
      }
    } else {
      console.log('⚠️ [TenantContext] No user, clearing tenant');
      setTenantId(null);
      setServices(null);
      setIsReady(false);
    }
  }, [user?.tenantId, user?.uid, user?.id]); // Removed tenantId from dependencies to prevent infinite loop

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