'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import MiniSiteActivator from '@/components/organisms/marketing/MiniSiteActivator';
import MiniSiteWidget from '@/components/organisms/marketing/MiniSiteWidget';

export default function MiniSitePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [miniSiteActive, setMiniSiteActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      {miniSiteActive ? (
        <MiniSiteWidget tenantId={user?.uid} />
      ) : (
        <MiniSiteActivator onActivated={handleActivated} />
      )}
    </Container>
  );
}