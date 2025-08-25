'use client';

import { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/utils/api-client';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Divider,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Save,
  Language,
  Palette,
  ContentCopy,
  OpenInNew,
  Visibility,
  Settings,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

interface MiniSiteConfig {
  active: boolean;
  title: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  whatsappNumber: string;
  companyEmail: string;
  showPrices: boolean;
  showAvailability: boolean;
  seoKeywords: string;
}

export default function MiniSiteConfigPanel() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MiniSiteConfig>({
    active: false,
    title: 'Minha Imobiliária',
    description: 'Encontre o imóvel perfeito para você',
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    accentColor: '#ed6c02',
    whatsappNumber: '',
    companyEmail: '',
    showPrices: true,
    showAvailability: true,
    seoKeywords: 'imóveis, aluguel, temporada',
  });
  const [miniSiteUrl, setMiniSiteUrl] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenantId) {
      loadConfig();
    }
  }, [tenantId]);

  const loadConfig = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Loading mini-site config for tenant:', tenantId);
      
      // Ensure config exists
      const ensureResponse = await fetch(`/api/mini-site/ensure-config?tenantId=${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!ensureResponse.ok) {
        throw new Error(`HTTP error! status: ${ensureResponse.status}`);
      }
      
      const ensureData = await ensureResponse.json();
      
      console.log('Received config data:', ensureData);
      
      if (ensureData.success && ensureData.config) {
        setConfig(ensureData.config);
        setMiniSiteUrl(ensureData.miniSiteUrl || '');
      } else {
        throw new Error(ensureData.error || 'Failed to load config');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setError('Erro ao carregar configurações: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }  
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const response = await ApiClient.put('/api/settings', {
        miniSite: config
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!tenantId) return;
    
    try {
      setSaving(true);
      setError('');

      // First save the active state
      const updatedConfig = { ...config, active: true };
      setConfig(updatedConfig);

      const response = await fetch('/api/mini-site/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        setMiniSiteUrl(data.miniSiteUrl);
        // Aguardar um momento antes de abrir para garantir que as configurações foram salvas
        setTimeout(() => {
          if (data.miniSiteUrl) {
            window.open(data.miniSiteUrl, '_blank');
          }
        }, 1000);
      } else {
        throw new Error(data.error || 'Erro ao ativar mini-site');
      }
    } catch (error) {
      console.error('Error activating mini-site:', error);
      setError('Erro ao ativar mini-site');
      setConfig({ ...config, active: false });
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(miniSiteUrl);
  };

  const openMiniSite = () => {
    window.open(miniSiteUrl, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Status Card */}
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        color: 'white',
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)',
                }}
              >
                <Language sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={600} sx={{ color: 'white', mb: 0.5 }}>
                  Status do Mini-Site
                </Typography>
                <Chip
                  label={config.active ? 'Ativo' : 'Inativo'}
                  sx={{
                    backgroundColor: config.active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                    color: config.active ? '#22c55e' : '#9ca3af',
                    border: `1px solid ${config.active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
            {!config.active && (
              <Button
                variant="contained"
                onClick={handleActivate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : null}
                sx={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  py: 1.5,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                  },
                }}
              >
                Ativar Mini-Site
              </Button>
            )}
          </Box>

          {config.active && (
            <>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 2,
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  color: '#22c55e',
                  '& .MuiAlert-icon': {
                    color: '#22c55e',
                  },
                }}
              >
                Seu mini-site está ativo e disponível para visitantes!
              </Alert>
              
              <Box sx={{ 
                p: 2, 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Typography variant="body2" sx={{ 
                  flex: 1, 
                  fontFamily: 'monospace',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.875rem',
                }}>
                  {miniSiteUrl}
                </Typography>
                <Tooltip title="Copiar URL">
                  <IconButton 
                    size="small" 
                    onClick={copyUrl}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                      },
                    }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Abrir em nova aba">
                  <IconButton 
                    size="small" 
                    onClick={openMiniSite}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                      },
                    }}
                  >
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        color: 'white',
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
              }}
            >
              <Settings sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
              Configurações do Mini-Site
            </Typography>
          </Box>

          {success && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 2,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                '& .MuiAlert-icon': {
                  color: '#22c55e',
                },
              }}
            >
              Configurações salvas com sucesso!
            </Alert>
          )}

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                '& .MuiAlert-icon': {
                  color: '#ef4444',
                },
              }}
            >
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            {/* Basic Info */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                Informações Básicas
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Título do Site"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#06b6d4',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#06b6d4',
                      },
                    },
                  }}
                />
                <TextField
                  label="Descrição"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#06b6d4',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#06b6d4',
                      },
                    },
                  }}
                />
                <TextField
                  label="Palavras-chave SEO"
                  value={config.seoKeywords}
                  onChange={(e) => setConfig({ ...config, seoKeywords: e.target.value })}
                  fullWidth
                  helperText="Separe por vírgulas"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#06b6d4',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#06b6d4',
                      },
                    },
                    '& .MuiFormHelperText-root': {
                      color: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                />
              </Stack>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Contact Info */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                Informações de Contato
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="WhatsApp"
                  value={config.whatsappNumber}
                  onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
                  fullWidth
                  placeholder="11999999999"
                  InputProps={{
                    startAdornment: <InputAdornment position="start" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>+55</InputAdornment>
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#06b6d4',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#06b6d4',
                      },
                    },
                  }}
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={config.companyEmail}
                  onChange={(e) => setConfig({ ...config, companyEmail: e.target.value })}
                  fullWidth
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#06b6d4',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#06b6d4',
                      },
                    },
                  }}
                />
              </Stack>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Colors */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                Cores do Tema
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Cor Primária
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: config.primaryColor,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                    <TextField
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      size="small"
                      sx={{ 
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'white',
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#06b6d4',
                          },
                        },
                      }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Cor Secundária
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: config.secondaryColor,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                    <TextField
                      value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      size="small"
                      sx={{ 
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'white',
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#06b6d4',
                          },
                        },
                      }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Cor de Destaque
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: config.accentColor,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                    <TextField
                      value={config.accentColor}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      size="small"
                      sx={{ 
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: 'white',
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#06b6d4',
                          },
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Display Options */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                Opções de Exibição
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showPrices}
                      onChange={(e) => setConfig({ ...config, showPrices: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#06b6d4',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#06b6d4',
                        },
                      }}
                    />
                  }
                  label="Mostrar preços das propriedades"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showAvailability}
                      onChange={(e) => setConfig({ ...config, showAvailability: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#06b6d4',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#06b6d4',
                        },
                      }}
                    />
                  }
                  label="Mostrar disponibilidade"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </Stack>
            </Box>

            {/* Save Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
              {config.active && (
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={openMiniSite}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    textTransform: 'none',
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#06b6d4',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      color: '#06b6d4',
                    },
                  }}
                >
                  Visualizar Site
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  py: 1.5,
                  boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                    boxShadow: '0 6px 20px rgba(6, 182, 212, 0.5)',
                  },
                  '&:disabled': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}