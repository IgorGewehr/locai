import { useState, useEffect, useCallback, useRef } from 'react';

interface ConnectionStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  message?: string;
  lastUpdated?: string;
}

interface UseWhatsAppConnectionStatusReturn {
  status: ConnectionStatus | null;
  loading: boolean;
  error: string | null;
  isConnecting: boolean;
  lastConnectionAttempt: number;
  
  // Ações
  checkStatus: () => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  // Eventos
  onConnectionChange: (callback: (connected: boolean) => void) => void;
}

/**
 * 🎯 Hook especializado para monitoramento em tempo real do status WhatsApp
 * Oferece feedback instantâneo sobre mudanças de conexão
 */
export function useWhatsAppConnectionStatus(
  apiClient: any,
  tenantId?: string
): UseWhatsAppConnectionStatusReturn {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);
  
  // Refs para controle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fastPollingRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCallbacksRef = useRef<((connected: boolean) => void)[]>([]);
  const lastStatusRef = useRef<string>('');
  const consecutiveSuccessRef = useRef(0);
  
  // 🔥 FEEDBACK IMEDIATO - detecta mudanças de status
  const handleStatusChange = useCallback((newStatus: ConnectionStatus) => {
    const wasConnected = status?.connected;
    const isNowConnected = newStatus.connected;
    
    // Detectar mudança de status de conexão
    if (wasConnected !== isNowConnected) {
      // Chamar callbacks de mudança de conexão
      connectionCallbacksRef.current.forEach(callback => {
        callback(isNowConnected);
      });
      
      // Se acabou de conectar, parar polling agressivo
      if (isNowConnected && !wasConnected) {
        console.log('🎉 WhatsApp conectado - parando polling agressivo');
        setIsConnecting(false);
        if (fastPollingRef.current) {
          clearInterval(fastPollingRef.current);
          fastPollingRef.current = null;
        }
      }
      
      // Se desconectou, detectar e reiniciar monitoring
      if (!isNowConnected && wasConnected) {
        console.log('⚠️ WhatsApp desconectado - ativando monitoring');
        setIsConnecting(false);
      }
    }
    
    // Detectar se está no processo de conexão (tem QR mas não conectado)
    if (newStatus.qrCode && !newStatus.connected && !isConnecting) {
      setIsConnecting(true);
      setLastConnectionAttempt(Date.now());
    }
    
    setStatus(newStatus);
    setError(null);
    consecutiveSuccessRef.current++;
    
    // Se o status mudou, log apenas para debug
    if (newStatus.status !== lastStatusRef.current) {
      console.log(`📱 WhatsApp status: ${lastStatusRef.current} → ${newStatus.status}`);
      lastStatusRef.current = newStatus.status;
    }
  }, [status?.connected, isConnecting]);

  const checkStatus = useCallback(async (): Promise<void> => {
    if (!apiClient) {
      setError('API client não disponível');
      return;
    }
    
    try {
      const response = await apiClient.get('/api/whatsapp/session', {
        timeout: 5000 // 5s timeout
      });
      
      if (response.data?.success && response.data.data) {
        handleStatusChange(response.data.data);
      } else {
        throw new Error(response.data?.error || 'Status não disponível');
      }
    } catch (err: any) {
      // Reduzir ruído de erro em desenvolvimento
      if (consecutiveSuccessRef.current > 0) {
        console.warn('Erro ao verificar status WhatsApp:', err.message);
      }
      
      setError(err.message || 'Erro ao verificar status');
      consecutiveSuccessRef.current = 0;
      
      // Se havia uma conexão ativa e agora deu erro, marcar como problema
      if (status?.connected) {
        setStatus(prev => prev ? { ...prev, connected: false, status: 'disconnected' } : null);
      }
    }
  }, [apiClient, handleStatusChange, status?.connected]);

  const startMonitoring = useCallback(() => {
    console.log('🚀 Iniciando monitoramento WhatsApp...');
    
    // Parar monitoramento existente
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (fastPollingRef.current) {
      clearInterval(fastPollingRef.current);
    }
    
    // Primeira verificação imediata
    checkStatus();
    
    // Polling normal (a cada 10 segundos)
    pollingIntervalRef.current = setInterval(() => {
      if (!isConnecting) {
        checkStatus();
      }
    }, 10000);
    
    // Polling rápido durante processo de conexão (a cada 2 segundos)
    const startFastPolling = () => {
      if (!fastPollingRef.current) {
        console.log('⚡ Ativando polling rápido durante conexão...');
        fastPollingRef.current = setInterval(checkStatus, 2000);
      }
    };
    
    // Monitorar se entrou em modo de conexão
    const checkForConnection = () => {
      if (isConnecting && !status?.connected) {
        startFastPolling();
      } else if (fastPollingRef.current && status?.connected) {
        clearInterval(fastPollingRef.current);
        fastPollingRef.current = null;
      }
    };
    
    // Verificar condição de conexão a cada 3 segundos
    const connectionCheckInterval = setInterval(checkForConnection, 3000);
    
    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [checkStatus, isConnecting, status?.connected]);

  const stopMonitoring = useCallback(() => {
    console.log('🛑 Parando monitoramento WhatsApp...');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (fastPollingRef.current) {
      clearInterval(fastPollingRef.current);
      fastPollingRef.current = null;
    }
    
    setIsConnecting(false);
  }, []);

  const onConnectionChange = useCallback((callback: (connected: boolean) => void) => {
    connectionCallbacksRef.current.push(callback);
    
    // Retornar função para remover callback
    return () => {
      const index = connectionCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        connectionCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopMonitoring();
      connectionCallbacksRef.current = [];
    };
  }, [stopMonitoring]);

  // Auto-restart monitoring se perder conexão
  useEffect(() => {
    if (status?.connected === false && !loading && consecutiveSuccessRef.current > 5) {
      console.log('🔄 Reconexão detectada - reiniciando monitoring...');
      setTimeout(startMonitoring, 2000);
    }
  }, [status?.connected, loading, startMonitoring]);

  return {
    status,
    loading,
    error,
    isConnecting,
    lastConnectionAttempt,
    
    // Ações
    checkStatus,
    startMonitoring,
    stopMonitoring,
    
    // Eventos
    onConnectionChange
  };
}