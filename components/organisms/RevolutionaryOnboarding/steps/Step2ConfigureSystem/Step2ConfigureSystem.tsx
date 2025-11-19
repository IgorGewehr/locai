/**
 * Step 2: Configure AI System
 * Minimalist embedded dialog for AI configuration in onboarding
 * Uses the SAME API as settings/ai-config for consistency
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Stack,
  IconButton,
  Alert,
  CircularProgress,
  Slider,
  Select,
  MenuItem,
  FormControl,
  TextField,
  alpha,
  useTheme,
  useMediaQuery,
  Fade,
  Chip,
} from '@mui/material';
import {
  Close,
  SmartToy,
  CheckCircle,
  Language,
  Percent,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';
import type { AIConfig } from '@/lib/types/ai-config';

interface Step2ConfigureSystemProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data?: any) => void;
  onSkip?: () => void;
}

export default function Step2ConfigureSystem({
  open,
  onClose,
  onComplete,
  onSkip,
}: Step2ConfigureSystemProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [config, setConfig] = useState<AIConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Token de autenticação não disponível');
      }

      const response = await fetch('/api/ai/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
      } else {
        throw new Error(result.error || 'Erro ao carregar configuração');
      }
    } catch (error) {
      logger.error('Failed to load AI config', error as Error);
      setError('Erro ao carregar configurações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Token de autenticação não disponível');
      }

      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
        setHasChanges(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        throw new Error(result.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      logger.error('Failed to save AI config', error as Error);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (hasChanges) {
      await handleSave();
    }
    onComplete({ aiConfig: config });
  };

  const handleSkipClick = () => {
    if (onSkip) {
      onSkip();
    }
    onClose();
  };

  const updateConfig = (updates: Partial<AIConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: isMobile ? 0 : '24px',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            p: { xs: 3, md: 4 },
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            },
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <SmartToy sx={{ color: 'white', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                    mb: 0.5,
                  }}
                >
                  Configurar Sofia IA
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  Personalize sua assistente virtual
                </Typography>
              </Box>
            </Stack>

            <IconButton
              onClick={onClose}
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ p: { xs: 3, md: 4 } }}>
          {/* Alerts */}
          <Fade in={!!success}>
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{
                mb: 3,
                display: success ? 'flex' : 'none',
                backgroundColor: alpha('#10b981', 0.15),
                border: `1px solid ${alpha('#10b981', 0.3)}`,
                color: '#6ee7b7',
              }}
            >
              Configurações salvas com sucesso!
            </Alert>
          </Fade>

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{
                mb: 3,
                backgroundColor: alpha('#ef4444', 0.15),
                border: `1px solid ${alpha('#ef4444', 0.3)}`,
                color: '#fca5a5',
              }}
            >
              {error}
            </Alert>
          )}

          {/* Main Settings Grid */}
          <Grid container spacing={3}>
            {/* Sofia Enabled */}
            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  background: alpha('#6366f1', 0.08),
                  border: `1px solid ${alpha('#6366f1', 0.2)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: alpha('#6366f1', 0.12),
                    border: `1px solid ${alpha('#6366f1', 0.3)}`,
                  },
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'white', mb: 0.5 }}>
                      Ativar Sofia IA
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.6) }}>
                      Habilita resposta automática em todas as conversas
                    </Typography>
                  </Box>
                  <Switch
                    checked={config.enabled}
                    onChange={(e) => updateConfig({ enabled: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#10b981',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#10b981',
                      },
                    }}
                  />
                </Stack>
              </Box>
            </Grid>

            {/* Company Name */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <Typography
                  variant="caption"
                  sx={{ color: alpha('#ffffff', 0.7), mb: 1, display: 'block', fontWeight: 500 }}
                >
                  Nome da Empresa
                </Typography>
                <TextField
                  value={config.customPrompts.companyName || ''}
                  onChange={(e) =>
                    updateConfig({
                      customPrompts: {
                        ...config.customPrompts,
                        companyName: e.target.value,
                      },
                    })
                  }
                  placeholder="Sua Imobiliária"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: alpha('#ffffff', 0.05),
                      borderRadius: '12px',
                    },
                  }}
                />
              </FormControl>
            </Grid>

            {/* Tone */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <Typography
                  variant="caption"
                  sx={{ color: alpha('#ffffff', 0.7), mb: 1, display: 'block', fontWeight: 500 }}
                >
                  Tom de Comunicação
                </Typography>
                <Select
                  value={config.customPrompts.tone || 'friendly'}
                  onChange={(e) =>
                    updateConfig({
                      customPrompts: {
                        ...config.customPrompts,
                        tone: e.target.value as 'formal' | 'casual' | 'friendly',
                      },
                    })
                  }
                  startAdornment={<Language sx={{ mr: 1, color: alpha('#ffffff', 0.6) }} />}
                  sx={{
                    backgroundColor: alpha('#ffffff', 0.05),
                    borderRadius: '12px',
                  }}
                >
                  <MenuItem value="formal">Formal</MenuItem>
                  <MenuItem value="friendly">Amigável</MenuItem>
                  <MenuItem value="casual">Casual</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Welcome Message */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <Typography
                  variant="caption"
                  sx={{ color: alpha('#ffffff', 0.7), mb: 1, display: 'block', fontWeight: 500 }}
                >
                  Mensagem de Boas-Vindas (opcional)
                </Typography>
                <TextField
                  multiline
                  rows={2}
                  value={config.customPrompts.welcome || ''}
                  onChange={(e) =>
                    updateConfig({
                      customPrompts: {
                        ...config.customPrompts,
                        welcome: e.target.value,
                      },
                    })
                  }
                  placeholder="Ex: Olá! Sou a Sofia, assistente virtual da sua empresa..."
                  inputProps={{ maxLength: 500 }}
                  helperText={`${config.customPrompts.welcome?.length || 0}/500 caracteres`}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: alpha('#ffffff', 0.05),
                      borderRadius: '12px',
                    },
                  }}
                />
              </FormControl>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 1 }}>
                <Box sx={{ flex: 1, height: '1px', background: alpha('#ffffff', 0.1) }} />
                <Chip
                  label="DESCONTOS AUTOMÁTICOS"
                  size="small"
                  icon={<Percent sx={{ fontSize: 14 }} />}
                  sx={{
                    backgroundColor: alpha('#8b5cf6', 0.15),
                    color: '#c4b5fd',
                    border: `1px solid ${alpha('#8b5cf6', 0.3)}`,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
                <Box sx={{ flex: 1, height: '1px', background: alpha('#ffffff', 0.1) }} />
              </Box>
            </Grid>

            {/* Discount Enabled */}
            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  background: alpha('#8b5cf6', 0.08),
                  border: `1px solid ${alpha('#8b5cf6', 0.2)}`,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.discountSettings.enabled}
                      onChange={(e) =>
                        updateConfig({
                          discountSettings: {
                            ...config.discountSettings,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#8b5cf6',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#8b5cf6',
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'white' }}>
                        Permitir Descontos Dinâmicos
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.6) }}>
                        Sofia poderá oferecer descontos automaticamente
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Grid>

            {/* Max Discount Percentage */}
            {config.discountSettings.enabled && (
              <Grid item xs={12}>
                <Box sx={{ px: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.7), fontWeight: 500 }}>
                      Desconto Máximo
                    </Typography>
                    <Chip
                      label={`${config.discountSettings.maxPercentage}%`}
                      size="small"
                      sx={{
                        backgroundColor: alpha('#10b981', 0.2),
                        color: '#6ee7b7',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                  <Slider
                    value={config.discountSettings.maxPercentage}
                    onChange={(_, value) =>
                      updateConfig({
                        discountSettings: {
                          ...config.discountSettings,
                          maxPercentage: value as number,
                          approvalThreshold: Math.min(
                            config.discountSettings.approvalThreshold,
                            value as number
                          ),
                        },
                      })
                    }
                    min={0}
                    max={50}
                    step={5}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 25, label: '25%' },
                      { value: 50, label: '50%' },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                    sx={{
                      color: '#10b981',
                      '& .MuiSlider-markLabel': {
                        color: alpha('#ffffff', 0.5),
                        fontSize: '0.75rem',
                      },
                    }}
                  />
                </Box>
              </Grid>
            )}
          </Grid>

          {/* Actions */}
          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleComplete}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{
                py: 1.5,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669, #047857)',
                },
              }}
            >
              {saving ? 'Salvando...' : hasChanges ? 'Salvar e Continuar' : 'Continuar'}
            </Button>

            <Button
              onClick={handleSkipClick}
              disabled={saving}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: '12px',
                color: alpha('#ffffff', 0.6),
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: alpha('#ffffff', 0.05),
                },
              }}
            >
              Pular
            </Button>
          </Stack>

          {/* Info */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: '12px',
              background: alpha('#3b82f6', 0.08),
              border: `1px solid ${alpha('#3b82f6', 0.2)}`,
            }}
          >
            <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.7), display: 'block' }}>
              💡 <strong>Dica:</strong> Você pode personalizar configurações avançadas depois em{' '}
              <strong style={{ color: '#60a5fa' }}>Configurações → IA</strong>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
