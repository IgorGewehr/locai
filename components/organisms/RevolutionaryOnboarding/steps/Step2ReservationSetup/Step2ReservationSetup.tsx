/**
 * Step 2: Reservation Setup Component
 * Quick reservation creation for onboarding
 */

'use client';

import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  Button,
  Stack,
  IconButton,
  Alert,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  EventAvailable,
  Close,
  Info,
  ArrowForward,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Step2ReservationSetupProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data?: any) => void;
  onSkip?: () => void;
}

export default function Step2ReservationSetup({
  open,
  onClose,
  onComplete,
  onSkip,
}: Step2ReservationSetupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const handleGoToCreate = () => {
    router.push('/dashboard/reservations/create');
    onClose();
    // Mark as in progress
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
    onClose();
  };

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
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                }}
              >
                <EventAvailable sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                  Criar Primeira Reserva
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                  Teste o sistema criando uma reserva
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
              backgroundColor: alpha('#3b82f6', 0.1),
              border: `1px solid ${alpha('#3b82f6', 0.2)}`,
              color: '#93c5fd',
            }}
          >
            Crie uma reserva de teste para ver como funciona o sistema de gestão
          </Alert>

          {/* Actions */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              endIcon={<ArrowForward />}
              onClick={handleGoToCreate}
              sx={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                fontWeight: 600,
              }}
            >
              Ir para Criar Reserva
            </Button>

            {onSkip && (
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
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
