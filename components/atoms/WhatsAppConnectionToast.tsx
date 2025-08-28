'use client';

import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Avatar,
  Box,
  Typography,
  Slide,
  SlideProps
} from '@mui/material';
import {
  WhatsApp,
  CheckCircle as CheckCircleIcon,
  Notifications,
  Phone
} from '@mui/icons-material';

interface WhatsAppConnectionToastProps {
  show: boolean;
  connected: boolean;
  phoneNumber?: string;
  businessName?: string;
  onClose: () => void;
  autoHideDuration?: number;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

/**
 * 🚀 Toast especializado para notificar conexões WhatsApp em tempo real
 * Aparece no topo da tela quando conexão é estabelecida
 */
export function WhatsAppConnectionToast({
  show,
  connected,
  phoneNumber,
  businessName,
  onClose,
  autoHideDuration = 4000
}: WhatsAppConnectionToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show && connected) {
      setIsVisible(true);
      
      // Tocar som de notificação (se disponível)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('WhatsApp Conectado!', {
          body: `Conectado como ${phoneNumber || 'usuário'}`,
          icon: '/whatsapp-icon.png',
          tag: 'whatsapp-connection'
        });
      }
    } else {
      setIsVisible(false);
    }
  }, [show, connected, phoneNumber]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setIsVisible(false);
    onClose();
  };

  return (
    <Snackbar
      open={isVisible}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{
        '& .MuiSnackbarContent-root': {
          padding: 0
        }
      }}
    >
      <Alert
        severity="success"
        onClose={handleClose}
        variant="filled"
        sx={{
          minWidth: 300,
          bgcolor: 'success.main',
          color: 'success.contrastText',
          boxShadow: '0 8px 32px rgba(37, 211, 102, 0.4)',
          borderRadius: 2,
          '& .MuiAlert-icon': {
            fontSize: '1.5rem'
          },
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
        icon={
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            animation: 'bounce 0.6s ease-in-out',
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
              '40%': { transform: 'translateY(-4px)' },
              '60%': { transform: 'translateY(-2px)' }
            }
          }}>
            <CheckCircleIcon />
          </Box>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.2)', 
              width: 32, 
              height: 32,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.05)' },
                '100%': { transform: 'scale(1)' }
              }
            }}
          >
            <WhatsApp fontSize="small" />
          </Avatar>
          
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              🎉 WhatsApp Conectado!
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {phoneNumber && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Phone fontSize="small" />
                  <Typography variant="body2">
                    {phoneNumber}
                  </Typography>
                </Box>
              )}
              
              {businessName && (
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  • {businessName}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
}