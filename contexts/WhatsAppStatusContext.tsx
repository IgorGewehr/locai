'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiClient } from '@/lib/utils/api-client';
import { useTenant } from './TenantContext';

interface WhatsAppStatus {
  connected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'qr';
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  lastUpdated: Date;
}

interface WhatsAppStatusContextType {
  status: WhatsAppStatus;
  refreshStatus: () => Promise<void>;
  isRefreshing: boolean;
}

const WhatsAppStatusContext = createContext<WhatsAppStatusContextType | undefined>(undefined);

export function WhatsAppStatusProvider({ children }: { children: React.ReactNode }) {
  const { tenantId, isReady } = useTenant();
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    status: 'disconnected',
    lastUpdated: new Date()
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollTimeoutId, setPollTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!tenantId || !isReady || isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await ApiClient.get('/api/whatsapp/session');
      
      if (response.ok) {
        const data = await response.json();
        const newStatus: WhatsAppStatus = {
          connected: data.data?.connected || false,
          status: data.data?.status || 'disconnected',
          phoneNumber: data.data?.phoneNumber,
          businessName: data.data?.businessName,
          qrCode: data.data?.qrCode,
          lastUpdated: new Date()
        };

        setStatus(prev => {
          // Only update if there's an actual change to prevent unnecessary re-renders
          const hasChanged = 
            prev.connected !== newStatus.connected ||
            prev.status !== newStatus.status ||
            prev.phoneNumber !== newStatus.phoneNumber ||
            prev.businessName !== newStatus.businessName ||
            prev.qrCode !== newStatus.qrCode;

          return hasChanged ? newStatus : { ...prev, lastUpdated: new Date() };
        });
      }
    } catch (error) {
      console.error('❌ [WhatsAppStatus] Failed to refresh status:', error);
      setStatus(prev => ({ ...prev, status: 'error', lastUpdated: new Date() }));
    } finally {
      setIsRefreshing(false);
    }
  }, [tenantId, isReady, isRefreshing]);

  // Smart polling based on current status
  useEffect(() => {
    if (!tenantId || !isReady) return;

    // Clear existing timeout
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId);
    }

    // Determine polling interval based on status
    let interval = 30000; // Default 30 seconds when connected
    
    switch (status.status) {
      case 'connecting':
      case 'qr':
        interval = 3000; // Fast polling when actively connecting
        break;
      case 'disconnected':
      case 'error':
        interval = 10000; // Medium polling when disconnected
        break;
      case 'connected':
        interval = 60000; // Slow polling when stable (1 minute)
        break;
    }

    // Schedule next status check
    const timeoutId = setTimeout(() => {
      refreshStatus();
    }, interval);

    setPollTimeoutId(timeoutId);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [status.status, tenantId, isReady, refreshStatus]);

  // Initial status check
  useEffect(() => {
    if (tenantId && isReady) {
      refreshStatus();
    }
  }, [tenantId, isReady, refreshStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
    };
  }, [pollTimeoutId]);

  const contextValue: WhatsAppStatusContextType = {
    status,
    refreshStatus,
    isRefreshing
  };

  return (
    <WhatsAppStatusContext.Provider value={contextValue}>
      {children}
    </WhatsAppStatusContext.Provider>
  );
}

export function useWhatsAppStatus() {
  const context = useContext(WhatsAppStatusContext);
  if (context === undefined) {
    throw new Error('useWhatsAppStatus must be used within a WhatsAppStatusProvider');
  }
  return context;
}