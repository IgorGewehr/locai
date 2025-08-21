'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Divider,
  Stack,
  Tooltip,
  Alert,
  CircularProgress,
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
  Visibility as VisibilityIcon,
  TouchApp,
  WhatsApp,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface MiniSiteWidgetProps {
  tenantId?: string;
}

export default function MiniSiteWidget({ tenantId = 'demo' }: MiniSiteWidgetProps) {
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
            active: settings.miniSite.active || false, // Usa o valor real do banco
            title: settings.miniSite.title || 'Minha Imobiliária',
            description: settings.miniSite.description || 'Encontre o imóvel perfeito para você',
            primaryColor: settings.miniSite.primaryColor || '#1976d2',
          });
        } else {
          // Set default config if no miniSite settings exist
          setMiniSiteConfig({
            active: false, // Inativo por padrão se não há configuração
            title: 'Minha Imobiliária',
            description: 'Encontre o imóvel perfeito para você',
            primaryColor: '#1976d2',
          });
        }
        // Use current user's UID as tenant ID
        const actualTenantId = user?.uid || 'default-tenant';
        setMiniSiteUrl(`${window.location.origin}/site/${actualTenantId}`);
      }
      
      // Load analytics - usar dados reais apenas
      try {
        const analyticsResponse = await fetch('/api/analytics/mini-site');
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          setAnalytics(analyticsData);
        } else {
          // Usar dados vazios se API não estiver disponível
          setAnalytics({
            totalViews: 0,
            propertyViews: 0,
            inquiries: 0,
            conversionRate: 0,
          });
        }
      } catch (analyticsError) {
        console.log('Analytics API não disponível, usando dados vazios');
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

  const copyMiniSiteUrl = () => {
    navigator.clipboard.writeText(miniSiteUrl);
    // You might want to show a toast notification here
  };

  const openMiniSite = () => {
    window.open(miniSiteUrl, '_blank');
  };

  const openSettings = () => {
    router.push('/dashboard/mini-site'); // Vai direto para a página de mini-site
  };

  const activateMiniSite = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mini-site/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Mini-site ativado:', data);
        // Recarregar dados após ativação
        await loadMiniSiteData();
        // Abrir mini-site em nova aba
        if (data.miniSiteUrl) {
          window.open(data.miniSiteUrl, '_blank');
        }
      } else {
        console.error('Erro ao ativar mini-site');
      }
    } catch (error) {
      console.error('Erro ao ativar mini-site:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: 'auto',
        minHeight: { xs: 'auto', lg: 350 },
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        }
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)',
              }}
            >
              <Language sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  mb: 0.5
                }}
              >
                Mini-Site
              </Typography>
              <Chip
                label={miniSiteConfig.active ? 'Ativo' : 'Inativo'}
                sx={{
                  background: miniSiteConfig.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                  color: miniSiteConfig.active ? '#10b981' : '#6b7280',
                  border: miniSiteConfig.active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(107, 114, 128, 0.3)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  height: 28,
                }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Configurações">
              <IconButton 
                onClick={openSettings}
                sx={{
                  background: 'rgba(236, 72, 153, 0.1)',
                  border: '1px solid rgba(236, 72, 153, 0.2)',
                  color: '#ec4899',
                  '&:hover': {
                    background: 'rgba(236, 72, 153, 0.2)',
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <Settings />
              </IconButton>
            </Tooltip>
            {miniSiteConfig.active && (
              <Tooltip title="Abrir Mini-Site">
                <IconButton 
                  onClick={openMiniSite}
                  sx={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.2)',
                    color: '#ec4899',
                    '&:hover': {
                      background: 'rgba(236, 72, 153, 0.2)',
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  <OpenInNew />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1.25rem',
              mb: 1
            }}
          >
            {miniSiteConfig.title}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1rem',
              mb: 3
            }}
          >
            {miniSiteConfig.description}
          </Typography>
          
          {miniSiteConfig.active ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              p: 2, 
              background: 'rgba(236, 72, 153, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
            }}>
              <Language sx={{ color: '#ec4899', fontSize: 20 }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  flex: 1, 
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}
              >
                {miniSiteUrl}
              </Typography>
              <Tooltip title="Copiar URL">
                <IconButton 
                  size="small" 
                  onClick={copyMiniSiteUrl}
                  sx={{
                    color: '#ec4899',
                    '&:hover': {
                      background: 'rgba(236, 72, 153, 0.1)',
                    }
                  }}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <>
              <Alert 
                severity="info" 
                sx={{ 
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  '& .MuiAlert-icon': {
                    color: '#60a5fa'
                  },
                  mb: 2
                }}
              >
                Ative seu mini-site para começar a receber visitas!
              </Alert>
              <Button
                variant="contained"
                onClick={activateMiniSite}
                disabled={loading}
                sx={{ 
                  width: '100%',
                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #db2777, #e11d48)',
                  },
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: '12px',
                }}
              >
                {loading ? 'Ativando...' : '🚀 Ativar Mini-Site'}
              </Button>
            </>
          )}
        </Box>

        {miniSiteConfig.active && (
          <>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 3 }} />
            
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1.125rem',
                mb: 2.5
              }}
            >
              Desempenho (30 dias)
            </Typography>
            
            <Stack spacing={2.5}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <VisibilityIcon sx={{ color: '#60a5fa', fontSize: 20 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Visualizações
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                  {analytics.totalViews.toLocaleString()}
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TouchApp sx={{ color: '#a78bfa', fontSize: 20 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Imóveis Vistos
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                  {analytics.propertyViews.toLocaleString()}
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <WhatsApp sx={{ color: '#10b981', fontSize: 20 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Contatos
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                  {analytics.inquiries}
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TrendingUp sx={{ color: '#10b981', fontSize: 20 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                    Taxa de Conversão
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ color: '#10b981', fontWeight: 700 }}>
                  {analytics.conversionRate}%
                </Typography>
              </Box>
            </Stack>
          </>
        )}

        {miniSiteConfig.active && (
          <>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 3 }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Visibility />}
                onClick={openMiniSite}
                sx={{ 
                  flex: 1,
                  background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #db2777, #e11d48)',
                  },
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: '12px',
                }}
              >
                Visualizar Site
              </Button>
              <Button
                variant="outlined"
                startIcon={<Share />}
                onClick={copyMiniSiteUrl}
                sx={{ 
                  flex: 1,
                  borderColor: 'rgba(236, 72, 153, 0.3)',
                  color: '#ec4899',
                  '&:hover': {
                    borderColor: '#ec4899',
                    background: 'rgba(236, 72, 153, 0.1)',
                  },
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: '12px',
                }}
              >
                Compartilhar
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}