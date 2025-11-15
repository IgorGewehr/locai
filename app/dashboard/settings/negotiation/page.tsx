/**
 * NEGOTIATION SETTINGS PAGE
 *
 * Comprehensive AI negotiation configuration
 * Replaces the NegotiationSettingsDialog from properties page
 *
 * @version 2.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  LocalOffer as OfferIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Bolt as BoltIcon,
  TrendingDown as TrendingDownIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';
import type { NegotiationSettings } from '@/lib/types/tenant-settings';
import { DEFAULT_NEGOTIATION_SETTINGS } from '@/lib/types/tenant-settings';

export default function NegotiationSettingsPage() {
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();
  const [settings, setSettings] = useState<NegotiationSettings>(DEFAULT_NEGOTIATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load settings
  useEffect(() => {
    if (!isReady || !tenantId) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getFirebaseToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await fetch('/api/tenant/settings/negotiation', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load negotiation settings');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setSettings(data.data);
        }
      } catch (err) {
        logger.error('[NEGOTIATION-SETTINGS] Failed to load', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Erro ao carregar configurações de negociação');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [tenantId, isReady]);

  // Handle save
  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/tenant/settings/negotiation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      setSuccess(true);
      logger.info('[NEGOTIATION-SETTINGS] Settings saved successfully');

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      logger.error('[NEGOTIATION-SETTINGS] Failed to save', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Apply preset
  const applyPreset = async (preset: 'default' | 'aggressive' | 'conservative' | 'high_season') => {
    try {
      setLoading(true);
      setError(null);

      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/tenant/settings/negotiation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preset }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply preset');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSettings(data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError('Erro ao aplicar preset');
    } finally {
      setLoading(false);
    }
  };

  if (!isReady || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <OfferIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={600}>
            Configurações de Negociação IA
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Configure como Sofia AI negocia preços, descontos e condições de pagamento
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ✅ Configurações salvas com sucesso!
        </Alert>
      )}

      {/* Presets */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            🎯 Presets Rápidos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Aplique configurações pré-definidas para diferentes estratégias
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              onClick={() => applyPreset('default')}
              fullWidth
            >
              Padrão (Equilibrado)
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => applyPreset('aggressive')}
              fullWidth
            >
              Agressivo (Mais Flexível)
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => applyPreset('conservative')}
              fullWidth
            >
              Conservador (Menos Flexível)
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => applyPreset('high_season')}
              fullWidth
            >
              Alta Temporada (Sem Desconto)
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Controle Geral
            </Typography>
            <Tooltip title="Ativa ou desativa completamente o sistema de negociação da IA">
              <InfoIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.allowAINegotiation}
                onChange={(e) =>
                  setSettings({ ...settings, allowAINegotiation: e.target.checked })
                }
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight={500}>
                  Permitir IA Negociar
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {settings.allowAINegotiation
                    ? '✅ Sofia pode oferecer descontos e negociar preços'
                    : '❌ Sofia apresenta apenas preços fixos, sem negociação'}
                </Typography>
              </Box>
            }
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" gutterBottom>
            Desconto Máximo Total
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Limite máximo acumulado de todos os descontos aplicados
          </Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={settings.maxDiscountPercentage}
              onChange={(_, value) =>
                setSettings({ ...settings, maxDiscountPercentage: value as number })
              }
              min={0}
              max={50}
              step={5}
              marks
              valueLabelDisplay="on"
              valueLabelFormat={(value) => `${value}%`}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Payment Method Discounts */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoltIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Descontos por Método de Pagamento
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* PIX Discount */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pixDiscountEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, pixDiscountEnabled: e.target.checked })
                    }
                  />
                }
                label={<Typography fontWeight={500}>Desconto PIX</Typography>}
              />
            </Grid>
            {settings.pixDiscountEnabled && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Percentual de Desconto PIX"
                  value={settings.pixDiscountPercentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pixDiscountPercentage: Number(e.target.value),
                    })
                  }
                  InputProps={{ endAdornment: '%' }}
                  inputProps={{ min: 0, max: 50 }}
                />
              </Grid>
            )}

            {/* Cash Discount */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.cashDiscountEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, cashDiscountEnabled: e.target.checked })
                    }
                  />
                }
                label={<Typography fontWeight={500}>Desconto Dinheiro</Typography>}
              />
            </Grid>
            {settings.cashDiscountEnabled && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Percentual de Desconto Dinheiro"
                  value={settings.cashDiscountPercentage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cashDiscountPercentage: Number(e.target.value),
                    })
                  }
                  InputProps={{ endAdornment: '%' }}
                  inputProps={{ min: 0, max: 50 }}
                />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Installments */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Parcelamento
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.installmentEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, installmentEnabled: e.target.checked })
                    }
                  />
                }
                label={<Typography fontWeight={500}>Permitir Parcelamento</Typography>}
              />
            </Grid>

            {settings.installmentEnabled && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Máximo de Parcelas"
                    value={settings.maxInstallments}
                    onChange={(e) =>
                      setSettings({ ...settings, maxInstallments: Number(e.target.value) })
                    }
                    inputProps={{ min: 1, max: 24 }}
                    helperText="Quantidade máxima de parcelas sem juros"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Valor Mínimo da Parcela"
                    value={settings.minInstallmentValue}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        minInstallmentValue: Number(e.target.value),
                      })
                    }
                    InputProps={{ startAdornment: 'R$' }}
                    inputProps={{ min: 0, step: 10 }}
                    helperText="Valor mínimo aceito por parcela"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Extended Stay Discounts */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDownIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Desconto por Estadia Prolongada
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.extendedStayDiscountEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        extendedStayDiscountEnabled: e.target.checked,
                      })
                    }
                  />
                }
                label={<Typography fontWeight={500}>Ativar Descontos por Estadia Longa</Typography>}
              />
            </Grid>

            {settings.extendedStayDiscountEnabled && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Configure os descontos por duração da estadia. Os descontos são aplicados
                    automaticamente quando a reserva atinge o mínimo de dias.
                  </Typography>
                </Alert>

                <Stack spacing={2}>
                  {settings.extendedStayRules.map((rule, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Mínimo de Dias"
                            value={rule.minDays}
                            onChange={(e) => {
                              const newRules = [...settings.extendedStayRules];
                              newRules[index].minDays = Number(e.target.value);
                              setSettings({ ...settings, extendedStayRules: newRules });
                            }}
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Desconto (%)"
                            value={rule.discountPercentage}
                            onChange={(e) => {
                              const newRules = [...settings.extendedStayRules];
                              newRules[index].discountPercentage = Number(e.target.value);
                              setSettings({ ...settings, extendedStayRules: newRules });
                            }}
                            InputProps={{ endAdornment: '%' }}
                            inputProps={{ min: 0, max: 50 }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Book Now Discount */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BoltIcon color="warning" />
            <Typography variant="h6" fontWeight={600}>
              Desconto por Reserva Imediata
            </Typography>
            <Chip label="Urgência" size="small" color="warning" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.bookNowDiscountEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, bookNowDiscountEnabled: e.target.checked })
                    }
                  />
                }
                label={
                  <Typography fontWeight={500}>
                    Ativar Desconto para "Fechar Agora"
                  </Typography>
                }
              />
            </Grid>

            {settings.bookNowDiscountEnabled && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Percentual de Desconto"
                    value={settings.bookNowDiscountPercentage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bookNowDiscountPercentage: Number(e.target.value),
                      })
                    }
                    InputProps={{ endAdornment: '%' }}
                    inputProps={{ min: 0, max: 20 }}
                    helperText="Desconto oferecido para fechar imediatamente"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Limite de Tempo (horas)"
                    value={settings.bookNowTimeLimit}
                    onChange={(e) =>
                      setSettings({ ...settings, bookNowTimeLimit: Number(e.target.value) })
                    }
                    inputProps={{ min: 1, max: 24 }}
                    helperText="Prazo para confirmar a reserva"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Additional Settings */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            ⚙️ Configurações Adicionais
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allowSuggestAlternatives}
                    onChange={(e) =>
                      setSettings({ ...settings, allowSuggestAlternatives: e.target.checked })
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Sugerir Propriedades Alternativas
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sofia pode sugerir imóveis mais baratos se o cliente achar caro
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.upsellEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, upsellEnabled: e.target.checked })
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Ativar Upselling
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sofia sugere extras (café da manhã, transfer, etc.)
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Observações para a IA"
                value={settings.negotiationNotes || ''}
                onChange={(e) =>
                  setSettings({ ...settings, negotiationNotes: e.target.value })
                }
                placeholder="Ex: Dezembro é alta temporada, evitar descontos acima de 5%"
                helperText="Orientações específicas que Sofia deve seguir ao negociar"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{ minWidth: 200 }}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </Box>
    </Box>
  );
}
