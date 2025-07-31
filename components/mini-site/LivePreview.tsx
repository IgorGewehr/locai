'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Stack,
  Chip,
  Avatar,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import {
  Smartphone,
  Tablet,
  Desktop,
  Refresh,
  Fullscreen,
  Share,
  QrCode2,
  Speed,
  Visibility,
  OpenInNew,
  ContentCopy,
  CheckCircle,
  Warning,
  Error,
} from '@mui/icons-material';
import { MiniSiteConfig } from '@/lib/types/mini-site';
import { MiniSiteTemplate } from '@/lib/types/mini-site-themes';

interface LivePreviewProps {
  config: any;
  template?: MiniSiteTemplate;
  tenantId: string;
  onRefresh: () => void;
  isLoading?: boolean;
}

type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

interface PreviewStats {
  loadTime: number;
  mobileScore: number;
  seoScore: number;
  accessibilityScore: number;
}

export default function LivePreview({
  config,
  template,
  tenantId,
  onRefresh,
  isLoading = false,
}: LivePreviewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeDevice, setActiveDevice] = useState<PreviewDevice>('desktop');
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [previewStats, setPreviewStats] = useState<PreviewStats>({
    loadTime: 0,
    mobileScore: 0,
    seoScore: 0,
    accessibilityScore: 0,
  });
  const [copied, setCopied] = useState(false);

  const siteUrl = `${window.location.origin}/site/${tenantId}`;

  useEffect(() => {
    // Simulate loading stats
    const timer = setTimeout(() => {
      setPreviewStats({
        loadTime: Math.random() * 2 + 1,
        mobileScore: Math.floor(Math.random() * 20 + 80),
        seoScore: Math.floor(Math.random() * 25 + 75),
        accessibilityScore: Math.floor(Math.random() * 15 + 85),
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [config]);

  const getDeviceWidth = () => {
    switch (activeDevice) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
        return '100%';
      default:
        return '100%';
    }
  };

  const getDeviceHeight = () => {
    switch (activeDevice) {
      case 'mobile':
        return '667px';
      case 'tablet':
        return '1024px';
      case 'desktop':
        return '600px';
      default:
        return '600px';
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success.main';
    if (score >= 70) return 'warning.main';
    return 'error.main';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle />;
    if (score >= 70) return <Warning />;
    return <Error />;
  };

  const PreviewFrame = () => (
    <Box
      sx={{
        width: getDeviceWidth(),
        height: getDeviceHeight(),
        maxWidth: '100%',
        mx: 'auto',
        border: activeDevice === 'desktop' ? 'none' : '2px solid',
        borderColor: 'divider',
        borderRadius: activeDevice === 'desktop' ? 0 : 2,
        overflow: 'hidden',
        position: 'relative',
        background: config?.active ? '#ffffff' : 'grey.100',
      }}
    >
      {config?.active ? (
        <iframe
          src={siteUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: activeDevice === 'desktop' ? 0 : 8,
          }}
          title="Mini-site Preview"
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            bgcolor: 'grey.100',
            color: 'text.secondary',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              Mini-site Inativo
            </Typography>
            <Typography variant="body2">
              Ative seu mini-site para visualizar o preview
            </Typography>
          </Box>
        </Box>
      )}
      
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1,
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <Skeleton variant="rectangular" width={300} height={200} />
            <Typography variant="body2" color="text.secondary">
              Carregando preview...
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ height: '100%' }}>
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Preview em Tempo Real
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Atualizar">
                <IconButton onClick={onRefresh} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Abrir em nova aba">
                <IconButton
                  onClick={() => window.open(siteUrl, '_blank')}
                  size="small"
                  disabled={!config?.active}
                >
                  <OpenInNew />
                </IconButton>
              </Tooltip>
              <Tooltip title={copied ? 'Copiado!' : 'Copiar URL'}>
                <IconButton onClick={handleCopyUrl} size="small">
                  {copied ? <CheckCircle color="success" /> : <ContentCopy />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Device Selector */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Tabs
              value={activeDevice}
              onChange={(_, value) => setActiveDevice(value)}
              sx={{ minHeight: 40 }}
            >
              <Tab
                value="mobile"
                icon={<Smartphone />}
                label={!isMobile ? 'Mobile' : ''}
                sx={{ minHeight: 40, minWidth: isMobile ? 60 : 'auto' }}
              />
              <Tab
                value="tablet"
                icon={<Tablet />}
                label={!isMobile ? 'Tablet' : ''}
                sx={{ minHeight: 40, minWidth: isMobile ? 60 : 'auto' }}
              />
              <Tab
                value="desktop"
                icon={<Desktop />}
                label={!isMobile ? 'Desktop' : ''}
                sx={{ minHeight: 40, minWidth: isMobile ? 60 : 'auto' }}
              />
            </Tabs>
            
            <Box sx={{ flex: 1 }} />
            
            <Stack direction="row" spacing={1}>
              <Chip
                label={config?.active ? 'Online' : 'Offline'}
                color={config?.active ? 'success' : 'default'}
                size="small"
              />
              {template && (
                <Chip
                  label={template.name}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>

          {/* Preview Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                bgcolor: 'grey.50',
                overflow: 'auto',
              }}
            >
              <PreviewFrame />
            </Paper>
          </Box>

          {/* Stats */}
          {config?.active && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Métricas de Performance
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Speed fontSize="small" color="action" />
                  <Typography variant="body2">
                    {previewStats.loadTime.toFixed(1)}s
                  </Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: getScoreColor(previewStats.mobileScore) }}>
                    {getScoreIcon(previewStats.mobileScore)}
                  </Box>
                  <Typography variant="body2">
                    Mobile: {previewStats.mobileScore}
                  </Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: getScoreColor(previewStats.seoScore) }}>
                    {getScoreIcon(previewStats.seoScore)}
                  </Box>
                  <Typography variant="body2">
                    SEO: {previewStats.seoScore}
                  </Typography>
                </Stack>
                
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: getScoreColor(previewStats.accessibilityScore) }}>
                    {getScoreIcon(previewStats.accessibilityScore)}
                  </Box>
                  <Typography variant="body2">
                    A11y: {previewStats.accessibilityScore}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          {/* URL Display */}
          <Box sx={{ mt: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {siteUrl}
              </Typography>
              <IconButton onClick={handleCopyUrl} size="small">
                {copied ? <CheckCircle color="success" /> : <ContentCopy />}
              </IconButton>
            </Paper>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}