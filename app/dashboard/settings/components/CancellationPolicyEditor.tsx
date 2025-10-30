'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  IconButton,
  Stack,
  Grid,
  Divider,
  Alert,
  Chip,
  Tooltip,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Delete,
  Add,
  EventBusy,
  Info,
  Save,
  Cancel as CancelIcon,
  LocalOffer,
  CalendarMonth,
  Percent,
} from '@mui/icons-material';

export interface CancellationRule {
  daysBeforeCheckIn: number;
  refundPercentage: number;
  description?: string;
}

export interface CancellationPolicy {
  enabled: boolean;
  rules: CancellationRule[];
  defaultRefundPercentage: number;
  forceMajeure: boolean;
  customMessage?: string;
  updatedAt?: Date;
}

interface CancellationPolicyEditorProps {
  initialPolicy?: CancellationPolicy;
  onSave: (policy: CancellationPolicy) => Promise<void>;
  loading?: boolean;
}

const defaultPolicy: CancellationPolicy = {
  enabled: true,
  rules: [
    { daysBeforeCheckIn: 7, refundPercentage: 100, description: 'Reembolso total' },
    { daysBeforeCheckIn: 3, refundPercentage: 50, description: 'Reembolso parcial' },
    { daysBeforeCheckIn: 0, refundPercentage: 0, description: 'Sem reembolso' },
  ],
  defaultRefundPercentage: 0,
  forceMajeure: true,
};

export default function CancellationPolicyEditor({
  initialPolicy,
  onSave,
  loading = false,
}: CancellationPolicyEditorProps) {
  const [policy, setPolicy] = useState<CancellationPolicy>(initialPolicy || defaultPolicy);
  const [editing, setEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialPolicy) {
      setPolicy(initialPolicy);
    }
  }, [initialPolicy]);

  const handleAddRule = () => {
    const newRule: CancellationRule = {
      daysBeforeCheckIn: 0,
      refundPercentage: 0,
      description: '',
    };

    setPolicy(prev => ({
      ...prev,
      rules: [...prev.rules, newRule].sort((a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn),
    }));
    setHasChanges(true);
  };

  const handleRemoveRule = (index: number) => {
    setPolicy(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  };

  const handleRuleChange = (index: number, field: keyof CancellationRule, value: any) => {
    setPolicy(prev => {
      const newRules = [...prev.rules];
      newRules[index] = { ...newRules[index], [field]: value };

      // Sort rules by days before check-in (descending)
      newRules.sort((a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn);

      return { ...prev, rules: newRules };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(policy);
    setEditing(false);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setPolicy(initialPolicy || defaultPolicy);
    setEditing(false);
    setHasChanges(false);
  };

  const getRefundColor = (percentage: number) => {
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 50) return '#f59e0b';
    if (percentage > 0) return '#ef4444';
    return '#6b7280';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        mb: 3,
        gap: { xs: 2, sm: 0 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventBusy sx={{ color: 'primary.main', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Políticas de Cancelamento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              Configure as regras de cancelamento e reembolso
            </Typography>
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={policy.enabled}
              onChange={(e) => {
                setPolicy(prev => ({ ...prev, enabled: e.target.checked }));
                setHasChanges(true);
              }}
              disabled={!editing}
            />
          }
          label={
            <Typography variant="body2" fontWeight={500}>
              {policy.enabled ? 'Ativo' : 'Inativo'}
            </Typography>
          }
        />
      </Box>

      {/* Policy Status Alert */}
      {!policy.enabled && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          As políticas de cancelamento estão desativadas. Os clientes não terão regras claras de reembolso.
        </Alert>
      )}

      {/* Rules List */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {policy.rules.map((rule, index) => (
          <Paper
            key={index}
            sx={{
              p: 2,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <Grid container spacing={2} alignItems="center">
              {/* Days Before */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Dias antes do check-in"
                  type="number"
                  value={rule.daysBeforeCheckIn}
                  onChange={(e) => handleRuleChange(index, 'daysBeforeCheckIn', parseInt(e.target.value) || 0)}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonth color="primary" sx={{ fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    inputProps: { min: 0 },
                  }}
                  size="small"
                />
              </Grid>

              {/* Refund Percentage */}
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Reembolso"
                  type="number"
                  value={rule.refundPercentage}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleRuleChange(index, 'refundPercentage', Math.min(100, Math.max(0, value)));
                  }}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Percent color="primary" sx={{ fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip
                          label={`${rule.refundPercentage}%`}
                          size="small"
                          sx={{
                            backgroundColor: `${getRefundColor(rule.refundPercentage)}20`,
                            color: getRefundColor(rule.refundPercentage),
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </InputAdornment>
                    ),
                    inputProps: { min: 0, max: 100 },
                  }}
                  size="small"
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12} sm={editing ? 4 : 5}>
                <TextField
                  fullWidth
                  label="Descrição (opcional)"
                  value={rule.description || ''}
                  onChange={(e) => handleRuleChange(index, 'description', e.target.value)}
                  disabled={!editing}
                  placeholder="Ex: Reembolso total"
                  size="small"
                />
              </Grid>

              {/* Delete Button */}
              {editing && (
                <Grid item xs={12} sm={1}>
                  <Tooltip title="Remover regra">
                    <IconButton
                      onClick={() => handleRemoveRule(index)}
                      disabled={policy.rules.length <= 1}
                      sx={{
                        color: '#ef4444',
                        '&:hover': {
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        },
                        '&:disabled': {
                          color: 'rgba(255, 255, 255, 0.3)',
                        },
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}
            </Grid>

            {/* Rule Preview */}
            {!editing && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="caption" color="text.secondary">
                  {rule.daysBeforeCheckIn > 0
                    ? `Cancelamento até ${rule.daysBeforeCheckIn} ${rule.daysBeforeCheckIn === 1 ? 'dia' : 'dias'} antes: ${rule.refundPercentage}% de reembolso`
                    : `Cancelamento no mesmo dia ou após check-in: ${rule.refundPercentage}% de reembolso`}
                </Typography>
              </Box>
            )}
          </Paper>
        ))}
      </Stack>

      {/* Add Rule Button */}
      {editing && (
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={handleAddRule}
          fullWidth
          sx={{
            mb: 3,
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            },
          }}
        >
          Adicionar Nova Regra
        </Button>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Additional Settings */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Force Majeure */}
        <Grid item xs={12} sm={6}>
          <Box sx={{
            p: 2,
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={policy.forceMajeure}
                  onChange={(e) => {
                    setPolicy(prev => ({ ...prev, forceMajeure: e.target.checked }));
                    setHasChanges(true);
                  }}
                  disabled={!editing}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Força Maior
                  </Typography>
                  <Tooltip title="Permite cancelamento com reembolso total em casos de força maior (catástrofes, pandemias, etc.)">
                    <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Tooltip>
                </Box>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
              Reembolso integral em eventos imprevisíveis
            </Typography>
          </Box>
        </Grid>

        {/* Default Refund */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Reembolso Padrão (%)"
            type="number"
            value={policy.defaultRefundPercentage}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 0;
              setPolicy(prev => ({
                ...prev,
                defaultRefundPercentage: Math.min(100, Math.max(0, value)),
              }));
              setHasChanges(true);
            }}
            disabled={!editing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocalOffer color="primary" />
                </InputAdornment>
              ),
              inputProps: { min: 0, max: 100 },
            }}
            helperText="Aplicado quando nenhuma regra se encaixa"
          />
        </Grid>

        {/* Custom Message */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mensagem Personalizada (opcional)"
            value={policy.customMessage || ''}
            onChange={(e) => {
              setPolicy(prev => ({ ...prev, customMessage: e.target.value }));
              setHasChanges(true);
            }}
            disabled={!editing}
            placeholder="Ex: Cancelamentos devem ser solicitados através do email contato@..."
            helperText="Mensagem adicional sobre políticas de cancelamento"
          />
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          Como funciona:
        </Typography>
        <Typography variant="body2" component="div" sx={{ fontSize: '0.85rem' }}>
          • As regras são aplicadas de acordo com o número de dias antes do check-in<br />
          • O sistema escolhe automaticamente a regra mais adequada<br />
          • Regras ordenadas do maior prazo para o menor prazo<br />
          • Estas políticas são exibidas para clientes e usadas pela Sofia AI
        </Typography>
      </Alert>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        {!editing ? (
          <Button
            variant="contained"
            onClick={() => setEditing(true)}
            disabled={loading}
          >
            Editar Políticas
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={loading || !hasChanges}
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
