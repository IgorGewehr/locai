'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  Alert,
  InputAdornment,
  Divider,
  Chip
} from '@mui/material';
import {
  LocalOffer as DiscountIcon,
  Percent as PercentIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { PropertyDiscountSettings, DEFAULT_DISCOUNT_SETTINGS } from '@/lib/types/property';

interface PropertyDiscountDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: PropertyDiscountSettings) => Promise<void>;
  currentSettings?: PropertyDiscountSettings;
  propertyName?: string;
}

export default function PropertyDiscountDialog({
  open,
  onClose,
  onSave,
  currentSettings,
  propertyName
}: PropertyDiscountDialogProps) {
  const [settings, setSettings] = useState<PropertyDiscountSettings>(
    currentSettings || DEFAULT_DISCOUNT_SETTINGS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    } else {
      setSettings(DEFAULT_DISCOUNT_SETTINGS);
    }
  }, [currentSettings, open]);

  const handleChange = (field: keyof PropertyDiscountSettings, value: number) => {
    // Validar limites (0-100 para percentagens)
    let validValue = value;
    if (field !== 'lastMinuteDaysThreshold') {
      validValue = Math.max(0, Math.min(100, value));
    } else {
      validValue = Math.max(1, Math.min(30, value));
    }

    setSettings(prev => ({
      ...prev,
      [field]: validValue
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await onSave(settings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_DISCOUNT_SETTINGS);
  };

  const getTotalMaxDiscount = () => {
    return Math.max(
      settings.pixDiscountPercentage,
      settings.cashDiscountPercentage,
      settings.cardDiscountPercentage
    ) + settings.weeklyStayDiscountPercentage + settings.negotiationDiscountPercentage + settings.lastMinuteDiscountPercentage;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1.5}>
          <DiscountIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Configurar Descontos
            </Typography>
            {propertyName && (
              <Typography variant="caption" color="text.secondary">
                {propertyName}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          Configure os descontos que a Sofia (IA) pode aplicar durante negociações.
          Todos os valores são em porcentagem (%).
        </Alert>

        {/* Descontos por Método de Pagamento */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
          💳 Descontos por Método de Pagamento
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Descontos aplicados automaticamente de acordo com a forma de pagamento escolhida
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="PIX"
              type="number"
              value={settings.pixDiscountPercentage}
              onChange={(e) => handleChange('pixDiscountPercentage', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
              helperText="Desconto para pagamento via PIX"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Dinheiro"
              type="number"
              value={settings.cashDiscountPercentage}
              onChange={(e) => handleChange('cashDiscountPercentage', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
              helperText="Desconto para pagamento em dinheiro"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Cartão"
              type="number"
              value={settings.cardDiscountPercentage}
              onChange={(e) => handleChange('cardDiscountPercentage', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
              helperText="Desconto para pagamento no cartão"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Desconto por Estadia Prolongada */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          📅 Desconto por Estadia Prolongada
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Desconto automático para estadias de 7 dias ou mais
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Desconto Semanal"
              type="number"
              value={settings.weeklyStayDiscountPercentage}
              onChange={(e) => handleChange('weeklyStayDiscountPercentage', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
              helperText="Desconto para reservas de 7+ noites"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Desconto para Negociação */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          🤝 Desconto para Negociação
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Margem que a Sofia pode usar em negociações com clientes difíceis
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Margem de Negociação"
              type="number"
              value={settings.negotiationDiscountPercentage}
              onChange={(e) => handleChange('negotiationDiscountPercentage', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
              helperText="Desconto máximo para fechar negócio"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Desconto de Última Hora */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          ⚡ Desconto de Última Hora
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Desconto para datas próximas que provavelmente não seriam reservadas
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Desconto Última Hora"
              type="number"
              value={settings.lastMinuteDiscountPercentage}
              onChange={(e) => handleChange('lastMinuteDiscountPercentage', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end"><PercentIcon fontSize="small" /></InputAdornment>
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
              helperText="Desconto para check-ins próximos"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Dias de Antecedência"
              type="number"
              value={settings.lastMinuteDaysThreshold}
              onChange={(e) => handleChange('lastMinuteDaysThreshold', Number(e.target.value))}
              InputProps={{
                endAdornment: <InputAdornment position="end">dias</InputAdornment>
              }}
              inputProps={{ min: 1, max: 30, step: 1 }}
              helperText="Aplicar se check-in em até X dias"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Resumo */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            📊 Resumo de Descontos
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            {settings.pixDiscountPercentage > 0 && (
              <Chip
                size="small"
                label={`PIX: ${settings.pixDiscountPercentage}%`}
                color="primary"
                variant="outlined"
              />
            )}
            {settings.cashDiscountPercentage > 0 && (
              <Chip
                size="small"
                label={`Dinheiro: ${settings.cashDiscountPercentage}%`}
                color="primary"
                variant="outlined"
              />
            )}
            {settings.cardDiscountPercentage > 0 && (
              <Chip
                size="small"
                label={`Cartão: ${settings.cardDiscountPercentage}%`}
                color="primary"
                variant="outlined"
              />
            )}
            {settings.weeklyStayDiscountPercentage > 0 && (
              <Chip
                size="small"
                label={`Semanal: ${settings.weeklyStayDiscountPercentage}%`}
                color="success"
                variant="outlined"
              />
            )}
            {settings.negotiationDiscountPercentage > 0 && (
              <Chip
                size="small"
                label={`Negociação: ${settings.negotiationDiscountPercentage}%`}
                color="warning"
                variant="outlined"
              />
            )}
            {settings.lastMinuteDiscountPercentage > 0 && (
              <Chip
                size="small"
                label={`Última Hora: ${settings.lastMinuteDiscountPercentage}%`}
                color="error"
                variant="outlined"
              />
            )}
            {getTotalMaxDiscount() === 0 && (
              <Typography variant="caption" color="text.secondary">
                Nenhum desconto configurado
              </Typography>
            )}
          </Box>
          {getTotalMaxDiscount() > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Desconto máximo acumulável: <strong>{getTotalMaxDiscount()}%</strong>
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={handleReset} color="inherit">
          Resetar
        </Button>
        <Box flex={1} />
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={<DiscountIcon />}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
