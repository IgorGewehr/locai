'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';
import Link from 'next/link';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function Custom500() {
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
        <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', mb: 2 }}>
          500
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Erro interno do servidor
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Ocorreu um erro interno no servidor. Nossa equipe foi notificada.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            component={Link}
            href="/dashboard"
            sx={{ minWidth: 150 }}
          >
            Ir para Dashboard
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => window.history.back()}
            sx={{ minWidth: 150 }}
          >
            Voltar
          </Button>
        </Box>
      </Box>
    </Container>
  );
}