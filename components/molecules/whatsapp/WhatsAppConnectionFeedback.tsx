'use client';

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Avatar,
  Fade,
  Zoom,
  Stack,
  Chip
} from '@mui/material';
import {
  WhatsApp,
  CheckCircle as CheckCircleIcon,
  SignalWifi4Bar,
  QrCode as QrCodeIcon,
  Speed as SpeedIcon,
  Schedule
} from '@mui/icons-material';

interface WhatsAppConnectionFeedbackProps {
  connected: boolean;
  phoneNumber?: string;
  businessName?: string;
  scanStep: 'loading' | 'qr_ready' | 'scanning' | 'connecting' | 'success';
  timeElapsed: number;
  connectionProgress: number;
}

/**
 * 🎯 Componente especializado para mostrar feedback visual da conexão WhatsApp
 * Projetado para dar feedback imediato ao usuário sobre o status
 */
export function WhatsAppConnectionFeedback({
  connected,
  phoneNumber,
  businessName,
  scanStep,
  timeElapsed,
  connectionProgress
}: WhatsAppConnectionFeedbackProps) {

  // 🎨 FEEDBACK VISUAL POR ESTADO
  if (scanStep === 'success' && connected) {
    return (
      <Zoom in={true} timeout={800}>
        <Alert 
          severity="success" 
          icon={
            <CheckCircleIcon sx={{ 
              animation: 'bounceIn 0.8s ease-in-out',
              '@keyframes bounceIn': {
                '0%': { transform: 'scale(0)', opacity: 0 },
                '50%': { transform: 'scale(1.2)', opacity: 0.8 },
                '100%': { transform: 'scale(1)', opacity: 1 }
              }
            }} />
          }
          sx={{
            bgcolor: 'success.light',
            '& .MuiAlert-icon': { fontSize: '2rem' }
          }}
        >
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              🎉 WhatsApp Conectado com Sucesso!
            </Typography>
            
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                <WhatsApp fontSize="small" />
              </Avatar>
              
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  📞 {phoneNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🏢 {businessName}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="caption" color="success.dark">
              ⚡ Conexão estabelecida em {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s
            </Typography>
          </Stack>
        </Alert>
      </Zoom>
    );
  }

  // 📊 FEEDBACK DURANTE PROCESSO
  if (scanStep === 'scanning' || scanStep === 'connecting') {
    return (
      <Fade in={true}>
        <Alert 
          severity="info" 
          icon={<SignalWifi4Bar />}
          sx={{
            bgcolor: 'info.light',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.8 },
              '100%': { opacity: 1 }
            }
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {scanStep === 'scanning' ? '🔍 QR Code Escaneado!' : '🔗 Estabelecendo Conexão...'}
            </Typography>
            
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'info.main'
            }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Chip
                  icon={<SpeedIcon />}
                  label={`${Math.round(connectionProgress)}% concluído`}
                  color="info"
                  size="small"
                />
                
                <Chip
                  icon={<Schedule />}
                  label={`${Math.floor(timeElapsed / 60)}m ${timeElapsed % 60}s`}
                  variant="outlined"
                  size="small"
                />
              </Stack>
              
              <Typography variant="body2" color="text.secondary">
                {scanStep === 'scanning' 
                  ? 'Processando código QR e iniciando handshake...'
                  : 'Sincronizando com servidores do WhatsApp...'
                }
              </Typography>
            </Box>

            <Typography variant="caption" color="info.dark">
              💡 Mantenha o WhatsApp aberto no seu celular durante este processo
            </Typography>
          </Stack>
        </Alert>
      </Fade>
    );
  }

  // 📱 FEEDBACK QR PRONTO
  if (scanStep === 'qr_ready') {
    return (
      <Alert 
        severity="warning" 
        icon={<QrCodeIcon />}
        sx={{
          bgcolor: 'warning.light',
          '& .MuiAlert-icon': { 
            animation: 'wiggle 2s infinite',
            '@keyframes wiggle': {
              '0%, 50%, 100%': { transform: 'rotate(0deg)' },
              '10%, 30%': { transform: 'rotate(-3deg)' },
              '20%, 40%': { transform: 'rotate(3deg)' }
            }
          }
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            📷 QR Code Pronto - Escaneie Agora!
          </Typography>
          
          <Typography variant="body2">
            🎯 <strong>Próximos passos:</strong>
          </Typography>
          
          <Box component="ol" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Abra o WhatsApp no seu celular
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Toque nos 3 pontos (⋮) → "Dispositivos conectados"
            </Typography>
            <Typography component="li" variant="body2">
              Toque em "Conectar dispositivo" e escaneie o código acima
            </Typography>
          </Box>

          {timeElapsed > 30 && (
            <Alert severity="info" sx={{ mt: 1, bgcolor: 'info.lighter' }}>
              <Typography variant="caption">
                ⏰ QR Code ativo há {Math.floor(timeElapsed / 60)}m {timeElapsed % 60}s
                {timeElapsed > 60 && ' - Se demorar muito, tente gerar um novo código'}
              </Typography>
            </Alert>
          )}
        </Stack>
      </Alert>
    );
  }

  return null;
}