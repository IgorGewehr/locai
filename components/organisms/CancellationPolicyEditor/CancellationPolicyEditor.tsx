/**
 * CANCELLATION POLICY EDITOR
 *
 * Editor for managing cancellation policies with rules
 *
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  IconButton,
  Stack,
  Alert,
  Paper,
  Divider,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
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
}

interface CancellationPolicyEditorProps {
  initialPolicy: CancellationPolicy;
  onSave: (policy: CancellationPolicy) => Promise<void>;
  loading?: boolean;
}

export default function CancellationPolicyEditor({
  initialPolicy,
  onSave,
  loading = false,
}: CancellationPolicyEditorProps) {
  const [policy, setPolicy] = useState<CancellationPolicy>(initialPolicy);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPolicy(initialPolicy);
    setHasChanges(false);
  }, [initialPolicy]);

  const handlePolicyChange = (updates: Partial<CancellationPolicy>) => {
    setPolicy((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleRuleChange = (index: number, updates: Partial<CancellationRule>) => {
    const newRules = [...policy.rules];
    newRules[index] = { ...newRules[index], ...updates };
    handlePolicyChange({ rules: newRules });
  };

  const handleAddRule = () => {
    const newRules = [
      ...policy.rules,
      { daysBeforeCheckIn: 0, refundPercentage: 0, description: '' },
    ];
    handlePolicyChange({ rules: newRules });
  };

  const handleRemoveRule = (index: number) => {
    const newRules = policy.rules.filter((_, i) => i !== index);
    handlePolicyChange({ rules: newRules });
  };

  const handleSave = async () => {
    // Sort rules by days before check-in (descending)
    const sortedRules = [...policy.rules].sort(
      (a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn
    );

    await onSave({
      ...policy,
      rules: sortedRules,
    });

    setHasChanges(false);
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Política de Cancelamento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure as regras de cancelamento e reembolso para suas propriedades
      </Typography>

      {/* Enable/Disable */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={policy.enabled}
              onChange={(e) => handlePolicyChange({ enabled: e.target.checked })}
            />
          }
          label={
            <Box>
              <Typography variant="body1" fontWeight={600}>
                Ativar política de cancelamento
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quando ativada, as regras de reembolso serão aplicadas automaticamente
              </Typography>
            </Box>
          }
        />
      </Paper>

      {/* Rules */}
      {policy.enabled && (
        <>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Regras de Reembolso
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Defina o percentual de reembolso baseado em quantos dias antes do check-in o cancelamento ocorrer
            </Typography>
          </Alert>

          <Stack spacing={2} sx={{ mb: 3 }}>
            {policy.rules.map((rule, index) => (
              <Paper key={index} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <TextField
                    label="Dias antes do check-in"
                    type="number"
                    value={rule.daysBeforeCheckIn}
                    onChange={(e) =>
                      handleRuleChange(index, {
                        daysBeforeCheckIn: parseInt(e.target.value) || 0,
                      })
                    }
                    size="small"
                    sx={{ width: 180 }}
                    inputProps={{ min: 0 }}
                  />

                  <TextField
                    label="% de reembolso"
                    type="number"
                    value={rule.refundPercentage}
                    onChange={(e) =>
                      handleRuleChange(index, {
                        refundPercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    size="small"
                    sx={{ width: 150 }}
                    inputProps={{ min: 0, max: 100 }}
                  />

                  <TextField
                    label="Descrição (opcional)"
                    value={rule.description || ''}
                    onChange={(e) =>
                      handleRuleChange(index, { description: e.target.value })
                    }
                    size="small"
                    fullWidth
                    placeholder="Ex: Reembolso total"
                  />

                  <Tooltip title="Remover regra">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveRule(index)}
                      disabled={policy.rules.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            ))}
          </Stack>

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddRule}
            variant="outlined"
            sx={{ mb: 3 }}
          >
            Adicionar Regra
          </Button>

          <Divider sx={{ my: 3 }} />

          {/* Default Refund */}
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Configurações Adicionais
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Reembolso padrão (%)"
              type="number"
              value={policy.defaultRefundPercentage}
              onChange={(e) =>
                handlePolicyChange({
                  defaultRefundPercentage: parseInt(e.target.value) || 0,
                })
              }
              helperText="Percentual de reembolso quando nenhuma regra se aplica"
              inputProps={{ min: 0, max: 100 }}
              sx={{ maxWidth: 300 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={policy.forceMajeure}
                  onChange={(e) =>
                    handlePolicyChange({ forceMajeure: e.target.checked })
                  }
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    Permitir reembolso total em casos de força maior
                  </Typography>
                  <Tooltip title="Em situações excepcionais (emergências médicas, desastres naturais), o cliente pode receber reembolso total">
                    <InfoIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
              }
            />

            <TextField
              label="Mensagem personalizada (opcional)"
              multiline
              rows={3}
              value={policy.customMessage || ''}
              onChange={(e) => handlePolicyChange({ customMessage: e.target.value })}
              placeholder="Ex: Em caso de cancelamento, entre em contato conosco pelo WhatsApp..."
              helperText="Esta mensagem será exibida junto com a política de cancelamento"
            />
          </Stack>
        </>
      )}

      {/* Save Button */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={!hasChanges || loading}
          startIcon={loading && <CircularProgress size={20} />}
          sx={{ minWidth: 200 }}
        >
          {loading ? 'Salvando...' : 'Salvar Política'}
        </Button>
      </Box>

      {/* Preview */}
      {policy.enabled && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            📋 Preview da Política
          </Typography>
          <Typography variant="body2" component="div">
            {policy.rules
              .sort((a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn)
              .map((rule, index) => (
                <Box key={index} sx={{ mb: 0.5 }}>
                  • Cancelamento {rule.daysBeforeCheckIn === 0 ? 'no dia' : `até ${rule.daysBeforeCheckIn} dias antes`}
                  : {rule.refundPercentage}% de reembolso
                  {rule.description && ` (${rule.description})`}
                </Box>
              ))}
            <Box sx={{ mt: 1, opacity: 0.8 }}>
              • Outros casos: {policy.defaultRefundPercentage}% de reembolso
            </Box>
            {policy.forceMajeure && (
              <Box sx={{ mt: 1, opacity: 0.8 }}>
                ℹ️ Reembolso total em casos de força maior
              </Box>
            )}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
