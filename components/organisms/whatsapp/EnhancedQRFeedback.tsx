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

  // Simular progresso inteligente baseado no estado
  const updateScanStep = useCallback((status: QRStatus) => {
    if (status.connected) {
      setScanStep('success');
      setConnectionProgress(100);
      setUserInteracted(true);
    } else if (status.qrCode) {
      if (scanStep === 'loading') {
        setScanStep('qr_ready');
        setEstimatedTime(45); // 45s para escanear + conectar
      }
      
      // Detectar quando usuário começou a escanear (baseado em timeElapsed)
      if (timeElapsed > 10 && scanStep === 'qr_ready' && !userInteracted) {
        setScanStep('scanning');
        setUserInteracted(true);
        setConnectionProgress(20);
        setEstimatedTime(15); // 15s para finalizar conexão
      }
    }
  }, [scanStep, timeElapsed, userInteracted]);

  const checkStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await apiClient.get('/api/whatsapp/session');
      
      if (response.data?.success) {
        const status: QRStatus = response.data.data;
        setQrStatus(status);
        setError(null);
        
        updateScanStep(status);

        if (status.connected && status.phoneNumber) {
          onSuccess(status.phoneNumber, status.businessName || 'WhatsApp Business');
          return;
        }
      }
    } catch (error: any) {
      setError(error.message);
      setScanStep('loading');
    }
  }, [apiClient, onSuccess, updateScanStep]);

  const initializeSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScanStep('loading');
    setConnectionProgress(0);
    setTimeElapsed(0);
    setUserInteracted(false);
    
    try {
      const response = await apiClient.post('/api/whatsapp/session');
      
      if (response.data?.success) {
        // Iniciar polling
        const pollInterval = setInterval(checkStatus, 3000);
        
        return () => clearInterval(pollInterval);
      }
    } catch (error: any) {
      setError(error.message);
      setScanStep('loading');
    } finally {
      setLoading(false);
    }
  }, [apiClient, checkStatus]);

  // Effect para inicializar quando dialog abre
  useEffect(() => {
    if (open) {
      const cleanup = initializeSession();
      return cleanup;
    } else {
      setScanStep('loading');
      setTimeElapsed(0);
      setUserInteracted(false);
    }
  }, [open, initializeSession]);

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
            
            {/* Overlay com instruções animadas */}
            <Fade in={scanStep === 'qr_ready'}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  📱 Escaneie com seu WhatsApp
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Abra o WhatsApp → Mais opções (⋮) → Dispositivos conectados → Conectar dispositivo
                </Typography>
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

    if (scanStep === 'scanning') {
      return (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={connectionProgress}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: 'rgba(37, 211, 102, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#25D366'
              }
            }}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Conectando... {Math.round(connectionProgress)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tempo estimado: ~{Math.max(0, estimatedTime - timeElapsed)}s
          </Typography>
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
            icon: <ConnectedTv /> 
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
          <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule fontSize="small" />
              Tempo decorrido: {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s
            </Typography>
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
          
          {scanStep === 'success' && qrStatus?.connected && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <Typography variant="subtitle2">✅ Conectado com sucesso!</Typography>
              <Typography variant="body2">📞 {qrStatus.phoneNumber}</Typography>
              <Typography variant="body2">🏢 {qrStatus.businessName}</Typography>
            </Alert>
          )}

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
    </Dialog>
  );
}