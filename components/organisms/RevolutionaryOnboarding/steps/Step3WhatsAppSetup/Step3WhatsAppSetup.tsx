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
  const { user } = useAuth();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const token = await user.getIdToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (err) {
      console.error('Error getting auth token:', err);
      throw new Error('Erro ao obter token de autenticação. Por favor, faça login novamente.');
    }
  };

  const handleGenerateQR = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (data.success && data.data.qrCode) {
        setQrCode(data.data.qrCode);
        // Start polling for connection
        startPolling();
      } else {
        setError('Erro ao gerar QR Code');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    const interval = setInterval(async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/whatsapp/session', {
          headers,
        });
        const data = await response.json();

        if (data.success && data.data.connected) {
          setConnected(true);
          clearInterval(interval);
          setTimeout(() => {
            onComplete({ connected: true });
          }, 2000);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    // Clear after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
    onClose();
  };

  useEffect(() => {
    if (open && !qrCode && !connected && user) {
      handleGenerateQR();
    }
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

                    {loading && user && <CircularProgress />}

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
                      </Alert>
                    )}

                    {!qrCode && !loading && !error && user && (
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
