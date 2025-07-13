// components/dashboard/goals/CreateGoalDialog.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Stack,
  FormControlLabel,
  Switch,
  InputAdornment,
  Alert,
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ptBR } from 'date-fns/locale'
import {
  Close,
  Add,
  Delete
} from '@mui/icons-material'
import {
  FinancialGoal,
  GoalType,
  GoalCategory,
  GoalMetric,
  GoalFrequency,
  GoalStatus,
  GoalMilestone,
  NotificationChannel,
  GOAL_TYPE_LABELS,
  GOAL_CATEGORY_LABELS,
  GOAL_STATUS_LABELS
} from '@/lib/types/financial'
import { formatCurrency } from '@/lib/utils/format'

interface CreateGoalDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  goal?: FinancialGoal | null
}

const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  [GoalMetric.TOTAL_REVENUE]: 'Receita Total',
  [GoalMetric.NET_REVENUE]: 'Receita Líquida',
  [GoalMetric.GROSS_PROFIT]: 'Lucro Bruto',
  [GoalMetric.NET_PROFIT]: 'Lucro Líquido',
  [GoalMetric.OCCUPANCY_RATE]: 'Taxa de Ocupação',
  [GoalMetric.ADR]: 'Diária Média',
  [GoalMetric.REVPAR]: 'RevPAR',
  [GoalMetric.BOOKING_COUNT]: 'Número de Reservas',
  [GoalMetric.MRR]: 'MRR',
  [GoalMetric.ARR]: 'ARR',
  [GoalMetric.GROWTH_RATE]: 'Taxa de Crescimento',
  [GoalMetric.NEW_CUSTOMERS]: 'Novos Clientes',
  [GoalMetric.CAC]: 'CAC',
  [GoalMetric.LTV]: 'LTV',
  [GoalMetric.CONVERSION_RATE]: 'Taxa de Conversão',
  [GoalMetric.REPEAT_RATE]: 'Taxa de Recompra'
}

const FREQUENCY_LABELS: Record<GoalFrequency, string> = {
  [GoalFrequency.DAILY]: 'Diária',
  [GoalFrequency.WEEKLY]: 'Semanal',
  [GoalFrequency.MONTHLY]: 'Mensal',
  [GoalFrequency.QUARTERLY]: 'Trimestral',
  [GoalFrequency.YEARLY]: 'Anual'
}

export default function CreateGoalDialog({
  open,
  onClose,
  onSuccess,
  goal
}: CreateGoalDialogProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: GoalType.REVENUE,
    category: GoalCategory.FINANCIAL,
    metric: GoalMetric.TOTAL_REVENUE,
    targetValue: 0,
    startValue: 0,
    period: {
      start: new Date(),
      end: new Date(new Date().getFullYear(), 11, 31) // Fim do ano
    },
    frequency: GoalFrequency.MONTHLY,
    status: GoalStatus.DRAFT,
    milestones: [] as Omit<GoalMilestone, 'achieved' | 'achievedDate'>[],
    notificationSettings: {
      enabled: true,
      channels: [NotificationChannel.DASHBOARD],
      frequency: 'daily' as const,
      onMilestone: true,
      onTarget: true,
      onDeviation: true,
      deviationThreshold: 10,
      recipients: []
    }
  })

  // Load existing goal data
  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        description: goal.description || '',
        type: goal.type,
        category: goal.category,
        metric: goal.metric,
        targetValue: goal.targetValue,
        startValue: goal.startValue,
        period: {
          start: new Date(goal.period.start),
          end: new Date(goal.period.end)
        },
        frequency: goal.frequency,
        status: goal.status,
        milestones: goal.milestones?.map(m => ({
          id: m.id,
          name: m.name,
          targetValue: m.targetValue,
          targetDate: new Date(m.targetDate),
          reward: m.reward || ''
        })) || [],
        notificationSettings: (goal.notificationSettings || formData.notificationSettings) as any
      })
    }
  }, [goal])

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      const endpoint = goal ? `/api/goals?id=${goal.id}` : '/api/goals'
      const method = goal ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          period: {
            start: formData.period.start.toISOString(),
            end: formData.period.end.toISOString()
          },
          milestones: formData.milestones.map(m => ({
            ...m,
            targetDate: m.targetDate.toISOString()
          }))
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar meta')
      }

      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao salvar meta')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones,
        {
          id: `milestone-${Date.now()}`,
          name: '',
          targetValue: 0,
          targetDate: new Date(),
          reward: ''
        }
      ]
    })
  }

  const handleRemoveMilestone = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((_, i) => i !== index)
    })
  }

  const getMetricsByType = (type: GoalType): GoalMetric[] => {
    switch (type) {
      case GoalType.REVENUE:
        return [
          GoalMetric.TOTAL_REVENUE,
          GoalMetric.NET_REVENUE,
          GoalMetric.GROSS_PROFIT,
          GoalMetric.NET_PROFIT
        ]
      case GoalType.OCCUPANCY:
        return [
          GoalMetric.OCCUPANCY_RATE,
          GoalMetric.ADR,
          GoalMetric.REVPAR
        ]
      case GoalType.BOOKINGS:
        return [GoalMetric.BOOKING_COUNT]
      case GoalType.CUSTOMER_ACQUISITION:
        return [
          GoalMetric.NEW_CUSTOMERS,
          GoalMetric.CAC,
          GoalMetric.CONVERSION_RATE
        ]
      case GoalType.RETENTION:
        return [
          GoalMetric.LTV,
          GoalMetric.REPEAT_RATE
        ]
      default:
        return Object.values(GoalMetric)
    }
  }

  const isPercentageMetric = (metric: GoalMetric) => {
    return [
      GoalMetric.OCCUPANCY_RATE,
      GoalMetric.CONVERSION_RATE,
      GoalMetric.REPEAT_RATE,
      GoalMetric.GROWTH_RATE
    ].includes(metric)
  }

  const isMonetaryMetric = (metric: GoalMetric) => {
    return [
      GoalMetric.TOTAL_REVENUE,
      GoalMetric.NET_REVENUE,
      GoalMetric.GROSS_PROFIT,
      GoalMetric.NET_PROFIT,
      GoalMetric.ADR,
      GoalMetric.REVPAR,
      GoalMetric.MRR,
      GoalMetric.ARR,
      GoalMetric.CAC,
      GoalMetric.LTV
    ].includes(metric)
  }

  const steps = ['Informações Básicas', 'Valores e Período', 'Marcos e Notificações']

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {goal ? 'Editar Meta' : 'Nova Meta'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 1: Informações Básicas */}
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome da Meta"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => {
                      const type = e.target.value as GoalType
                      const metrics = getMetricsByType(type)
                      setFormData({ 
                        ...formData, 
                        type,
                        metric: metrics[0] || GoalMetric.TOTAL_REVENUE
                      })
                    }}
                    label="Tipo"
                  >
                    {Object.entries(GOAL_TYPE_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as GoalCategory })}
                    label="Categoria"
                  >
                    {Object.entries(GOAL_CATEGORY_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Métrica</InputLabel>
                  <Select
                    value={formData.metric}
                    onChange={(e) => setFormData({ ...formData, metric: e.target.value as GoalMetric })}
                    label="Métrica"
                  >
                    {getMetricsByType(formData.type).map((metric) => (
                      <MenuItem key={metric} value={metric}>
                        {GOAL_METRIC_LABELS[metric]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as GoalStatus })}
                    label="Status"
                  >
                    {Object.entries(GOAL_STATUS_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {/* Step 2: Valores e Período */}
          {activeStep === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Inicial"
                  type="number"
                  value={formData.startValue}
                  onChange={(e) => setFormData({ ...formData, startValue: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: isMonetaryMetric(formData.metric) ? 
                      <InputAdornment position="start">R$</InputAdornment> : null,
                    endAdornment: isPercentageMetric(formData.metric) ? 
                      <InputAdornment position="end">%</InputAdornment> : null
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Alvo"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: isMonetaryMetric(formData.metric) ? 
                      <InputAdornment position="start">R$</InputAdornment> : null,
                    endAdornment: isPercentageMetric(formData.metric) ? 
                      <InputAdornment position="end">%</InputAdornment> : null
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data Inicial"
                  value={formData.period.start}
                  onChange={(date) => date && setFormData({ 
                    ...formData, 
                    period: { ...formData.period, start: date }
                  })}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data Final"
                  value={formData.period.end}
                  onChange={(date) => date && setFormData({ 
                    ...formData, 
                    period: { ...formData.period, end: date }
                  })}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Frequência de Acompanhamento</InputLabel>
                  <Select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as GoalFrequency })}
                    label="Frequência de Acompanhamento"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          {/* Step 3: Marcos e Notificações */}
          {activeStep === 2 && (
            <Grid container spacing={3}>
              {/* Marcos */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1">
                    Marcos da Meta
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={handleAddMilestone}
                  >
                    Adicionar Marco
                  </Button>
                </Box>

                {formData.milestones.map((milestone, index) => (
                  <Box key={milestone.id} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Nome do Marco"
                          value={milestone.name}
                          onChange={(e) => {
                            const updated = [...formData.milestones]
                            if (updated[index]) updated[index].name = e.target.value
                            setFormData({ ...formData, milestones: updated })
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Valor"
                          type="number"
                          value={milestone.targetValue}
                          onChange={(e) => {
                            const updated = [...formData.milestones]
                            if (updated[index]) updated[index].targetValue = parseFloat(e.target.value) || 0
                            setFormData({ ...formData, milestones: updated })
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <DatePicker
                          label="Data"
                          value={milestone.targetDate}
                          onChange={(date) => {
                            if (date) {
                              const updated = [...formData.milestones]
                              if (updated[index]) updated[index].targetDate = date
                              setFormData({ ...formData, milestones: updated })
                            }
                          }}
                          format="dd/MM/yyyy"
                          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveMilestone(index)}
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Grid>

              {/* Notificações */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" mb={2}>
                  Configurações de Notificação
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.notificationSettings.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            notificationSettings: {
                              ...formData.notificationSettings,
                              enabled: e.target.checked
                            }
                          })}
                        />
                      }
                      label="Ativar notificações"
                    />
                  </Grid>

                  {formData.notificationSettings.enabled && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.notificationSettings.onMilestone}
                              onChange={(e) => setFormData({
                                ...formData,
                                notificationSettings: {
                                  ...formData.notificationSettings,
                                  onMilestone: e.target.checked
                                }
                              })}
                            />
                          }
                          label="Notificar ao atingir marcos"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.notificationSettings.onTarget}
                              onChange={(e) => setFormData({
                                ...formData,
                                notificationSettings: {
                                  ...formData.notificationSettings,
                                  onTarget: e.target.checked
                                }
                              })}
                            />
                          }
                          label="Notificar ao atingir meta"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.notificationSettings.onDeviation}
                              onChange={(e) => setFormData({
                                ...formData,
                                notificationSettings: {
                                  ...formData.notificationSettings,
                                  onDeviation: e.target.checked
                                }
                              })}
                            />
                          }
                          label="Notificar desvios"
                        />
                      </Grid>

                      {formData.notificationSettings.onDeviation && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Limite de desvio"
                            type="number"
                            value={formData.notificationSettings.deviationThreshold}
                            onChange={(e) => setFormData({
                              ...formData,
                              notificationSettings: {
                                ...formData.notificationSettings,
                                deviationThreshold: parseFloat(e.target.value) || 10
                              }
                            })}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>
                            }}
                          />
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Box flex={1} />
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Voltar
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !formData.name) ||
                (activeStep === 1 && (!formData.targetValue || formData.targetValue <= formData.startValue))
              }
            >
              Próximo
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Salvando...' : (goal ? 'Salvar' : 'Criar')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}