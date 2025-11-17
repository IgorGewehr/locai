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
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  LinearProgress,
  Skeleton,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  SmartToy,
  ExpandMore,
  Save,
  RestartAlt,
  Info,
  Check,
  Close,
  Search,
  EventAvailable,
  TrendingUp,
  SupportAgent,
  Payment,
  Percent,
  Edit,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import type { AIConfig } from '@/lib/types/ai-config';
import { logger } from '@/lib/utils/logger';

interface Props {
  setGlobalError: (error: string | null) => void;
  setGlobalSuccess: (success: string | null) => void;
}

export default function AIConfigTab({ setGlobalError, setGlobalSuccess }: Props) {
  const { tenantId } = useTenant();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<AIConfig | null>(null);

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  const loadConfig = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai/config');
      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setOriginalConfig(result.data);
        setHasChanges(false);
      } else {
        throw new Error(result.error || 'Falha ao carregar configuração');
      }
    } catch (error) {
      logger.error('Failed to load AI config', { error });
      setGlobalError('Erro ao carregar configurações da IA');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (updates: Partial<AIConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setOriginalConfig(result.data);
        setHasChanges(false);
        setGlobalSuccess('Configurações da IA salvas com sucesso!');
      } else {
        throw new Error(result.error || 'Falha ao salvar');
      }
    } catch (error) {
      logger.error('Failed to save AI config', { error });
      setGlobalError('Erro ao salvar configurações da IA');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Deseja realmente resetar todas as configurações para os valores padrão?')) return;

    setSaving(true);
    try {
      const response = await fetch('/api/ai/config', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setOriginalConfig(result.data);
        setHasChanges(false);
        setGlobalSuccess('Configurações resetadas para valores padrão!');
      } else {
        throw new Error(result.error || 'Falha ao resetar');
      }
    } catch (error) {
      logger.error('Failed to reset AI config', { error });
      setGlobalError('Erro ao resetar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!originalConfig) return;
    setConfig(originalConfig);
    setHasChanges(false);
  };

  const agentIcons = {
    search: <Search />,
    booking: <EventAvailable />,
    sales: <TrendingUp />,
    support: <SupportAgent />,
    payments: <Payment />,
  };

  const agentDescriptions = {
    search: 'Busca e apresentação de imóveis, envio de fotos e mapas',
    booking: 'Criação, modificação e cancelamento de reservas',
    sales: 'Negociação, descontos e acompanhamento de pipeline',
    support: 'Políticas, agendamento de visitas e suporte geral',
    payments: 'Cobranças, recebimento de pagamentos (em breve)',
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (!config) {
    return (
      <Alert severity="error">
        Erro ao carregar configurações. Por favor, recarregue a página.
      </Alert>
    );
  }

  const activeAgentsCount = Object.values(config.agentPermissions).filter(Boolean).length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Configuração da Sofia (Agente IA)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Personalize o comportamento do agente de IA, permissões e limites de negociação
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {hasChanges && (
              <Chip
                label="Alterações não salvas"
                color="warning"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        {/* Quick Status Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                background: config.enabled
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${
                  config.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                }`,
              }}
            >
              <CardContent sx={{ py: 2, px: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status do Agente
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {config.enabled ? 'Ativo' : 'Desativado'}
                    </Typography>
                  </Box>
                  {config.enabled ? (
                    <Check sx={{ color: '#22c55e', fontSize: 32 }} />
                  ) : (
                    <Close sx={{ color: '#ef4444', fontSize: 32 }} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <CardContent sx={{ py: 2, px: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Agentes Ativos
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {activeAgentsCount}/5
                    </Typography>
                  </Box>
                  <SmartToy sx={{ color: '#3b82f6', fontSize: 32 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card
              sx={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <CardContent sx={{ py: 2, px: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Desconto Máximo
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {config.discountSettings.maxPercentage}%
                    </Typography>
                  </Box>
                  <Percent sx={{ color: '#a855f7', fontSize: 32 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Configurações Gerais */}
      <Accordion
        defaultExpanded
        sx={{
          mb: 2,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Configurações Gerais
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={(e) => handleUpdate({ enabled: e.target.checked })}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Agente Habilitado
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ativa/desativa a Sofia completamente
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.autoResponse}
                    onChange={(e) => handleUpdate({ autoResponse: e.target.checked })}
                    disabled={!config.enabled}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Resposta Automática
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Responde mensagens automaticamente
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.businessHoursOnly}
                    onChange={(e) => handleUpdate({ businessHoursOnly: e.target.checked })}
                    disabled={!config.enabled}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Apenas Horário Comercial
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Responde só em horário de trabalho
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Agentes Especializados */}
      <Accordion
        defaultExpanded
        sx={{
          mb: 2,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Agentes Especializados
            </Typography>
            <Chip
              size="small"
              label={`${activeAgentsCount}/5 ativos`}
              color="primary"
              sx={{ ml: 1 }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 3 }}>
            Habilite ou desabilite agentes especializados. Quando desabilitado, a Sofia não oferecerá
            essas funcionalidades nas conversas.
          </Alert>

          <Grid container spacing={2}>
            {(Object.keys(config.agentPermissions) as Array<keyof typeof config.agentPermissions>).map(
              (agentKey) => (
                <Grid item xs={12} md={6} key={agentKey}>
                  <Card
                    sx={{
                      background: config.agentPermissions[agentKey]
                        ? 'rgba(34, 197, 94, 0.05)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${
                        config.agentPermissions[agentKey]
                          ? 'rgba(34, 197, 94, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)'
                      }`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: config.agentPermissions[agentKey]
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {agentIcons[agentKey]}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={config.agentPermissions[agentKey]}
                                onChange={(e) =>
                                  handleUpdate({
                                    agentPermissions: {
                                      ...config.agentPermissions,
                                      [agentKey]: e.target.checked,
                                    },
                                  })
                                }
                                disabled={!config.enabled}
                              />
                            }
                            label={
                              <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                                {agentKey === 'search' && 'Agente de Busca'}
                                {agentKey === 'booking' && 'Agente de Reservas'}
                                {agentKey === 'sales' && 'Agente de Vendas'}
                                {agentKey === 'support' && 'Agente de Suporte'}
                                {agentKey === 'payments' && 'Agente de Pagamentos (Em Breve)'}
                              </Typography>
                            }
                            sx={{ mb: 0.5, ml: 0 }}
                          />
                          <Typography variant="caption" color="text.secondary" display="block">
                            {agentDescriptions[agentKey]}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Negociação e Descontos */}
      <Accordion
        sx={{
          mb: 2,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Percent color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Negociação e Descontos
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.discountSettings.enabled}
                    onChange={(e) =>
                      handleUpdate({
                        discountSettings: { ...config.discountSettings, enabled: e.target.checked },
                      })
                    }
                    disabled={!config.enabled || !config.agentPermissions.sales}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Permitir Descontos Dinâmicos
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Habilita a Sofia a oferecer descontos baseados em critérios definidos
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
                value={config.discountSettings.maxPercentage}
                onChange={(e) =>
                  handleUpdate({
                    discountSettings: {
                      ...config.discountSettings,
                      maxPercentage: Number(e.target.value),
                    },
                  })
                }
                disabled={!config.discountSettings.enabled}
                inputProps={{ min: 0, max: 100, step: 1 }}
                helperText="Desconto máximo que a Sofia pode oferecer automaticamente"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Limite para Aprovação Manual (%)"
                value={config.discountSettings.approvalThreshold}
                onChange={(e) =>
                  handleUpdate({
                    discountSettings: {
                      ...config.discountSettings,
                      approvalThreshold: Number(e.target.value),
                    },
                  })
                }
                disabled={!config.discountSettings.enabled}
                inputProps={{ min: 0, max: 100, step: 1 }}
                helperText="Descontos acima deste valor requerem aprovação humana"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Critérios de Desconto Permitidos
              </Typography>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block" sx={{ mb: 2 }}>
                Selecione quais tipos de desconto a Sofia pode oferecer
              </Typography>

              <Grid container spacing={2}>
                {Object.entries({
                  earlyBooking: 'Reserva Antecipada',
                  longStay: 'Estadia Longa',
                  lowSeason: 'Baixa Temporada',
                  lastMinute: 'Última Hora',
                  multiProperty: 'Múltiplos Imóveis',
                }).map(([key, label]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={
                            config.discountSettings.allowedCriteria[
                              key as keyof typeof config.discountSettings.allowedCriteria
                            ]
                          }
                          onChange={(e) =>
                            handleUpdate({
                              discountSettings: {
                                ...config.discountSettings,
                                allowedCriteria: {
                                  ...config.discountSettings.allowedCriteria,
                                  [key]: e.target.checked,
                                },
                              },
                            })
                          }
                          disabled={!config.discountSettings.enabled}
                        />
                      }
                      label={label}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Personalização de Comunicação */}
      <Accordion
        sx={{
          mb: 3,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Personalização de Comunicação
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome da Empresa"
                value={config.customPrompts.companyName || ''}
                onChange={(e) =>
                  handleUpdate({
                    customPrompts: { ...config.customPrompts, companyName: e.target.value },
                  })
                }
                disabled={!config.enabled}
                helperText="Como a Sofia deve se referir à sua empresa"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!config.enabled}>
                <InputLabel>Tom de Comunicação</InputLabel>
                <Select
                  value={config.customPrompts.tone || 'friendly'}
                  onChange={(e) =>
                    handleUpdate({
                      customPrompts: {
                        ...config.customPrompts,
                        tone: e.target.value as 'formal' | 'casual' | 'friendly',
                      },
                    })
                  }
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
                value={config.customPrompts.welcome || ''}
                onChange={(e) =>
                  handleUpdate({
                    customPrompts: { ...config.customPrompts, welcome: e.target.value },
                  })
                }
                disabled={!config.enabled}
                helperText="Mensagem inicial que a Sofia usa para novos contatos (máx. 500 caracteres)"
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Valores e Diferenciais"
                value={config.customPrompts.companyValues || ''}
                onChange={(e) =>
                  handleUpdate({
                    customPrompts: { ...config.customPrompts, companyValues: e.target.value },
                  })
                }
                disabled={!config.enabled}
                helperText="Valores, diferenciais e características únicas da sua empresa (máx. 1000 caracteres)"
                inputProps={{ maxLength: 1000 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Instruções Especiais"
                value={config.customPrompts.specialInstructions || ''}
                onChange={(e) =>
                  handleUpdate({
                    customPrompts: { ...config.customPrompts, specialInstructions: e.target.value },
                  })
                }
                disabled={!config.enabled}
                helperText="Instruções adicionais para o comportamento da Sofia (máx. 2000 caracteres)"
                inputProps={{ maxLength: 2000 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          p: 2,
          mt: 3,
          mx: -3,
          mb: -3,
          display: 'flex',
          gap: 2,
          justifyContent: 'flex-end',
          zIndex: 1,
        }}
      >
        {hasChanges && (
          <Button variant="outlined" onClick={handleDiscard} disabled={saving}>
            Descartar Alterações
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<RestartAlt />}
          onClick={handleReset}
          disabled={saving}
          color="warning"
        >
          Resetar Padrão
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </Box>
    </Box>
  );
}
