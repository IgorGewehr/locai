'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Stack,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Payment,
  Schedule,
  CheckCircle,
  Warning,
  AttachMoney,
  Download,
  Upload,
  FilterList,
  Search,
  CalendarMonth,
  Receipt,
  Notifications,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Assessment,
  Refresh,
  AttachFile,
  RemoveRedEye,
  Print,
  Share,
  MoreVert,
  Calculate
} from '@mui/icons-material';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Account, 
  AccountStatus, 
  AccountCategory,
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_CATEGORY_LABELS 
} from '@/lib/types/accounts';
import { accountsService } from '@/lib/services/accounts-service';
import { propertyService, clientService } from '@/lib/firebase/firestore';
import { Client } from '@/lib/types';
import { Property } from '@/lib/types/property';

interface AccountFormData {
  type: 'payable' | 'receivable';
  category: AccountCategory;
  subcategory?: string;
  description: string;
  originalAmount: number;
  dueDate: string;
  paymentMethod?: string;
  propertyId?: string;
  supplierId?: string;
  customerId?: string;
  notes?: string;
  isInstallment: boolean;
  totalInstallments?: number;
  interestRate?: number;
  fineRate?: number;
  invoiceNumber?: string;
  tags?: string[];
}

interface AccountFilters {
  type?: 'all' | 'payable' | 'receivable';
  status?: AccountStatus | 'all';
  category?: AccountCategory | 'all';
  propertyId?: string;
  dateRange?: { start: string; end: string };
  searchTerm?: string;
  overdue?: boolean;
}

const defaultFilters: AccountFilters = {
  type: 'all',
  status: 'all',
  dateRange: {
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  }
};

const paymentMethods = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  bank_transfer: 'Transferência',
  cash: 'Dinheiro',
  boleto: 'Boleto'
};

export default function ContasPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('receivable');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<AccountFilters>(defaultFilters);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    overdueReceivable: 0,
    overduePayable: 0,
    upcomingReceivable: 0,
    upcomingPayable: 0
  });

  const [formData, setFormData] = useState<AccountFormData>({
    type: 'receivable',
    category: AccountCategory.RENT,
    description: '',
    originalAmount: 0,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    isInstallment: false,
    tags: []
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [accountsData, propertiesData, clientsData, overdueAccounts, upcomingAccounts] = await Promise.all([
        accountsService.getAll(),
        propertyService.getAll(),
        clientService.getAll(),
        accountsService.getOverdue(),
        accountsService.getUpcoming(7)
      ]);

      // Apply filters
      let filteredAccounts = accountsData;

      if (filters.type && filters.type !== 'all') {
        filteredAccounts = filteredAccounts.filter(a => a.type === filters.type);
      }

      if (filters.status && filters.status !== 'all') {
        filteredAccounts = filteredAccounts.filter(a => a.status === filters.status);
      }

      if (filters.category && filters.category !== 'all') {
        filteredAccounts = filteredAccounts.filter(a => a.category === filters.category);
      }

      if (filters.propertyId) {
        filteredAccounts = filteredAccounts.filter(a => a.propertyId === filters.propertyId);
      }

      if (filters.dateRange) {
        const start = new Date(filters.dateRange.start);
        const end = new Date(filters.dateRange.end);
        filteredAccounts = filteredAccounts.filter(a => {
          const dueDate = new Date(a.dueDate);
          return dueDate >= start && dueDate <= end;
        });
      }

      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredAccounts = filteredAccounts.filter(a => 
          a.description.toLowerCase().includes(term) ||
          a.invoiceNumber?.toLowerCase().includes(term) ||
          a.notes?.toLowerCase().includes(term)
        );
      }

      if (filters.overdue) {
        filteredAccounts = filteredAccounts.filter(a => 
          overdueAccounts.some(o => o.id === a.id)
        );
      }

      setAccounts(filteredAccounts);
      setProperties(propertiesData);
      setClients(clientsData);

      // Calculate stats
      const receivables = accountsData.filter(a => a.type === 'receivable');
      const payables = accountsData.filter(a => a.type === 'payable');

      setStats({
        totalReceivable: receivables
          .filter(a => a.status !== AccountStatus.PAID && a.status !== AccountStatus.CANCELLED)
          .reduce((sum, a) => sum + a.remainingAmount, 0),
        totalPayable: payables
          .filter(a => a.status !== AccountStatus.PAID && a.status !== AccountStatus.CANCELLED)
          .reduce((sum, a) => sum + a.remainingAmount, 0),
        overdueReceivable: overdueAccounts
          .filter(a => a.type === 'receivable')
          .reduce((sum, a) => sum + a.remainingAmount, 0),
        overduePayable: overdueAccounts
          .filter(a => a.type === 'payable')
          .reduce((sum, a) => sum + a.remainingAmount, 0),
        upcomingReceivable: upcomingAccounts
          .filter(a => a.type === 'receivable')
          .reduce((sum, a) => sum + a.remainingAmount, 0),
        upcomingPayable: upcomingAccounts
          .filter(a => a.type === 'payable')
          .reduce((sum, a) => sum + a.remainingAmount, 0)
      });

    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormData({
      type: activeTab,
      category: activeTab === 'receivable' ? AccountCategory.RENT : AccountCategory.PROPERTY_MAINTENANCE,
      description: '',
      originalAmount: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      isInstallment: false,
      tags: []
    });
    setShowAccountDialog(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      type: account.type,
      category: account.category,
      subcategory: account.subcategory || '',
      description: account.description,
      originalAmount: account.originalAmount,
      dueDate: format(new Date(account.dueDate), 'yyyy-MM-dd'),
      paymentMethod: account.paymentMethod || '',
      propertyId: account.propertyId || '',
      supplierId: account.supplierId || '',
      customerId: account.customerId || '',
      notes: account.notes || '',
      isInstallment: account.isInstallment,
      totalInstallments: account.totalInstallments || 1,
      interestRate: account.interestRate || 0,
      fineRate: account.fineRate || 0,
      invoiceNumber: account.invoiceNumber || '',
      tags: account.tags || []
    });
    setShowAccountDialog(true);
  };

  const handleSaveAccount = async () => {
    try {
      setSaving(true);

      const accountData: any = {
        tenantId: user?.tenantId || '',
        type: formData.type,
        category: formData.category,
        subcategory: formData.subcategory,
        description: formData.description,
        originalAmount: formData.originalAmount,
        amount: formData.originalAmount,
        paidAmount: 0,
        remainingAmount: formData.originalAmount,
        issueDate: new Date(),
        dueDate: new Date(formData.dueDate),
        status: AccountStatus.PENDING,
        overdueDays: 0,
        paymentMethod: formData.paymentMethod,
        propertyId: formData.propertyId,
        supplierId: formData.supplierId,
        customerId: formData.customerId,
        notes: formData.notes,
        isInstallment: formData.isInstallment,
        totalInstallments: formData.totalInstallments,
        interestRate: formData.interestRate,
        fineRate: formData.fineRate,
        invoiceNumber: formData.invoiceNumber,
        tags: formData.tags,
        autoCharge: false,
        remindersSent: 0,
        createdBy: user?.id || 'system'
      };

      if (formData.isInstallment && formData.totalInstallments && formData.totalInstallments > 1) {
        await accountsService.createInstallments(accountData, formData.totalInstallments);
      } else if (editingAccount) {
        await accountsService.update(editingAccount.id, accountData);
      } else {
        await accountsService.create(accountData);
      }

      setShowAccountDialog(false);
      loadData();
    } catch (error) {

    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedAccount || paymentAmount <= 0) return;

    try {
      setSaving(true);
      await accountsService.processPayment(selectedAccount.id, paymentAmount, paymentMethod);
      setShowPaymentDialog(false);
      setSelectedAccount(null);
      setPaymentAmount(0);
      loadData();
    } catch (error) {

    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        await accountsService.delete(id);
        loadData();
      } catch (error) {

      }
    }
  };

  const getStatusChip = (status: AccountStatus, overdueDays?: number) => {
    const configs = {
      [AccountStatus.DRAFT]: { color: 'default' as const, icon: <Edit /> },
      [AccountStatus.PENDING]: { color: 'warning' as const, icon: <Schedule /> },
      [AccountStatus.PARTIALLY_PAID]: { color: 'info' as const, icon: <TrendingUp /> },
      [AccountStatus.PAID]: { color: 'success' as const, icon: <CheckCircle /> },
      [AccountStatus.OVERDUE]: { color: 'error' as const, icon: <Warning /> },
      [AccountStatus.CANCELLED]: { color: 'default' as const, icon: <Delete /> },
      [AccountStatus.NEGOTIATING]: { color: 'secondary' as const, icon: <AccountBalance /> },
      [AccountStatus.IN_PROTEST]: { color: 'error' as const, icon: <Warning /> },
      [AccountStatus.WRITTEN_OFF]: { color: 'error' as const, icon: <TrendingDown /> }
    };

    const config = configs[status] || configs[AccountStatus.PENDING];
    const label = overdueDays && overdueDays > 0 
      ? `${ACCOUNT_STATUS_LABELS[status]} (${overdueDays}d)`
      : ACCOUNT_STATUS_LABELS[status];

    return <Chip label={label} color={config.color} size="small" icon={config.icon} />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateInterestAndFees = async (account: Account) => {
    const { interest, fine } = await accountsService.calculateInterestAndFees(account.id);
    const total = account.remainingAmount + interest + fine;

    setSelectedAccount(account);
    setPaymentAmount(total);
    setShowPaymentDialog(true);
  };

  const filteredByTab = accounts.filter(a => a.type === activeTab);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Contas a Pagar e Receber
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Upload />}>
            Importar
          </Button>
          <Button variant="outlined" startIcon={<Download />}>
            Exportar
          </Button>
          <IconButton onClick={() => setShowFilters(!showFilters)}>
            <Badge color="primary" variant="dot" invisible={!Object.values(filters).some(v => v && v !== 'all')}>
              <FilterList />
            </Badge>
          </IconButton>
          <IconButton onClick={loadData}>
            <Refresh />
          </IconButton>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddAccount}>
            Nova Conta
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    A Receber
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(stats.totalReceivable)}
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    Vencidos: {formatCurrency(stats.overdueReceivable)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ color: 'success.main', fontSize: 40 }} />
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
                    A Pagar
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(stats.totalPayable)}
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    Vencidos: {formatCurrency(stats.overduePayable)}
                  </Typography>
                </Box>
                <TrendingDown sx={{ color: 'error.main', fontSize: 40 }} />
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
                    Saldo Previsto
                  </Typography>
                  <Typography 
                    variant="h5" 
                    fontWeight={600} 
                    color={(stats.totalReceivable - stats.totalPayable) >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(stats.totalReceivable - stats.totalPayable)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Próximos 30 dias
                  </Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 40, color: 'primary.main' }} />
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
                    Próximos 7 Dias
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    Receber: {formatCurrency(stats.upcomingReceivable)}
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    Pagar: {formatCurrency(stats.upcomingPayable)}
                  </Typography>
                </Box>
                <CalendarMonth sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={filters.type || 'all'}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                    label="Tipo"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="receivable">A Receber</MenuItem>
                    <MenuItem value="payable">A Pagar</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || 'all'}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    label="Status"
                  >
                    <MenuItem value="all">Todos</MenuItem>
                    {Object.entries(ACCOUNT_STATUS_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Categoria</InputLabel>
                  <Select
                    value={filters.category || 'all'}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
                    label="Categoria"
                  >
                    <MenuItem value="all">Todas</MenuItem>
                    {Object.entries(ACCOUNT_CATEGORY_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Propriedade</InputLabel>
                  <Select
                    value={filters.propertyId || ''}
                    onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
                    label="Propriedade"
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {properties.map(prop => (
                      <MenuItem key={prop.id} value={prop.id}>{prop.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Data Inicial"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange!, start: e.target.value } 
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Data Final"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange!, end: e.target.value } 
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setFilters(defaultFilters)}
                >
                  Limpar Filtros
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
        <Tab 
          label={
            <Badge badgeContent={accounts.filter(a => a.type === 'receivable').length} color="primary">
              A Receber
            </Badge>
          } 
          value="receivable" 
        />
        <Tab 
          label={
            <Badge badgeContent={accounts.filter(a => a.type === 'payable').length} color="primary">
              A Pagar
            </Badge>
          } 
          value="payable" 
        />
      </Tabs>

      {/* Accounts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vencimento</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Propriedade</TableCell>
              <TableCell>{activeTab === 'receivable' ? 'Cliente' : 'Fornecedor'}</TableCell>
              <TableCell align="right">Valor Original</TableCell>
              <TableCell align="right">Valor Pendente</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredByTab.map((account) => {
              const today = new Date();
              const dueDate = new Date(account.dueDate);
              const isOverdue = dueDate < today && account.status !== AccountStatus.PAID;
              const daysUntilDue = differenceInDays(dueDate, today);

              return (
                <TableRow 
                  key={account.id}
                  sx={{ 
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: isOverdue ? 'error.light' : 'inherit',
                    opacity: account.status === AccountStatus.PAID ? 0.7 : 1
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {format(dueDate, 'dd/MM/yyyy')}
                      </Typography>
                      {isOverdue && (
                        <Typography variant="caption" color="error">
                          Vencido há {account.overdueDays} dias
                        </Typography>
                      )}
                      {!isOverdue && daysUntilDue <= 7 && daysUntilDue >= 0 && (
                        <Typography variant="caption" color="warning.main">
                          Vence em {daysUntilDue} dias
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {account.description}
                      </Typography>
                      {account.isInstallment && (
                        <Typography variant="caption" color="text.secondary">
                          Parcela {account.installmentNumber}/{account.totalInstallments}
                        </Typography>
                      )}
                      {account.notes && (
                        <Tooltip title={account.notes}>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {account.notes}
                          </Typography>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={ACCOUNT_CATEGORY_LABELS[account.category]} 
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {account.propertyId && properties.find(p => p.id === account.propertyId)?.title}
                  </TableCell>
                  <TableCell>
                    {activeTab === 'receivable' 
                      ? account.customerId && clients.find(c => c.id === account.customerId)?.name
                      : account.supplierId
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(account.originalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box>
                      <Typography 
                        variant="body2" 
                        fontWeight={600}
                        color={account.remainingAmount > 0 ? 'error.main' : 'success.main'}
                      >
                        {formatCurrency(account.remainingAmount)}
                      </Typography>
                      {account.paidAmount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Pago: {formatCurrency(account.paidAmount)}
                        </Typography>
                      )}
                      {account.interestAmount && account.interestAmount > 0 && (
                        <Typography variant="caption" color="error">
                          +Juros: {formatCurrency(account.interestAmount)}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(account.status, account.overdueDays)}
                  </TableCell>
                  <TableCell>
                    {account.invoiceNumber && (
                      <Chip 
                        label={account.invoiceNumber} 
                        size="small"
                        icon={<Receipt />}
                        variant="outlined"
                      />
                    )}
                    {account.attachments && account.attachments.length > 0 && (
                      <IconButton size="small">
                        <AttachFile />
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {account.status !== AccountStatus.PAID && (
                        <>
                          <Tooltip title="Registrar Pagamento">
                            <IconButton 
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedAccount(account);
                                setPaymentAmount(account.remainingAmount);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <Payment />
                            </IconButton>
                          </Tooltip>
                          {isOverdue && account.interestRate && (
                            <Tooltip title="Calcular Juros e Multa">
                              <IconButton 
                                size="small"
                                color="warning"
                                onClick={() => calculateInterestAndFees(account)}
                              >
                                <Calculate />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEditAccount(account)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Account Dialog */}
      <Dialog open={showAccountDialog} onClose={() => setShowAccountDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAccount ? 'Editar Conta' : 'Nova Conta'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  label="Tipo"
                >
                  <MenuItem value="receivable">A Receber</MenuItem>
                  <MenuItem value="payable">A Pagar</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as AccountCategory })}
                  label="Categoria"
                >
                  {Object.entries(ACCOUNT_CATEGORY_LABELS)
                    .filter(([key]) => {
                      const receivableCategories = ['rent', 'booking_fee', 'cleaning_fee', 'security_deposit', 'late_fee', 'damage_charge', 'extra_service', 'commission_receivable'];
                      return formData.type === 'receivable' 
                        ? receivableCategories.includes(key)
                        : !receivableCategories.includes(key);
                    })
                    .map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor"
                value={formData.originalAmount}
                onChange={(e) => setFormData({ ...formData, originalAmount: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Vencimento"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Propriedade</InputLabel>
                <Select
                  value={formData.propertyId || ''}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  label="Propriedade"
                >
                  <MenuItem value="">Nenhuma</MenuItem>
                  {properties.map(prop => (
                    <MenuItem key={prop.id} value={prop.id}>{prop.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              {formData.type === 'receivable' ? (
                <FormControl fullWidth>
                  <InputLabel>Cliente</InputLabel>
                  <Select
                    value={formData.customerId || ''}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    label="Cliente"
                  >
                    <MenuItem value="">Nenhum</MenuItem>
                    {clients.map(client => (
                      <MenuItem key={client.id} value={client.id}>{client.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  label="Fornecedor"
                  value={formData.supplierId || ''}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Número do Documento"
                value={formData.invoiceNumber || ''}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Forma de Pagamento</InputLabel>
                <Select
                  value={formData.paymentMethod || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  label="Forma de Pagamento"
                >
                  <MenuItem value="">Não definida</MenuItem>
                  {Object.entries(paymentMethods).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>Configurações Avançadas</Divider>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Taxa de Juros (% ao mês)"
                value={formData.interestRate || ''}
                onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Multa (%)"
                value={formData.fineRate || ''}
                onChange={(e) => setFormData({ ...formData, fineRate: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Parcelamento</InputLabel>
                <Select
                  value={formData.isInstallment ? (formData.totalInstallments || 2) : 1}
                  onChange={(e) => {
                    const value = parseInt(e.target.value as string);
                    setFormData({ 
                      ...formData, 
                      isInstallment: value > 1,
                      totalInstallments: value > 1 ? value : 1
                    });
                  }}
                  label="Parcelamento"
                >
                  <MenuItem value={1}>À vista</MenuItem>
                  {[2, 3, 4, 5, 6, 12, 24, 36, 48].map(n => (
                    <MenuItem key={n} value={n}>{n}x</MenuItem>
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
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={formData.tags || []}
                onChange={(_, newValue) => setFormData({ ...formData, tags: newValue })}
                renderInput={(params) => (
                  <TextField
                    {...(params as any)}
                    label="Tags"
                    placeholder="Digite e pressione Enter"
                    size="small"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveAccount}
            disabled={saving || !formData.description || formData.originalAmount <= 0}
          >
            {saving ? <CircularProgress size={24} /> : (editingAccount ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pagamento</DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={500}>
                  {selectedAccount.description}
                </Typography>
                <Typography variant="caption">
                  Valor pendente: {formatCurrency(selectedAccount.remainingAmount)}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Valor do Pagamento"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Forma de Pagamento</InputLabel>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      label="Forma de Pagamento"
                    >
                      {Object.entries(paymentMethods).map(([key, label]) => (
                        <MenuItem key={key} value={key}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {paymentAmount < selectedAccount.remainingAmount && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Pagamento parcial - restará {formatCurrency(selectedAccount.remainingAmount - paymentAmount)}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handlePayment}
            disabled={saving || paymentAmount <= 0}
          >
            {saving ? <CircularProgress size={24} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}