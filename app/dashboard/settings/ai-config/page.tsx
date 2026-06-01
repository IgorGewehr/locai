'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  SmartToy as AiIcon,
  Save as SaveIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';

interface AgentSettings {
  tone: 'formal' | 'casual' | 'friendly';
  tagline: string;
  specialInstructions: string;
  customRules: string[];
  autoReplyMessage: string;
}

const DEFAULT_SETTINGS: AgentSettings = {
  tone: 'friendly',
  tagline: '',
  specialInstructions: '',
  customRules: [],
  autoReplyMessage: '',
};

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Profissional e respeitoso' },
  { value: 'casual', label: 'Casual', description: 'Descontraído e próximo' },
  { value: 'friendly', label: 'Amigável', description: 'Caloroso e atencioso' },
] as const;

export default function AIConfigPage() {
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newRule, setNewRule] = useState('');

  // Load settings
  useEffect(() => {
    if (!isReady || !tenantId) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getFirebaseToken();
        if (!token) throw new Error('Authentication token not available');

        const response = await fetch('/api/tenant/settings/agent', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to load AI settings');

        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.data });
        }
      } catch (err) {
        logger.error('[AI-CONFIG] Failed to load', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Erro ao carregar configurações da IA');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [tenantId, isReady]);

  // Save settings
  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const token = await getFirebaseToken();
      if (!token) throw new Error('Authentication token not available');

      const response = await fetch('/api/tenant/settings/agent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save AI settings');

      setSuccess(true);
      logger.info('[AI-CONFIG] Settings saved successfully');
    } catch (err) {
      logger.error('[AI-CONFIG] Failed to save', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Erro ao salvar configurações da IA');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed || settings.customRules.length >= 10) return;
    setSettings((prev) => ({ ...prev, customRules: [...prev.customRules, trimmed] }));
    setNewRule('');
  };

  const handleDeleteRule = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      customRules: prev.customRules.filter((_, i) => i !== index),
    }));
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
          <AiIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={600}>
            Configurações da IA
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Personalize o comportamento e o tom de voz do agente de IA
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tone */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl component="fieldset" fullWidth>
            <FormLabel
              component="legend"
              sx={{
                fontWeight: 600,
                fontSize: '1.25rem',
                mb: 1,
                color: 'text.primary',
                '&.Mui-focused': { color: 'text.primary' },
              }}
            >
              Tom da IA
            </FormLabel>
            <Divider sx={{ mb: 2 }} />
            <RadioGroup
              value={settings.tone}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  tone: e.target.value as AgentSettings['tone'],
                }))
              }
            >
              {TONE_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  value={opt.value}
                  control={<Radio sx={{ '&.Mui-checked': { color: '#dc2626' } }} />}
                  label={
                    <Box>
                      <Typography fontWeight={500}>{opt.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {opt.description}
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: 'flex-start', '& .MuiRadio-root': { mt: 0.5 } }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Tagline */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Sobre o negócio
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <TextField
            fullWidth
            label="Tagline"
            value={settings.tagline}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, tagline: e.target.value }))
            }
            placeholder="Ex: Imobiliária especializada em temporada em Florianópolis"
            inputProps={{ maxLength: 200 }}
            helperText={`${settings.tagline.length}/200`}
          />
        </CardContent>
      </Card>

      {/* Special Instructions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Instruções especiais
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Instruções adicionais"
            value={settings.specialInstructions}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, specialInstructions: e.target.value }))
            }
            placeholder="Instruções adicionais para a IA. Ex: Sempre mencionar que oferecemos transfer do aeroporto..."
            inputProps={{ maxLength: 2000 }}
            helperText={`${settings.specialInstructions.length}/2000`}
          />
        </CardContent>
      </Card>

      {/* Custom Rules */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Regras do negócio
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Nova regra"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRule();
                }
              }}
              disabled={settings.customRules.length >= 10}
              placeholder={
                settings.customRules.length >= 10
                  ? 'Limite de 10 regras atingido'
                  : 'Ex: Check-in a partir das 15h'
              }
            />
            <Button
              variant="contained"
              onClick={handleAddRule}
              disabled={!newRule.trim() || settings.customRules.length >= 10}
              startIcon={<AddIcon />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Adicionar
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {settings.customRules.map((rule, index) => (
              <Chip
                key={index}
                label={rule}
                onDelete={() => handleDeleteRule(index)}
                sx={{
                  bgcolor: 'rgba(220, 38, 38, 0.1)',
                  borderColor: 'rgba(220, 38, 38, 0.3)',
                  border: '1px solid',
                }}
              />
            ))}
            {settings.customRules.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Nenhuma regra adicionada
              </Typography>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {settings.customRules.length}/10 regras
          </Typography>
        </CardContent>
      </Card>

      {/* Auto-reply Message */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Mensagem quando offline
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Mensagem de resposta automática"
            value={settings.autoReplyMessage}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, autoReplyMessage: e.target.value }))
            }
            placeholder="Mensagem enviada quando a IA está pausada..."
            inputProps={{ maxLength: 500 }}
            helperText={`${settings.autoReplyMessage.length}/500`}
          />
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
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(false)} sx={{ width: '100%' }}>
          Configurações da IA salvas com sucesso!
        </Alert>
      </Snackbar>
    </Box>
  );
}
