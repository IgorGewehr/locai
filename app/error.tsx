'use client';

import { useEffect } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { Refresh, Home } from '@mui/icons-material';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
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
        <Typography variant="h4" component="h1" gutterBottom>
          Algo deu errado!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.
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
            component={Link}
            href="/dashboard"
            sx={{ minWidth: 150 }}
          >
            Ir para Dashboard
          </Button>
        </Box>
      </Box>
    </Container>
  );
}