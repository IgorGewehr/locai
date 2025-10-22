'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
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
  const [isReady, setIsReady] = useState(false);
  const debug = process.env.NEXT_PUBLIC_DEBUG_TENANT === 'true';

  // 🚀 OTIMIZAÇÃO: useMemo mantém referência estável do services
  // Só recria se tenantId mudar de fato
  const services = useMemo(() => {
    if (!tenantId) return null;

    if (debug) {
      console.log('🏭 [TenantContext] Creating new TenantServiceFactory', { tenantId });
    }

    return new TenantServiceFactory(tenantId);
  }, [tenantId, debug]);

  useEffect(() => {
    if (debug) {
      console.log('🌐 [TenantContext] Effect triggered', {
        hasUser: !!user,
        userTenantId: user?.tenantId,
        userUid: user?.uid,
        userId: user?.id,
        currentTenantId: tenantId
      });
    }

    if (user) {
      // Use tenantId if available, otherwise use uid as tenantId
      const id = user.tenantId || user.uid || user.id;

      if (debug) {
        console.log('🎯 [TenantContext] Tenant ID determined', {
          determinedId: id,
          source: user.tenantId ? 'tenantId' : (user.uid ? 'uid' : 'id')
        });
      }

      // Only update if tenantId actually changes
      if (tenantId !== id) {
        if (debug) {
          console.log('🔄 [TenantContext] Updating tenant', {
            oldId: tenantId,
            newId: id
          });
        }

        setTenantId(id);
        setIsReady(true);
      }
    } else {
      if (debug) {
        console.log('⚠️ [TenantContext] No user, clearing tenant');
      }
      setTenantId(null);
      setIsReady(false);
    }
  }, [user?.tenantId, user?.uid, user?.id, tenantId, debug])

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