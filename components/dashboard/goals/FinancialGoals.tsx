// components/dashboard/goals/FinancialGoals.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Tab,
  Tabs,
  Stack,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material'
import {
  Add,
  Refresh,
  TrendingUp,
  EmojiEvents,
  Warning,
  Assessment,
  Sync
} from '@mui/icons-material'
import { 
  FinancialGoal, 
  GoalStatus, 
  GoalCategory,
  GoalsDashboard,
  GoalPerformance,
  GOAL_CATEGORY_LABELS
} from '@/lib/types/financial'
import GoalCard from './GoalCard'
import CreateGoalDialog from './CreateGoalDialog'
import GoalDetailsDialog from './GoalDetailsDialog'
import AddCheckpointDialog from './AddCheckpointDialog'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils/format'

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
      id={`goals-tabpanel-${index}`}
      aria-labelledby={`goals-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function FinancialGoals() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [dashboard, setDashboard] = useState<GoalsDashboard | null>(null)
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [performances, setPerformances] = useState<Record<string, GoalPerformance>>({})

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [checkpointDialogOpen, setCheckpointDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null)

  // Fetch data
  const fetchData = async () => {
    if (!user?.tenantId) return

    try {
      setLoading(true)
      setError(null)

      // Buscar dashboard completo
      const dashboardResponse = await fetch('/api/goals?dashboard=true')
      if (!dashboardResponse.ok) throw new Error('Erro ao carregar dashboard')
      const dashboardData = await dashboardResponse.json()
      setDashboard(dashboardData)

      // Buscar metas com performance
      const goalsResponse = await fetch('/api/goals')
      if (!goalsResponse.ok) throw new Error('Erro ao carregar metas')
      const goalsData = await goalsResponse.json()
      setGoals(goalsData.goals)

      // Buscar performance de cada meta ativa
      const activeGoals = goalsData.goals.filter((g: FinancialGoal) => 
        g.status === GoalStatus.ACTIVE
      )

      const performancePromises = activeGoals.map(async (goal: FinancialGoal) => {
        const response = await fetch(`/api/goals?id=${goal.id}&includePerformance=true`)
        if (response.ok) {
          const data = await response.json()
          return { goalId: goal.id, performance: data.performance }
        }
        return null
      })

      const performanceResults = await Promise.all(performancePromises)
      const performanceMap = performanceResults.reduce((acc, result) => {
        if (result) {
          acc[result.goalId] = result.performance
        }
        return acc
      }, {} as Record<string, GoalPerformance>)

      setPerformances(performanceMap)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleCreateGoal = () => {
    setCreateDialogOpen(true)
  }

  const handleViewGoal = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    setDetailsDialogOpen(true)
  }

  const handleEditGoal = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    setCreateDialogOpen(true)
  }

  const handleDeleteGoal = async (goal: FinancialGoal) => {
    if (!confirm(`Tem certeza que deseja excluir a meta "${goal.name}"?`)) return

    try {
      const response = await fetch(`/api/goals?id=${goal.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Erro ao excluir meta')

      await fetchData()
    } catch (error) {
      alert('Erro ao excluir meta')
    }
  }

  const handleAddCheckpoint = (goal: FinancialGoal) => {
    setSelectedGoal(goal)
    setCheckpointDialogOpen(true)
  }

  const handleSyncMetrics = async () => {
    try {
      const response = await fetch('/api/goals/sync-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) throw new Error('Erro ao sincronizar métricas')

      const result = await response.json()
      alert(result.message)
      await fetchData()
    } catch (error) {
      alert('Erro ao sincronizar métricas')
    }
  }

  const filterGoalsByStatus = (status?: GoalStatus) => {
    if (!status) return goals
    return goals.filter(g => g.status === status)
  }

  const filterGoalsByCategory = (category: GoalCategory) => {
    return goals.filter(g => g.category === category)
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={fetchData}>
          Tentar novamente
        </Button>
      }>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            Metas Financeiras
          </Typography>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Sincronizar com métricas">
              <IconButton onClick={handleSyncMetrics}>
                <Sync />
              </IconButton>
            </Tooltip>
            <Tooltip title="Atualizar">
              <IconButton onClick={fetchData}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateGoal}
            >
              Nova Meta
            </Button>
          </Stack>
        </Box>

        {/* Summary Cards */}
        {dashboard && (
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Metas Ativas
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.summary.activeGoals}
                      </Typography>
                    </Box>
                    <Assessment color="primary" sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Progresso Médio
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.summary.averageProgress.toFixed(1)}%
                      </Typography>
                    </Box>
                    <TrendingUp color="success" sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={dashboard.summary.averageProgress} 
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        No Prazo
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.summary.onTrackPercentage.toFixed(0)}%
                      </Typography>
                    </Box>
                    <EmojiEvents color="warning" sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        Precisam Atenção
                      </Typography>
                      <Typography variant="h4">
                        {dashboard.needsAttention.length}
                      </Typography>
                    </Box>
                    <Warning color="error" sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Todas" />
          <Tab label="Ativas" />
          <Tab label="Concluídas" />
          {Object.entries(GOAL_CATEGORY_LABELS).map(([key, label]) => (
            <Tab key={key} label={label} />
          ))}
        </Tabs>
      </Paper>

      {/* Goals Grid */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {goals.map(goal => (
            <Grid item xs={12} md={6} lg={4} key={goal.id}>
              <GoalCard
                goal={goal}
                performance={performances[goal.id]}
                onView={handleViewGoal}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                onAddCheckpoint={handleAddCheckpoint}
              />
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {filterGoalsByStatus(GoalStatus.ACTIVE).map(goal => (
            <Grid item xs={12} md={6} lg={4} key={goal.id}>
              <GoalCard
                goal={goal}
                performance={performances[goal.id]}
                onView={handleViewGoal}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
                onAddCheckpoint={handleAddCheckpoint}
              />
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {filterGoalsByStatus(GoalStatus.COMPLETED).map(goal => (
            <Grid item xs={12} md={6} lg={4} key={goal.id}>
              <GoalCard
                goal={goal}
                performance={performances[goal.id]}
                onView={handleViewGoal}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
              />
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Category Tabs */}
      {Object.entries(GOAL_CATEGORY_LABELS).map(([key, label], index) => (
        <TabPanel key={key} value={tabValue} index={index + 3}>
          <Grid container spacing={3}>
            {filterGoalsByCategory(key as GoalCategory).map(goal => (
              <Grid item xs={12} md={6} lg={4} key={goal.id}>
                <GoalCard
                  goal={goal}
                  performance={performances[goal.id]}
                  onView={handleViewGoal}
                  onEdit={handleEditGoal}
                  onDelete={handleDeleteGoal}
                  onAddCheckpoint={handleAddCheckpoint}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      ))}

      {/* Empty State */}
      {goals.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma meta cadastrada
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Defina metas para acompanhar o progresso do seu negócio
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateGoal}
          >
            Criar Primeira Meta
          </Button>
        </Box>
      )}

      {/* Dialogs */}
      {createDialogOpen && (
        <CreateGoalDialog
          open={createDialogOpen}
          onClose={() => {
            setCreateDialogOpen(false)
            setSelectedGoal(null)
          }}
          onSuccess={() => {
            setCreateDialogOpen(false)
            setSelectedGoal(null)
            fetchData()
          }}
          goal={selectedGoal}
        />
      )}

      {detailsDialogOpen && selectedGoal && (
        <GoalDetailsDialog
          open={detailsDialogOpen}
          onClose={() => {
            setDetailsDialogOpen(false)
            setSelectedGoal(null)
          }}
          goal={selectedGoal}
          performance={performances[selectedGoal.id]}
        />
      )}

      {checkpointDialogOpen && selectedGoal && (
        <AddCheckpointDialog
          open={checkpointDialogOpen}
          onClose={() => {
            setCheckpointDialogOpen(false)
            setSelectedGoal(null)
          }}
          goal={selectedGoal}
          onSuccess={() => {
            setCheckpointDialogOpen(false)
            setSelectedGoal(null)
            fetchData()
          }}
        />
      )}
    </Box>
  )
}