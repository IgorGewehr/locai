'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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
} from '@mui/material';
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
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Transaction, Client, Property, Reservation } from '@/lib/types';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function TransactionsPage() {
  const router = useRouter();
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
    status: yup.string().oneOf(['pending', 'completed', 'cancelled']).required('Status é obrigatório'),
    paymentMethod: yup.string().required('Método de pagamento é obrigatório'),
    clientId: yup.string(),
    reservationId: yup.string(),
    propertyId: yup.string(),
    notes: yup.string(),
  });
  
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
    try {
      setLoading(true);
      console.log('Loading transactions...');
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(transactionsQuery);
      console.log('Transactions snapshot:', snapshot.size, 'documents');
      const transactionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      })) as Transaction[];

      console.log('Transaction data:', transactionData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionDetails = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRelatedClient(null);
    setRelatedProperty(null);
    setRelatedReservation(null);

    try {
      // Load related client
      if (transaction.clientId) {
        const clientDoc = await getDoc(doc(db, 'clients', transaction.clientId));
        if (clientDoc.exists()) {
          setRelatedClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
        }
      }

      // Load related property
      if (transaction.propertyId) {
        const propertyDoc = await getDoc(doc(db, 'properties', transaction.propertyId));
        if (propertyDoc.exists()) {
          setRelatedProperty({ id: propertyDoc.id, ...propertyDoc.data() } as Property);
        }
      }

      // Load related reservation
      if (transaction.reservationId) {
        const reservationDoc = await getDoc(doc(db, 'reservations', transaction.reservationId));
        if (reservationDoc.exists()) {
          setRelatedReservation({ id: reservationDoc.id, ...reservationDoc.data() } as Reservation);
        }
      }
    } catch (error) {
      console.error('Error loading transaction details:', error);
    }

    setDetailsOpen(true);
  };

  const handleCreateTransaction = async (data: any) => {
    try {
      const newTransaction = {
        ...data,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        // Only include IDs if they have values
        ...(data.clientId && { clientId: data.clientId }),
        ...(data.reservationId && { reservationId: data.reservationId }),
        ...(data.propertyId && { propertyId: data.propertyId }),
      };

      await addDoc(collection(db, 'transactions'), newTransaction);
      
      // Reset form and close dialog
      reset();
      setSelectedClient(null);
      setSelectedReservation(null);
      setNewTransactionOpen(false);
      
      // Reload transactions
      await loadTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleCloseNewTransaction = () => {
    reset();
    setSelectedClient(null);
    setSelectedReservation(null);
    setNewTransactionOpen(false);
  };

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
      // Auto-fill form fields based on reservation
      reset({
        description: `Pagamento - Reserva #${reservation.id.slice(-8)}`,
        amount: reservation.totalAmount,
        type: 'income',
        category: 'reservation',
        status: reservation.paymentStatus === 'paid' ? 'completed' : 'pending',
        paymentMethod: reservation.paymentMethod || 'pix',
        clientId: reservation.clientId,
        reservationId: reservation.id,
        propertyId: reservation.propertyId,
        notes: `Check-in: ${format(reservation.checkIn, 'dd/MM/yyyy')} - Check-out: ${format(reservation.checkOut, 'dd/MM/yyyy')}`,
      });
      
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
    try {
      const clientsQuery = query(collection(db, 'clients'), orderBy('name'));
      const snapshot = await getDocs(clientsQuery);
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      setAllClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadReservations = async () => {
    try {
      const reservationsQuery = query(collection(db, 'reservations'), orderBy('checkIn', 'desc'));
      const snapshot = await getDocs(reservationsQuery);
      const reservationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        checkIn: doc.data().checkIn?.toDate ? doc.data().checkIn.toDate() : new Date(doc.data().checkIn),
        checkOut: doc.data().checkOut?.toDate ? doc.data().checkOut.toDate() : new Date(doc.data().checkOut),
      })) as Reservation[];
      setAllReservations(reservationsData);
      setFilteredReservations(reservationsData);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadClients();
    loadReservations();
  }, []);

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
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'reservation': return 'Reserva';
      case 'maintenance': return 'Manutenção';
      case 'cleaning': return 'Limpeza';
      case 'commission': return 'Comissão';
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
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setNewTransactionOpen(true)}
          >
            Nova Transação
          </Button>
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
                      {format(transaction.date, 'dd/MM/yyyy')}
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
                        {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      {selectedTransaction.type === 'income' ? '+' : '-'}R$ {selectedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Data:</Typography>
                    <Typography variant="body2">{format(selectedTransaction.date, 'dd/MM/yyyy')}</Typography>
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
                              {relatedClient.name} • {relatedClient.phone}
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
                              #{relatedReservation.id.slice(-8)} • {relatedReservation.status}
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

      {/* New Transaction Dialog */}
      <Dialog
        open={newTransactionOpen}
        onClose={handleCloseNewTransaction}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Nova Transação
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit(handleCreateTransaction)}>
          <DialogContent>
            <Stack spacing={3}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descrição"
                    fullWidth
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
              
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
                  />
                )}
              />
              
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Tipo</InputLabel>
                    <Select {...field} label="Tipo">
                      <MenuItem value="income">Receita</MenuItem>
                      <MenuItem value="expense">Despesa</MenuItem>
                    </Select>
                    {errors.type && <Typography variant="caption" color="error">{errors.type.message}</Typography>}
                  </FormControl>
                )}
              />
              
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
                    helperText="Associe esta transação a um cliente"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="subtitle2">{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.phone} {option.email && `• ${option.email}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
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
                  const checkIn = option.checkIn instanceof Date ? option.checkIn : new Date(option.checkIn);
                  return `#${option.id.slice(-8)} - ${format(checkIn, 'dd/MM/yyyy')} - R$ ${option.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
                  />
                )}
                renderOption={(props, option) => {
                  const checkIn = option.checkIn instanceof Date ? option.checkIn : new Date(option.checkIn);
                  const checkOut = option.checkOut instanceof Date ? option.checkOut : new Date(option.checkOut);
                  return (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="subtitle2">
                          Reserva #{option.id.slice(-8)} - {option.status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format(checkIn, 'dd/MM/yyyy')} - {format(checkOut, 'dd/MM/yyyy')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          R$ {option.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {option.paymentStatus}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                  />
                )}
              />
              
              {selectedReservation && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Reserva selecionada:</strong> Os campos foram preenchidos automaticamente com base na reserva.
                  </Typography>
                </Alert>
              )}
              
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>Categoria</InputLabel>
                    <Select {...field} label="Categoria">
                      <MenuItem value="reservation">Reserva</MenuItem>
                      <MenuItem value="maintenance">Manutenção</MenuItem>
                      <MenuItem value="cleaning">Limpeza</MenuItem>
                      <MenuItem value="commission">Comissão</MenuItem>
                      <MenuItem value="refund">Reembolso</MenuItem>
                      <MenuItem value="other">Outros</MenuItem>
                    </Select>
                    {errors.category && <Typography variant="caption" color="error">{errors.category.message}</Typography>}
                  </FormControl>
                )}
              />
              
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.status}>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} label="Status">
                      <MenuItem value="pending">Pendente</MenuItem>
                      <MenuItem value="completed">Concluída</MenuItem>
                      <MenuItem value="cancelled">Cancelada</MenuItem>
                    </Select>
                    {errors.status && <Typography variant="caption" color="error">{errors.status.message}</Typography>}
                  </FormControl>
                )}
              />
              
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.paymentMethod}>
                    <InputLabel>Método de Pagamento</InputLabel>
                    <Select {...field} label="Método de Pagamento">
                      <MenuItem value="pix">PIX</MenuItem>
                      <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
                      <MenuItem value="debit_card">Cartão de Débito</MenuItem>
                      <MenuItem value="bank_transfer">Transferência Bancária</MenuItem>
                      <MenuItem value="cash">Dinheiro</MenuItem>
                      <MenuItem value="stripe">Stripe</MenuItem>
                    </Select>
                    {errors.paymentMethod && <Typography variant="caption" color="error">{errors.paymentMethod.message}</Typography>}
                  </FormControl>
                )}
              />
              
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Observações"
                    fullWidth
                    multiline
                    rows={3}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseNewTransaction} startIcon={<Cancel />}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isSubmitting}
              startIcon={<Save />}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}