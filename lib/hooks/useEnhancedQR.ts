import { useState, useEffect, useCallback, useRef } from 'react';

interface QRStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  message?: string;
  persistent?: boolean;
}

type ScanStep = 'loading' | 'qr_ready' | 'scanning' | 'connecting' | 'success' | 'error';

interface UseEnhancedQRReturn {
  // Estado principal
  qrStatus: QRStatus | null;
  scanStep: ScanStep;
  error: string | null;
  loading: boolean;
  
  // Estados visuais melhorados
  connectionProgress: number;
  timeElapsed: number;
  estimatedTimeLeft: number;
  userInteracted: boolean;
  qrImageLoaded: boolean;
  
  // Ações
  initializeSession: () => Promise<void>;
  checkStatus: () => Promise<void>;
  reset: () => void;
  
  // Eventos para feedback visual
  onQRImageLoad: () => void;
  onUserStartedScanning: () => void;
}

/**
 * 🎯 Hook personalizado para gerenciar estado QR com feedback visual melhorado
 * Não depende de recursos adicionais do microservice
 */
export function useEnhancedQR(apiClient: any, onSuccess?: (phone: string, name: string) => void): UseEnhancedQRReturn {
  // Estados principais
  const [qrStatus, setQrStatus] = useState<QRStatus | null>(null);
  const [scanStep, setScanStep] = useState<ScanStep>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para feedback visual
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(45);
  const [userInteracted, setUserInteracted] = useState(false);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);
  
  // Refs para timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // 📊 Timer principal para tempo decorrido
  useEffect(() => {
    if (scanStep !== 'loading' && scanStep !== 'success' && scanStep !== 'error') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000);
        setTimeElapsed(elapsed);
        
        // Atualizar tempo estimado baseado no progresso
        if (scanStep === 'scanning') {
          setEstimatedTimeLeft(Math.max(0, 15 - (elapsed - 10))); // 15s após começar a escanear
        } else if (scanStep === 'qr_ready') {
          setEstimatedTimeLeft(Math.max(0, 45 - elapsed)); // 45s total inicial
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (scanStep === 'loading') {
        startTimeRef.current = null;
        setTimeElapsed(0);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [scanStep]);

  // 🎯 Progresso inteligente baseado no tempo e estado
  useEffect(() => {
    if (scanStep === 'scanning') {
      progressRef.current = setInterval(() => {
        setConnectionProgress(prev => {
          // Progresso mais realista: rápido no início, desacelera depois
          const increment = prev < 30 ? 3 : prev < 70 ? 1.5 : 0.5;
          return Math.min(prev + increment, 85);
        });
      }, 1000);
    } else if (scanStep === 'connecting') {
      setConnectionProgress(prev => Math.min(prev + 10, 95));
    } else if (scanStep === 'success') {
      setConnectionProgress(100);
    }
    
    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [scanStep]);

  // 🔄 Auto-detecção de mudança de estado baseada no tempo
  useEffect(() => {
    // Se QR está pronto há mais de 15 segundos e usuário não indicou que começou, assumir que está escaneando
    if (scanStep === 'qr_ready' && timeElapsed > 15 && !userInteracted) {
      setScanStep('scanning');
      setConnectionProgress(25);
      setUserInteracted(true);
    }
    
    // Se está escaneando há mais de 30 segundos, pode estar conectando
    if (scanStep === 'scanning' && timeElapsed > 30 && connectionProgress > 60) {
      setScanStep('connecting');
    }
  }, [scanStep, timeElapsed, userInteracted, connectionProgress]);

  const checkStatus = useCallback(async (): Promise<void> => {
    if (!apiClient) return;
    
    try {
      const response = await apiClient.get('/api/whatsapp/session');
      
      if (response.data?.success) {
        const status: QRStatus = response.data.data;
        setQrStatus(status);
        setError(null);
        
        // Atualizar step baseado no status real
        if (status.connected && status.phoneNumber) {
          setScanStep('success');
          setConnectionProgress(100);
          onSuccess?.(status.phoneNumber, status.businessName || 'WhatsApp Business');
        } else if (status.qrCode) {
          if (scanStep === 'loading') {
            setScanStep('qr_ready');
            setQrImageLoaded(false); // Reset para nova imagem
          }
        }
      } else {
        throw new Error(response.data?.error || 'Failed to get session status');
      }
    } catch (err: any) {
      setError(err.message);
      if (scanStep !== 'error') {
        setScanStep('error');
      }
    }
  }, [apiClient, scanStep, onSuccess]);

  const initializeSession = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setScanStep('loading');
    setConnectionProgress(0);
    setTimeElapsed(0);
    setEstimatedTimeLeft(45);
    setUserInteracted(false);
    setQrImageLoaded(false);
    startTimeRef.current = null;
    
    // Limpar timers existentes
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    try {
      const response = await apiClient.post('/api/whatsapp/session');
      
      if (response.data?.success) {
        // Iniciar polling otimizado
        pollingRef.current = setInterval(checkStatus, 3000); // 3s interval
        
        // Primeira verificação imediata após inicializar
        setTimeout(checkStatus, 1000);
      } else {
        throw new Error(response.data?.error || 'Failed to initialize session');
      }
    } catch (err: any) {
      setError(err.message);
      setScanStep('error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, checkStatus]);

  const reset = useCallback(() => {
    setScanStep('loading');
    setQrStatus(null);
    setError(null);
    setLoading(false);
    setConnectionProgress(0);
    setTimeElapsed(0);
    setEstimatedTimeLeft(45);
    setUserInteracted(false);
    setQrImageLoaded(false);
    startTimeRef.current = null;
    
    // Limpar todos os timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  const onQRImageLoad = useCallback(() => {
    setQrImageLoaded(true);
  }, []);

  const onUserStartedScanning = useCallback(() => {
    if (scanStep === 'qr_ready') {
      setScanStep('scanning');
      setConnectionProgress(20);
      setUserInteracted(true);
      setEstimatedTimeLeft(15);
    }
  }, [scanStep]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return {
    // Estado principal
    qrStatus,
    scanStep,
    error,
    loading,
    
    // Estados visuais
    connectionProgress,
    timeElapsed,
    estimatedTimeLeft,
    userInteracted,
    qrImageLoaded,
    
    // Ações
    initializeSession,
    checkStatus,
    reset,
    
    // Eventos
    onQRImageLoad,
    onUserStartedScanning
  };
}