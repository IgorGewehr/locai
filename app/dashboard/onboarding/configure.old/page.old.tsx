'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  InputAdornment,
  Chip,
  Alert,
  CircularProgress,
  Fade,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Business,
  Phone,
  Email,
  Language,
  LocationOn,
  SmartToy,
  Percent,
  Edit,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Close,
  Info,
  Upload,
  Celebration,
  Settings,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthProvider';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import type { AIConfig } from '@/lib/types/ai-config';
import { DEFAULT_AI_CONFIG } from '@/lib/types/ai-config';

interface CompanyInfo {
  name: string;
  phone: string;
  email: string;
  website: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  logo?: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: '',
  phone: '',
  email: '',
  website: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
  },
};

export default function ConfigureSystemPage() {
  const router = useRouter();
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();
  const { completeStep } = useOnboarding();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Company Info
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);
  const [companyInfoChanged, setCompanyInfoChanged] = useState(false);

  // AI Config
  const [aiConfig, setAIConfig] = useState<AIConfig | null>(null);
  const [aiConfigChanged, setAIConfigChanged] = useState(false);

  const steps = [
    {
      label: 'Informações da Empresa',
      description: 'Configure dados básicos da sua imobiliária',
      optional: true,
    },
    {
      label: 'Agente Sofia (IA)',
      description: 'Personalize a assistente virtual',
      optional: true,
    },
    {
      label: 'Negociação e Descontos',
      description: 'Defina limites e critérios',
      optional: true,
    },
  ];

  useEffect(() => {
    loadAllData();
  }, [tenantId]);

  const loadAllData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // Load company info
      const companyRef = doc(db, 'tenants', tenantId, 'settings', 'companyInfo');
      const companySnap = await getDoc(companyRef);
      if (companySnap.exists()) {
        setCompanyInfo(companySnap.data() as CompanyInfo);
      }

      // Load AI config with authentication
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Token de autenticação não disponível');
      }

      const configResponse = await fetch('/api/ai/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const configResult = await configResponse.json();
      if (configResult.success) {
        setAIConfig(configResult.data);
      }
    } catch (error) {
      logger.error('Failed to load configuration data', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanyInfo = async () => {
    if (!tenantId) return false;

    try {
      setError(null);
      const infoRef = doc(db, 'tenants', tenantId, 'settings', 'companyInfo');
      await setDoc(infoRef, companyInfo);
      setCompanyInfoChanged(false);
      setSuccessMessage('Informações da empresa salvas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
      return true;
    } catch (error) {
      logger.error('Failed to save company info', error as Error);
      setError('Erro ao salvar informações da empresa. Tente novamente.');
      return false;
    }
  };

  const handleSaveAIConfig = async () => {
    if (!aiConfig) return false;

    try {
      setError(null);

      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Token de autenticação não disponível');
      }

      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(aiConfig),
      });

      const result = await response.json();
      if (result.success) {
        setAIConfig(result.data);
        setAIConfigChanged(false);
        setSuccessMessage('Configuração da IA salva com sucesso!');
        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      } else {
        setError(result.error || 'Erro ao salvar configuração da IA');
        return false;
      }
    } catch (error) {
      logger.error('Failed to save AI config', error as Error);
      setError('Erro ao salvar configuração da IA. Tente novamente.');
      return false;
    }
  };

  const handleNext = async () => {
    setSaving(true);
    setError(null);

    try {
      // Save current step data
      if (activeStep === 0 && companyInfoChanged) {
        const saved = await handleSaveCompanyInfo();
        if (!saved) {
          setSaving(false);
          return; // Don't proceed if save failed
        }
      } else if ((activeStep === 1 || activeStep === 2) && aiConfigChanged) {
        const saved = await handleSaveAIConfig();
        if (!saved) {
          setSaving(false);
          return; // Don't proceed if save failed
        }
      }

      // Move to next step
      if (activeStep < steps.length - 1) {
        setActiveStep((prev) => prev + 1);
      } else {
        // Completed all steps
        await handleComplete();
      }
    } catch (error) {
      logger.error('Error in handleNext', error as Error);
      setError('Erro ao avançar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    setSaving(true);

    try {
      // Save any pending changes
      if (companyInfoChanged) await handleSaveCompanyInfo();
      if (aiConfigChanged) await handleSaveAIConfig();

      // Mark onboarding step as complete
      await completeStep('configure_system');

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      logger.error('Failed to complete configuration', error as Error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAll = async () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1200, margin: '0 auto' }}>
      {/* Success/Error Messages */}
      {successMessage && (
        <Fade in={true}>
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ mb: 3 }}
          >
            {successMessage}
          </Alert>
        </Fade>
      )}

      {error && (
        <Fade in={true}>
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Settings sx={{ color: 'white', fontSize: 40 }} />
        </Box>

        <Typography variant="h4" fontWeight={700} gutterBottom>
          Configure Seu Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Personalize a Locai para o seu negócio. Você pode pular qualquer etapa e configurar depois.
        </Typography>

        <Button
          variant="text"
          size="small"
          onClick={handleSkipAll}
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          Pular Tudo e Ir para o Dashboard
        </Button>
      </Box>

      {/* Stepper */}
      <Card
        sx={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* STEP 1: Company Info */}
            <Step>
              <StepLabel
                optional={
                  <Chip label="Opcional" size="small" color="warning" sx={{ mt: 0.5 }} />
                }
              >
                <Typography variant="h6" fontWeight={600}>
                  {steps[0].label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {steps[0].description}
                </Typography>

                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome da Empresa"
                      value={companyInfo.name}
                      onChange={(e) => {
                        setCompanyInfo({ ...companyInfo, name: e.target.value });
                        setCompanyInfoChanged(true);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Telefone Principal"
                      value={companyInfo.phone}
                      onChange={(e) => {
                        setCompanyInfo({ ...companyInfo, phone: e.target.value });
                        setCompanyInfoChanged(true);
                      }}
                      placeholder="(11) 99999-9999"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => {
                        setCompanyInfo({ ...companyInfo, email: e.target.value });
                        setCompanyInfoChanged(true);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Website (opcional)"
                      value={companyInfo.website}
                      onChange={(e) => {
                        setCompanyInfo({ ...companyInfo, website: e.target.value });
                        setCompanyInfoChanged(true);
                      }}
                      placeholder="https://www.exemplo.com.br"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Language color="primary" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Descrição (opcional)"
                      value={companyInfo.description || ''}
                      onChange={(e) => {
                        setCompanyInfo({ ...companyInfo, description: e.target.value });
                        setCompanyInfoChanged(true);
                      }}
                      placeholder="Breve descrição da sua empresa..."
                      helperText="Essa descrição será usada pela Sofia ao apresentar sua empresa"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                    endIcon={<ArrowForward />}
                  >
                    {saving ? 'Salvando...' : 'Próximo'}
                  </Button>
                  <Button onClick={handleSkip} disabled={saving}>
                    Pular
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* STEP 2: Sofia IA */}
            <Step>
              <StepLabel
                optional={
                  <Chip label="Opcional" size="small" color="warning" sx={{ mt: 0.5 }} />
                }
              >
                <Typography variant="h6" fontWeight={600}>
                  {steps[1].label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {steps[1].description}
                </Typography>

                {aiConfig && (
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={aiConfig.enabled}
                            onChange={(e) => {
                              setAIConfig({ ...aiConfig, enabled: e.target.checked });
                              setAIConfigChanged(true);
                            }}
                            color="success"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              Agente Sofia Habilitado
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Ativa a resposta automática via IA
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nome da Empresa para a Sofia"
                        value={aiConfig.customPrompts.companyName || ''}
                        onChange={(e) => {
                          setAIConfig({
                            ...aiConfig,
                            customPrompts: {
                              ...aiConfig.customPrompts,
                              companyName: e.target.value,
                            },
                          });
                          setAIConfigChanged(true);
                        }}
                        helperText="Como a Sofia deve se referir à sua empresa"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tom de Comunicação</InputLabel>
                        <Select
                          value={aiConfig.customPrompts.tone || 'friendly'}
                          onChange={(e) => {
                            setAIConfig({
                              ...aiConfig,
                              customPrompts: {
                                ...aiConfig.customPrompts,
                                tone: e.target.value as 'formal' | 'casual' | 'friendly',
                              },
                            });
                            setAIConfigChanged(true);
                          }}
                          label="Tom de Comunicação"
                        >
                          <MenuItem value="formal">Formal</MenuItem>
                          <MenuItem value="friendly">Amigável</MenuItem>
                          <MenuItem value="casual">Casual</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Mensagem de Boas-Vindas"
                        value={aiConfig.customPrompts.welcome || ''}
                        onChange={(e) => {
                          setAIConfig({
                            ...aiConfig,
                            customPrompts: {
                              ...aiConfig.customPrompts,
                              welcome: e.target.value,
                            },
                          });
                          setAIConfigChanged(true);
                        }}
                        placeholder="Ex: Olá! Sou a Sofia, assistente virtual da [Sua Empresa]..."
                        helperText="Primeira mensagem que novos clientes recebem (máx. 500 caracteres)"
                        inputProps={{ maxLength: 500 }}
                      />
                    </Grid>
                  </Grid>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                    endIcon={<ArrowForward />}
                  >
                    {saving ? 'Salvando...' : 'Próximo'}
                  </Button>
                  <Button onClick={handleSkip} disabled={saving}>
                    Pular
                  </Button>
                  <Button onClick={handleBack} disabled={saving}>
                    Voltar
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* STEP 3: Negociação */}
            <Step>
              <StepLabel
                optional={
                  <Chip label="Opcional" size="small" color="warning" sx={{ mt: 0.5 }} />
                }
              >
                <Typography variant="h6" fontWeight={600}>
                  {steps[2].label}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {steps[2].description}
                </Typography>

                {aiConfig && (
                  <Grid container spacing={2.5}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={aiConfig.discountSettings.enabled}
                            onChange={(e) => {
                              setAIConfig({
                                ...aiConfig,
                                discountSettings: {
                                  ...aiConfig.discountSettings,
                                  enabled: e.target.checked,
                                },
                              });
                              setAIConfigChanged(true);
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              Permitir Descontos Dinâmicos
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Sofia pode oferecer descontos automaticamente
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Desconto Máximo (%)"
                        value={aiConfig.discountSettings.maxPercentage}
                        onChange={(e) => {
                          const newMax = Number(e.target.value);
                          const currentThreshold = aiConfig.discountSettings.approvalThreshold;

                          setAIConfig({
                            ...aiConfig,
                            discountSettings: {
                              ...aiConfig.discountSettings,
                              maxPercentage: newMax,
                              // Auto-adjust threshold if it exceeds max
                              approvalThreshold: currentThreshold > newMax ? newMax : currentThreshold,
                            },
                          });
                          setAIConfigChanged(true);
                        }}
                        disabled={!aiConfig.discountSettings.enabled}
                        inputProps={{ min: 0, max: 100, step: 1 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Percent />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Máximo que a Sofia pode oferecer"
                        error={aiConfig.discountSettings.maxPercentage < aiConfig.discountSettings.approvalThreshold}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Limite para Aprovação Manual (%)"
                        value={aiConfig.discountSettings.approvalThreshold}
                        onChange={(e) => {
                          const newThreshold = Number(e.target.value);
                          setAIConfig({
                            ...aiConfig,
                            discountSettings: {
                              ...aiConfig.discountSettings,
                              approvalThreshold: newThreshold,
                            },
                          });
                          setAIConfigChanged(true);
                        }}
                        disabled={!aiConfig.discountSettings.enabled}
                        inputProps={{
                          min: 0,
                          max: aiConfig.discountSettings.maxPercentage,
                          step: 1
                        }}
                        helperText={
                          aiConfig.discountSettings.approvalThreshold > aiConfig.discountSettings.maxPercentage
                            ? "Não pode ser maior que o desconto máximo"
                            : "Acima deste valor, você precisa aprovar"
                        }
                        error={aiConfig.discountSettings.approvalThreshold > aiConfig.discountSettings.maxPercentage}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                        Critérios Permitidos
                      </Typography>
                      <Grid container spacing={1.5}>
                        {Object.entries({
                          earlyBooking: 'Reserva Antecipada',
                          longStay: 'Estadia Longa',
                          lowSeason: 'Baixa Temporada',
                          lastMinute: 'Última Hora',
                          multiProperty: 'Múltiplos Imóveis',
                        }).map(([key, label]) => (
                          <Grid item xs={12} sm={6} key={key}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={
                                    aiConfig.discountSettings.allowedCriteria[
                                      key as keyof typeof aiConfig.discountSettings.allowedCriteria
                                    ]
                                  }
                                  onChange={(e) => {
                                    setAIConfig({
                                      ...aiConfig,
                                      discountSettings: {
                                        ...aiConfig.discountSettings,
                                        allowedCriteria: {
                                          ...aiConfig.discountSettings.allowedCriteria,
                                          [key]: e.target.checked,
                                        },
                                      },
                                    });
                                    setAIConfigChanged(true);
                                  }}
                                  disabled={!aiConfig.discountSettings.enabled}
                                  size="small"
                                />
                              }
                              label={label}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleComplete}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <Celebration />}
                  >
                    {saving ? 'Finalizando...' : 'Concluir Configuração'}
                  </Button>
                  <Button onClick={handleSkip} disabled={saving}>
                    Pular
                  </Button>
                  <Button onClick={handleBack} disabled={saving}>
                    Voltar
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>

      {/* Help Box */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Alert severity="info" sx={{ display: 'inline-flex', textAlign: 'left' }}>
          <Typography variant="body2">
            💡 <strong>Dica:</strong> Você pode pular qualquer etapa e configurar depois em{' '}
            <strong>Configurações</strong>
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
}
