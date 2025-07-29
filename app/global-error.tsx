'use client';

import { useEffect } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { Refresh, Home } from '@mui/icons-material';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
              py: 4,
            }}
          >
            <Typography variant="h1" component="h1" sx={{ fontSize: '4rem', fontWeight: 'bold', mb: 2 }}>
              500
            </Typography>
            <Typography variant="h4" component="h2" gutterBottom>
              Erro interno do servidor
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Ocorreu um erro inesperado no servidor. Nossa equipe foi notificada.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={reset}
                sx={{ minWidth: 150 }}
              >
                Tentar novamente
              </Button>
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={() => window.location.href = '/dashboard'}
                sx={{ minWidth: 150 }}
              >
                Ir para Dashboard
              </Button>
            </Box>
          </Box>
        </Container>
      </body>
    </html>
  );
}