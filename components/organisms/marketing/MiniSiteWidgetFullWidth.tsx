'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Language,
  Visibility,
  Share,
  QrCode2,
  Analytics,
  Settings,
  OpenInNew,
  ContentCopy,
  TrendingUp,
  TouchApp,
  WhatsApp,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface MiniSiteWidgetProps {
  tenantId?: string;
}

export default function MiniSiteWidgetFullWidth({ tenantId = 'demo' }: MiniSiteWidgetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [miniSiteConfig, setMiniSiteConfig] = useState({
    active: false,
    title: 'Minha Imobiliária',
    description: 'Encontre o imóvel perfeito para você',
    primaryColor: '#1976d2',
  });
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    propertyViews: 0,
    inquiries: 0,
    conversionRate: 0,
  });
  const [miniSiteUrl, setMiniSiteUrl] = useState('');

  useEffect(() => {
    loadMiniSiteData();
  }, []);

  const loadMiniSiteData = async () => {
    try {
      setLoading(true);
      
      // Load mini-site config
      const configResponse = await fetch('/api/settings');
      if (configResponse.ok) {
        const settings = await configResponse.json();
        if (settings?.miniSite) {
          setMiniSiteConfig({
            active: settings.miniSite.active || false,
            title: settings.miniSite.title || 'Minha Imobiliária',
            description: settings.miniSite.description || 'Encontre o imóvel perfeito para você',
            primaryColor: settings.miniSite.primaryColor || '#1976d2',
          });
        } else {
          setMiniSiteConfig({
            active: false,
            title: 'Minha Imobiliária',
            description: 'Encontre o imóvel perfeito para você',
            primaryColor: '#1976d2',
          });
        }
        const actualTenantId = user?.uid || 'default-tenant';
        setMiniSiteUrl(`${window.location.origin}/mini-site/${actualTenantId}`);
      }
      
      // Load analytics
      try {
        const analyticsResponse = await fetch('/api/analytics/mini-site');
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData);
        } else {
          setAnalytics({
            totalViews: 0,
            propertyViews: 0,
            inquiries: 0,
            conversionRate: 0,
          });
        }
      } catch (error) {
        setAnalytics({
          totalViews: 0,
          propertyViews: 0,
          inquiries: 0,
          conversionRate: 0,
        });
      }
    } catch (error) {
      console.error('Error loading mini-site data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(miniSiteUrl);
      // Could add a toast here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleOpenSite = () => {
    window.open(miniSiteUrl, '_blank');
  };

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: 200,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} />
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: 200,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
        }
      }}
    >
      <CardContent sx={{ p: 4, height: '100%' }}>
        <Grid container spacing={4} sx={{ height: '100%' }}>
          {/* Left Section - Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                    color: 'white',
                    boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)',
                  }}
                >
                  <Language sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                    Mini-Site
                  </Typography>
                  <Chip
                    label={miniSiteConfig.active ? 'Ativo' : 'Inativo'}
                    size="small"
                    sx={{
                      backgroundColor: miniSiteConfig.active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: miniSiteConfig.active ? '#22c55e' : '#ef4444',
                      border: `1px solid ${miniSiteConfig.active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>

              <Typography variant="body1" fontWeight={600} sx={{ color: '#ffffff', mb: 1 }}>
                {miniSiteConfig.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', flex: 1 }}>
                {miniSiteConfig.description}
              </Typography>
            </Box>
          </Grid>

          {/* Center Section - Analytics */}
          <Grid item xs={12} md={4}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                      {analytics.totalViews}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Visualizações
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#06b6d4', mb: 0.5 }}>
                      {analytics.inquiries}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Consultas
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#f59e0b', mb: 0.5 }}>
                      {analytics.propertyViews}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Imóveis Vistos
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={700} sx={{ color: '#22c55e', mb: 0.5 }}>
                      {analytics.conversionRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Conversão
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Right Section - Actions */}
          <Grid item xs={12} md={4}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                <Tooltip title="Copiar URL">
                  <IconButton
                    onClick={handleCopyUrl}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Abrir Site">
                  <IconButton
                    onClick={handleOpenSite}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                    }}
                  >
                    <OpenInNew sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<Settings />}
                  onClick={() => router.push('/dashboard/mini-site')}
                  sx={{
                    backgroundColor: '#06b6d4',
                    '&:hover': { backgroundColor: '#0891b2' },
                    borderRadius: 2,
                  }}
                >
                  Configurar
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Analytics />}
                  onClick={() => router.push('/dashboard/analytics')}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  Ver Analytics
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}