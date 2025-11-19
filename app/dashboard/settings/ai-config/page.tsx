'use client';

/**
 * AI CONFIGURATION PAGE
 *
 * Dashboard page for managing AI features and agent behavior
 * Uses /api/ai/config (GET, PUT) with AIConfig type
 * Same data source as onboarding Step 2
 *
 * Storage: tenants/{tenantId}/aiConfig/settings
 *
 * @version 2.0.0 - Unified with onboarding
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  TextField,
  Grid,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  SmartToy as SmartToyIcon,
  Percent as PercentIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import type { AIConfig } from '@/lib/types/ai-config';
import { logger } from '@/lib/utils/logger';

export default function AIConfigPage() {
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [config, setConfig] = useState<AIConfig | null>(null);

  // Load current config
  useEffect(() => {
    if (isReady && tenantId) {
      loadConfig();
    }
  }, [tenantId, isReady]);

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

      if (!response.ok) {
        throw new Error('Erro ao carregar configuração');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
        logger.info('[AI-CONFIG-PAGE] Config loaded successfully');
      } else {
        throw new Error(data.error || 'Erro ao carregar configuração');
      }
    } catch (err) {
      logger.error('[AI-CONFIG-PAGE] Failed to load config', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
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

      if (!response.ok) {
        throw new Error('Erro ao salvar configuração');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        logger.info('[AI-CONFIG-PAGE] Config saved successfully');
      } else {
        throw new Error(data.error || 'Erro ao salvar configuração');
      }
    } catch (err) {
      logger.error('[AI-CONFIG-PAGE] Failed to save config', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<AIConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  const updateAgentPermissions = (updates: Partial<AIConfig['agentPermissions']>) => {
    if (!config) return;
    setConfig({
      ...config,
      agentPermissions: {
        ...config.agentPermissions,
        ...updates,
      },
    });
  };

  const updateDiscountSettings = (updates: Partial<AIConfig['discountSettings']>) => {
    if (!config) return;
    setConfig({
      ...config,
      discountSettings: {
        ...config.discountSettings,
        ...updates,
      },
    });
  };

  const updateDiscountCriteria = (updates: Partial<AIConfig['discountSettings']['allowedCriteria']>) => {
    if (!config) return;
    setConfig({
      ...config,
      discountSettings: {
        ...config.discountSettings,
        allowedCriteria: {
          ...config.discountSettings.allowedCriteria,
          ...updates,
        },
      },
    });
  };

  const updateCustomPrompts = (updates: Partial<AIConfig['customPrompts']>) => {
    if (!config) return;
    setConfig({
      ...config,
      customPrompts: {
        ...config.customPrompts,
        ...updates,
      },
    });
  };

  if (!isReady || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ py: 8 }}>
        <Alert severity="error">Erro ao carregar configurações de IA</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <SmartToyIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={600}>
              Configuração de IA Sofia
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Personalize os agentes de IA e suas funcionalidades
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConfig}
            disabled={loading || saving}
          >
            Recarregar
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
          ✅ Configurações salvas com sucesso! As mudanças entrarão em vigor nas próximas conversas.
        </Alert>
      )}

      {/* MAIN SETTINGS */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎯 Configurações Gerais
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={3}>
            {/* Sofia Enabled */}
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={(e) => updateConfig({ enabled: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Ativar Sofia IA
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Habilita resposta automática em todas as conversas
                  </Typography>
                </Box>
              }
            />

            {/* Auto Response */}
            <FormControlLabel
              control={
                <Switch
                  checked={config.autoResponse}
                  onChange={(e) => updateConfig({ autoResponse: e.target.checked })}
                  disabled={!config.enabled}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Resposta Automática
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sofia responde automaticamente sem aprovação manual
                  </Typography>
                </Box>
              }
            />

            {/* Business Hours Only */}
            <FormControlLabel
              control={
                <Switch
                  checked={config.businessHoursOnly}
                  onChange={(e) => updateConfig({ businessHoursOnly: e.target.checked })}
                  disabled={!config.enabled}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Apenas Horário Comercial
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sofia só responde durante o horário comercial (9h-18h)
                  </Typography>
                </Box>
              }
            />

            <Divider />

            {/* Company Name */}
            <TextField
              label="Nome da Empresa"
              value={config.customPrompts.companyName || ''}
              onChange={(e) => updateCustomPrompts({ companyName: e.target.value })}
              fullWidth
              placeholder="Sua Imobiliária"
            />

            {/* Tone */}
            <FormControl fullWidth>
              <InputLabel>Tom de Comunicação</InputLabel>
              <Select
                value={config.customPrompts.tone || 'friendly'}
                onChange={(e) =>
                  updateCustomPrompts({ tone: e.target.value as 'formal' | 'casual' | 'friendly' })
                }
                label="Tom de Comunicação"
              >
                <MenuItem value="formal">Formal</MenuItem>
                <MenuItem value="friendly">Amigável</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
              </Select>
            </FormControl>

            {/* Welcome Message */}
            <TextField
              label="Mensagem de Boas-Vindas (opcional)"
              value={config.customPrompts.welcome || ''}
              onChange={(e) => updateCustomPrompts({ welcome: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Ex: Olá! Sou a Sofia, assistente virtual da sua empresa..."
              inputProps={{ maxLength: 500 }}
              helperText={`${config.customPrompts.welcome?.length || 0}/500 caracteres`}
            />

            {/* Company Values */}
            <TextField
              label="Valores e Diferenciais da Empresa (opcional)"
              value={config.customPrompts.companyValues || ''}
              onChange={(e) => updateCustomPrompts({ companyValues: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Ex: Somos especializados em imóveis de alto padrão..."
              inputProps={{ maxLength: 1000 }}
              helperText={`${config.customPrompts.companyValues?.length || 0}/1000 caracteres`}
            />

            {/* Special Instructions */}
            <TextField
              label="Instruções Especiais (opcional)"
              value={config.customPrompts.specialInstructions || ''}
              onChange={(e) => updateCustomPrompts({ specialInstructions: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="Ex: Sempre mencionar que aceitamos pets, sempre oferecer desconto para estadias acima de 7 dias..."
              inputProps={{ maxLength: 2000 }}
              helperText={`${config.customPrompts.specialInstructions?.length || 0}/2000 caracteres`}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* AGENT PERMISSIONS */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🤖 Permissões dos Agentes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Habilite ou desabilite agentes especializados
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.search}
                    onChange={(e) => updateAgentPermissions({ search: e.target.checked })}
                  />
                }
                label="🔍 Search Agent (Busca de Imóveis)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.booking}
                    onChange={(e) => updateAgentPermissions({ booking: e.target.checked })}
                  />
                }
                label="📝 Booking Agent (Reservas)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.sales}
                    onChange={(e) => updateAgentPermissions({ sales: e.target.checked })}
                  />
                }
                label="💰 Sales Agent (Negociação)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.support}
                    onChange={(e) => updateAgentPermissions({ support: e.target.checked })}
                  />
                }
                label="🤝 Support Agent (Suporte)"
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  opacity: 0.7,
                }}
              >
                <FormControlLabel
                  control={<Switch checked={false} disabled />}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary">
                        💳 Payments Agent (Pagamentos)
                      </Typography>
                      <Chip label="Em Breve" size="small" />
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Integração AbacatePay em desenvolvimento
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* DISCOUNT SETTINGS */}
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <PercentIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6">
              Configurações de Desconto
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure descontos dinâmicos oferecidos pela Sofia
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={3}>
            {/* Enable Discounts */}
            <FormControlLabel
              control={
                <Switch
                  checked={config.discountSettings.enabled}
                  onChange={(e) => updateDiscountSettings({ enabled: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Permitir Descontos Dinâmicos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sofia poderá oferecer descontos automaticamente
                  </Typography>
                </Box>
              }
            />

            {config.discountSettings.enabled && (
              <>
                {/* Max Discount Percentage */}
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={600}>
                      Desconto Máximo
                    </Typography>
                    <Chip label={`${config.discountSettings.maxPercentage}%`} color="primary" size="small" />
                  </Box>
                  <Slider
                    value={config.discountSettings.maxPercentage}
                    onChange={(_, value) => updateDiscountSettings({ maxPercentage: value as number })}
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
                  />
                </Box>

                {/* Requires Approval */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.discountSettings.requiresApproval}
                      onChange={(e) => updateDiscountSettings({ requiresApproval: e.target.checked })}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Requer Aprovação Humana
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Descontos acima do threshold precisam de aprovação
                      </Typography>
                    </Box>
                  }
                />

                {/* Approval Threshold */}
                {config.discountSettings.requiresApproval && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight={600}>
                        Limite para Aprovação Automática
                      </Typography>
                      <Chip label={`${config.discountSettings.approvalThreshold}%`} size="small" />
                    </Box>
                    <Slider
                      value={config.discountSettings.approvalThreshold}
                      onChange={(_, value) =>
                        updateDiscountSettings({
                          approvalThreshold: Math.min(value as number, config.discountSettings.maxPercentage),
                        })
                      }
                      min={0}
                      max={config.discountSettings.maxPercentage}
                      step={1}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}%`}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Descontos até {config.discountSettings.approvalThreshold}% são aplicados automaticamente.
                      Acima disso, Sofia pedirá aprovação.
                    </Typography>
                  </Box>
                )}

                <Divider />

                {/* Allowed Criteria */}
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Critérios de Desconto Permitidos
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.discountSettings.allowedCriteria.earlyBooking}
                          onChange={(e) => updateDiscountCriteria({ earlyBooking: e.target.checked })}
                        />
                      }
                      label="📅 Reserva Antecipada"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.discountSettings.allowedCriteria.longStay}
                          onChange={(e) => updateDiscountCriteria({ longStay: e.target.checked })}
                        />
                      }
                      label="📆 Estadia Longa"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.discountSettings.allowedCriteria.lowSeason}
                          onChange={(e) => updateDiscountCriteria({ lowSeason: e.target.checked })}
                        />
                      }
                      label="🌊 Baixa Temporada"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.discountSettings.allowedCriteria.lastMinute}
                          onChange={(e) => updateDiscountCriteria({ lastMinute: e.target.checked })}
                        />
                      }
                      label="⏰ Última Hora"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.discountSettings.allowedCriteria.multiProperty}
                          onChange={(e) => updateDiscountCriteria({ multiProperty: e.target.checked })}
                        />
                      }
                      label="🏘️ Múltiplos Imóveis"
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* SAVE BUTTON BOTTOM */}
      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Todas as Alterações'}
        </Button>
      </Box>
    </Box>
  );
}
