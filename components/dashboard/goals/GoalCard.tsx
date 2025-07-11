// components/dashboard/goals/GoalCard.tsx
'use client'

import React from 'react'
import {
  Card,
  CardContent,
  Box,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Stack,
  Button
} from '@mui/material'
import {
  MoreVert,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Warning,
  Timer,
  Flag
} from '@mui/icons-material'
import { 
  FinancialGoal, 
  GoalStatus, 
  GoalPerformance,
  GOAL_TYPE_LABELS,
  GOAL_STATUS_LABELS 
} from '@/lib/types/financial'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils/format'

interface GoalCardProps {
  goal: FinancialGoal
  performance?: GoalPerformance
  onEdit?: (goal: FinancialGoal) => void
  onDelete?: (goal: FinancialGoal) => void
  onView?: (goal: FinancialGoal) => void
  onAddCheckpoint?: (goal: FinancialGoal) => void
  compact?: boolean
}

export default function GoalCard({
  goal,
  performance,
  onEdit,
  onDelete,
  onView,
  onAddCheckpoint,
  compact = false
}: GoalCardProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const getStatusColor = () => {
    switch (goal.status) {
      case GoalStatus.ACTIVE:
        return 'primary'
      case GoalStatus.COMPLETED:
        return 'success'
      case GoalStatus.FAILED:
        return 'error'
      case GoalStatus.PAUSED:
        return 'warning'
      default:
        return 'default'
    }
  }

  const getProgressColor = () => {
    if (goal.progress >= 100) return 'success'
    if (goal.progress >= 75) return 'primary'
    if (goal.progress >= 50) return 'warning'
    return 'error'
  }

  const getTrendIcon = () => {
    if (!performance) return <TrendingFlat color="action" />
    
    switch (performance.trend) {
      case 'up':
        return <TrendingUp color="success" />
      case 'down':
        return <TrendingDown color="error" />
      default:
        return <TrendingFlat color="action" />
    }
  }

  const getPaceIndicator = () => {
    if (!performance) return null
    
    switch (performance.currentPace) {
      case 'ahead':
        return (
          <Chip
            icon={<CheckCircle />}
            label="No prazo"
            size="small"
            color="success"
            variant="outlined"
          />
        )
      case 'behind':
        return (
          <Chip
            icon={<Warning />}
            label="Atrasado"
            size="small"
            color="error"
            variant="outlined"
          />
        )
      default:
        return (
          <Chip
            icon={<Timer />}
            label="No ritmo"
            size="small"
            color="primary"
            variant="outlined"
          />
        )
    }
  }

  const formatValue = (value: number) => {
    // Para métricas percentuais
    if (goal.metric.includes('rate') || goal.metric.includes('percentage')) {
      return `${value.toFixed(1)}%`
    }
    // Para métricas monetárias
    if (goal.metric.includes('revenue') || goal.metric.includes('profit') || 
        goal.metric === 'mrr' || goal.metric === 'arr' || 
        goal.metric === 'cac' || goal.metric === 'ltv') {
      return formatCurrency(value)
    }
    // Para outras métricas
    return value.toLocaleString('pt-BR')
  }

  const daysRemaining = differenceInDays(goal.period.end, new Date())
  const isOverdue = daysRemaining < 0 && goal.status === GoalStatus.ACTIVE

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        borderLeft: 4,
        borderColor: `${getStatusColor()}.main`,
        '&:hover': {
          boxShadow: 3
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {goal.name}
            </Typography>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={GOAL_TYPE_LABELS[goal.type]}
                size="small"
                variant="outlined"
              />
              <Chip
                label={GOAL_STATUS_LABELS[goal.status]}
                size="small"
                color={getStatusColor()}
              />
              {performance && getPaceIndicator()}
            </Stack>
          </Box>

          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>

        {!compact && goal.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {goal.description}
          </Typography>
        )}

        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progresso
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {getTrendIcon()}
              <Typography variant="h6" color={getProgressColor()}>
                {goal.progress}%
              </Typography>
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={goal.progress}
            color={getProgressColor()}
            sx={{ height: 8, borderRadius: 4 }}
          />

          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="text.secondary">
              {formatValue(goal.currentValue)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Meta: {formatValue(goal.targetValue)}
            </Typography>
          </Box>
        </Box>

        {performance && !compact && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Velocidade
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Média diária
                </Typography>
                <Typography variant="body2">
                  {formatValue(performance.dailyAverage)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Necessário/dia
                </Typography>
                <Typography variant="body2">
                  {formatValue(performance.requiredDailyRate)}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">
              Período
            </Typography>
            <Typography variant="body2">
              {format(goal.period.start, 'dd/MM/yyyy', { locale: ptBR })} - 
              {format(goal.period.end, 'dd/MM/yyyy', { locale: ptBR })}
            </Typography>
          </Box>

          {goal.status === GoalStatus.ACTIVE && (
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                {isOverdue ? 'Vencida há' : 'Restam'}
              </Typography>
              <Typography 
                variant="body2" 
                color={isOverdue ? 'error' : 'text.primary'}
                fontWeight="bold"
              >
                {Math.abs(daysRemaining)} dias
              </Typography>
            </Box>
          )}
        </Box>

        {goal.milestones && goal.milestones.length > 0 && !compact && (
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Marcos: {goal.milestones.filter(m => m.achieved).length}/{goal.milestones.length}
            </Typography>
          </Box>
        )}

        {goal.status === GoalStatus.ACTIVE && onAddCheckpoint && (
          <Box mt={2}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => onAddCheckpoint(goal)}
            >
              Atualizar Progresso
            </Button>
          </Box>
        )}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {onView && (
          <MenuItem
            onClick={() => {
              handleMenuClose()
              onView(goal)
            }}
          >
            <Visibility sx={{ mr: 1 }} fontSize="small" />
            Visualizar
          </MenuItem>
        )}
        {onEdit && goal.status !== GoalStatus.COMPLETED && (
          <MenuItem
            onClick={() => {
              handleMenuClose()
              onEdit(goal)
            }}
          >
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Editar
          </MenuItem>
        )}
        {onDelete && goal.status !== GoalStatus.ACTIVE && (
          <MenuItem
            onClick={() => {
              handleMenuClose()
              onDelete(goal)
            }}
          >
            <Delete sx={{ mr: 1 }} fontSize="small" />
            Excluir
          </MenuItem>
        )}
      </Menu>

      {goal.alerts && goal.alerts.filter(a => !a.read).length > 0 && (
        <Box
          position="absolute"
          top={8}
          right={8}
          bgcolor="error.main"
          borderRadius="50%"
          width={12}
          height={12}
        />
      )}
    </Card>
  )
}