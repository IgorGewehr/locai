'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Avatar,
  Stack,
  Card,
  CardContent,
  Fade,
  Zoom,
  Skeleton,
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon,
  WhatsApp,
  Smartphone,
  SignalWifi4Bar,
  SignalWifiOff,
  Schedule,
  ConnectedTv,
} from '@mui/icons-material';
import { WhatsAppConnectionFeedback } from '@/components/molecules/whatsapp/WhatsAppConnectionFeedback';
import { useWhatsAppConnectionStatus } from '@/lib/hooks/useWhatsAppConnectionStatus';
import { WhatsAppConnectionToast } from '@/components/atoms/WhatsAppConnectionToast';

interface QRStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  message?: string;
  lastActivity?: string;
  persistent?: boolean;
  cacheOptimized?: boolean;
}

interface EnhancedQRFeedbackProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string, businessName: string) => void;
  apiClient: any;
}

/**
 * 🚀 ENHANCED QR FEEDBACK - Melhor UX sem depender de recursos do microservice
 */
export function EnhancedQRFeedback({
  open,
  onClose,
  onSuccess,
  apiClient
}: EnhancedQRFeedbackProps) {
  const [qrStatus, setQrStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<'loading' | 'qr_ready' | 'scanning' | 'connecting' | 'success'>('loading');
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [lastQRCode, setLastQRCode] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [showConnectionToast, setShowConnectionToast] = useState(false);
  
  // 🚀 HOOK DE MONITORAMENTO EM TEMPO REAL
  const {
    status: realtimeStatus,
    isConnecting: realtimeConnecting,
    onConnectionChange,
    startMonitoring,
    stopMonitoring
  } = useWhatsAppConnectionStatus(apiClient);

  // 🎯 MELHORIAS VISUAIS SEM MICROSERVICE
  const [pulseAnimation, setPulseAnimation] = useState(true);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(30); // 30s estimativa inicial
  
  // Timer para feedback visual
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (open && scanStep !== 'success') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        
        // Atualizar progresso baseado no tempo
        if (scanStep === 'scanning') {
          setConnectionProgress(prev => Math.min(prev + 2, 85));
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [open, scanStep]);

  // Animação de pulse para QR code
  useEffect(() => {
    if (scanStep === 'qr_ready') {
      const pulseInterval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 2000);
      
      return () => clearInterval(pulseInterval);
    }
  }, [scanStep]);

  // ✨ FEEDBACK INTELIGENTE - detecta mudanças no QR e status de conexão
  const updateScanStep = useCallback((status: QRStatus) => {
    if (status.connected) {
      setScanStep('success');
      setConnectionProgress(100);
      setUserInteracted(true);
      setEstimatedTime(0);
      return;
    } 
    
    if (status.qrCode) {
      // Detectar novo QR code
      if (status.qrCode !== lastQRCode) {
        setLastQRCode(status.qrCode);
        if (scanStep === 'loading') {
          setScanStep('qr_ready');
          setEstimatedTime(45);
          setConnectionAttempts(0);
        }
      }
      
      // Auto-detectar início do scan baseado no tempo e interação
      if (timeElapsed > 8 && scanStep === 'qr_ready' && !userInteracted) {
        setScanStep('scanning');
        setUserInteracted(true);
        setConnectionProgress(25);
        setEstimatedTime(20);
        setConnectionAttempts(prev => prev + 1);
      }
      
      // Detectar provável conexão em andamento
      if (scanStep === 'scanning' && timeElapsed > 15 && connectionProgress < 70) {
        setScanStep('connecting');
        setConnectionProgress(75);
        setEstimatedTime(10);
      }
    } else if (!status.connected && scanStep !== 'loading') {
      // Reset se perdeu QR code mas não está conectado
      setScanStep('loading');
      setConnectionProgress(0);
    }
  }, [scanStep, timeElapsed, userInteracted, lastQRCode, connectionProgress]);

  const checkStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClient.get('/api/whatsapp/session');
      
      if (response.data?.success) {
        const status: QRStatus = response.data.data;
        const wasConnected = qrStatus?.connected;
        
        setQrStatus(status);
        setError(null);
        
        updateScanStep(status);

        // 🎉 FEEDBACK IMEDIATO ao conectar
        if (status.connected && status.phoneNumber && !wasConnected) {
          // Mostrar feedback visual de sucesso
          setScanStep('success');
          setConnectionProgress(100);
          
          // Chamar onSuccess após um breve delay para mostrar animação
          setTimeout(() => {
            onSuccess(status.phoneNumber, status.businessName || 'WhatsApp Business');
          }, 1500);
          return;
        }
      } else {
        // Lidar com resposta não bem-sucedida
        setError(response.data?.error || 'Falha ao verificar status');
      }
    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      setError(error.message || 'Erro de conexão');
      if (scanStep !== 'success') {
        setScanStep('loading');
      }
    }
  }, [apiClient, onSuccess, updateScanStep, qrStatus?.connected, scanStep]);

  const initializeSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScanStep('loading');
    setConnectionProgress(0);
    setTimeElapsed(0);
    setUserInteracted(false);
    setLastQRCode(null);
    setConnectionAttempts(0);
    
    try {
      const response = await apiClient.post('/api/whatsapp/session');
      
      if (response.data?.success) {
        // ⚡ POLLING OTIMIZADO com feedback imediato
        const pollInterval = setInterval(() => {
          checkStatus().catch(err => {
            console.error('Polling error:', err);
          });
        }, 2000); // 2s para feedback mais rápido
        
        // Primeira verificação imediata
        setTimeout(() => checkStatus(), 500);
        
        return () => clearInterval(pollInterval);
      } else {
        throw new Error(response.data?.error || 'Falha ao inicializar sessão');
      }
    } catch (error: any) {
      console.error('Erro ao inicializar:', error);
      setError(error.message || 'Erro ao inicializar sessão');
      setScanStep('loading');
    } finally {
      setLoading(false);
    }
  }, [apiClient, checkStatus]);

  // 🎉 FEEDBACK INSTANTÂNEO DE CONEXÃO
  useEffect(() => {
    const removeListener = onConnectionChange((connected: boolean) => {
      if (connected) {
        console.log('🎉 CONEXÃO DETECTADA INSTANTANEAMENTE!');
        setScanStep('success');
        setConnectionProgress(100);
        setUserInteracted(true);
        
        // 🚀 MOSTRAR TOAST IMEDIATAMENTE
        setShowConnectionToast(true);
        
        // Usar dados em tempo real se disponíveis
        if (realtimeStatus?.phoneNumber) {
          setTimeout(() => {
            onSuccess(
              realtimeStatus.phoneNumber!,
              realtimeStatus.businessName || 'WhatsApp Business'
            );
          }, 2000); // Aumentado para 2s para mostrar toast
        }
      }
    });
    
    return removeListener;
  }, [onConnectionChange, onSuccess, realtimeStatus]);
  
  // Sincronizar com status em tempo real
  useEffect(() => {
    if (realtimeStatus) {
      setQrStatus(realtimeStatus);
      
      // Priorizar status em tempo real sobre polling manual
      if (realtimeStatus.connected && scanStep !== 'success') {
        setScanStep('success');
        setConnectionProgress(100);
      } else if (realtimeStatus.qrCode && scanStep === 'loading') {
        setScanStep('qr_ready');
      }
    }
  }, [realtimeStatus, scanStep]);

  // Effect para inicializar quando dialog abre
  useEffect(() => {
    if (open) {
      // Iniciar monitoramento em tempo real
      startMonitoring();
      
      const cleanup = initializeSession();
      return () => {
        cleanup?.();
        stopMonitoring();
      };
    } else {
      setScanStep('loading');
      setTimeElapsed(0);
      setUserInteracted(false);
      stopMonitoring();
    }
  }, [open, initializeSession, startMonitoring, stopMonitoring]);

  // 🎨 COMPONENTES VISUAIS MELHORADOS

  const QRCodeDisplay = () => (
    <Zoom in={scanStep === 'qr_ready' || scanStep === 'scanning'} timeout={500}>
      <Box 
        sx={{ 
          position: 'relative', 
          textAlign: 'center',
          transform: pulseAnimation && scanStep === 'qr_ready' ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {!qrImageLoaded && (
          <Skeleton 
            variant="rectangular" 
            width={280} 
            height={280} 
            sx={{ borderRadius: 2, mx: 'auto' }}
          />
        )}
        
        {qrStatus?.qrCode && (
          <>
            <img 
              src={qrStatus.qrCode} 
              alt="WhatsApp QR Code"
              onLoad={() => setQrImageLoaded(true)}
              style={{ 
                maxWidth: '280px',
                height: 'auto',
                border: '3px solid #25D366',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(37, 211, 102, 0.3)',
                display: qrImageLoaded ? 'block' : 'none',
                margin: '0 auto'
              }}
            />
            
            {/* Overlay com instruções animadas e feedback de progresso */}
            <Fade in={scanStep === 'qr_ready' || scanStep === 'scanning'}>
              <Box sx={{ mt: 2 }}>
                {scanStep === 'qr_ready' && (
                  <>
                    <Typography variant="h6" color="primary" gutterBottom>
                      📱 Escaneie com seu WhatsApp
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Abra o WhatsApp → Mais opções (⋮) → Dispositivos conectados → Conectar dispositivo
                    </Typography>
                    <Typography variant="caption" color="warning.main" sx={{ 
                      display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center'
                    }}>
                      <Schedule fontSize="small" />
                      Aguardando scan... ({Math.max(0, estimatedTime - timeElapsed)}s)
                    </Typography>
                  </>
                )}
                
                {scanStep === 'scanning' && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main" gutterBottom>
                      ✨ Detectamos o scan!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conectando ao WhatsApp...
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>
          </>
        )}
      </Box>
    </Zoom>
  );

  const ProgressIndicator = () => {
    if (scanStep === 'loading') {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Gerando QR Code...
          </Typography>
          <LinearProgress sx={{ mt: 1, maxWidth: 200, mx: 'auto' }} />
        </Box>
      );
    }

    if (scanStep === 'scanning' || scanStep === 'connecting') {
      return (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={connectionProgress}
            sx={{ 
              height: 10, 
              borderRadius: 5,
              bgcolor: 'rgba(37, 211, 102, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#25D366',
                borderRadius: 5,
                transition: 'width 0.3s ease-in-out'
              }
            }}
          />
          <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
            {scanStep === 'scanning' ? '🔄 Escaneando...' : '🔗 Conectando...'} {Math.round(connectionProgress)}%
          </Typography>
          <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
            ⏱️ Tempo restante: ~{Math.max(0, estimatedTime - timeElapsed)}s
          </Typography>
          
          {connectionAttempts > 0 && (
            <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5 }}>
              💫 Tentativa #{connectionAttempts}
            </Typography>
          )}
        </Box>
      );
    }
    
    if (scanStep === 'success') {
      return (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <CheckCircleIcon 
            sx={{ 
              fontSize: 60, 
              color: 'success.main',
              animation: 'bounce 0.6s ease-in-out'
            }} 
          />
          <Typography variant="h5" color="success.main" sx={{ mt: 1, fontWeight: 'bold' }}>
            🎉 Conectado!
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={100}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'rgba(37, 211, 102, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#25D366'
              },
              mt: 1
            }}
          />
        </Box>
      );
    }

    return null;
  };

  const StatusChip = () => {
    const getStatusConfig = () => {
      switch (scanStep) {
        case 'loading':
          return { 
            label: 'Inicializando...', 
            color: 'default' as const, 
            icon: <CircularProgress size={16} /> 
          };
        case 'qr_ready':
          return { 
            label: 'QR Pronto', 
            color: 'info' as const, 
            icon: <QrCodeIcon /> 
          };
        case 'scanning':
          return { 
            label: 'Escaneando...', 
            color: 'warning' as const, 
            icon: <SignalWifi4Bar /> 
          };
        case 'connecting':
          return { 
            label: 'Conectando...', 
            color: 'warning' as const, 
            icon: <CircularProgress size={16} /> 
          };
        case 'success':
          return { 
            label: 'Conectado!', 
            color: 'success' as const, 
            icon: <CheckCircleIcon /> 
          };
        default:
          return { 
            label: 'Desconectado', 
            color: 'default' as const, 
            icon: <SignalWifiOff /> 
          };
      }
    };

    const config = getStatusConfig();
    
    return (
      <Chip 
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
        sx={{ 
          animation: scanStep === 'scanning' ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 }
          },
          '@keyframes bounce': {
            '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
            '40%': { transform: 'translateY(-10px)' },
            '60%': { transform: 'translateY(-5px)' }
          }
        }}
      />
    );
  };

  const InstructionsCard = () => (
    <Card sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Smartphone color="primary" fontSize="small" />
          Como conectar:
        </Typography>
        
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            1. <WhatsApp fontSize="small" /> Abra o WhatsApp no seu celular
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            2. ⋮ Toque em "Mais opções" (3 pontos)
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            3. 📱 "Dispositivos conectados"
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            4. ➕ "Conectar dispositivo"
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            5. 📸 Escaneie o QR code acima
          </Typography>
        </Stack>

        {timeElapsed > 0 && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule fontSize="small" />
                <Typography variant="caption">
                  {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s
                </Typography>
              </Box>
              
              {scanStep === 'scanning' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SignalWifi4Bar fontSize="small" />
                  <Typography variant="caption">Escaneando</Typography>
                </Box>
              )}
              
              {connectionAttempts > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SpeedIcon fontSize="small" />
                  <Typography variant="caption">#{connectionAttempts}</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading}
      PaperProps={{
        sx: { 
          borderRadius: 3,
          overflow: 'visible'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'success.main' }}>
              <WhatsApp />
            </Avatar>
            <Box>
              <Typography variant="h6">Conectar WhatsApp</Typography>
              <Typography variant="caption" color="text.secondary">
                Sistema otimizado de conexão
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <StatusChip />
            <Tooltip title="Atualizar">
              <IconButton onClick={() => initializeSession()} disabled={loading} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={() => initializeSession()}>
                Tentar Novamente
              </Button>
            }>
              {error}
            </Alert>
          )}

          <QRCodeDisplay />
          <ProgressIndicator />
          
          {/* 🎯 FEEDBACK VISUAL MELHORADO - Prioriza status em tempo real */}
          <WhatsAppConnectionFeedback
            connected={realtimeStatus?.connected || qrStatus?.connected || false}
            phoneNumber={realtimeStatus?.phoneNumber || qrStatus?.phoneNumber}
            businessName={realtimeStatus?.businessName || qrStatus?.businessName}
            scanStep={scanStep}
            timeElapsed={timeElapsed}
            connectionProgress={connectionProgress}
          />

          {(scanStep === 'qr_ready' || scanStep === 'scanning') && <InstructionsCard />}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={onClose}
          disabled={loading}
          variant="outlined"
        >
          {scanStep === 'success' ? 'Concluir' : 'Cancelar'}
        </Button>
        
        {scanStep !== 'success' && (
          <Button 
            onClick={() => initializeSession()}
            disabled={loading}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            {loading ? 'Carregando...' : 'Gerar Novo QR'}
          </Button>
        )}
      </DialogActions>
      
      {/* 🚀 TOAST DE CONEXÃO INSTANTÂNEA */}
      <WhatsAppConnectionToast
        show={showConnectionToast}
        connected={realtimeStatus?.connected || qrStatus?.connected || false}
        phoneNumber={realtimeStatus?.phoneNumber || qrStatus?.phoneNumber}
        businessName={realtimeStatus?.businessName || qrStatus?.businessName}
        onClose={() => setShowConnectionToast(false)}
        autoHideDuration={3000}
      />
    </Dialog>
  );
}