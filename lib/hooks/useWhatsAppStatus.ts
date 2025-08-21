'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiClient } from '@/lib/utils/api-client';
import { useAuth } from '@/contexts/AuthProvider';

// Tipos para o status do WhatsApp
export type WhatsAppStatusType = 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';
export type ConnectionType = 'web' | 'business' | null;

// Cache compartilhado entre instâncias do hook
const statusCache = new Map<string, {
  data: WhatsAppStatusData;
  timestamp: number;
  status: WhatsAppStatusType;
}>();

// Configurações de cache inteligente baseado no status
const CACHE_TTL = {
  connected: 60000,     // 1 minuto quando conectado
  disconnected: 30000,  // 30 segundos quando desconectado
  error: 10000,         // 10 segundos em erro
  connecting: 5000,     // 5 segundos conectando
  qr: 5000             // 5 segundos esperando QR
};

// Interface para o indicador visual
export interface WhatsAppIndicator {
  icon: React.ReactNode;
  text: string;
  color: string;
  bgColor: string;
  status: WhatsAppStatusType;
}

// Interface para os dados do status
export interface WhatsAppStatusData {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  lastUpdated?: string;
}

// Interface para WebSocket (preparação futura)
export interface WhatsAppWebSocketMessage {
  type: 'status' | 'qr' | 'connected' | 'disconnected' | 'error';
  data: WhatsAppStatusData;
  timestamp: number;
}

// Hook principal
export function useWhatsAppStatus(autoRefresh = false) {
  const [status, setStatus] = useState<WhatsAppStatusType>('disconnected');
  const [connectionType, setConnectionType] = useState<ConnectionType>('web');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Função para verificar o status com cache inteligente
  const checkStatus = useCallback(async (forceRefresh = false): Promise<WhatsAppStatusData | null> => {
    if (!user) return null;
    
    const cacheKey = `whatsapp-status-${user.uid}`;
    const now = Date.now();
    
    // Verificar cache primeiro (se não for forceRefresh)
    if (!forceRefresh) {
      const cached = statusCache.get(cacheKey);
      if (cached) {
        const ttl = CACHE_TTL[cached.status] || 30000;
        if (now - cached.timestamp < ttl) {
          // Usar dados do cache
          setStatus(cached.status);
          setConnectionType('web');
          setPhoneNumber(cached.data.phoneNumber || null);
          setBusinessName(cached.data.businessName || null);
          setQrCode(cached.data.qrCode || null);
          setLastUpdated(new Date(cached.timestamp));
          return cached.data;
        }
      }
    }
    
    try {
      setIsLoading(true);
      
      const response = await ApiClient.get('/api/whatsapp/session');
      
      if (response.ok) {
        const data = await response.json();
        const statusData = data.data;
        
        // Mapear status do backend para nossos tipos
        let mappedStatus: WhatsAppStatusType = 'disconnected';
        
        if (statusData.connected) {
          mappedStatus = 'connected';
        } else if (statusData.status === 'qr' || statusData.status === 'qr_ready') {
          mappedStatus = 'qr';
        } else if (statusData.status === 'connecting' || statusData.status === 'initializing') {
          mappedStatus = 'connecting';
        } else if (statusData.status === 'error') {
          mappedStatus = 'error';
        }
        
        // Atualizar states
        setStatus(mappedStatus);
        setConnectionType('web');
        setPhoneNumber(statusData.phoneNumber || null);
        setBusinessName(statusData.businessName || null);
        setQrCode(statusData.qrCode || null);
        setLastUpdated(new Date());
        
        // Salvar no cache inteligente
        statusCache.set(cacheKey, {
          data: statusData,
          timestamp: now,
          status: mappedStatus
        });
        
        return statusData;
      } else {
        // Em caso de erro, marcar como disconnected
        setStatus('disconnected');
        setConnectionType(null);
        setPhoneNumber(null);
        setBusinessName(null);
        setQrCode(null);
        return null;
      }
    } catch (error) {
      console.warn('[useWhatsAppStatus] Erro ao verificar status:', error);
      setStatus('error');
      setConnectionType(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // WebSocket para status em tempo real (preparação)
  const connectWebSocket = useCallback(() => {
    if (!user || typeof window === 'undefined') return;
    
    // Preparação para WebSocket - será implementado quando o backend suportar
    // const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    // wsRef.current = new WebSocket(`${wsUrl}/whatsapp/status/${user.uid}`);
    
    // wsRef.current.onmessage = (event) => {
    //   const message: WhatsAppWebSocketMessage = JSON.parse(event.data);
    //   // Processar mensagem WebSocket
    // };
  }, [user]);

  // Auto refresh opcional
  useEffect(() => {
    if (autoRefresh && user) {
      // Definir intervalo baseado no status atual
      const getRefreshInterval = () => {
        switch (status) {
          case 'connected':
            return 60000; // 1 minuto
          case 'connecting':
          case 'qr':
            return 5000;  // 5 segundos
          default:
            return 30000; // 30 segundos
        }
      };
      
      autoRefreshIntervalRef.current = setInterval(() => {
        checkStatus();
      }, getRefreshInterval());
      
      return () => {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, user, status, checkStatus]);

  // Verificação inicial
  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user, checkStatus]);

  // Cleanup WebSocket
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  // Função para refresh manual
  const refreshStatus = useCallback(() => {
    return checkStatus(true); // Force refresh
  }, [checkStatus]);

  // Função para obter o indicador visual
  const getIndicator = useCallback((): WhatsAppIndicator => {
    switch (status) {
      case 'connected':
        return {
          icon: null,
          text: phoneNumber 
            ? `Conectado (${phoneNumber})` 
            : 'WhatsApp Web Conectado',
          color: 'success.main',
          bgColor: 'success.main',
          status: 'connected'
        };
      
      case 'qr':
        return {
          icon: null,
          text: 'Aguardando QR Code',
          color: 'warning.main',
          bgColor: 'warning.main',
          status: 'qr'
        };
      
      case 'connecting':
        return {
          icon: null,
          text: 'Conectando...',
          color: 'info.main',
          bgColor: 'info.main',
          status: 'connecting'
        };
      
      case 'error':
        return {
          icon: null,
          text: 'Erro na Conexão',
          color: 'error.main',
          bgColor: 'error.main',
          status: 'error'
        };
      
      default: // disconnected
        return {
          icon: null,
          text: 'WhatsApp Desconectado',
          color: 'error.main',
          bgColor: 'error.main',
          status: 'disconnected'
        };
    }
  }, [status, phoneNumber]);

  // Função para limpar cache
  const clearCache = useCallback(() => {
    if (user) {
      const cacheKey = `whatsapp-status-${user.uid}`;
      statusCache.delete(cacheKey);
    }
  }, [user]);

  return {
    // Estados
    status,
    connectionType,
    isLoading,
    lastUpdated,
    phoneNumber,
    businessName,
    qrCode,
    
    // Funções
    checkStatus,
    refreshStatus,
    getIndicator,
    clearCache,
    connectWebSocket,
    
    // Helpers
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    needsQR: status === 'qr',
    hasError: status === 'error',
    isDisconnected: status === 'disconnected',
  };
}