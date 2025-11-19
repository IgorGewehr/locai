'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  WhatsApp,
  Schedule,
  Message,
  Save,
  Warning,
  CheckCircle,
  NotificationsActive,
  Send,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';

interface AutoBillingConfig {
  enabled: boolean;
  daysBeforeDue: number;
  message: string;
  sendTime: string; // "HH:MM" format
}

export default function CobrancasAutomaticasPage() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const [config, setConfig] = useState<AutoBillingConfig>({
    enabled: false,
    daysBeforeDue: 3,
    message: '',
    sendTime: '09:00',
  });

  // Load configuration
  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/billing/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar configuração');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (err) {
      console.error('Error loading config:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    // Validações
    if (config.enabled && !config.message.trim()) {
      setError('A mensagem de cobrança é obrigatória quando ativo');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/billing/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar configuração');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!tenantId) return;

    setSending(true);
    setError(null);
    setSendResult(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/billing/send-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao enviar lembretes');
      }

      const data = await response.json();
      setSendResult(data.data);
    } catch (err) {
      console.error('Error sending reminders:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar lembretes');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <NotificationsActive sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Cobranças Automáticas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure lembretes automáticos via WhatsApp para recebimentos pendentes
          </Typography>
        </Box>
      </Stack>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)} sx={{ mb: 3 }}>
          Configuração salva com sucesso!
        </Alert>
      )}

      {/* Main Configuration Card */}
      <Card elevation={2}>
        <CardContent>
          <Stack spacing={3}>
            {/* Enable/Disable */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    color="primary"
                    size="medium"
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={600}>
                      {config.enabled ? 'Ativado' : 'Desativado'}
                    </Typography>
                    {config.enabled && (
                      <Chip
                        size="small"
                        label="Ativo"
                        color="success"
                        icon={<CheckCircle fontSize="small" />}
                      />
                    )}
                  </Stack>
                }
              />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 6, display: 'block' }}>
                Quando ativado, lembretes serão enviados automaticamente para recebimentos pendentes
              </Typography>
            </Box>

            <Divider />

            {/* Days Before Due */}
            <FormControl fullWidth disabled={!config.enabled}>
              <InputLabel>Enviar lembrete</InputLabel>
              <Select
                value={config.daysBeforeDue}
                label="Enviar lembrete"
                onChange={(e) => setConfig({ ...config, daysBeforeDue: Number(e.target.value) })}
                startAdornment={<Schedule sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value={1}>1 dia antes do vencimento</MenuItem>
                <MenuItem value={2}>2 dias antes do vencimento</MenuItem>
                <MenuItem value={3}>3 dias antes do vencimento</MenuItem>
                <MenuItem value={5}>5 dias antes do vencimento</MenuItem>
                <MenuItem value={7}>7 dias antes do vencimento</MenuItem>
                <MenuItem value={15}>15 dias antes do vencimento</MenuItem>
              </Select>
            </FormControl>

            {/* Send Time */}
            <FormControl fullWidth disabled={!config.enabled}>
              <TextField
                type="time"
                label="Horário de envio"
                value={config.sendTime}
                onChange={(e) => setConfig({ ...config, sendTime: e.target.value })}
                InputProps={{
                  startAdornment: <Schedule sx={{ mr: 1, color: 'action.active' }} />,
                }}
                helperText="Horário em que os lembretes serão enviados"
              />
            </FormControl>

            <Divider />

            {/* Message Template */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Message color="action" />
                <Typography fontWeight={600}>Mensagem de Cobrança</Typography>
              </Stack>

              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Olá! Este é um lembrete sobre um pagamento pendente.

Por favor, efetue o pagamento para manter tudo em dia.

Qualquer dúvida, estamos à disposição!

Atenciosamente,
Equipe Locai"
                value={config.message}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                disabled={!config.enabled}
                helperText={`${config.message.length}/1000 caracteres`}
                inputProps={{ maxLength: 1000 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'monospace',
                  },
                }}
              />

              {/* Helper Info */}
              <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="text.secondary" component="div">
                  <strong>💡 Dica:</strong> A mensagem será enviada via WhatsApp para o telefone do cliente.
                  <br />
                  <strong>📝 Nota:</strong> Esta é uma mensagem de texto simples - mantenha clara e profissional.
                  <br />
                  <strong>⏰ Envio:</strong> Será enviada automaticamente {config.daysBeforeDue} dia(s) antes do vencimento.
                </Typography>
              </Paper>
            </Box>

            {/* Info Box */}
            {config.enabled && (
              <Alert severity="info" icon={<WhatsApp />}>
                <Typography variant="body2">
                  <strong>Como funciona:</strong>
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  • O sistema verifica diariamente às {config.sendTime} os recebimentos pendentes
                  <br />
                  • Lembretes são enviados {config.daysBeforeDue} dia(s) antes do vencimento
                  <br />
                  • Apenas recebimentos com status "pendente" e telefone cadastrado
                  <br />
                  • Um lembrete por recebimento (não envia duplicados)
                </Typography>
              </Alert>
            )}

            {/* Send Result */}
            {sendResult && (
              <Alert severity={sendResult.sent > 0 ? "success" : "info"} onClose={() => setSendResult(null)}>
                <Typography variant="body2" fontWeight={600}>
                  Resultado do Envio:
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  • Processados: {sendResult.processed}
                  <br />
                  • Enviados: {sendResult.sent}
                  <br />
                  • Ignorados: {sendResult.skipped}
                  <br />
                  • Falhas: {sendResult.failed}
                </Typography>
              </Alert>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={handleSendNow}
                disabled={sending || !config.enabled}
                startIcon={sending ? <CircularProgress size={20} /> : <Send />}
                color="info"
              >
                {sending ? 'Enviando...' : 'Enviar Lembretes Agora'}
              </Button>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={loadConfig}
                  disabled={saving || loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || loading}
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                >
                  {saving ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Statistics (Future) */}
      {config.enabled && (
        <Card elevation={1} sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Estatísticas (em breve)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Em breve você poderá ver estatísticas sobre lembretes enviados, taxa de resposta e efetividade.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
