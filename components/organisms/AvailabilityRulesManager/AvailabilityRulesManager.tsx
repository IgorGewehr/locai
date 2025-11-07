'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Grid,
  Alert,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Tooltip,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PowerSettingsNew,
  Event,
  Block,
  AttachMoney,
  Hotel,
  Info,
  CalendarMonth,
  AutoAwesome,
  CheckCircle,
  Cancel,
  Warning,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import {
  AvailabilityRule,
  AvailabilityRuleType,
  AvailabilityRuleAction,
  AvailabilityStatus,
} from '@/lib/types/availability';
import { AvailabilityRulesService } from '@/lib/services/availability-rules-service';
import { logger } from '@/lib/utils/logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvailabilityRulesManagerProps {
  propertyId: string;
  onRulesChange?: () => void;
}

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const RULE_TYPE_LABELS: Record<AvailabilityRuleType, string> = {
  [AvailabilityRuleType.WEEKLY]: 'Semanal',
  [AvailabilityRuleType.MONTHLY]: 'Mensal',
  [AvailabilityRuleType.SEASONAL]: 'Sazonal',
  [AvailabilityRuleType.CUSTOM]: 'Customizado',
};

const RULE_ACTION_LABELS: Record<AvailabilityRuleAction, string> = {
  [AvailabilityRuleAction.BLOCK]: 'Bloquear',
  [AvailabilityRuleAction.PRICE]: 'Definir Preço',
  [AvailabilityRuleAction.MIN_NIGHTS]: 'Mínimo de Noites',
  [AvailabilityRuleAction.MAX_NIGHTS]: 'Máximo de Noites',
};

const RULE_ACTION_ICONS: Record<AvailabilityRuleAction, React.ReactNode> = {
  [AvailabilityRuleAction.BLOCK]: <Block fontSize="small" />,
  [AvailabilityRuleAction.PRICE]: <AttachMoney fontSize="small" />,
  [AvailabilityRuleAction.MIN_NIGHTS]: <Hotel fontSize="small" />,
  [AvailabilityRuleAction.MAX_NIGHTS]: <Hotel fontSize="small" />,
};

export default function AvailabilityRulesManager({
  propertyId,
  onRulesChange,
}: AvailabilityRulesManagerProps) {
  const theme = useTheme();
  const { tenantId, isReady } = useTenant();

  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: AvailabilityRuleType.WEEKLY,
    action: AvailabilityRuleAction.BLOCK,
    actionValue: '',
    dayIndexes: [] as number[],
    validFrom: '',
    validUntil: '',
    priority: 5,
    isActive: true,
  });

  // Load rules
  useEffect(() => {
    if (isReady && tenantId) {
      loadRules();
    }
  }, [isReady, tenantId, propertyId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const service = new AvailabilityRulesService(tenantId!);
      const activeRules = await service.getActiveRules(propertyId);

      // Also get inactive rules
      const allRules = activeRules; // TODO: add method to get all rules
      setRules(allRules);

      logger.info('✅ Rules loaded', {
        count: allRules.length,
        propertyId,
      });
    } catch (error) {
      logger.error('❌ Error loading rules', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!tenantId) return;

    try {
      const service = new AvailabilityRulesService(tenantId);

      // Parse action value based on action type
      let parsedActionValue: any = formData.actionValue;
      if (formData.action === AvailabilityRuleAction.PRICE) {
        parsedActionValue = parseFloat(formData.actionValue);
      } else if (
        formData.action === AvailabilityRuleAction.MIN_NIGHTS ||
        formData.action === AvailabilityRuleAction.MAX_NIGHTS
      ) {
        parsedActionValue = parseInt(formData.actionValue);
      } else if (formData.action === AvailabilityRuleAction.BLOCK) {
        parsedActionValue = AvailabilityStatus.BLOCKED;
      }

      const ruleData: Omit<AvailabilityRule, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'> = {
        propertyId,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        pattern: {
          dayIndexes: formData.dayIndexes.length > 0 ? formData.dayIndexes : undefined,
        },
        action: formData.action,
        actionValue: parsedActionValue,
        validFrom: formData.validFrom ? new Date(formData.validFrom) : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
        priority: formData.priority,
        isActive: formData.isActive,
        createdBy: 'admin', // TODO: get from user context
      };

      if (editingRule) {
        await service.updateRule(editingRule.id, ruleData);
        logger.info('✅ Rule updated', { ruleId: editingRule.id });
      } else {
        await service.createRule(ruleData);
        logger.info('✅ Rule created');
      }

      setShowCreateDialog(false);
      setEditingRule(null);
      resetForm();
      loadRules();
      onRulesChange?.();
    } catch (error) {
      logger.error('❌ Error saving rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleEditRule = (rule: AvailabilityRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      type: rule.type,
      action: rule.action,
      actionValue: rule.actionValue?.toString() || '',
      dayIndexes: rule.pattern.dayIndexes || [],
      validFrom: rule.validFrom ? format(rule.validFrom, 'yyyy-MM-dd') : '',
      validUntil: rule.validUntil ? format(rule.validUntil, 'yyyy-MM-dd') : '',
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setShowCreateDialog(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!tenantId || !confirm('Tem certeza que deseja excluir esta regra?')) return;

    try {
      const service = new AvailabilityRulesService(tenantId);
      await service.deleteRule(ruleId);
      loadRules();
      onRulesChange?.();
      logger.info('✅ Rule deleted', { ruleId });
    } catch (error) {
      logger.error('❌ Error deleting rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleToggleRule = async (rule: AvailabilityRule) => {
    if (!tenantId) return;

    try {
      const service = new AvailabilityRulesService(tenantId);
      await service.updateRule(rule.id, { isActive: !rule.isActive });
      loadRules();
      onRulesChange?.();
      logger.info('✅ Rule toggled', { ruleId: rule.id, isActive: !rule.isActive });
    } catch (error) {
      logger.error('❌ Error toggling rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: AvailabilityRuleType.WEEKLY,
      action: AvailabilityRuleAction.BLOCK,
      actionValue: '',
      dayIndexes: [],
      validFrom: '',
      validUntil: '',
      priority: 5,
      isActive: true,
    });
  };

  const handleDayToggle = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      dayIndexes: prev.dayIndexes.includes(dayIndex)
        ? prev.dayIndexes.filter(d => d !== dayIndex)
        : [...prev.dayIndexes, dayIndex].sort(),
    }));
  };

  const getRuleDescription = (rule: AvailabilityRule): string => {
    let desc = '';

    if (rule.type === AvailabilityRuleType.WEEKLY && rule.pattern.dayIndexes) {
      const days = rule.pattern.dayIndexes.map(i => WEEKDAY_NAMES[i]).join(', ');
      desc = `Toda semana: ${days}`;
    } else if (rule.type === AvailabilityRuleType.MONTHLY && rule.pattern.dayIndexes) {
      const days = rule.pattern.dayIndexes.join(', ');
      desc = `Todo mês nos dias: ${days}`;
    } else if (rule.type === AvailabilityRuleType.SEASONAL && rule.validFrom && rule.validUntil) {
      desc = `${format(rule.validFrom, 'dd/MM/yyyy')} até ${format(rule.validUntil, 'dd/MM/yyyy')}`;
    }

    if (rule.action === AvailabilityRuleAction.PRICE) {
      desc += ` • R$ ${rule.actionValue}`;
    } else if (
      rule.action === AvailabilityRuleAction.MIN_NIGHTS ||
      rule.action === AvailabilityRuleAction.MAX_NIGHTS
    ) {
      desc += ` • ${rule.actionValue} noites`;
    }

    return desc;
  };

  const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return 'error.main';
    if (priority >= 5) return 'warning.main';
    return 'info.main';
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 8) return 'Alta';
    if (priority >= 5) return 'Média';
    return 'Baixa';
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AutoAwesome sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Regras de Disponibilidade
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Automatize bloqueios, preços e requisitos de forma recorrente
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setEditingRule(null);
              setShowCreateDialog(true);
            }}
            size="large"
          >
            Nova Regra
          </Button>
        </Box>

        {rules.length > 0 && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {rules.filter(r => r.isActive).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Regras Ativas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {rules.filter(r => r.action === AvailabilityRuleAction.PRICE).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Regras de Preço
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {rules.filter(r => r.action === AvailabilityRuleAction.BLOCK).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Regras de Bloqueio
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Rules List */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Carregando regras...</Typography>
        </Box>
      ) : rules.length === 0 ? (
        <Alert severity="info" icon={<Info />}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Nenhuma regra criada ainda
          </Typography>
          <Typography variant="body2">
            Crie regras para automatizar bloqueios de datas, definir preços especiais ou configurar
            requisitos de estadia mínima/máxima. Exemplos:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>Bloquear todos os domingos para manutenção</li>
            <li>Definir preço de R$ 700 para fins de semana</li>
            <li>Exigir mínimo de 5 noites em dezembro</li>
          </Box>
        </Alert>
      ) : (
        <List>
          {rules.map((rule, index) => (
            <React.Fragment key={rule.id}>
              {index > 0 && <Divider />}
              <ListItem
                sx={{
                  py: 2,
                  px: 3,
                  bgcolor: !rule.isActive ? alpha(theme.palette.action.disabled, 0.05) : 'transparent',
                  opacity: rule.isActive ? 1 : 0.6,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {rule.name}
                      </Typography>
                      <Chip
                        icon={RULE_ACTION_ICONS[rule.action]}
                        label={RULE_ACTION_LABELS[rule.action]}
                        size="small"
                        color={
                          rule.action === AvailabilityRuleAction.BLOCK
                            ? 'error'
                            : rule.action === AvailabilityRuleAction.PRICE
                            ? 'success'
                            : 'default'
                        }
                      />
                      <Chip
                        label={RULE_TYPE_LABELS[rule.type]}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`Prioridade: ${getPriorityLabel(rule.priority)}`}
                        size="small"
                        sx={{
                          borderColor: getPriorityColor(rule.priority),
                          color: getPriorityColor(rule.priority),
                        }}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {getRuleDescription(rule)}
                      </Typography>
                      {rule.description && (
                        <Typography variant="caption" color="text.secondary">
                          {rule.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title={rule.isActive ? 'Desativar' : 'Ativar'}>
                      <IconButton
                        onClick={() => handleToggleRule(rule)}
                        color={rule.isActive ? 'success' : 'default'}
                      >
                        <PowerSettingsNew />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleEditRule(rule)} color="primary">
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton onClick={() => handleDeleteRule(rule.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingRule(null);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? 'Editar Regra' : 'Nova Regra de Disponibilidade'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Name */}
            <Grid item xs={12}>
              <TextField
                label="Nome da Regra"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
                placeholder="Ex: Bloquear Domingos"
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label="Descrição (opcional)"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                placeholder="Descrição detalhada da regra..."
              />
            </Grid>

            {/* Type */}
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Regra</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo de Regra"
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      type: e.target.value as AvailabilityRuleType,
                    }))
                  }
                >
                  <MenuItem value={AvailabilityRuleType.WEEKLY}>
                    Semanal (dias da semana)
                  </MenuItem>
                  <MenuItem value={AvailabilityRuleType.MONTHLY}>
                    Mensal (dias do mês)
                  </MenuItem>
                  <MenuItem value={AvailabilityRuleType.SEASONAL}>
                    Sazonal (período fixo)
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Action */}
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Ação</InputLabel>
                <Select
                  value={formData.action}
                  label="Ação"
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      action: e.target.value as AvailabilityRuleAction,
                    }))
                  }
                >
                  <MenuItem value={AvailabilityRuleAction.BLOCK}>Bloquear Datas</MenuItem>
                  <MenuItem value={AvailabilityRuleAction.PRICE}>Definir Preço</MenuItem>
                  <MenuItem value={AvailabilityRuleAction.MIN_NIGHTS}>
                    Mínimo de Noites
                  </MenuItem>
                  <MenuItem value={AvailabilityRuleAction.MAX_NIGHTS}>
                    Máximo de Noites
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Day Selection for Weekly/Monthly */}
            {(formData.type === AvailabilityRuleType.WEEKLY ||
              formData.type === AvailabilityRuleType.MONTHLY) && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  {formData.type === AvailabilityRuleType.WEEKLY
                    ? 'Dias da Semana'
                    : 'Dias do Mês'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.type === AvailabilityRuleType.WEEKLY
                    ? WEEKDAY_NAMES.map((day, index) => (
                        <Chip
                          key={index}
                          label={day}
                          onClick={() => handleDayToggle(index)}
                          color={formData.dayIndexes.includes(index) ? 'primary' : 'default'}
                          variant={formData.dayIndexes.includes(index) ? 'filled' : 'outlined'}
                        />
                      ))
                    : Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <Chip
                          key={day}
                          label={day}
                          onClick={() => handleDayToggle(day)}
                          color={formData.dayIndexes.includes(day) ? 'primary' : 'default'}
                          variant={formData.dayIndexes.includes(day) ? 'filled' : 'outlined'}
                          size="small"
                        />
                      ))}
                </Box>
              </Grid>
            )}

            {/* Date Range for Seasonal */}
            {formData.type === AvailabilityRuleType.SEASONAL && (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Data Inicial"
                    type="date"
                    value={formData.validFrom}
                    onChange={e => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Data Final"
                    type="date"
                    value={formData.validUntil}
                    onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            {/* Action Value */}
            {formData.action !== AvailabilityRuleAction.BLOCK && (
              <Grid item xs={12}>
                <TextField
                  label={
                    formData.action === AvailabilityRuleAction.PRICE
                      ? 'Preço (R$)'
                      : 'Número de Noites'
                  }
                  type="number"
                  value={formData.actionValue}
                  onChange={e => setFormData(prev => ({ ...prev, actionValue: e.target.value }))}
                  fullWidth
                  required
                  inputProps={{ min: 0, step: formData.action === AvailabilityRuleAction.PRICE ? 10 : 1 }}
                />
              </Grid>
            )}

            {/* Priority */}
            <Grid item xs={6}>
              <TextField
                label="Prioridade"
                type="number"
                value={formData.priority}
                onChange={e =>
                  setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))
                }
                fullWidth
                inputProps={{ min: 1, max: 10 }}
                helperText="1 (baixa) a 10 (alta)"
              />
            </Grid>

            {/* Active */}
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Regra Ativa"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowCreateDialog(false);
              setEditingRule(null);
              resetForm();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateRule}
            disabled={
              !formData.name ||
              (formData.action !== AvailabilityRuleAction.BLOCK && !formData.actionValue) ||
              ((formData.type === AvailabilityRuleType.WEEKLY ||
                formData.type === AvailabilityRuleType.MONTHLY) &&
                formData.dayIndexes.length === 0) ||
              (formData.type === AvailabilityRuleType.SEASONAL &&
                (!formData.validFrom || !formData.validUntil))
            }
          >
            {editingRule ? 'Atualizar' : 'Criar'} Regra
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
