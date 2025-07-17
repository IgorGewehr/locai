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
            active: true, // Sempre ativo para permitir configuração inicial
            title: settings.miniSite.title || 'Minha Imobiliária',
            description: settings.miniSite.description || 'Encontre o imóvel perfeito para você',
            primaryColor: settings.miniSite.primaryColor || '#1976d2',
          });
        } else {
          // Set default config if no miniSite settings exist
          setMiniSiteConfig({
            active: true, // Ativo por padrão para permitir configuração
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
    router.push('/dashboard/settings?tab=3'); // Tab 3 is the Mini-Site tab
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
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Language color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Mini-Site
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Configurações">
              <IconButton size="small" onClick={openSettings}>
                <Settings />
              </IconButton>
            </Tooltip>
            <Tooltip title="Abrir Mini-Site">
              <span>
                <IconButton size="small" onClick={openMiniSite} disabled={!miniSiteConfig.active}>
                  <OpenInNew />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {miniSiteConfig.title}
            </Typography>
            <Chip
              label={miniSiteConfig.active ? 'Ativo' : 'Inativo'}
              color={miniSiteConfig.active ? 'success' : 'default'}
              size="small"
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {miniSiteConfig.description}
          </Typography>
          
          {miniSiteConfig.active ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              p: 1, 
              bgcolor: 'background.default',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                {miniSiteUrl}
              </Typography>
              <Tooltip title="Copiar URL">
                <IconButton size="small" onClick={copyMiniSiteUrl}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ative seu mini-site nas configurações para começar a receber visitas!
            </Alert>
          )}
        </Box>

        {miniSiteConfig.active && (
          <>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Estatísticas (últimos 30 dias)
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <VisibilityIcon color="primary" fontSize="small" />
                  <Typography variant="body2">Visualizações</Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {analytics.totalViews.toLocaleString()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TouchApp color="primary" fontSize="small" />
                  <Typography variant="body2">Imóveis Visualizados</Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {analytics.propertyViews.toLocaleString()}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WhatsApp color="primary" fontSize="small" />
                  <Typography variant="body2">Contatos</Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>
                  {analytics.inquiries}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="success" fontSize="small" />
                  <Typography variant="body2">Taxa de Conversão</Typography>
                </Box>
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {analytics.conversionRate}%
                </Typography>
              </Box>
            </Stack>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Visibility />}
            onClick={openMiniSite}
            disabled={!miniSiteConfig.active}
            sx={{ flex: 1 }}
          >
            Visualizar
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Share />}
            onClick={copyMiniSiteUrl}
            disabled={!miniSiteConfig.active}
            sx={{ flex: 1 }}
          >
            Compartilhar
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}