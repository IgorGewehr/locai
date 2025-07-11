// components/dashboard/goals/AddCheckpointDialog.tsx
'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  InputAdornment,
  LinearProgress
} from '@mui/material'
import { FinancialGoal } from '@/lib/types/financial'
import { formatCurrency } from '@/lib/utils/format'

interface AddCheckpointDialogProps {
  open: boolean
  onClose: () => void
  goal: FinancialGoal
  onSuccess: () => void
}

export default function AddCheckpointDialog({
  open,
  onClose,
  goal,
  onSuccess
}: AddCheckpointDialogProps) {
  const [value, setValue] = useState<number>(goal.currentValue || 0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPercentageMetric = () => {
    return goal.metric.includes('rate') || goal.metric.includes('percentage')
  }

  const isMonetaryMetric = () => {
    return goal.metric.includes('revenue') || goal.metric.includes('profit') || 
           goal.metric === 'mrr' || goal.metric === 'arr' || 
           goal.metric === 'cac' || goal.metric === 'ltv'
  }

  const formatValue = (val: number) => {
    if (isPercentageMetric()) {
      return `${val.toFixed(1)}%`
    }
    if (isMonetaryMetric()) {
      return formatCurrency(val)
    }
    return val.toLocaleString('pt-BR')
  }

  const calculateNewProgress = () => {
    if (!goal.targetValue || goal.startValue === undefined) return 0
    
    const start = goal.startValue || 0
    const target = goal.targetValue
    
    if (target === start) return 100
    
    const progress = ((value - start) / (target - start)) * 100
    return Math.max(0, Math.min(100, progress))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/goals/checkpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goalId: goal.id,
          value,
          notes,
          automated: false
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao adicionar checkpoint')
      }

      onSuccess()
    } catch (error) {
      console.error('Erro ao adicionar checkpoint:', error)
      setError(error instanceof Error ? error.message : 'Erro ao adicionar checkpoint')
    } finally {
      setLoading(false)
    }
  }

  const newProgress = calculateNewProgress()
  const progressDiff = newProgress - goal.progress

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Atualizar Progresso - {goal.name}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Progresso Atual
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flex={1}>
              <LinearProgress 
                variant="determinate" 
                value={goal.progress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="h6">
              {goal.progress}%
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="text.secondary">
              Atual: {formatValue(goal.currentValue)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Meta: {formatValue(goal.targetValue)}
            </Typography>
          </Box>
        </Box>

        <TextField
          fullWidth
          label="Novo Valor"
          type="number"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
          InputProps={{
            startAdornment: isMonetaryMetric() ? 
              <InputAdornment position="start">R$</InputAdornment> : null,
            endAdornment: isPercentageMetric() ? 
              <InputAdornment position="end">%</InputAdornment> : null
          }}
          required
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Observações (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          sx={{ mb: 3 }}
        />

        {value !== goal.currentValue && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Novo Progresso
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Box flex={1}>
                <LinearProgress 
                  variant="determinate" 
                  value={newProgress} 
                  color={newProgress >= 100 ? 'success' : 'primary'}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="h6" color={progressDiff > 0 ? 'success.main' : 'error.main'}>
                {newProgress.toFixed(1)}%
              </Typography>
            </Box>
            
            <Typography 
              variant="body2" 
              color={progressDiff > 0 ? 'success.main' : 'error.main'}
              sx={{ mt: 1 }}
            >
              {progressDiff > 0 ? '+' : ''}{progressDiff.toFixed(1)}% em relação ao progresso atual
            </Typography>

            {newProgress >= 100 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                🎉 Parabéns! Com este valor, a meta será alcançada!
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || value === goal.currentValue}
        >
          {loading ? 'Salvando...' : 'Atualizar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}