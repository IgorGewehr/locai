'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
} from '@mui/material';
import {
  ErrorOutline,
  Home,
  Refresh,
  ContactSupport,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface MiniSiteErrorProps {
  error: Error;
  reset?: () => void;
  isNotFound?: boolean;
}

export default function MiniSiteError({ error, reset, isNotFound = false }: MiniSiteErrorProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRefresh = () => {
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: 4,
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            margin: '0 auto 3rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: isNotFound
              ? 'linear-gradient(135deg, #ff6b6b, #ee5a6f)'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}
        >
          <ErrorOutline sx={{ fontSize: 60, color: '#ffffff' }} />
        </Box>

        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: isNotFound
              ? 'linear-gradient(135deg, #ff6b6b, #ee5a6f)'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {isNotFound ? 'Mini-Site Não Encontrado' : 'Ops! Algo deu errado'}
        </Typography>

        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          {isNotFound
            ? 'O mini-site que você está procurando não existe ou foi desativado.'
            : 'Encontramos um problema ao carregar o mini-site. Por favor, tente novamente.'}
        </Typography>

        {!isNotFound && error.message && (
          <Paper
            sx={{
              p: 2,
              mb: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Detalhes do erro: {error.message}
            </Typography>
          </Paper>
        )}

        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<Home />}
            onClick={handleGoHome}
            sx={{
              px: 4,
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8, #6b46c1)',
              },
            }}
          >
            Página Inicial
          </Button>

          {!isNotFound && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              sx={{
                px: 4,
                py: 1.5,
                borderColor: '#667eea',
                color: '#667eea',
                '&:hover': {
                  borderColor: '#5a67d8',
                  backgroundColor: 'rgba(102, 126, 234, 0.08)',
                },
              }}
            >
              Tentar Novamente
            </Button>
          )}
        </Stack>

        <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Precisa de ajuda?
          </Typography>
          <Button
            startIcon={<ContactSupport />}
            sx={{
              textTransform: 'none',
              color: '#667eea',
            }}
            href="mailto:suporte@locai.com"
          >
            Entre em contato com o suporte
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}