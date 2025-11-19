/**
 * Step 3: WhatsApp Setup Component
 * QR Code connection embedded in onboarding
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  Button,
  Stack,
  IconButton,
  Alert,
  Card,
  CardContent,
  alpha,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  WhatsApp,
  Close,
  Info,
  CheckCircle,
  QrCode2,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthProvider';

interface Step3WhatsAppSetupProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data?: any) => void;
  onSkip?: () => void;
}

export default function Step3WhatsAppSetup({
  open,
  onClose,
  onComplete,
  onSkip,
}: Step3WhatsAppSetupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, getFirebaseToken } = useAuth();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = React.useRef(false); // Previne múltiplas chamadas
  const hasCheckedExistingSession = React.useRef(false);

  const steps = [
    'Abra o WhatsApp no celular',
    'Toque em Menu (⋮) ou Configurações',
    'Selecione "Aparelhos Conectados"',
    'Toque em "Conectar um aparelho"',
    'Escaneie o QR Code abaixo',
  ];

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    if (!user) {
      throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
    }

    try {
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Token não disponível');
      }
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (err) {
      console.error('[WhatsAppSetup] Error getting auth token:', err);
      throw new Error('Erro ao obter token de autenticação. Por favor, faça login novamente.');
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[WhatsAppSetup] Polling stopped');
    }
  };

  const checkStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/whatsapp/session', {
        headers,
      });

      if (!response.ok) {
        console.error('[WhatsAppSetup] Status check failed:', response.status);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log('[WhatsAppSetup] Status update:', {
          connected: data.data.connected,
          hasQrCode: !!data.data.qrCode,
          status: data.data.status
        });

        // Update QR code if available
        if (data.data.qrCode && data.data.qrCode !== qrCode) {
          console.log('[WhatsAppSetup] New QR Code received');
          setQrCode(data.data.qrCode);
          setIsInitializing(false);
          setError(null);
        }

        // Check if connected
        if (data.data.connected) {
          console.log('[WhatsAppSetup] Connection successful!');
          setConnected(true);
          stopPolling();
          setTimeout(() => {
            onComplete({ connected: true });
          }, 2000);
        }
      }
    } catch (err) {
      console.error('[WhatsAppSetup] Status check error:', err);
    }
  };

  const startPolling = () => {
    // Stop any existing polling
    stopPolling();

    console.log('[WhatsAppSetup] Starting aggressive polling every 2s');

    // Start new polling interval - aggressive 2s
    pollingIntervalRef.current = setInterval(checkStatus, 2000);

    // Also check immediately
    checkStatus();

    // Stop polling after 3 minutes
    setTimeout(() => {
      stopPolling();
      if (!connected && !qrCode) {
        setError('Timeout: QR Code não foi gerado. Por favor, tente novamente.');
        setIsInitializing(false);
      }
    }, 180000);
  };

  // Check if session already exists before creating new one
  const checkExistingSession = async () => {
    try {
      console.log('[WhatsAppSetup] Checking for existing session...');
      const headers = await getAuthHeaders();

      const response = await fetch('/api/whatsapp/session', {
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      console.log('[WhatsAppSetup] Existing session status:', {
        connected: data.data?.connected,
        hasQrCode: !!data.data?.qrCode,
        status: data.data?.status
      });

      return data.data;
    } catch (err) {
      console.error('[WhatsAppSetup] Error checking existing session:', err);
      return null;
    }
  };

  const handleGenerateQR = async () => {
    // Prevent multiple simultaneous calls
    if (isInitializingRef.current) {
      console.log('[WhatsAppSetup] Already initializing, skipping...');
      return;
    }

    isInitializingRef.current = true;
    setLoading(true);
    setError(null);
    setIsInitializing(true);

    try {
      console.log('[WhatsAppSetup] Starting connection flow...');

      // First, check if session already exists
      const existingSession = await checkExistingSession();

      if (existingSession) {
        // If already connected, complete immediately
        if (existingSession.connected) {
          console.log('[WhatsAppSetup] Already connected!');
          setConnected(true);
          setIsInitializing(false);
          setLoading(false);
          isInitializingRef.current = false;
          setTimeout(() => {
            onComplete({ connected: true });
          }, 1000);
          return;
        }

        // If QR code already exists, use it and start polling
        if (existingSession.qrCode) {
          console.log('[WhatsAppSetup] QR Code already exists, using it');
          setQrCode(existingSession.qrCode);
          setIsInitializing(false);
          setLoading(false);
          isInitializingRef.current = false;
          startPolling();
          return;
        }

        // If initializing, just start polling
        if (existingSession.status === 'initializing' || existingSession.status === 'connecting') {
          console.log('[WhatsAppSetup] Session already initializing, starting polling');
          setIsInitializing(false);
          setLoading(false);
          isInitializingRef.current = false;
          startPolling();
          return;
        }
      }

      // No existing session or disconnected, create new one
      console.log('[WhatsAppSetup] Creating new session...');
      const headers = await getAuthHeaders();

      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers,
      });

      console.log('[WhatsAppSetup] POST response status:', response.status);

      // Handle rate limiting gracefully
      if (response.status === 429) {
        const data = await response.json();
        const retryAfter = data.data?.retryAfter || 10;

        console.log('[WhatsAppSetup] Rate limited, will retry after', retryAfter, 'seconds');

        setError(null); // Don't show error to user
        setIsInitializing(false);
        setLoading(false);
        isInitializingRef.current = false;

        // Just start polling, session might already be ready
        startPolling();
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WhatsAppSetup] Response error:', errorText);
        throw new Error(`Erro na resposta: ${response.status}`);
      }

      const data = await response.json();
      console.log('[WhatsAppSetup] Connection initiated:', {
        success: data.success,
        hasQrCode: !!data.data?.qrCode
      });

      if (data.success) {
        // If QR is immediately available, set it
        if (data.data?.qrCode) {
          console.log('[WhatsAppSetup] QR Code received immediately');
          setQrCode(data.data.qrCode);
          setIsInitializing(false);
        }

        // ALWAYS start polling regardless of whether QR was received
        startPolling();
        console.log('[WhatsAppSetup] Polling started for QR code and connection status');
      } else {
        const errorMsg = data.error || 'Erro ao iniciar conexão';
        console.error('[WhatsAppSetup] Connection failed:', errorMsg);
        setError(errorMsg);
        setIsInitializing(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro de conexão';
      console.error('[WhatsAppSetup] Exception:', err);
      setError(errorMsg);
      setIsInitializing(false);
    } finally {
      setLoading(false);
      isInitializingRef.current = false;
    }
  };

  const handleSkip = () => {
    stopPolling();
    if (onSkip) onSkip();
    onClose();
  };

  useEffect(() => {
    if (open && !qrCode && !connected && user && !isInitializing && !loading && !isInitializingRef.current) {
      handleGenerateQR();
    }

    // Cleanup on unmount or close
    return () => {
      stopPolling();
      if (!open) {
        // Reset refs when modal closes
        isInitializingRef.current = false;
        hasCheckedExistingSession.current = false;
      }
    };
  }, [open, user]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
          borderRadius: isMobile ? 0 : '20px',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(37, 211, 102, 0.4)',
                }}
              >
                <WhatsApp sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                  Conectar WhatsApp
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                  Automatize o atendimento com Sofia IA
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={onClose} sx={{ color: alpha('#ffffff', 0.6) }}>
              <Close />
            </IconButton>
          </Stack>

          {/* Info */}
          <Alert
            severity="info"
            icon={<Info />}
            sx={{
              backgroundColor: alpha('#25D366', 0.1),
              border: `1px solid ${alpha('#25D366', 0.2)}`,
              color: '#6ee7b7',
            }}
          >
            Conecte seu WhatsApp para receber leads e automatizar respostas
          </Alert>

          {/* Content */}
          {!connected ? (
            <Card
              sx={{
                backgroundColor: alpha(theme.palette.background.paper, 0.5),
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              }}
            >
              <CardContent>
                <Stack spacing={3}>
                  {/* Instructions */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: 'white', fontWeight: 600, mb: 2 }}
                    >
                      Como conectar:
                    </Typography>
                    <Stepper activeStep={-1} orientation="vertical">
                      {steps.map((step, index) => (
                        <Step key={index} expanded>
                          <StepLabel>
                            <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.8) }}>
                              {step}
                            </Typography>
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </Box>

                  {/* QR Code */}
                  <Box sx={{ textAlign: 'center' }}>
                    {!user && !loading && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Aguardando autenticação... Se o problema persistir, faça login novamente.
                      </Alert>
                    )}

                    {qrCode && !loading && (
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          display: 'inline-block',
                        }}
                      >
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          style={{
                            width: '250px',
                            height: '250px',
                            display: 'block',
                          }}
                        />
                      </Box>
                    )}

                    {(loading || isInitializing) && user && !qrCode && (
                      <Box sx={{ py: 4 }}>
                        <CircularProgress size={60} />
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 2,
                            color: alpha('#ffffff', 0.8)
                          }}
                        >
                          {loading ? 'Iniciando conexão...' : 'Aguardando QR Code...'}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 1,
                            color: alpha('#ffffff', 0.6),
                            display: 'block'
                          }}
                        >
                          Isso pode levar alguns segundos
                        </Typography>
                      </Box>
                    )}

                    {error && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                        {error.includes('autenticado') && (
                          <Button
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={() => window.location.href = '/login'}
                          >
                            Fazer Login
                          </Button>
                        )}
                        {error.includes('Timeout') && (
                          <Button
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={handleGenerateQR}
                          >
                            Tentar Novamente
                          </Button>
                        )}
                      </Alert>
                    )}

                    {!qrCode && !loading && !isInitializing && !error && user && (
                      <Button
                        variant="contained"
                        startIcon={<QrCode2 />}
                        onClick={handleGenerateQR}
                        sx={{
                          background: 'linear-gradient(135deg, #25D366, #128C7E)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #128C7E, #25D366)',
                          },
                        }}
                      >
                        Gerar QR Code
                      </Button>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card
              sx={{
                backgroundColor: alpha('#10b981', 0.1),
                border: `2px solid ${alpha('#10b981', 0.3)}`,
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  WhatsApp Conectado com Sucesso!
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7), mt: 1 }}>
                  Você já pode receber mensagens automatizadas
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {!connected && onSkip && (
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSkip}
              sx={{
                borderColor: alpha('#ffffff', 0.2),
                color: alpha('#ffffff', 0.7),
              }}
            >
              Pular este passo
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
