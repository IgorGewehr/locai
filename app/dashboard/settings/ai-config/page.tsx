'use client';

/**
 * AI CONFIGURATION PAGE
 *
 * Dashboard page for managing AI features and agent behavior
 * Allows tenant users to enable/disable AI specialists dynamically
 *
 * @version 1.0.0
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';

interface AIFeatures {
  payments: boolean;
  contracts: boolean;
  analytics: boolean;
  customReports: boolean;
  autoFollowUp: boolean;
}

interface AgentBehavior {
  sales: {
    allowNegotiation: boolean;
    maxDiscount: number;
    enableDynamicDiscounts: boolean;
    autoApplyPixDiscount: boolean;
  };
  search: {
    maxPropertiesPerSearch: number;
    autoSendPhotos: boolean;
    autoSendMap: boolean;
  };
  booking: {
    requireEmail: boolean;
    requireDocument: boolean;
    autoScheduleKeyPickup: boolean;
  };
  support: {
    allowCancellations: boolean;
    allowModifications: boolean;
    autoTransferThreshold: number;
  };
}

export default function AIConfigPage() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [features, setFeatures] = useState<AIFeatures>({
    payments: false,
    contracts: false,
    analytics: true,
    customReports: false,
    autoFollowUp: true,
  });

  const [behavior, setBehavior] = useState<AgentBehavior>({
    sales: {
      allowNegotiation: true,
      maxDiscount: 25,
      enableDynamicDiscounts: true,
      autoApplyPixDiscount: true,
    },
    search: {
      maxPropertiesPerSearch: 3,
      autoSendPhotos: true,
      autoSendMap: true,
    },
    booking: {
      requireEmail: true,
      requireDocument: false,
      autoScheduleKeyPickup: true,
    },
    support: {
      allowCancellations: true,
      allowModifications: true,
      autoTransferThreshold: 10,
    },
  });

  // Load current config
  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/ai/get-agent-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const data = await response.json();

      if (data.success) {
        setFeatures(data.data.features);
        setBehavior(data.data.agentBehavior);
      } else {
        throw new Error(data.error || 'Failed to load configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/ai/update-tenant-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          features,
          agentBehavior: behavior,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleFeatureToggle = (feature: keyof AIFeatures) => {
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', padding: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🤖 Configuração de IA Sofia
          </Typography>
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
          Configurações salvas com sucesso! As mudanças entrarão em vigor nas próximas conversas.
        </Alert>
      )}

      {/* AI FEATURES SECTION */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🎯 Funcionalidades de IA
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Habilite ou desabilite agentes especializados
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            {/* Payments */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        💳 Agente de Pagamentos
                      </Typography>
                      {features.payments && <Chip label="ATIVO" size="small" color="success" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Sofia pode gerar cobranças, PIX QR Code, enviar lembretes e processar saques automaticamente.
                    </Typography>
                    <Box mt={1}>
                      <Typography variant="caption" color="primary">
                        ✓ AbacatePay integrado
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={features.payments}
                    onChange={() => handleFeatureToggle('payments')}
                  />
                </Box>
              </Card>
            </Grid>

            {/* Contracts */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        📄 Agente de Contratos
                      </Typography>
                      {features.contracts ? (
                        <Chip label="ATIVO" size="small" color="success" />
                      ) : (
                        <Chip label="EM BREVE" size="small" color="default" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Sofia pode criar contratos personalizados, gerenciar assinaturas digitais e enviar automaticamente.
                    </Typography>
                    <Box mt={1}>
                      <Typography variant="caption" color="text.disabled">
                        ⏳ Feature em desenvolvimento
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={features.contracts}
                    onChange={() => handleFeatureToggle('contracts')}
                    disabled // Desabilitado até implementar
                  />
                </Box>
              </Card>
            </Grid>

            {/* Analytics */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        📊 Analytics Avançado
                      </Typography>
                      {features.analytics && <Chip label="ATIVO" size="small" color="success" />}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Tracking de conversões, métricas de engajamento e dashboards analíticos.
                    </Typography>
                  </Box>
                  <Switch
                    checked={features.analytics}
                    onChange={() => handleFeatureToggle('analytics')}
                  />
                </Box>
              </Card>
            </Grid>

          </Grid>

          {/* Info Alert - Negotiation moved to dedicated page */}
          <Alert severity="info" sx={{ mt: 2 }}>
            💰 <strong>Configurações de Negociação:</strong> Todas as configurações de descontos, preços e estratégias de vendas foram movidas para a página dedicada.{' '}
            <Button
              size="small"
              variant="text"
              onClick={() => window.location.href = '/dashboard/settings/negotiation'}
              sx={{ ml: 1 }}
            >
              Acessar Negociação →
            </Button>
          </Alert>
        </CardContent>
      </Card>

      {/* AGENT BEHAVIOR SECTION */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ⚙️ Comportamento dos Agentes
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Configure como cada agente especializado deve funcionar
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Search Agent */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">🔍 Search Agent (Busca de Imóveis)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={3}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Máximo de imóveis por busca: {behavior.search.maxPropertiesPerSearch}
                  </Typography>
                  <Slider
                    value={behavior.search.maxPropertiesPerSearch}
                    onChange={(_, value) =>
                      setBehavior(prev => ({
                        ...prev,
                        search: { ...prev.search, maxPropertiesPerSearch: value as number },
                      }))
                    }
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.search.autoSendPhotos}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          search: { ...prev.search, autoSendPhotos: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Enviar fotos automaticamente"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.search.autoSendMap}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          search: { ...prev.search, autoSendMap: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Enviar mapa automaticamente"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Booking Agent */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">📝 Booking Agent (Reservas)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.booking.requireEmail}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          booking: { ...prev.booking, requireEmail: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Exigir email para todas as reservas"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.booking.requireDocument}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          booking: { ...prev.booking, requireDocument: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Exigir CPF/documento"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.booking.autoScheduleKeyPickup}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          booking: { ...prev.booking, autoScheduleKeyPickup: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Agendar retirada de chaves automaticamente"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Support Agent */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">🤝 Support Agent (Suporte)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.support.allowCancellations}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          support: { ...prev.support, allowCancellations: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Permitir IA processar cancelamentos"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={behavior.support.allowModifications}
                      onChange={(e) =>
                        setBehavior(prev => ({
                          ...prev,
                          support: { ...prev.support, allowModifications: e.target.checked },
                        }))
                      }
                    />
                  }
                  label="Permitir IA processar modificações"
                />

                <Box>
                  <Typography variant="body2" gutterBottom>
                    Auto-transferir para humano após {behavior.support.autoTransferThreshold} mensagens
                  </Typography>
                  <Slider
                    value={behavior.support.autoTransferThreshold}
                    onChange={(_, value) =>
                      setBehavior(prev => ({
                        ...prev,
                        support: { ...prev.support, autoTransferThreshold: value as number },
                      }))
                    }
                    min={1}
                    max={20}
                    marks={[
                      { value: 1, label: '1' },
                      { value: 10, label: '10' },
                      { value: 20, label: '20' },
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
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
