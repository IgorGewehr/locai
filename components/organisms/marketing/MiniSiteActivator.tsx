'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  Launch,
  Check,
  ContentCopy,
  Settings,
  Public,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';

interface MiniSiteActivatorProps {
  onActivated?: () => void;
}

export default function MiniSiteActivator({ onActivated }: MiniSiteActivatorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const [miniSiteUrl, setMiniSiteUrl] = useState('');
  const [error, setError] = useState('');

  const activateMiniSite = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/activate-mini-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setActivated(true);
        setMiniSiteUrl(data.miniSiteUrl);
        if (onActivated) onActivated();
      } else {
        setError(data.error || 'Erro ao ativar mini-site');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
      console.error('Error activating mini-site:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(miniSiteUrl);
    // You might want to show a toast notification here
  };

  const openMiniSite = () => {
    window.open(miniSiteUrl, '_blank');
  };

  const openSettings = () => {
    window.open('/dashboard/settings', '_blank');
  };

  if (activated) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <Check sx={{ fontSize: 40, color: 'white' }} />
            </Box>

            <Typography variant="h4" fontWeight={700} color="success.main">
              Mini-Site Ativado!
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Seu mini-site foi criado com sucesso e já está disponível para seus clientes.
            </Typography>

            <Alert severity="success" sx={{ width: '100%', borderRadius: 3 }}>
              <Typography variant="body2" fontWeight={600}>
                URL do seu mini-site:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                  p: 2,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {miniSiteUrl}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={copyUrl}
                  variant="outlined"
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  Copiar
                </Button>
              </Box>
            </Alert>

            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <Button
                variant="contained"
                startIcon={<Launch />}
                onClick={openMiniSite}
                sx={{ flex: 1 }}
                size="large"
              >
                Abrir Mini-Site
              </Button>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={openSettings}
                sx={{ flex: 1 }}
                size="large"
              >
                Configurações
              </Button>
            </Stack>

            <Divider sx={{ width: '100%', my: 2 }} />

            <Box sx={{ textAlign: 'left', width: '100%' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Próximos passos:
              </Typography>
              <Stack spacing={1}>
                <Chip
                  icon={<Check />}
                  label="1. Personalize as cores e textos nas configurações"
                  variant="outlined"
                  sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
                />
                <Chip
                  icon={<Check />}
                  label="2. Adicione suas propriedades no dashboard"
                  variant="outlined"
                  sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
                />
                <Chip
                  icon={<Check />}
                  label="3. Configure seu número do WhatsApp"
                  variant="outlined"
                  sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
                />
                <Chip
                  icon={<Check />}
                  label="4. Compartilhe o link com seus clientes"
                  variant="outlined"
                  sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
                />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Public sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          <Typography variant="h4" fontWeight={700}>
            Ativar Mini-Site
          </Typography>

          <Typography variant="body1" color="text.secondary">
            Crie seu mini-site personalizado para exibir suas propriedades de forma profissional e atrair mais clientes.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ textAlign: 'left', width: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              O que você terá:
            </Typography>
            <Stack spacing={1}>
              <Chip
                icon={<Check />}
                label="Site responsivo e profissional"
                variant="outlined"
                sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
              />
              <Chip
                icon={<Check />}
                label="Galeria de propriedades com filtros"
                variant="outlined"
                sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
              />
              <Chip
                icon={<Check />}
                label="Integração direta com WhatsApp"
                variant="outlined"
                sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
              />
              <Chip
                icon={<Check />}
                label="Personalização de cores e textos"
                variant="outlined"
                sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
              />
              <Chip
                icon={<Check />}
                label="Analytics de visitantes"
                variant="outlined"
                sx={{ justifyContent: 'flex-start', px: 2, py: 1, height: 'auto' }}
              />
            </Stack>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={activateMiniSite}
            disabled={loading || !user}
            sx={{
              width: '100%',
              py: 1.5,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
              },
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                Ativando...
              </>
            ) : (
              'Ativar Mini-Site Agora'
            )}
          </Button>

          <Typography variant="caption" color="text.secondary">
            A ativação é instantânea e gratuita
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}