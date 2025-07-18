'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from '@mui/material';
import { useAuth } from '@/lib/hooks/useAuth';
import MiniSiteActivator from '@/components/organisms/marketing/MiniSiteActivator';
import MiniSiteWidget from '@/components/organisms/marketing/MiniSiteWidget';

export default function MiniSitePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [miniSiteActive, setMiniSiteActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    const checkMiniSiteStatus = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          setMiniSiteActive(settings?.miniSite?.active || false);
        } else {
          console.error('Failed to fetch settings:', response.status);
          setError('Failed to load settings');
        }
      } catch (error) {
        console.error('Error checking mini-site status:', error);
        setError('Error loading mini-site status');
      } finally {
        setLoading(false);
      }
    };

    checkMiniSiteStatus();
  }, [user]);

  const handleActivated = () => {
    setMiniSiteActive(true);
  };

  const handleTestActivation = async () => {
    setTestMode(true);
    try {
      const response = await fetch('/api/activate-mini-site-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: user?.uid || 'default-tenant' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMiniSiteActive(true);
        setError(null);
        // Open mini-site in new tab
        window.open(data.miniSiteUrl, '_blank');
      } else {
        setError(data.error || 'Erro ao ativar mini-site');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setTestMode(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
          Mini-Site
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {miniSiteActive 
            ? 'Gerencie seu mini-site e acompanhe o desempenho'
            : 'Crie seu mini-site personalizado para atrair mais clientes'
          }
        </Typography>
      </Box>

      {/* Test buttons for debugging */}
      <Stack direction="row" spacing={2} sx={{ mb: 4, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={handleTestActivation}
          disabled={testMode}
          color="warning"
        >
          {testMode ? 'Testando...' : 'Ativar Mini-Site (Teste)'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => window.open(`/api/test-mini-site?tenantId=${user?.uid || 'default-tenant'}`, '_blank')}
          color="info"
        >
          Debug Info
        </Button>
      </Stack>

      {miniSiteActive ? (
        <MiniSiteWidget tenantId={user?.uid} />
      ) : (
        <MiniSiteActivator onActivated={handleActivated} />
      )}
    </Container>
  );
}