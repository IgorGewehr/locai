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
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const refreshStatus = useCallback(async () => {
    const now = Date.now();
    // Prevent calls more frequent than every 5 seconds
    if (!tenantId || !isReady || isRefreshing || (now - lastRefresh < 5000)) {
      return;
    }

    setLastRefresh(now);

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

  // Smart polling based on current status (MICROSERVICE OPTIMIZED)
  useEffect(() => {
    if (!tenantId || !isReady) return;

    // Clear existing timeout
    if (pollTimeoutId) {
      clearTimeout(pollTimeoutId);
    }

    // MICROSERVICE MODE: Minimal polling since webhooks handle real-time updates
    let interval = 300000; // Default 5 minutes for microservice mode
    
    switch (status.status) {
      case 'microservice_mode':
        interval = 300000; // 5 minutes - webhooks handle updates
        break;
      case 'connecting':
      case 'qr':
        interval = 8000; // Slower polling when connecting (8s instead of 3s)
        break;
      case 'disconnected':
      case 'error':
        interval = 30000; // 30 seconds when disconnected
        break;
      case 'connected':
        interval = 120000; // 2 minutes when stable (reduced from 1 minute)
        break;
      default:
        interval = 60000; // 1 minute for unknown states
    }

    // Skip polling entirely if microservice mode is detected
    if (status.status === 'microservice_mode') {
      console.log('🌐 [WhatsAppStatus] Microservice mode detected - minimal polling enabled');
      interval = 600000; // 10 minutes - very infrequent checks
    }

    // Schedule next status check with intelligent intervals
    const timeoutId = setTimeout(() => {
      refreshStatus();
    }, interval);

    setPollTimeoutId(timeoutId);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [status.status, tenantId, isReady]); // Removed refreshStatus to prevent infinite loop

  // Initial status check - run only once when tenant is ready
  useEffect(() => {
    if (tenantId && isReady) {
      refreshStatus();
    }
  }, [tenantId, isReady]); // Removed refreshStatus to prevent infinite loop

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