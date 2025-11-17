'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import type { AIConfig } from '@/lib/types/ai-config';
import { logger } from '@/lib/utils/logger';

export default function AIConfigSection() {
  const { tenantId } = useTenant();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Carregar configuração
  useEffect(() => {
    if (!tenantId) return;

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/ai/config');
        const result = await response.json();

        if (result.success) {
          setConfig(result.data);
        } else {
          throw new Error(result.error || 'Falha ao carregar configuração');
        }
      } catch (error) {
        logger.error('Failed to load AI config', { error });
        setSnackbar({
          open: true,
          message: 'Erro ao carregar configurações',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [tenantId]);

  // Atualizar configuração
  const handleUpdate = (updates: Partial<AIConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  // Salvar configuração
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
        setSnackbar({
          open: true,
          message: 'Configurações salvas com sucesso!',
          severity: 'success',
        });
      } else {
        throw new Error(result.error || 'Falha ao salvar');
      }
    } catch (error) {
      logger.error('Failed to save AI config', { error });
      setSnackbar({
        open: true,
        message: 'Erro ao salvar configurações',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset para padrão
  const handleReset = async () => {
    if (!confirm('Deseja realmente resetar para as configurações padrão?')) return;

    setSaving(true);
    try {
      const response = await fetch('/api/ai/config', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setSnackbar({
          open: true,
          message: 'Configurações resetadas com sucesso!',
          severity: 'success',
        });
      } else {
        throw new Error(result.error || 'Falha ao resetar');
      }
    } catch (error) {
      logger.error('Failed to reset AI config', { error });
      setSnackbar({
        open: true,
        message: 'Erro ao resetar configurações',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Carregando configurações...</Typography>
      </Paper>
    );
  }

  if (!config) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">Erro ao carregar configurações do agente de IA</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AIIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h5">Configuração do Agente Sofia</Typography>
      </Box>

      {/* Configurações Gerais */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Configurações Gerais</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={(e) => handleUpdate({ enabled: e.target.checked })}
                    color="primary"
                  />
                }
                label="Agente de IA Habilitado"
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
                label="Resposta Automática"
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
                label="Apenas Horário Comercial"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Permissões de Agentes */}
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Agentes Especializados</Typography>
            <Chip
              size="small"
              label={`${Object.values(config.agentPermissions).filter(Boolean).length}/5 ativos`}
              color="primary"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            Habilite ou desabilite agentes especializados. Quando desabilitado, o agente Sofia não oferecerá essas funcionalidades.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.search}
                    onChange={(e) =>
                      handleUpdate({
                        agentPermissions: { ...config.agentPermissions, search: e.target.checked },
                      })
                    }
                    disabled={!config.enabled}
                  />
                }
                label="Agente de Busca (Search Agent)"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Busca e apresentação de imóveis, envio de fotos e mapas
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.booking}
                    onChange={(e) =>
                      handleUpdate({
                        agentPermissions: { ...config.agentPermissions, booking: e.target.checked },
                      })
                    }
                    disabled={!config.enabled}
                  />
                }
                label="Agente de Reservas (Booking Agent)"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Criação, modificação e cancelamento de reservas
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.sales}
                    onChange={(e) =>
                      handleUpdate({
                        agentPermissions: { ...config.agentPermissions, sales: e.target.checked },
                      })
                    }
                    disabled={!config.enabled}
                  />
                }
                label="Agente de Vendas (Sales Agent)"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Negociação, descontos e acompanhamento de pipeline
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.support}
                    onChange={(e) =>
                      handleUpdate({
                        agentPermissions: { ...config.agentPermissions, support: e.target.checked },
                      })
                    }
                    disabled={!config.enabled}
                  />
                }
                label="Agente de Suporte (Support Agent)"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Políticas, agendamento de visitas e suporte geral
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.agentPermissions.payments}
                    onChange={(e) =>
                      handleUpdate({
                        agentPermissions: { ...config.agentPermissions, payments: e.target.checked },
                      })
                    }
                    disabled={!config.enabled}
                  />
                }
                label="Agente de Pagamentos (Em Breve)"
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                Cobranças, recebimento de pagamentos e gestão financeira
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Configurações de Desconto */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Negociação e Descontos</Typography>
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
                label="Permitir Descontos Dinâmicos"
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
                helperText="Desconto máximo que o agente pode oferecer"
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
              <Typography variant="subtitle2" gutterBottom>
                Critérios de Desconto Permitidos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.discountSettings.allowedCriteria.earlyBooking}
                        onChange={(e) =>
                          handleUpdate({
                            discountSettings: {
                              ...config.discountSettings,
                              allowedCriteria: {
                                ...config.discountSettings.allowedCriteria,
                                earlyBooking: e.target.checked,
                              },
                            },
                          })
                        }
                        disabled={!config.discountSettings.enabled}
                      />
                    }
                    label="Reserva Antecipada"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.discountSettings.allowedCriteria.longStay}
                        onChange={(e) =>
                          handleUpdate({
                            discountSettings: {
                              ...config.discountSettings,
                              allowedCriteria: {
                                ...config.discountSettings.allowedCriteria,
                                longStay: e.target.checked,
                              },
                            },
                          })
                        }
                        disabled={!config.discountSettings.enabled}
                      />
                    }
                    label="Estadia Longa"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.discountSettings.allowedCriteria.lowSeason}
                        onChange={(e) =>
                          handleUpdate({
                            discountSettings: {
                              ...config.discountSettings,
                              allowedCriteria: {
                                ...config.discountSettings.allowedCriteria,
                                lowSeason: e.target.checked,
                              },
                            },
                          })
                        }
                        disabled={!config.discountSettings.enabled}
                      />
                    }
                    label="Baixa Temporada"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.discountSettings.allowedCriteria.lastMinute}
                        onChange={(e) =>
                          handleUpdate({
                            discountSettings: {
                              ...config.discountSettings,
                              allowedCriteria: {
                                ...config.discountSettings.allowedCriteria,
                                lastMinute: e.target.checked,
                              },
                            },
                          })
                        }
                        disabled={!config.discountSettings.enabled}
                      />
                    }
                    label="Última Hora"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.discountSettings.allowedCriteria.multiProperty}
                        onChange={(e) =>
                          handleUpdate({
                            discountSettings: {
                              ...config.discountSettings,
                              allowedCriteria: {
                                ...config.discountSettings.allowedCriteria,
                                multiProperty: e.target.checked,
                              },
                            },
                          })
                        }
                        disabled={!config.discountSettings.enabled}
                      />
                    }
                    label="Múltiplos Imóveis"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Prompts Personalizados */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Personalização de Comunicação</Typography>
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
                label="Mensagem de Boas-Vindas Personalizada"
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

      {/* Botões de Ação */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={handleReset}
          disabled={saving}
        >
          Resetar Padrão
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
