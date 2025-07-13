'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Skeleton
} from '@mui/material'
import {
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as PaidIcon,
  Warning as OverdueIcon,
  Schedule as PendingIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { financialMovementService } from '@/lib/services/financial-movement-service'
import { 
  FinancialMovement, 
  FinancialSummary,
  CreateFinancialMovementInput,
  MOVEMENT_CATEGORIES,
  PAYMENT_METHODS,
  MovementType
} from '@/lib/types/financial-movement'
import { useAuth } from '@/contexts/AuthContext'

export default function FinanceiroSimplesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<FinancialMovement[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState(0)
  const [selectedMovement, setSelectedMovement] = useState<FinancialMovement | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateFinancialMovementInput>({
    type: 'income',
    category: 'rent',
    description: '',
    amount: 0,
    dueDate: new Date(),
    autoCharge: true
  })

  const tenantId = user?.tenantId || 'default'

  useEffect(() => {
    loadData()
  }, [currentTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const startDate = startOfMonth(now)
      const endDate = endOfMonth(now)

      // Carregar movimentações baseado na aba
      let filters: any = { tenantId }
      
      switch (currentTab) {
        case 0: // Todos
          filters = { ...filters, startDate, endDate }
          break
        case 1: // A Receber
          filters = { ...filters, type: 'income', status: 'pending' }
          break
        case 2: // A Pagar
          filters = { ...filters, type: 'expense', status: 'pending' }
          break
        case 3: // Vencidos
          const overdueMovements = await financialMovementService.getOverdue(tenantId)
          setMovements(overdueMovements)
          setLoading(false)
          return
      }

      const movementsList = await financialMovementService.list(filters)
      setMovements(movementsList)

      // Carregar resumo
      const summaryData = await financialMovementService.getSummary(tenantId, startDate, endDate)
      setSummary(summaryData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (selectedMovement) {
        // Atualizar movimentação existente
        await financialMovementService.update(selectedMovement.id, {
          description: formData.description,
          amount: formData.amount,
          dueDate: formData.dueDate
        })
      } else {
        // Criar nova movimentação
        await financialMovementService.create({
          ...formData,
          tenantId
        })
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
    }
  }

  const handleMarkAsPaid = async (movement: FinancialMovement) => {
    try {
      await financialMovementService.markAsPaid(movement.id, {
        paymentDate: new Date()
      })
      loadData()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja cancelar esta movimentação?')) {
      try {
        await financialMovementService.cancel(id, 'Cancelado pelo usuário')
        loadData()
      } catch (error) {
        console.error('Erro ao cancelar:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: 'rent',
      description: '',
      amount: 0,
      dueDate: new Date(),
      autoCharge: true
    })
    setSelectedMovement(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <PaidIcon color="success" />
      case 'overdue':
        return <OverdueIcon color="error" />
      default:
        return <PendingIcon color="warning" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'overdue':
        return 'error'
      case 'pending':
        return 'warning'
      default:
        return 'default'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Financeiro
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<IncomeIcon />}
            onClick={() => {
              resetForm()
              setFormData(prev => ({ ...prev, type: 'income' }))
              setDialogOpen(true)
            }}
            color="success"
          >
            Receber
          </Button>
          <Button
            variant="contained"
            startIcon={<ExpenseIcon />}
            onClick={() => {
              resetForm()
              setFormData(prev => ({ ...prev, type: 'expense' }))
              setDialogOpen(true)
            }}
            color="error"
          >
            Pagar
          </Button>
          <IconButton onClick={loadData}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Cards de Resumo */}
      {loading ? (
        <Grid container spacing={3} mb={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : summary && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Receitas
                    </Typography>
                    <Typography variant="h5" color="success.main">
                      {formatCurrency(summary.totalIncome)}
                    </Typography>
                  </Box>
                  <IncomeIcon color="success" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Despesas
                    </Typography>
                    <Typography variant="h5" color="error.main">
                      {formatCurrency(summary.totalExpenses)}
                    </Typography>
                  </Box>
                  <ExpenseIcon color="error" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Saldo
                    </Typography>
                    <Typography 
                      variant="h5" 
                      color={summary.balance >= 0 ? 'primary.main' : 'error.main'}
                    >
                      {formatCurrency(summary.balance)}
                    </Typography>
                  </Box>
                  <MoneyIcon color="primary" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Vencidos
                    </Typography>
                    <Typography variant="h5" color="error.main">
                      {formatCurrency(summary.overdue.amount)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {summary.overdue.count} movimentações
                    </Typography>
                  </Box>
                  <OverdueIcon color="error" fontSize="large" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs e Tabela */}
      <Card>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="Todos" />
          <Tab label="A Receber" />
          <Tab label="A Pagar" />
          <Tab label="Vencidos" />
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Vencimento</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Cobrança</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Skeleton />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">
                      Nenhuma movimentação encontrada
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(movement.status)}
                        label={movement.status === 'paid' ? 'Pago' : 
                               movement.status === 'overdue' ? 'Vencido' : 'Pendente'}
                        color={getStatusColor(movement.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{movement.description}</Typography>
                        {movement.clientName && (
                          <Typography variant="caption" color="textSecondary">
                            {movement.clientName}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={MOVEMENT_CATEGORIES[movement.category]} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {format(
                        movement.dueDate instanceof Date ? movement.dueDate : movement.dueDate.toDate(), 
                        'dd/MM/yyyy'
                      )}
                      {movement.overdueDays && movement.overdueDays > 0 && (
                        <Typography variant="caption" color="error" display="block">
                          {movement.overdueDays} dias atraso
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={movement.type === 'income' ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {movement.type === 'expense' && '-'}
                        {formatCurrency(movement.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {movement.autoCharge && movement.type === 'income' && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <WhatsAppIcon fontSize="small" color="success" />
                          <Typography variant="caption">
                            {movement.remindersSent || 0}x
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        {movement.status === 'pending' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleMarkAsPaid(movement)}
                            title="Marcar como pago"
                          >
                            <PaidIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedMovement(movement)
                            setFormData({
                              type: movement.type,
                              category: movement.category,
                              description: movement.description,
                              amount: movement.amount,
                              dueDate: movement.dueDate instanceof Date ? 
                                movement.dueDate : movement.dueDate.toDate(),
                              autoCharge: movement.autoCharge
                            })
                            setDialogOpen(true)
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        {movement.status !== 'cancelled' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(movement.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedMovement ? 'Editar' : 'Nova'} Movimentação
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as MovementType })}
                label="Tipo"
                disabled={!!selectedMovement}
              >
                <MenuItem value="income">Receita</MenuItem>
                <MenuItem value="expense">Despesa</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                label="Categoria"
              >
                {Object.entries(MOVEMENT_CATEGORIES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Valor"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              fullWidth
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>
              }}
            />

            <TextField
              label="Vencimento"
              type="date"
              value={format(formData.dueDate, 'yyyy-MM-dd')}
              onChange={(e) => setFormData({ ...formData, dueDate: new Date(e.target.value) })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            {formData.type === 'income' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoCharge}
                    onChange={(e) => setFormData({ ...formData, autoCharge: e.target.checked })}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <WhatsAppIcon color="success" />
                    <Typography>Cobrar automaticamente via WhatsApp</Typography>
                  </Box>
                }
              />
            )}

            {formData.autoCharge && formData.type === 'income' && (
              <Alert severity="info">
                Lembretes serão enviados 2 dias antes do vencimento e a cada 3 dias após o vencimento.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.description || formData.amount <= 0}
          >
            {selectedMovement ? 'Salvar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}