'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Stack,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  Autocomplete,
  InputAdornment,
  Menu,
  CircularProgress,
  Snackbar,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Collapse,
  FormHelperText,
  Fab,
} from '@mui/material';
import {
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Add,
  Edit,
  Delete,
  Download,
  CalendarMonth,
  AccountBalance,
  Receipt,
  Assessment,
  Home,
  CheckCircle,
  Schedule,
  Warning,
  FilterList,
  Print,
  ArrowUpward,
  ArrowDownward,
  Repeat,
  MoreVert,
  Cancel,
  Check,
  Close,
  Visibility,
  ExpandMore,
  ExpandLess,
  DateRange,
  Category,
  PaymentOutlined,
  Person,
  Apartment,
  Search,
  Clear,
  AttachFile,
  LocalOffer,
  AccessTime,
  Info,
  NotificationsActive,
  NotificationsOff,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, addMonths, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, Client, Reservation } from '@/lib/types';
import { Property } from '@/lib/types/property';
import { BillingSettings } from '@/lib/types/billing';
import { transactionService } from '@/lib/services/transaction-service';
import { billingService } from '@/lib/services/billing-service';
import { propertyService, clientService, reservationService } from '@/lib/firebase/firestore';
import { useAuth } from '@/lib/hooks/useAuth';

interface TransactionFormData {
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed';
  propertyId?: string;
  clientId?: string;
  reservationId?: string;
  paymentMethod: string;
  notes?: string;
  tags?: string[];
  // Campos para recorrência
  isRecurring: boolean;
  recurringType?: 'monthly' | 'weekly' | 'yearly';
  recurringEndDate?: string;
  // Campos para cobrança automática
  enableAutomaticBilling?: boolean;
  reminderDays?: number;
}

interface TransactionFilters {
  type?: 'all' | 'income' | 'expense';
  status?: 'all' | 'pending' | 'completed' | 'cancelled';
  category?: string;
  propertyId?: string;
  clientId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  searchTerm?: string;
  isRecurring?: boolean;
  tags?: string[];
}

const incomeCategories = {
  'reservation': { name: 'Reserva', subcategories: ['Diária', 'Taxa de Limpeza', 'Taxa de Reserva'] },
  'other': { name: 'Outros', subcategories: ['Reembolso', 'Venda de Produtos', 'Serviços Extras'] },
};

const expenseCategories = {
  'maintenance': { name: 'Manutenção', subcategories: ['Reparos', 'Melhorias', 'Equipamentos'] },
  'cleaning': { name: 'Limpeza', subcategories: ['Limpeza Regular', 'Produtos', 'Lavanderia'] },
  'commission': { name: 'Comissões', subcategories: ['Plataforma', 'Agente', 'Indicação'] },
  'other': { name: 'Outros', subcategories: ['Marketing', 'Administrativo', 'Impostos'] },
};

const paymentMethods = {
  'pix': 'PIX',
  'credit_card': 'Cartão de Crédito',
  'debit_card': 'Cartão de Débito',
  'bank_transfer': 'Transferência',
  'cash': 'Dinheiro',
  'stripe': 'Stripe',
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const defaultFilters: TransactionFilters = {
  type: 'all',
  status: 'all',
  dateRange: {
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  }
};

export default function FinanceiroPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'dashboard' | 'transactions' | 'recurring'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<Transaction[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [stats, setStats] = useState<any>(null);
  const [previousMonthStats, setPreviousMonthStats] = useState<any>(null);
  const [expandedRecurring, setExpandedRecurring] = useState<string[]>([]);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);

  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'income',
    category: '',
    description: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending',
    paymentMethod: 'pix',
    isRecurring: false,
    tags: [],
    enableAutomaticBilling: true,
    reminderDays: 2
  });

  useEffect(() => {
    loadData();
    loadBillingSettings();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar dados relacionados
      const [propertiesData, clientsData, reservationsData] = await Promise.all([
        propertyService.getAll(),
        clientService.getAll(),
        reservationService.getAll(),
      ]);

      setProperties(propertiesData);
      setClients(clientsData);
      setReservations(reservationsData);

      // Carregar transações com filtros
      const transactionFilters: any = {};

      if (filters.type && filters.type !== 'all') {
        transactionFilters.type = filters.type;
      }
      if (filters.status && filters.status !== 'all') {
        transactionFilters.status = filters.status;
      }
      if (filters.category) {
        transactionFilters.category = filters.category;
      }
      if (filters.propertyId) {
        transactionFilters.propertyId = filters.propertyId;
      }
      if (filters.clientId) {
        transactionFilters.clientId = filters.clientId;
      }
      if (filters.dateRange) {
        transactionFilters.startDate = new Date(filters.dateRange.start);
        transactionFilters.endDate = new Date(filters.dateRange.end);
      }
      if (filters.isRecurring !== undefined) {
        transactionFilters.isRecurring = filters.isRecurring;
      }

      const { transactions: transactionsData } = await transactionService.getFiltered(transactionFilters);
      setTransactions(transactionsData);

      // Carregar transações recorrentes
      const recurringData = await transactionService.getRecurring();
      setRecurringTransactions(recurringData);

      // Calcular estatísticas
      const statsData = await transactionService.getStats(transactionFilters);
      setStats(statsData);
      
      // Calcular estatísticas do mês anterior para comparação
      const previousMonth = startOfMonth(subMonths(new Date(), 1));
      const previousMonthEnd = endOfMonth(previousMonth);
      const previousStats = await transactionService.getStats({
        ...transactionFilters,
        startDate: previousMonth,
        endDate: previousMonthEnd
      });
      setPreviousMonthStats(previousStats);

    } catch (error) {

      showSnackbar('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBillingSettings = async () => {
    try {
      const settings = await billingService.getSettings(user?.tenantId || '');
      if (settings) {
        setBillingSettings(settings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de cobrança:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      category: '',
      description: '',
      amount: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      paymentMethod: 'pix',
      isRecurring: false,
      tags: [],
      enableAutomaticBilling: billingSettings?.enabled || false,
      reminderDays: billingSettings?.defaultReminderDays || 2
    });
    setShowTransactionDialog(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      subcategory: transaction.subcategory || '',
      description: transaction.description,
      amount: transaction.amount,
      date: format(transaction.date, 'yyyy-MM-dd'),
      status: transaction.status === 'cancelled' ? 'pending' : transaction.status,
      propertyId: transaction.propertyId || '',
      clientId: transaction.clientId || '',
      reservationId: transaction.reservationId || '',
      paymentMethod: transaction.paymentMethod || '',
      notes: transaction.notes || '',
      tags: transaction.tags || [],
      isRecurring: transaction.isRecurring,
      recurringType: transaction.recurringType || 'monthly',
      recurringEndDate: transaction.recurringEndDate ? format(transaction.recurringEndDate, 'yyyy-MM-dd') : '',
      enableAutomaticBilling: false, // TODO: buscar configuração específica da transação
      reminderDays: billingSettings?.defaultReminderDays || 2
    });
    setShowTransactionDialog(true);
  };

  const handleSaveTransaction = async () => {
    try {
      setSaving(true);

      if (formData.isRecurring && !editingTransaction) {
        // Criar transação recorrente
        await transactionService.createRecurringTransaction({
          baseTransaction: {
            type: formData.type,
            category: formData.category as any,
            subcategory: formData.subcategory,
            description: formData.description,
            amount: formData.amount,
            date: new Date(formData.date),
            status: formData.status,
            propertyId: formData.propertyId,
            clientId: formData.clientId,
            reservationId: formData.reservationId,
            paymentMethod: formData.paymentMethod as any,
            notes: formData.notes,
            tags: formData.tags,
            createdByAI: false,
            tenantId: user?.tenantId
          } as any,
          recurringType: formData.recurringType!,
          recurringEndDate: new Date(formData.recurringEndDate!),
          createFirstNow: true
        });
        showSnackbar('Transação recorrente criada com sucesso', 'success');
      } else {
        // Criar ou atualizar transação normal
        const transactionData: any = {
          type: formData.type,
          category: formData.category,
          subcategory: formData.subcategory,
          description: formData.description,
          amount: formData.amount,
          date: new Date(formData.date),
          status: formData.status,
          propertyId: formData.propertyId,
          clientId: formData.clientId,
          reservationId: formData.reservationId,
          paymentMethod: formData.paymentMethod as any,
          notes: formData.notes,
          tags: formData.tags,
          isRecurring: false,
          createdByAI: false,
          tenantId: user?.tenantId
        };

        if (editingTransaction) {
          await transactionService.update(editingTransaction.id, transactionData);
          showSnackbar('Transação atualizada com sucesso', 'success');
        } else {
          const newTransaction = await transactionService.create(transactionData);
          
          // Criar lembretes de cobrança se habilitado
          if (formData.enableAutomaticBilling && formData.type === 'income' && formData.clientId && newTransaction.id) {
            try {
              await billingService.createReminder({
                transactionId: newTransaction.id,
                clientId: formData.clientId,
                type: 'before_due',
                scheduledDate: addDays(new Date(formData.date), -formData.reminderDays!),
                daysFromDue: -formData.reminderDays!
              });
              
              if (billingSettings?.defaultOverdueDays && billingSettings.defaultOverdueDays > 0) {
                await billingService.createReminder({
                  transactionId: newTransaction.id,
                  clientId: formData.clientId,
                  type: 'overdue',
                  scheduledDate: addDays(new Date(formData.date), billingSettings.defaultOverdueDays),
                  daysFromDue: billingSettings.defaultOverdueDays
                });
              }
            } catch (error) {
              console.error('Erro ao criar lembretes:', error);
            }
          }
          
          showSnackbar('Transação criada com sucesso', 'success');
        }
      }

      setShowTransactionDialog(false);
      loadData();
    } catch (error) {

      showSnackbar('Erro ao salvar transação', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await transactionService.delete(id);
        showSnackbar('Transação excluída com sucesso', 'success');
        loadData();
      } catch (error) {

        showSnackbar('Erro ao excluir transação', 'error');
      }
    }
  };

  const handleConfirmTransaction = async (transactionId: string) => {
    try {
      await transactionService.confirmTransaction(transactionId, user?.id || 'admin');
      showSnackbar('Transação confirmada com sucesso', 'success');
      loadData();
    } catch (error) {

      showSnackbar('Erro ao confirmar transação', 'error');
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      await transactionService.cancelTransaction(transactionId, 'Cancelada pelo usuário');
      showSnackbar('Transação cancelada com sucesso', 'success');
      loadData();
    } catch (error) {

      showSnackbar('Erro ao cancelar transação', 'error');
    }
  };

  const handleBulkAction = async (action: 'confirm' | 'cancel') => {
    try {
      if (action === 'confirm') {
        await transactionService.bulkUpdateStatus(selectedTransactions, 'completed', user?.id || 'admin');
        showSnackbar(`${selectedTransactions.length} transações confirmadas`, 'success');
      } else {
        await transactionService.bulkUpdateStatus(selectedTransactions, 'cancelled');
        showSnackbar(`${selectedTransactions.length} transações canceladas`, 'success');
      }
      setSelectedTransactions([]);
      loadData();
    } catch (error) {

      showSnackbar('Erro ao processar ação em lote', 'error');
    }
  };

  const handleFilterChange = (newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip label="Confirmado" color="success" size="small" icon={<CheckCircle />} />;
      case 'pending':
        return <Chip label="Pendente" color="warning" size="small" icon={<Schedule />} />;
      case 'cancelled':
        return <Chip label="Cancelado" color="error" size="small" icon={<Cancel />} />;
      default:
        return null;
    }
  };

  const getTypeChip = (type: 'income' | 'expense') => {
    return (
      <Chip
        label={type === 'income' ? 'Receita' : 'Despesa'}
        size="small"
        color={type === 'income' ? 'success' : 'error'}
        icon={type === 'income' ? <ArrowUpward /> : <ArrowDownward />}
      />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const toggleRecurringExpand = (id: string) => {
    setExpandedRecurring(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Preparar dados para gráficos
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
    });

    const income = monthTransactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: format(date, 'MMM', { locale: ptBR }),
      receitas: income,
      despesas: expenses,
      lucro: income - expenses,
    };
  });

  const categoryData = stats?.byCategory 
    ? Object.entries(stats.byCategory)
        .filter(([_, value]) => (value as number) > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        gap: 2,
        mb: 3 
      }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Financeiro
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{ 
              display: { xs: 'none', md: 'flex' },
              flexGrow: { xs: 1, sm: 0 }
            }}
          >
            <ToggleButton value="dashboard">
              <Assessment sx={{ mr: { xs: 0, sm: 1 } }} />
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Dashboard</Box>
            </ToggleButton>
            <ToggleButton value="transactions">
              <Receipt sx={{ mr: { xs: 0, sm: 1 } }} />
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Transações</Box>
            </ToggleButton>
            <ToggleButton value="recurring">
              <Repeat sx={{ mr: { xs: 0, sm: 1 } }} />
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Recorrentes</Box>
            </ToggleButton>
          </ToggleButtonGroup>
          
          {/* Mobile view mode selector */}
          <Select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'dashboard' | 'transactions' | 'recurring')}
            size="small"
            sx={{ display: { xs: 'flex', md: 'none' }, mb: { xs: 1, sm: 0 } }}
          >
            <MenuItem value="dashboard">Dashboard</MenuItem>
            <MenuItem value="transactions">Transações</MenuItem>
            <MenuItem value="recurring">Recorrentes</MenuItem>
          </Select>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddTransaction}
            fullWidth={{ xs: true, sm: false }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Nova Transação</Box>
            <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Nova</Box>
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <Badge color="primary" variant="dot" invisible={!Object.keys(filters).some(key => key !== 'dateRange' && filters[key as keyof TransactionFilters])}>
                <FilterList />
              </Badge>
            </IconButton>
            <IconButton sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <Download />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Filtros Expandíveis */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={filters.type || 'all'}
                    onChange={(e) => handleFilterChange({ type: e.target.value as any })}
                    label="Tipo"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="income">Receitas</MenuItem>
                    <MenuItem value="expense">Despesas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || 'all'}
                    onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                    label="Status"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="pending">Pendente</MenuItem>
                    <MenuItem value="completed">Confirmado</MenuItem>
                    <MenuItem value="cancelled">Cancelado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Propriedade</InputLabel>
                  <Select
                    value={filters.propertyId || ''}
                    onChange={(e) => handleFilterChange({ propertyId: e.target.value })}
                    label="Propriedade"
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {properties.map(prop => (
                      <MenuItem key={prop.id} value={prop.id}>{prop.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={filters.clientId || ''}
                    onChange={(e) => handleFilterChange({ clientId: e.target.value })}
                    label="Cliente"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {clients.map(client => (
                      <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Data Início"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => handleFilterChange({ 
                    dateRange: { 
                      ...filters.dateRange!, 
                      start: e.target.value 
                    } 
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Data Fim"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => handleFilterChange({ 
                    dateRange: { 
                      ...filters.dateRange!, 
                      end: e.target.value 
                    } 
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por descrição..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.isRecurring || false}
                      onChange={(e) => handleFilterChange({ isRecurring: e.target.checked })}
                    />
                  }
                  label="Apenas Recorrentes"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Clear />}
                  onClick={() => setFilters(defaultFilters)}
                >
                  Limpar Filtros
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {viewMode === 'dashboard' ? (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Receitas
                      </Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {formatCurrency(stats?.totalIncome || 0)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {previousMonthStats && previousMonthStats.totalIncome > 0 ? (
                          <>
                            {stats.totalIncome >= previousMonthStats.totalIncome ? (
                              <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                            ) : (
                              <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                            )}
                            <Typography 
                              variant="caption" 
                              color={stats.totalIncome >= previousMonthStats.totalIncome ? 'success.main' : 'error.main'}
                            >
                              {stats.totalIncome >= previousMonthStats.totalIncome ? '+' : ''}
                              {((stats.totalIncome - previousMonthStats.totalIncome) / previousMonthStats.totalIncome * 100).toFixed(1)}% vs mês anterior
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Sem dados do mês anterior
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2,
                      bgcolor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ArrowUpward sx={{ color: 'success.main' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Despesas
                      </Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {formatCurrency(stats?.totalExpenses || 0)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {previousMonthStats && previousMonthStats.totalExpenses > 0 ? (
                          <>
                            {stats.totalExpenses <= previousMonthStats.totalExpenses ? (
                              <TrendingDown sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                            ) : (
                              <TrendingUp sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                            )}
                            <Typography 
                              variant="caption" 
                              color={stats.totalExpenses <= previousMonthStats.totalExpenses ? 'success.main' : 'error.main'}
                            >
                              {stats.totalExpenses > previousMonthStats.totalExpenses ? '+' : ''}
                              {((stats.totalExpenses - previousMonthStats.totalExpenses) / previousMonthStats.totalExpenses * 100).toFixed(1)}% vs mês anterior
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Sem dados do mês anterior
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2,
                      bgcolor: 'error.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ArrowDownward sx={{ color: 'error.main' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Saldo
                      </Typography>
                      <Typography variant="h5" fontWeight={600} color={stats?.balance >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(stats?.balance || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Lucro líquido do período
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2,
                      bgcolor: stats?.balance >= 0 ? 'success.light' : 'error.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <AccountBalance sx={{ color: stats?.balance >= 0 ? 'success.main' : 'error.main' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        A Receber
                      </Typography>
                      <Typography variant="h5" fontWeight={600} color="warning.main">
                        {formatCurrency(stats?.pendingIncome || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {stats?.transactionCount?.pending || 0} pendências
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2,
                      bgcolor: 'warning.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Schedule sx={{ color: 'warning.main' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Fluxo de Caixa Mensal
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="receitas"
                        stackId="1"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="despesas"
                        stackId="2"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.6}
                      />
                      <Line
                        type="monotone"
                        dataKey="lucro"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Por Categoria
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : viewMode === 'transactions' ? (
        /* Transactions View */
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Transações ({transactions.length})
              </Typography>
              {selectedTransactions.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<Check />}
                    onClick={() => handleBulkAction('confirm')}
                  >
                    Confirmar ({selectedTransactions.length})
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={() => handleBulkAction('cancel')}
                  >
                    Cancelar ({selectedTransactions.length})
                  </Button>
                </Box>
              )}
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: { xs: 600, sm: 800, md: 1000 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions(transactions.map(t => t.id));
                          } else {
                            setSelectedTransactions([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Descrição</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Relacionamentos</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Pagamento</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow 
                      key={transaction.id}
                      selected={selectedTransactions.includes(transaction.id)}
                    >
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTransactions(prev => [...prev, transaction.id]);
                            } else {
                              setSelectedTransactions(prev => prev.filter(id => id !== transaction.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {format(transaction.date, 'dd/MM/yyyy')}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {transaction.isRecurring && (
                              <Chip
                                size="small"
                                label={transaction.recurringType}
                                icon={<Repeat />}
                              />
                            )}
                            {transaction.type === 'income' && transaction.status === 'pending' && billingSettings?.enabled && (
                              <Tooltip title="Cobrança automática ativa">
                                <Chip
                                  size="small"
                                  label="Auto"
                                  icon={<NotificationsActive />}
                                  color="success"
                                  variant="outlined"
                                />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{getTypeChip(transaction.type)}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{transaction.category}</Typography>
                          {transaction.subcategory && (
                            <Typography variant="caption" color="text.secondary">
                              {transaction.subcategory}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{transaction.description}</Typography>
                          {transaction.notes && (
                            <Tooltip title={transaction.notes}>
                              <Info sx={{ fontSize: 16, ml: 0.5, color: 'text.secondary' }} />
                            </Tooltip>
                          )}
                          {transaction.tags && transaction.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              {transaction.tags.map(tag => (
                                <Chip
                                  key={tag}
                                  size="small"
                                  label={tag}
                                  icon={<LocalOffer />}
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Stack spacing={0.5}>
                          {transaction.propertyId && (
                            <Link
                              href={`/dashboard/properties/${transaction.propertyId}`}
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
                            >
                              <Apartment sx={{ fontSize: 16 }} />
                              {properties.find(p => p.id === transaction.propertyId)?.title || 'Propriedade'}
                            </Link>
                          )}
                          {transaction.clientId && (
                            <Link
                              href={`/dashboard/clients/${transaction.clientId}`}
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
                            >
                              <Person sx={{ fontSize: 16 }} />
                              {clients.find(c => c.id === transaction.clientId)?.name || 'Cliente'}
                            </Link>
                          )}
                          {transaction.reservationId && (
                            <Link
                              href={`/dashboard/reservations/${transaction.reservationId}`}
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}
                            >
                              <CalendarMonth sx={{ fontSize: 16 }} />
                              Reserva #{transaction.reservationId.slice(-6)}
                            </Link>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                          fontWeight={500}
                        >
                          {transaction.type === 'expense' && '-'}
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{getStatusChip(transaction.status)}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Chip
                          size="small"
                          label={paymentMethods[transaction.paymentMethod]}
                          icon={<PaymentOutlined />}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {transaction.status === 'pending' && (
                            <>
                              <Tooltip title="Confirmar">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleConfirmTransaction(transaction.id)}
                                >
                                  <Check fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancelar">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleCancelTransaction(transaction.id)}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleEditTransaction(transaction)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => handleDeleteTransaction(transaction.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        /* Recurring Transactions View */
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Transações Recorrentes ({recurringTransactions.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setFormData(prev => ({ ...prev, isRecurring: true }));
                  setShowTransactionDialog(true);
                }}
              >
                Nova Recorrente
              </Button>
            </Box>

            <List>
              {recurringTransactions.map((transaction) => (
                <Box key={transaction.id}>
                  <ListItem
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTypeChip(transaction.type)}
                          <Typography variant="body1" fontWeight={500}>
                            {transaction.description}
                          </Typography>
                          <Chip
                            size="small"
                            label={transaction.recurringType}
                            icon={<Repeat />}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Valor: {formatCurrency(transaction.amount)} | 
                            Categoria: {transaction.category} | 
                            Até: {transaction.recurringEndDate ? format(transaction.recurringEndDate, 'dd/MM/yyyy') : 'Sem fim'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => toggleRecurringExpand(transaction.id)}
                      >
                        {expandedRecurring.includes(transaction.id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Collapse in={expandedRecurring.includes(transaction.id)}>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      <Alert severity="info" sx={{ mb: 1 }}>
                        Próximas ocorrências serão criadas automaticamente
                      </Alert>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={() => handleDeleteTransaction(transaction.id)}
                      >
                        Cancelar Recorrência
                      </Button>
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onClose={() => setShowTransactionDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <ToggleButtonGroup
                value={formData.type}
                exclusive
                onChange={(_, newType) => newType && setFormData(prev => ({ ...prev, type: newType }))}
                fullWidth
              >
                <ToggleButton value="income" color="success">
                  <ArrowUpward sx={{ mr: 1 }} />
                  Receita
                </ToggleButton>
                <ToggleButton value="expense" color="error">
                  <ArrowDownward sx={{ mr: 1 }} />
                  Despesa
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
                  label="Categoria"
                >
                  {Object.entries(formData.type === 'income' ? incomeCategories : expenseCategories).map(([key, value]) => (
                    <MenuItem key={key} value={key}>{value.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!formData.category}>
                <InputLabel>Subcategoria</InputLabel>
                <Select
                  value={formData.subcategory || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  label="Subcategoria"
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {formData.category && (
                    formData.type === 'income' 
                      ? incomeCategories[formData.category as keyof typeof incomeCategories]?.subcategories 
                      : expenseCategories[formData.category as keyof typeof expenseCategories]?.subcategories
                  )?.map(sub => (
                    <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Data"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  label="Status"
                >
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="completed">Confirmado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Método de Pagamento</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  label="Método de Pagamento"
                >
                  {Object.entries(paymentMethods).map(([key, value]) => (
                    <MenuItem key={key} value={key}>{value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Relacionamentos */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Relacionamentos (opcional)
                </Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Propriedade</InputLabel>
                <Select
                  value={formData.propertyId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, propertyId: e.target.value }))}
                  label="Propriedade"
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {properties.map(prop => (
                    <MenuItem key={prop.id} value={prop.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Apartment sx={{ fontSize: 20 }} />
                        {prop.title}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={formData.clientId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                  label="Cliente"
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {clients.map(client => (
                    <MenuItem key={client.id} value={client.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ fontSize: 20 }} />
                        {client.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Reserva</InputLabel>
                <Select
                  value={formData.reservationId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, reservationId: e.target.value }))}
                  label="Reserva"
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {reservations.map(res => (
                    <MenuItem key={res.id} value={res.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonth sx={{ fontSize: 20 }} />
                        #{res.id.slice(-6)} - {format((res.checkIn as any)?.toDate ? (res.checkIn as any).toDate() : new Date(res.checkIn), 'dd/MM')}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observações"
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={formData.tags || []}
                onChange={(_, newValue) => setFormData(prev => ({ ...prev, tags: newValue }))}
                renderInput={(params) => (
                  <TextField
                    {...(params as any)}
                    label="Tags"
                    placeholder="Digite e pressione Enter"
                    helperText="Use tags para categorizar melhor suas transações"
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      size="small"
                      icon={<LocalOffer />}
                      {...getTagProps({ index })}
                    />
                  ))
                }
              />
            </Grid>

            {/* Cobrança Automática */}
            {formData.type === 'income' && formData.clientId && billingSettings?.enabled && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Cobrança Automática
                    </Typography>
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enableAutomaticBilling}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableAutomaticBilling: e.target.checked }))}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <NotificationsActive sx={{ fontSize: 20 }} />
                        Ativar cobrança automática via WhatsApp
                      </Box>
                    }
                  />
                  {formData.enableAutomaticBilling && (
                    <FormHelperText>
                      Lembretes serão enviados {formData.reminderDays} {formData.reminderDays === 1 ? 'dia' : 'dias'} antes do vencimento
                    </FormHelperText>
                  )}
                </Grid>

                {formData.enableAutomaticBilling && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Dias antes do vencimento"
                      value={formData.reminderDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, reminderDays: parseInt(e.target.value) || 2 }))}
                      InputProps={{
                        inputProps: { min: 0, max: 30 }
                      }}
                      helperText="Quantos dias antes do vencimento enviar o lembrete"
                    />
                  </Grid>
                )}
              </>
            )}

            {/* Recorrência */}
            {!editingTransaction && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                      />
                    }
                    label="Transação Recorrente"
                  />
                </Grid>

                {formData.isRecurring && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Recorrência</InputLabel>
                        <Select
                          value={formData.recurringType || 'monthly'}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurringType: e.target.value as any }))}
                          label="Tipo de Recorrência"
                        >
                          <MenuItem value="weekly">Semanal</MenuItem>
                          <MenuItem value="monthly">Mensal</MenuItem>
                          <MenuItem value="yearly">Anual</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Recorrer até"
                        value={formData.recurringEndDate || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        helperText="Data final para criação de transações"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          Transações recorrentes serão criadas automaticamente no sistema.
                          A primeira transação será criada na data selecionada acima.
                        </Typography>
                      </Alert>
                    </Grid>
                  </>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransactionDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveTransaction}
            disabled={saving || !formData.category || !formData.description || formData.amount <= 0}
          >
            {saving ? <CircularProgress size={24} /> : (editingTransaction ? 'Salvar' : 'Adicionar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add transaction"
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={handleAddTransaction}
      >
        <Add />
      </Fab>
    </Box>
  );
}