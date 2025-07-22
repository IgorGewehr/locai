'use client';

import { useState, useEffect } from 'react';
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
import { useAuth } from '@/lib/hooks/useAuth';

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
  const { user } = useAuth();
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
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Ensure config exists
      const ensureResponse = await fetch('/api/mini-site/ensure-config');
      const ensureData = await ensureResponse.json();
      
      if (ensureData.success && ensureData.config) {
        setConfig(ensureData.config);
        setMiniSiteUrl(ensureData.miniSiteUrl);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          miniSite: config
        })
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
    try {
      setSaving(true);
      setError('');

      // First save the active state
      const updatedConfig = { ...config, active: true };
      setConfig(updatedConfig);

      const response = await fetch('/api/mini-site/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        if (data.miniSiteUrl) {
          window.open(data.miniSiteUrl, '_blank');
        }
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
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Language sx={{ fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" fontWeight={600}>
                  Status do Mini-Site
                </Typography>
                <Chip
                  label={config.active ? 'Ativo' : 'Inativo'}
                  color={config.active ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
            {!config.active && (
              <Button
                variant="contained"
                onClick={handleActivate}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                Ativar Mini-Site
              </Button>
            )}
          </Box>

          {config.active && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Seu mini-site está ativo e disponível para visitantes!
              </Alert>
              
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                  {miniSiteUrl}
                </Typography>
                <Tooltip title="Copiar URL">
                  <IconButton size="small" onClick={copyUrl}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Abrir em nova aba">
                  <IconButton size="small" onClick={openMiniSite}>
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Configurações do Mini-Site
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Configurações salvas com sucesso!
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            {/* Basic Info */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Informações Básicas
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Título do Site"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Descrição"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="Palavras-chave SEO"
                  value={config.seoKeywords}
                  onChange={(e) => setConfig({ ...config, seoKeywords: e.target.value })}
                  fullWidth
                  helperText="Separe por vírgulas"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Contact Info */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
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
                    startAdornment: <InputAdornment position="start">+55</InputAdornment>
                  }}
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={config.companyEmail}
                  onChange={(e) => setConfig({ ...config, companyEmail: e.target.value })}
                  fullWidth
                />
              </Stack>
            </Box>

            <Divider />

            {/* Colors */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Cores do Tema
              </Typography>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cor Primária
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: config.primaryColor,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                    <TextField
                      value={config.primaryColor}
                      onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cor Secundária
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: config.secondaryColor,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                    <TextField
                      value={config.secondaryColor}
                      onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Cor de Destaque
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: config.accentColor,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                    <TextField
                      value={config.accentColor}
                      onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Display Options */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Opções de Exibição
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showPrices}
                      onChange={(e) => setConfig({ ...config, showPrices: e.target.checked })}
                    />
                  }
                  label="Mostrar preços das propriedades"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.showAvailability}
                      onChange={(e) => setConfig({ ...config, showAvailability: e.target.checked })}
                    />
                  }
                  label="Mostrar disponibilidade"
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
                >
                  Visualizar Site
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving}
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