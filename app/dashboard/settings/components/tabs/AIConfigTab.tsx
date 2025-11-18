'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Paper,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  SmartToy,
  ExpandMore,
  Save,
  Percent,
  Payment,
  CalendarToday,
  TrendingUp,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface NegotiationConfig {
  allowAINegotiation: boolean;
  pixDiscountEnabled: boolean;
  pixDiscountPercentage: number;
  cashDiscountEnabled: boolean;
  cashDiscountPercentage: number;
  installmentEnabled: boolean;
  maxInstallments: number;
  minInstallmentValue: number;
  extendedStayDiscountEnabled: boolean;
  extendedStayRules: Array<{ minDays: number; discountPercentage: number }>;
  bookNowDiscountEnabled: boolean;
  bookNowDiscountPercentage: number;
  bookNowTimeLimit: number;
  earlyBookingDiscountEnabled: boolean;
  earlyBookingRules: Array<{ daysInAdvance: number; discountPercentage: number }>;
  lastMinuteDiscountEnabled: boolean;
  lastMinuteRules: Array<{ daysBeforeCheckIn: number; discountPercentage: number }>;
  maxDiscountPercentage: number;
}

export default function AIConfigTab() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoResponse, setAutoResponse] = useState(true);
  const [config, setConfig] = useState<NegotiationConfig>({
    allowAINegotiation: true,
    pixDiscountEnabled: true,
    pixDiscountPercentage: 10,
    cashDiscountEnabled: true,
    cashDiscountPercentage: 8,
    installmentEnabled: true,
    maxInstallments: 10,
    minInstallmentValue: 100,
    extendedStayDiscountEnabled: true,
    extendedStayRules: [
      { minDays: 7, discountPercentage: 15 },
      { minDays: 14, discountPercentage: 20 },
      { minDays: 30, discountPercentage: 25 },
    ],
    bookNowDiscountEnabled: true,
    bookNowDiscountPercentage: 5,
    bookNowTimeLimit: 2,
    earlyBookingDiscountEnabled: true,
    earlyBookingRules: [
      { daysInAdvance: 30, discountPercentage: 10 },
      { daysInAdvance: 60, discountPercentage: 15 },
    ],
    lastMinuteDiscountEnabled: true,
    lastMinuteRules: [
      { daysBeforeCheckIn: 3, discountPercentage: 20 },
      { daysBeforeCheckIn: 7, discountPercentage: 15 },
    ],
    maxDiscountPercentage: 30,
  });

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/ai/functions/get-tenant-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // AI Config
          if (data.data.aiConfig) {
            setAiEnabled(data.data.aiConfig.enabled !== false);
            setAutoResponse(data.data.aiConfig.autoResponse !== false);
          }

          // Negotiation Config
          if (data.data.negotiation) {
            setConfig(data.data.negotiation);
          }
        }
      } else {
        throw new Error('Erro ao carregar configurações');
      }
    } catch (err) {
      console.error('Error loading config:', err);
      setError('Erro ao carregar configurações de negociação');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/ai/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          aiConfig: {
            enabled: aiEnabled,
            autoResponse: autoResponse,
          },
          negotiation: config,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Configurações salvas com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Erro ao salvar configurações');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* AI Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SmartToy sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Agente de IA
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Habilitar Agente de IA"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              A IA responderá automaticamente às mensagens dos clientes
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoResponse}
                  onChange={(e) => setAutoResponse(e.target.checked)}
                  color="primary"
                  disabled={!aiEnabled}
                />
              }
              label="Resposta Automática"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              A IA responde imediatamente sem esperar aprovação manual
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Negotiation Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Configurações de Negociação
            </Typography>
          </Box>
          <Chip
            label={config.allowAINegotiation ? 'Ativado' : 'Desativado'}
            color={config.allowAINegotiation ? 'success' : 'default'}
            size="small"
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={config.allowAINegotiation}
              onChange={(e) => setConfig({ ...config, allowAINegotiation: e.target.checked })}
              color="primary"
            />
          }
          label="Permitir IA negociar preços e descontos"
          sx={{ mb: 3 }}
        />

        <Divider sx={{ my: 3 }} />

        {/* Payment Discounts */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Payment />
              <Typography fontWeight={600}>Descontos por Forma de Pagamento</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2.5}>
              {/* PIX Discount */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.pixDiscountEnabled}
                      onChange={(e) => setConfig({ ...config, pixDiscountEnabled: e.target.checked })}
                    />
                  }
                  label="Desconto PIX"
                />
              </Grid>
              {config.pixDiscountEnabled && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Desconto PIX (%)"
                    value={config.pixDiscountPercentage}
                    onChange={(e) => setConfig({ ...config, pixDiscountPercentage: Number(e.target.value) })}
                    InputProps={{ endAdornment: <Percent fontSize="small" /> }}
                  />
                </Grid>
              )}

              {/* Cash Discount */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.cashDiscountEnabled}
                      onChange={(e) => setConfig({ ...config, cashDiscountEnabled: e.target.checked })}
                    />
                  }
                  label="Desconto Dinheiro"
                />
              </Grid>
              {config.cashDiscountEnabled && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Desconto Dinheiro (%)"
                    value={config.cashDiscountPercentage}
                    onChange={(e) => setConfig({ ...config, cashDiscountPercentage: Number(e.target.value) })}
                    InputProps={{ endAdornment: <Percent fontSize="small" /> }}
                  />
                </Grid>
              )}

              {/* Installments */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.installmentEnabled}
                      onChange={(e) => setConfig({ ...config, installmentEnabled: e.target.checked })}
                    />
                  }
                  label="Parcelamento"
                />
              </Grid>
              {config.installmentEnabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Máximo de Parcelas"
                      value={config.maxInstallments}
                      onChange={(e) => setConfig({ ...config, maxInstallments: Number(e.target.value) })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Valor Mínimo da Parcela (R$)"
                      value={config.minInstallmentValue}
                      onChange={(e) => setConfig({ ...config, minInstallmentValue: Number(e.target.value) })}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Time-based Discounts */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday />
              <Typography fontWeight={600}>Descontos por Tempo</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2.5}>
              {/* Book Now */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.bookNowDiscountEnabled}
                      onChange={(e) => setConfig({ ...config, bookNowDiscountEnabled: e.target.checked })}
                    />
                  }
                  label="Desconto 'Reserve Agora'"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Cliente que reserva imediatamente durante a conversa
                </Typography>
              </Grid>
              {config.bookNowDiscountEnabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Desconto (%)"
                      value={config.bookNowDiscountPercentage}
                      onChange={(e) => setConfig({ ...config, bookNowDiscountPercentage: Number(e.target.value) })}
                      InputProps={{ endAdornment: <Percent fontSize="small" /> }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Tempo Limite (horas)"
                      value={config.bookNowTimeLimit}
                      onChange={(e) => setConfig({ ...config, bookNowTimeLimit: Number(e.target.value) })}
                    />
                  </Grid>
                </>
              )}

              {/* Extended Stay */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.extendedStayDiscountEnabled}
                      onChange={(e) => setConfig({ ...config, extendedStayDiscountEnabled: e.target.checked })}
                    />
                  }
                  label="Desconto Estadia Prolongada"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Descontos progressivos para estadias longas (7, 14, 30+ dias)
                </Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Max Discount */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Desconto Máximo Permitido
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={config.maxDiscountPercentage}
            onChange={(e) => setConfig({ ...config, maxDiscountPercentage: Number(e.target.value) })}
            InputProps={{ endAdornment: <Percent fontSize="small" /> }}
            helperText="Limite máximo de desconto que a IA pode oferecer"
          />
        </Box>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </Box>
    </Box>
  );
}
