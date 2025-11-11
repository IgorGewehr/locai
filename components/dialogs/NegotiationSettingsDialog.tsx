// components/dialogs/NegotiationSettingsDialog.tsx
// Dialog para configurar regras de negociação da IA

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ExpandMore,
  Info,
  AttachMoney,
  Schedule,
  TrendingUp,
  LocalOffer,
  Psychology,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import type { NegotiationSettings } from '@/lib/types/tenant-settings';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NegotiationSettingsDialog({ open, onClose }: Props) {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NegotiationSettings | null>(null);
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    if (open && tenantId) {
      loadSettings();
    }
  }, [open, tenantId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[NegotiationDialog] Carregando configurações...');

      const response = await fetch('/api/tenant/settings/negotiation');

      console.log('[NegotiationDialog] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('[NegotiationDialog] Data received:', data);

      if (data.success) {
        setSettings(data.data);
        setIsDefault(data.isDefault);
        console.log('[NegotiationDialog] Settings loaded successfully');
      } else {
        const errorMsg = data.error || 'Erro ao carregar configurações';
        setError(errorMsg);
        console.error('[NegotiationDialog] Error in response:', errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Falha ao carregar configurações';
      setError(errorMsg);
      console.error('[NegotiationDialog] Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/tenant/settings/negotiation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setIsDefault(false);
        onClose();
      } else {
        setError(data.error || 'Erro ao salvar configurações');
      }
    } catch (err) {
      setError('Falha ao salvar configurações');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async (preset: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/tenant/settings/negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        setIsDefault(false);
      } else {
        setError(data.error || 'Erro ao aplicar preset');
      }
    } catch (err) {
      setError('Falha ao aplicar preset');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NegotiationSettings>(
    key: K,
    value: NegotiationSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Psychology color="primary" />
          <Typography variant="h6">Configurações de Negociação IA</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Configure como a IA Sofia pode negociar preços e condições
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading && !settings ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button
              size="small"
              onClick={loadSettings}
              sx={{ mt: 1, display: 'block' }}
            >
              Tentar novamente
            </Button>
          </Alert>
        ) : !settings ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <Typography color="text.secondary">
              Nenhuma configuração carregada
            </Typography>
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

        {isDefault && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Você está usando as configurações padrão. Personalize conforme necessário.
          </Alert>
        )}

        {/* Presets rápidos */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Presets Rápidos:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label="Conservador"
              onClick={() => handleApplyPreset('conservative')}
              disabled={saving}
            />
            <Chip
              label="Balanceado"
              onClick={() => handleApplyPreset('default')}
              disabled={saving}
            />
            <Chip
              label="Agressivo"
              onClick={() => handleApplyPreset('aggressive')}
              disabled={saving}
            />
            <Chip
              label="Alta Temporada"
              onClick={() => handleApplyPreset('high_season')}
              disabled={saving}
            />
          </Stack>
        </Box>

        {/* Controle Geral */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography fontWeight="bold">Controle Geral</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowAINegotiation}
                  onChange={(e) => updateSetting('allowAINegotiation', e.target.checked)}
                />
              }
              label="Permitir IA negociar preços"
            />
            <Typography variant="caption" color="text.secondary" display="block" ml={5}>
              Quando desativado, a IA não oferecerá descontos
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Descontos por Pagamento */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <AttachMoney />
              <Typography fontWeight="bold">Descontos por Forma de Pagamento</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pixDiscountEnabled}
                      onChange={(e) => updateSetting('pixDiscountEnabled', e.target.checked)}
                    />
                  }
                  label="Desconto PIX"
                />
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Percentual de desconto (%)"
                  value={settings.pixDiscountPercentage}
                  onChange={(e) =>
                    updateSetting('pixDiscountPercentage', Number(e.target.value))
                  }
                  disabled={!settings.pixDiscountEnabled}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.cashDiscountEnabled}
                      onChange={(e) => updateSetting('cashDiscountEnabled', e.target.checked)}
                    />
                  }
                  label="Desconto Dinheiro"
                />
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Percentual de desconto (%)"
                  value={settings.cashDiscountPercentage}
                  onChange={(e) =>
                    updateSetting('cashDiscountPercentage', Number(e.target.value))
                  }
                  disabled={!settings.cashDiscountEnabled}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Parcelamento */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Schedule />
              <Typography fontWeight="bold">Parcelamento</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.installmentEnabled}
                  onChange={(e) => updateSetting('installmentEnabled', e.target.checked)}
                />
              }
              label="Permitir parcelamento sem juros"
            />
            <Stack spacing={2} mt={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Máximo de parcelas"
                value={settings.maxInstallments}
                onChange={(e) => updateSetting('maxInstallments', Number(e.target.value))}
                disabled={!settings.installmentEnabled}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Valor mínimo por parcela (R$)"
                value={settings.minInstallmentValue}
                onChange={(e) => updateSetting('minInstallmentValue', Number(e.target.value))}
                disabled={!settings.installmentEnabled}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Estadia Prolongada */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUp />
              <Typography fontWeight="bold">Estadia Prolongada</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.extendedStayDiscountEnabled}
                  onChange={(e) =>
                    updateSetting('extendedStayDiscountEnabled', e.target.checked)
                  }
                />
              }
              label="Ativar descontos por dias"
            />
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Regras atuais: {settings.extendedStayRules.length} configuradas
            </Typography>
          </AccordionDetails>
        </Accordion>

        {/* Reserva Imediata */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocalOffer />
              <Typography fontWeight="bold">Desconto por Fechamento Imediato</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.bookNowDiscountEnabled}
                  onChange={(e) => updateSetting('bookNowDiscountEnabled', e.target.checked)}
                />
              }
              label="Ativar desconto 'feche agora'"
            />
            <Stack spacing={2} mt={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Percentual de desconto (%)"
                value={settings.bookNowDiscountPercentage}
                onChange={(e) =>
                  updateSetting('bookNowDiscountPercentage', Number(e.target.value))
                }
                disabled={!settings.bookNowDiscountEnabled}
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Limite de tempo (horas)"
                value={settings.bookNowTimeLimit}
                onChange={(e) => updateSetting('bookNowTimeLimit', Number(e.target.value))}
                disabled={!settings.bookNowDiscountEnabled}
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Limites Gerais */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography fontWeight="bold">Limites e Restrições</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Desconto máximo total (%)"
                value={settings.maxDiscountPercentage}
                onChange={(e) => updateSetting('maxDiscountPercentage', Number(e.target.value))}
                helperText="Limite máximo mesmo combinando vários descontos"
              />
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Preço mínimo após desconto (R$)"
                value={settings.minPriceAfterDiscount}
                onChange={(e) => updateSetting('minPriceAfterDiscount', Number(e.target.value))}
                helperText="0 = sem limite mínimo"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Upselling */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography fontWeight="bold">Upselling e Alternativas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.upsellEnabled}
                    onChange={(e) => updateSetting('upsellEnabled', e.target.checked)}
                  />
                }
                label="Permitir sugestões de upsell"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allowSuggestAlternatives}
                    onChange={(e) => updateSetting('allowSuggestAlternatives', e.target.checked)}
                  />
                }
                label="Sugerir propriedades alternativas"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || loading || !settings}>
          {saving ? <CircularProgress size={24} /> : 'Salvar Configurações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
