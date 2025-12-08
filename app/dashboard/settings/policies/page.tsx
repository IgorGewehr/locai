/**
 * POLICIES SETTINGS PAGE
 *
 * Manages cancellation policies, terms and conditions
 * Uses CancellationPolicyEditor component
 *
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  EventBusy as CancellationIcon,
  Description as TermsIcon,
  Security as PrivacyIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { logger } from '@/lib/utils/logger';
import CancellationPolicyEditor, {
  CancellationPolicy,
} from '@/components/organisms/CancellationPolicyEditor';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`policies-tabpanel-${index}`}
      aria-labelledby={`policies-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Policies {
  cancellationPolicy: CancellationPolicy;
  termsAndConditions?: string;
  privacyPolicy?: string;
}

export default function PoliciesPage() {
  const { tenantId, isReady } = useTenant();
  const { getFirebaseToken } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [policies, setPolicies] = useState<Policies | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load policies
  useEffect(() => {
    if (!isReady || !tenantId) return;

    const loadPolicies = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getFirebaseToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        const response = await fetch('/api/tenant/settings/policies', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load policies');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setPolicies(data.data);
        }
      } catch (err) {
        logger.error('[POLICIES] Failed to load', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Erro ao carregar políticas');
      } finally {
        setLoading(false);
      }
    };

    loadPolicies();
  }, [tenantId, isReady]);

  // Handle save cancellation policy
  const handleSaveCancellationPolicy = async (policy: CancellationPolicy) => {
    if (!tenantId || !policies) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updatedPolicies = {
        ...policies,
        cancellationPolicy: policy,
      };

      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/tenant/settings/policies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedPolicies),
      });

      if (!response.ok) {
        throw new Error('Failed to save cancellation policy');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setPolicies(data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }

      logger.info('[POLICIES] Cancellation policy saved successfully');
    } catch (err) {
      logger.error('[POLICIES] Failed to save cancellation policy', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Erro ao salvar política de cancelamento');
    } finally {
      setSaving(false);
    }
  };

  // Handle save terms/privacy
  const handleSaveText = async (field: 'termsAndConditions' | 'privacyPolicy', value: string) => {
    if (!tenantId || !policies) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updatedPolicies = {
        ...policies,
        [field]: value,
      };

      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/tenant/settings/policies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedPolicies),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${field}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setPolicies(data.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }

      logger.info(`[POLICIES] ${field} saved successfully`);
    } catch (err) {
      logger.error(`[POLICIES] Failed to save ${field}`, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(`Erro ao salvar ${field === 'termsAndConditions' ? 'termos' : 'política de privacidade'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isReady || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!policies) {
    return (
      <Box sx={{ py: 8 }}>
        <Alert severity="error">Erro ao carregar políticas</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <GavelIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={600}>
            Políticas e Termos
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Configure políticas de cancelamento, termos de uso e política de privacidade
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
          ✅ Políticas salvas com sucesso!
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<CancellationIcon />}
              iconPosition="start"
              label="Cancelamento"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<TermsIcon />}
              iconPosition="start"
              label="Termos e Condições"
              sx={{ minHeight: 64 }}
            />
            <Tab
              icon={<PrivacyIcon />}
              iconPosition="start"
              label="Política de Privacidade"
              sx={{ minHeight: 64 }}
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Cancellation Policy Tab */}
          <TabPanel value={activeTab} index={0}>
            <CancellationPolicyEditor
              initialPolicy={policies.cancellationPolicy}
              onSave={handleSaveCancellationPolicy}
              loading={saving}
            />
          </TabPanel>

          {/* Terms and Conditions Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Termos e Condições de Uso
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Defina os termos e condições que os clientes devem aceitar ao fazer uma reserva
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={15}
                value={policies.termsAndConditions || ''}
                onChange={(e) =>
                  setPolicies({ ...policies, termsAndConditions: e.target.value })
                }
                placeholder="Digite aqui os termos e condições de uso...&#10;&#10;Exemplo:&#10;1. Ao fazer uma reserva, o cliente concorda com...&#10;2. O pagamento deve ser efetuado em até...&#10;3. É proibido..."
                sx={{ mb: 3 }}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={() =>
                    handleSaveText('termsAndConditions', policies.termsAndConditions || '')
                  }
                  disabled={saving}
                  sx={{ minWidth: 200 }}
                >
                  {saving ? 'Salvando...' : 'Salvar Termos'}
                </Button>
              </Stack>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Dica:</strong> Os termos e condições são apresentados aos clientes
                  durante o processo de reserva e podem ser usados pela Sofia AI para esclarecer
                  dúvidas.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>

          {/* Privacy Policy Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Política de Privacidade
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Explique como os dados pessoais dos clientes são coletados, usados e protegidos
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={15}
                value={policies.privacyPolicy || ''}
                onChange={(e) =>
                  setPolicies({ ...policies, privacyPolicy: e.target.value })
                }
                placeholder="Digite aqui a política de privacidade...&#10;&#10;Exemplo:&#10;1. Coleta de Dados&#10;   - Coletamos nome, email, telefone e CPF...&#10;&#10;2. Uso dos Dados&#10;   - Os dados são utilizados para...&#10;&#10;3. Proteção&#10;   - Utilizamos criptografia e..."
                sx={{ mb: 3 }}
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={() =>
                    handleSaveText('privacyPolicy', policies.privacyPolicy || '')
                  }
                  disabled={saving}
                  sx={{ minWidth: 200 }}
                >
                  {saving ? 'Salvando...' : 'Salvar Política'}
                </Button>
              </Stack>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Importante:</strong> De acordo com a LGPD (Lei Geral de Proteção de
                  Dados), é obrigatório informar aos clientes como seus dados são tratados.
                </Typography>
              </Alert>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          💡 Onde são usadas estas políticas?
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Políticas de Cancelamento:</strong> Exibidas durante a reserva e usadas pela
          Sofia AI para calcular reembolsos
          <br />
          • <strong>Termos e Condições:</strong> Apresentados no checkout e disponíveis no mini-site
          <br />• <strong>Política de Privacidade:</strong> Link disponível em todas as páginas e
          emails enviados
        </Typography>
      </Alert>
    </Box>
  );
}
