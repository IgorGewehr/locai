'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Autocomplete,
  Alert,
  Tooltip,
  Grid,
  Paper,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Slide,
  Snackbar,
} from '@mui/material';
import ModernButton from '@/components/atoms/ModernButton';
import {
  Add,
  Visibility,
  FilterList,
  Download,
  Refresh,
  ArrowForward,
  Save,
  Cancel,
  Link,
  Person as PersonIcon,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  CreditCard,
  Pix,
  MoneyOff,
  AttachMoney,
  Receipt,
  Build,
  CleaningServices,
  Percent,
  Undo,
  MoreHoriz,
  Close,
  CheckCircle,
  Schedule,
  Error,
  Info,
  AccountCircle,
  Home,
  CalendarToday,
  Campaign,
} from '@mui/icons-material';
import { Transaction, Client, Property, Reservation } from '@/lib/types';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function TransactionsPage() {
  const router = useRouter();
  const services = useTenantServices();
  const isReady = !!services;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Detail data
  const [relatedClient, setRelatedClient] = useState<Client | null>(null);
  const [relatedProperty, setRelatedProperty] = useState<Property | null>(null);
  const [relatedReservation, setRelatedReservation] = useState<Reservation | null>(null);
  
  // New transaction dialog
  const [newTransactionOpen, setNewTransactionOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Client and reservation data
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  
  // Transaction form validation schema
  const transactionSchema = yup.object().shape({
    description: yup.string().required('Descrição é obrigatória'),
    amount: yup.number().positive('Valor deve ser positivo').required('Valor é obrigatório'),
    type: yup.string().oneOf(['income', 'expense']).required('Tipo é obrigatório'),
    category: yup.string().required('Categoria é obrigatória'),
    status: yup.string().oneOf(['pending', 'paid', 'overdue', 'cancelled']).required('Status é obrigatório'),
    paymentMethod: yup.string().required('Método de pagamento é obrigatório'),
    clientId: yup.string(),
    reservationId: yup.string(),
    propertyId: yup.string(),
    notes: yup.string(),
  });

  // Função para formatar data de forma segura
  const formatSafeDate = (date: any): string => {
    if (!date) return 'Data inválida';
    
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date?.toDate && typeof date.toDate === 'function') {
      // Firestore Timestamp
      dateObj = date.toDate();
    } else if (date?.seconds) {
      // Firestore Timestamp object
      dateObj = new Date(date.seconds * 1000);
    } else {
      dateObj = new Date(date);
    }
    
    if (!isValid(dateObj)) {
      return 'Data inválida';
    }
    
    return format(dateObj, 'dd/MM/yyyy');
  };
  
  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'income',
      category: '',
      status: 'pending',
      paymentMethod: 'pix',
      clientId: '',
      reservationId: '',
      propertyId: '',
      notes: '',
    }
  });

  const loadTransactions = async () => {
    if (!services || !isReady) return;
    
    try {
      setLoading(true);
      console.log('Loading transactions...');
      const transactionData = await services.transactions.getAll();
      console.log('Transaction data:', transactionData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionDetails = async (transaction: Transaction) => {
    if (!services) return;
    
    setSelectedTransaction(transaction);
    setRelatedClient(null);
    setRelatedProperty(null);
    setRelatedReservation(null);

    try {
      // Load related client
      if (transaction.clientId) {
        const clientData = await services.clients.getById(transaction.clientId);
        if (clientData) {
          setRelatedClient(clientData);
        }
      }

      // Load related property
      if (transaction.propertyId) {
        const propertyData = await services.properties.getById(transaction.propertyId);
        if (propertyData) {
          setRelatedProperty(propertyData);
        }
      }

      // Load related reservation
      if (transaction.reservationId) {
        const reservationData = await services.reservations.getById(transaction.reservationId);
        if (reservationData) {
          setRelatedReservation(reservationData);
        }
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
    }

    setDetailsOpen(true);
  };

  const handleCreateTransaction = async (data: any) => {
    if (!services) {
      setSnackbar({
        open: true,
        message: 'Serviços não disponíveis. Por favor, tente novamente.',
        severity: 'error'
      });
      return;
    }
    
    try {
      // Map form status to valid MovementStatus
      const mappedStatus = data.status === 'completed' ? 'paid' : data.status;
      
      const newTransaction = {
        ...data,
        status: mappedStatus,
        dueDate: new Date(), // Add required dueDate
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user', // Add required field
        isRecurring: false, // Add required field
        isInstallment: false, // Add required field
        autoCharge: false, // Add required field
        remindersSent: 0, // Add required field
        // Only include IDs if they have values
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.reservationId && { reservationId: data.reservationId }),
        ...(data.propertyId && { propertyId: data.propertyId }),
      };

      await services.transactions.create(newTransaction);
      
      // Reset form and close dialog
      reset();
      setSelectedClient(null);
      setSelectedReservation(null);
      setNewTransactionOpen(false);
      setActiveStep(0); // Reset step to initial
      
      // Reload transactions
      await loadTransactions();
      
      // Show success feedback
      setSnackbar({
        open: true,
        message: 'Transação criada com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      setSnackbar({
        open: true,
        message: `Erro ao criar transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        severity: 'error'
      });
    }
  };

  const handleCloseNewTransaction = () => {
    reset();
    setSelectedClient(null);
    setSelectedReservation(null);
    setFilteredReservations([]);
    setActiveStep(0);
    setTransactionType('income');
    setNewTransactionOpen(false);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleTypeChange = (type: 'income' | 'expense') => {
    setTransactionType(type);
    // Auto-update form type when toggle changes
    reset((formData) => ({
      ...formData,
      type: type
    }));
  };

  // Helper functions for icons and categories
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rent': return <Receipt />;
      case 'reservation': return <Receipt />; // For backward compatibility
      case 'maintenance': return <Build />;
      case 'cleaning': return <CleaningServices />;
      case 'commission': return <Percent />;
      case 'utilities': return <Build />;
      case 'marketing': return <Campaign />;
      case 'refund': return <Undo />;
      default: return <MoreHoriz />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix': return <Pix />;
      case 'credit_card': return <CreditCard />;
      case 'debit_card': return <CreditCard />;
      case 'bank_transfer': return <AccountBalance />;
      case 'cash': return <AttachMoney />;
      case 'stripe': return <CreditCard />;
      default: return <AttachMoney />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle />;
      case 'pending':
        return <Schedule />;
      case 'overdue':
        return <Error />;
      case 'cancelled':
        return <Close />;
      case 'refunded':
        return <Undo />;
      default:
        return <Info />;
    }
  };


  const categories = [
    { value: 'rent', label: 'Aluguel', icon: <Receipt /> },
    { value: 'cleaning', label: 'Limpeza', icon: <CleaningServices /> },
    { value: 'maintenance', label: 'Manutenção', icon: <Build /> },
    { value: 'commission', label: 'Comissão', icon: <Percent /> },
    { value: 'utilities', label: 'Utilidades', icon: <Build /> },
    { value: 'marketing', label: 'Marketing', icon: <Campaign /> },
    { value: 'refund', label: 'Reembolso', icon: <Undo /> },
    { value: 'other', label: 'Outros', icon: <MoreHoriz /> },
  ];

  const paymentMethods = [
    { value: 'pix', label: 'PIX', icon: <Pix /> },
    { value: 'credit_card', label: 'Cartão de Crédito', icon: <CreditCard /> },
    { value: 'debit_card', label: 'Cartão de Débito', icon: <CreditCard /> },
    { value: 'bank_transfer', label: 'Transferência Bancária', icon: <AccountBalance /> },
    { value: 'cash', label: 'Dinheiro', icon: <AttachMoney /> },
    { value: 'stripe', label: 'Stripe', icon: <CreditCard /> },
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pendente', icon: <Schedule />, color: 'warning' as const },
    { value: 'paid', label: 'Pago', icon: <CheckCircle />, color: 'success' as const },
    { value: 'overdue', label: 'Vencido', icon: <Error />, color: 'error' as const },
    { value: 'cancelled', label: 'Cancelada', icon: <Cancel />, color: 'default' as const },
  ];

  const steps = [
    'Tipo e Informações Básicas',
    'Categoria e Método de Pagamento',
    'Associações e Observações'
  ];

  const handleClientSelection = (client: Client | null) => {
    setSelectedClient(client);
    
    if (client) {
      // Filter reservations by selected client
      const clientReservations = allReservations.filter(r => r.clientId === client.id);
      setFilteredReservations(clientReservations);
    } else {
      // Show all reservations if no client selected
      setFilteredReservations(allReservations);
      setSelectedReservation(null);
    }
  };

  const handleReservationSelection = async (reservation: Reservation | null) => {
    setSelectedReservation(reservation);
    
    if (reservation) {
      // Only auto-fill if user hasn't made changes to avoid conflicts
      const currentFormData = control._getWatch();
      const isFormEmpty = !currentFormData.description && !currentFormData.amount;
      
      if (isFormEmpty) {
        // Auto-fill form fields based on reservation
        reset({
          description: `Pagamento - Reserva #${reservation.id.slice(-8)}`,
          amount: reservation.totalAmount,
          type: 'income',
          category: 'rent',
          status: reservation.paymentStatus === 'paid' ? 'paid' : 'pending',
          paymentMethod: reservation.paymentMethod || 'pix',
          clientId: reservation.clientId,
          reservationId: reservation.id,
          propertyId: reservation.propertyId,
          notes: (() => {
            try {
              const checkIn = reservation.checkIn instanceof Date ? reservation.checkIn : new Date(reservation.checkIn);
              const checkOut = reservation.checkOut instanceof Date ? reservation.checkOut : new Date(reservation.checkOut);
              
              if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
                return `Check-in: ${format(checkIn, 'dd/MM/yyyy')} - Check-out: ${format(checkOut, 'dd/MM/yyyy')}`;
              }
              return `Reserva #${reservation.id.slice(-8)}`;
            } catch (error) {
              return `Reserva #${reservation.id.slice(-8)}`;
            }
          })(),
        });
      }
      
      // Also set the selected client if not already selected
      if (!selectedClient && reservation.clientId) {
        const client = allClients.find(c => c.id === reservation.clientId);
        if (client) {
          setSelectedClient(client);
        }
      }
    }
  };

  const loadClients = async () => {
    if (!services) return;
    
    try {
      const clientsData = await services.clients.getAll();
      setAllClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadReservations = async () => {
    if (!services) return;
    
    try {
      const reservationsData = await services.reservations.getAll();
      setAllReservations(reservationsData);
      setFilteredReservations(reservationsData);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  useEffect(() => {
    if (isReady && services) {
      loadTransactions();
      loadClients();
      loadReservations();
    }
  }, [isReady, services]);

  const filteredTransactions = transactions.filter(transaction => {
    if (filterType !== 'all' && transaction.type !== filterType) return false;
    if (filterStatus !== 'all' && transaction.status !== filterStatus) return false;
    return true;
  });

  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'completed': return 'success'; // For backward compatibility
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      case 'refunded': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'completed': return 'Concluída'; // For backward compatibility
      case 'pending': return 'Pendente';
      case 'overdue': return 'Vencido';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'rent': return 'Aluguel';
      case 'reservation': return 'Reserva'; // For backward compatibility
      case 'maintenance': return 'Manutenção';
      case 'cleaning': return 'Limpeza';
      case 'commission': return 'Comissão';
      case 'utilities': return 'Utilidades';
      case 'marketing': return 'Marketing';
      case 'refund': return 'Reembolso';
      case 'other': return 'Outros';
      default: return category;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Transações
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Gerenciar todas as receitas e despesas
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <IconButton onClick={loadTransactions} disabled={loading}>
            <Refresh />
          </IconButton>
          <ModernButton
            variant="primary"
            size="medium"
            icon={<Add />}
            onClick={() => setNewTransactionOpen(true)}
          >
            Nova Transação
          </ModernButton>
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FilterList color="action" />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Tipo"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="income">Receita</MenuItem>
                <MenuItem value="expense">Despesa</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="completed">Concluída</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
                <MenuItem value="failed">Falhou</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<Download />} size="small">
              Exportar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {formatSafeDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {transaction.description}
                        </Typography>
                        {(transaction.clientId || transaction.reservationId) && (
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            {transaction.clientId && (
                              <Chip
                                label="Cliente"
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ height: 20, fontSize: '0.75rem' }}
                              />
                            )}
                            {transaction.reservationId && (
                              <Chip
                                label="Reserva"
                                size="small"
                                variant="outlined"
                                color="secondary"
                                sx={{ height: 20, fontSize: '0.75rem' }}
                              />
                            )}
                          </Stack>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{getCategoryLabel(transaction.category)}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        color={transaction.type === 'income' ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="subtitle2"
                        color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                        fontWeight={600}
                      >
                        {transaction.type === 'income' ? '+' : '-'}R$ {(transaction.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(transaction.status)}
                        color={getStatusColor(transaction.status) as any}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalhes">
                        <IconButton
                          size="small"
                          onClick={() => router.push(`/dashboard/financeiro/transacoes/${transaction.id}`)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredTransactions.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Detalhes da Transação
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Stack spacing={3}>
              {/* Transaction Info */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Informações da Transação
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Descrição:</Typography>
                    <Typography variant="body2">{selectedTransaction.description}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Categoria:</Typography>
                    <Typography variant="body2">{getCategoryLabel(selectedTransaction.category)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Valor:</Typography>
                    <Typography 
                      variant="body2" 
                      fontWeight={600}
                      color={selectedTransaction.type === 'income' ? 'success.main' : 'error.main'}
                    >
                      {selectedTransaction.type === 'income' ? '+' : '-'}R$ {(selectedTransaction.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Data:</Typography>
                    <Typography variant="body2">{formatSafeDate(selectedTransaction.date)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Chip
                      label={getStatusLabel(selectedTransaction.status)}
                      color={getStatusColor(selectedTransaction.status) as any}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                  {selectedTransaction.notes && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Observações:</Typography>
                      <Typography variant="body2">{selectedTransaction.notes}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Related Data Navigation */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Dados Relacionados
                </Typography>
                <Stack spacing={2}>
                  {relatedClient && (
                    <Card variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              Cliente
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {relatedClient.name} - {relatedClient.phone}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            endIcon={<ArrowForward />}
                            onClick={() => {
                              setDetailsOpen(false);
                              router.push(`/dashboard/clients/${relatedClient.id}`);
                            }}
                          >
                            Ver Cliente
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {relatedProperty && (
                    <Card variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              Propriedade
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {relatedProperty.title}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            endIcon={<ArrowForward />}
                            onClick={() => {
                              setDetailsOpen(false);
                              router.push(`/dashboard/properties/${relatedProperty.id}`);
                            }}
                          >
                            Ver Propriedade
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {relatedReservation && (
                    <Card variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              Reserva
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              #{relatedReservation.id.slice(-8)} - {relatedReservation.status}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            endIcon={<ArrowForward />}
                            onClick={() => {
                              setDetailsOpen(false);
                              router.push(`/dashboard/reservations/${relatedReservation.id}`);
                            }}
                          >
                            Ver Reserva
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {!relatedClient && !relatedProperty && !relatedReservation && (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum dado relacionado encontrado
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Transaction Dialog - Modern with Stepper */}
      <Dialog
        open={newTransactionOpen}
        onClose={handleCloseNewTransaction}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Add />
              </Avatar>
              <Box>
                <Typography component="div" variant="h5" fontWeight={600}>
                  Nova Transação
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crie uma nova transação financeira
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleCloseNewTransaction} sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <form onSubmit={handleSubmit(handleCreateTransaction)}>
          <DialogContent sx={{ px: 3, py: 0 }}>
            <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Fade in={true} timeout={500}>
              <Box>
                {/* Step 1: Basic Information */}
                {activeStep === 0 && (
                  <Stack spacing={4}>
                    {/* Type Selection with Toggle */}
                    <Paper elevation={0} sx={{ 
                      p: 3, 
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '16px'
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp />
                        Tipo da Transação
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <ToggleButtonGroup
                          value={transactionType}
                          exclusive
                          onChange={(_, value) => value && handleTypeChange(value)}
                          sx={{ 
                            '& .MuiToggleButton-root': { 
                              px: 4, 
                              py: 1.5, 
                              borderRadius: 2,
                              border: '2px solid',
                              minWidth: 150,
                            }
                          }}
                        >
                          <ToggleButton value="income" sx={{ color: 'success.main', borderColor: 'success.main' }}>
                            <TrendingUp sx={{ mr: 1 }} />
                            Receita
                          </ToggleButton>
                          <ToggleButton value="expense" sx={{ color: 'error.main', borderColor: 'error.main' }}>
                            <TrendingDown sx={{ mr: 1 }} />
                            Despesa
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    </Paper>

                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Controller
                          name="description"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Descrição da Transação"
                              placeholder="Ex: Pagamento de reserva, Taxa de limpeza..."
                              fullWidth
                              error={!!errors.description}
                              helperText={errors.description?.message}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Receipt />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Controller
                          name="amount"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label="Valor"
                              type="number"
                              fullWidth
                              inputProps={{ step: '0.01', min: '0' }}
                              error={!!errors.amount}
                              helperText={errors.amount?.message}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    R$
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth error={!!errors.status}>
                              <InputLabel>Status</InputLabel>
                              <Select 
                                {...field} 
                                label="Status"
                                renderValue={(selected) => (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getStatusIcon(selected)}
                                    {statusOptions.find(s => s.value === selected)?.label}
                                  </Box>
                                )}
                              >
                                {statusOptions.map((status) => (
                                  <MenuItem key={status.value} value={status.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {status.icon}
                                      {status.label}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                              {errors.status && <Typography variant="caption" color="error">{errors.status.message}</Typography>}
                            </FormControl>
                          )}
                        />
                      </Grid>
                    </Grid>

                    {/* Hidden type controller */}
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <input type="hidden" {...field} value={transactionType} />
                      )}
                    />
                  </Stack>
                )}

                {/* Step 2: Category and Payment Method */}
                {activeStep === 1 && (
                  <Stack spacing={4}>
                    <Typography variant="h6" gutterBottom>
                      Categoria e Método de Pagamento
                    </Typography>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Controller
                          name="category"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth error={!!errors.category}>
                              <InputLabel>Categoria</InputLabel>
                              <Select 
                                {...field} 
                                label="Categoria"
                                renderValue={(selected) => (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getCategoryIcon(selected)}
                                    {categories.find(c => c.value === selected)?.label}
                                  </Box>
                                )}
                              >
                                {categories.map((category) => (
                                  <MenuItem key={category.value} value={category.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {category.icon}
                                      {category.label}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                              {errors.category && <Typography variant="caption" color="error">{errors.category.message}</Typography>}
                            </FormControl>
                          )}
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Controller
                          name="paymentMethod"
                          control={control}
                          render={({ field }) => (
                            <FormControl fullWidth error={!!errors.paymentMethod}>
                              <InputLabel>Método de Pagamento</InputLabel>
                              <Select 
                                {...field} 
                                label="Método de Pagamento"
                                renderValue={(selected) => (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getPaymentMethodIcon(selected)}
                                    {paymentMethods.find(p => p.value === selected)?.label}
                                  </Box>
                                )}
                              >
                                {paymentMethods.map((method) => (
                                  <MenuItem key={method.value} value={method.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {method.icon}
                                      {method.label}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                              {errors.paymentMethod && <Typography variant="caption" color="error">{errors.paymentMethod.message}</Typography>}
                            </FormControl>
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Stack>
                )}

                {/* Step 3: Associations and Notes */}
                {activeStep === 2 && (
                  <Stack spacing={4}>
                    <Typography variant="h6" gutterBottom>
                      Associações e Observações
                    </Typography>
                    
                    {/* Client Selection */}
                    <Controller
                      name="clientId"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <Autocomplete
                          options={allClients}
                          getOptionLabel={(option) => `${option.name} - ${option.phone}`}
                          value={selectedClient}
                          onChange={(_, newValue) => {
                            handleClientSelection(newValue);
                            onChange(newValue?.id || '');
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Cliente (opcional)"
                              placeholder="Selecione um cliente"
                              helperText="Associe esta transação a um cliente específico"
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <AccountCircle />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            return (
                              <Box component="li" key={key} {...otherProps}>
                                <ListItemAvatar>
                                  <Avatar>
                                    <AccountCircle />
                                  </Avatar>
                                </ListItemAvatar>
                                <Box>
                                  <Typography variant="subtitle2">{option.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {option.phone} {option.email && ` - ${option.email}`}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          }}
                        />
                      )}
                    />
                    
                    {/* Reservation Selection */}
                    <Controller
                      name="reservationId"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <Autocomplete
                          options={filteredReservations}
                          getOptionLabel={(option) => {
                            try {
                              const checkIn = option.checkIn instanceof Date ? option.checkIn : new Date(option.checkIn);
                              if (isNaN(checkIn.getTime())) {
                                return `#${option.id.slice(-8)} - R$ ${(option.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                              }
                              return `#${option.id.slice(-8)} - ${format(checkIn, 'dd/MM/yyyy')} - R$ ${(option.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                            } catch (error) {
                              return `#${option.id.slice(-8)} - R$ ${(option.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                            }
                          }}
                          value={selectedReservation}
                          onChange={(_, newValue) => {
                            handleReservationSelection(newValue);
                            onChange(newValue?.id || '');
                          }}
                          disabled={filteredReservations.length === 0}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Reserva Relacionada (opcional)"
                              placeholder="Selecione uma reserva"
                              helperText={
                                selectedClient 
                                  ? `${filteredReservations.length} reserva(s) encontrada(s) para este cliente`
                                  : "Selecione um cliente para filtrar as reservas"
                              }
                              InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <CalendarToday />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          )}
                          renderOption={(props, option) => {
                            const { key, ...otherProps } = props;
                            
                            // Safe date formatting with validation
                            let dateRange = 'Datas não informadas';
                            try {
                              const checkIn = option.checkIn instanceof Date ? option.checkIn : new Date(option.checkIn);
                              const checkOut = option.checkOut instanceof Date ? option.checkOut : new Date(option.checkOut);
                              
                              if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
                                dateRange = `${format(checkIn, 'dd/MM/yyyy')} - ${format(checkOut, 'dd/MM/yyyy')}`;
                              }
                            } catch (error) {
                              // Keep default value
                            }
                            
                            return (
                              <Box component="li" key={key} {...otherProps}>
                                <ListItemAvatar>
                                  <Avatar>
                                    <CalendarToday />
                                  </Avatar>
                                </ListItemAvatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    Reserva #{option.id.slice(-8)} - {option.status}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {dateRange}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    R$ {(option.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {option.paymentStatus}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          }}
                        />
                      )}
                    />
                    
                    {selectedReservation && (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                          <strong>Reserva selecionada:</strong> Os campos foram preenchidos automaticamente com base na reserva.
                        </Typography>
                      </Alert>
                    )}
                    
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Observações"
                          placeholder="Adicione observações sobre esta transação..."
                          fullWidth
                          multiline
                          rows={4}
                          error={!!errors.notes}
                          helperText={errors.notes?.message}
                        />
                      )}
                    />
                    
                    {/* Hidden fields for IDs */}
                    <Controller
                      name="propertyId"
                      control={control}
                      render={({ field }) => (
                        <input type="hidden" {...field} />
                      )}
                    />
                  </Stack>
                )}
              </Box>
            </Fade>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button 
              onClick={handleCloseNewTransaction} 
              startIcon={<Close />}
              sx={{ mr: 'auto' }}
            >
              Cancelar
            </Button>
            
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowForward sx={{ transform: 'rotate(180deg)' }} />}
            >
              Voltar
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button 
                type="submit" 
                variant="contained" 
                disabled={isSubmitting}
                startIcon={<Save />}
                sx={{ minWidth: 140 }}
              >
                {isSubmitting ? 'Salvando...' : 'Criar Transação'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleNext}
                endIcon={<ArrowForward />}
                sx={{ minWidth: 120 }}
              >
                Próximo
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}