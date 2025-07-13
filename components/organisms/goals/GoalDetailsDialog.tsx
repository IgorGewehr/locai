// components/dashboard/goals/GoalDetailsDialog.tsx
'use client'

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material'
import {
  Close,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  CheckCircle,
  Cancel,
  Schedule,
  Flag,
  Notifications,
  Timeline,
  Assessment,
  Warning,
  Info
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { 
  FinancialGoal, 
  GoalPerformance,
  GOAL_TYPE_LABELS,
  GOAL_CATEGORY_LABELS,
  GOAL_STATUS_LABELS
} from '@/lib/types/financial'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils/format'

interface GoalDetailsDialogProps {
  open: boolean
  onClose: () => void
  goal: FinancialGoal
  performance?: GoalPerformance
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

export default function GoalDetailsDialog({
  open,
  onClose,
  goal,
  performance
}: GoalDetailsDialogProps) {
  const [tabValue, setTabValue] = React.useState(0)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const formatValue = (value: number) => {
    if (goal.metric.includes('rate') || goal.metric.includes('percentage')) {
      return `${value.toFixed(1)}%`
    }
    if (goal.metric.includes('revenue') || goal.metric.includes('profit') || 
        goal.metric === 'mrr' || goal.metric === 'arr' || 
        goal.metric === 'cac' || goal.metric === 'ltv') {
      return formatCurrency(value)
    }
    return value.toLocaleString('pt-BR')
  }

  const getStatusIcon = () => {
    switch (goal.status) {
      case 'active':
        return <Schedule color="primary" />
      case 'completed':
        return <CheckCircle color="success" />
      case 'failed':
        return <Cancel color="error" />
      default:
        return <Info color="action" />
    }
  }

  const getTrendIcon = () => {
    if (!performance) return <TrendingFlat />
    
    switch (performance.trend) {
      case 'up':
        return <TrendingUp color="success" />
      case 'down':
        return <TrendingDown color="error" />
      default:
        return <TrendingFlat />
    }
  }

  // Preparar dados para o gráfico
  const chartData = goal.checkpoints?.map(checkpoint => ({
    date: format(new Date(checkpoint.date), 'dd/MM', { locale: ptBR }),
    value: checkpoint.value,
    progress: checkpoint.progress
  })) || []

  const daysRemaining = differenceInDays(goal.period.end, new Date())
  const totalDays = differenceInDays(goal.period.end, goal.period.start)
  const daysElapsed = totalDays - daysRemaining

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            {getStatusIcon()}
            <Typography variant="h6">
              {goal.name}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Summary Section */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={8}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Descrição
              </Typography>
              <Typography variant="body1">
                {goal.description || 'Sem descrição'}
              </Typography>

              <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                <Chip label={GOAL_TYPE_LABELS[goal.type]} size="small" />
                <Chip label={GOAL_CATEGORY_LABELS[goal.category]} size="small" />
                <Chip 
                  label={GOAL_STATUS_LABELS[goal.status]} 
                  size="small" 
                  color={goal.status === 'active' ? 'primary' : 
                         goal.status === 'completed' ? 'success' : 'default'}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Progresso Geral
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="h3">
                  {goal.progress}%
                </Typography>
                {getTrendIcon()}
              </Box>
              <LinearProgress
                variant="determinate"
                value={goal.progress}
                color={goal.progress >= 100 ? 'success' : 'primary'}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="caption">
                  {formatValue(goal.currentValue)}
                </Typography>
                <Typography variant="caption">
                  {formatValue(goal.targetValue)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Visão Geral" />
            <Tab label="Progresso" />
            <Tab label="Marcos" />
            <Tab label="Alertas" />
          </Tabs>
        </Box>

        {/* Tab: Visão Geral */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Informações da Meta
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Período"
                    secondary={`${format(goal.period.start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(goal.period.end, 'dd/MM/yyyy', { locale: ptBR })}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Duração Total"
                    secondary={`${totalDays} dias`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tempo Decorrido"
                    secondary={`${daysElapsed} dias (${Math.round((daysElapsed / totalDays) * 100)}%)`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Tempo Restante"
                    secondary={daysRemaining >= 0 ? `${daysRemaining} dias` : `Vencida há ${Math.abs(daysRemaining)} dias`}
                  />
                </ListItem>
              </List>
            </Grid>

            {performance && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Análise de Performance
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Ritmo Atual"
                      secondary={
                        <Chip
                          label={
                            performance.currentPace === 'ahead' ? 'Adiantado' :
                            performance.currentPace === 'behind' ? 'Atrasado' : 'No prazo'
                          }
                          size="small"
                          color={
                            performance.currentPace === 'ahead' ? 'success' :
                            performance.currentPace === 'behind' ? 'error' : 'primary'
                          }
                        />
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Média Diária"
                      secondary={formatValue(performance.dailyAverage)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Necessário por Dia"
                      secondary={formatValue(performance.requiredDailyRate)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Conclusão Projetada"
                      secondary={format(performance.projectedCompletion, 'dd/MM/yyyy', { locale: ptBR })}
                    />
                  </ListItem>
                </List>
              </Grid>
            )}
          </Grid>

          {performance && performance.contributingFactors.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>
                Fatores Contribuintes
              </Typography>
              <List dense>
                {performance.contributingFactors.map((factor, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {factor.impact === 'positive' ? 
                        <TrendingUp color="success" /> : 
                        <TrendingDown color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={factor.factor}
                      secondary={factor.description}
                    />
                    <Chip
                      label={factor.magnitude}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </TabPanel>

        {/* Tab: Progresso */}
        <TabPanel value={tabValue} index={1}>
          {chartData.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Evolução do Progresso
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatValue(value)}
                    />
                    <ReferenceLine 
                      y={goal.targetValue} 
                      label="Meta" 
                      stroke="red" 
                      strokeDasharray="5 5" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Histórico de Checkpoints
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell align="right">Valor</TableCell>
                        <TableCell align="right">Progresso</TableCell>
                        <TableCell>Notas</TableCell>
                        <TableCell align="center">Automático</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {goal.checkpoints?.map((checkpoint) => (
                        <TableRow key={checkpoint.id}>
                          <TableCell>
                            {format(new Date(checkpoint.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell align="right">
                            {formatValue(checkpoint.value)}
                          </TableCell>
                          <TableCell align="right">
                            {checkpoint.progress}%
                          </TableCell>
                          <TableCell>
                            {checkpoint.notes || '-'}
                          </TableCell>
                          <TableCell align="center">
                            {checkpoint.automated ? <CheckCircle color="success" fontSize="small" /> : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">
              Nenhum checkpoint registrado ainda
            </Alert>
          )}
        </TabPanel>

        {/* Tab: Marcos */}
        <TabPanel value={tabValue} index={2}>
          {goal.milestones && goal.milestones.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Marco</TableCell>
                    <TableCell align="right">Valor Alvo</TableCell>
                    <TableCell>Data Alvo</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Data Conclusão</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {goal.milestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell>{milestone.name}</TableCell>
                      <TableCell align="right">
                        {formatValue(milestone.targetValue)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(milestone.targetDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell align="center">
                        {milestone.achieved ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Schedule color="action" />
                        )}
                      </TableCell>
                      <TableCell>
                        {milestone.achievedDate ? 
                          format(new Date(milestone.achievedDate), 'dd/MM/yyyy', { locale: ptBR }) : 
                          '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">
              Nenhum marco definido para esta meta
            </Alert>
          )}
        </TabPanel>

        {/* Tab: Alertas */}
        <TabPanel value={tabValue} index={3}>
          {goal.alerts && goal.alerts.length > 0 ? (
            <List>
              {goal.alerts.map((alert) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <ListItemIcon>
                      {alert.type === 'warning' && <Warning color="warning" />}
                      {alert.type === 'success' && <CheckCircle color="success" />}
                      {alert.type === 'info' && <Info color="info" />}
                      {alert.type === 'critical' && <Cancel color="error" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.title}
                      secondary={
                        <>
                          <Typography variant="body2">
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(alert.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </Typography>
                        </>
                      }
                    />
                    {alert.actionRequired && (
                      <Chip label="Ação necessária" size="small" color="error" />
                    )}
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              Nenhum alerta registrado
            </Alert>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  )
}