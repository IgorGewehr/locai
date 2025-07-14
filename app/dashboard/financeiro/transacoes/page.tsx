'use client';

import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add,
  Visibility,
  FilterList,
  Download,
  Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Transaction, Client, Property, Reservation } from '@/lib/types';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const transactionsQuery = query(
        collection(db, 'transactions'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(transactionsQuery);
      const transactionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
      })) as Transaction[];

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

  useEffect(() => {
    loadTransactions();
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
          <Button variant="contained" startIcon={<Add />}>
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
                      {transaction.date.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {transaction.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{transaction.category}</TableCell>
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
                      <IconButton
                        size="small"
                        onClick={() => loadTransactionDetails(transaction)}
                      >
                        <Visibility />
                      </IconButton>
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
                    <Typography variant="body2">{selectedTransaction.category}</Typography>
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
                    <Typography variant="body2">{selectedTransaction.date.toLocaleDateString('pt-BR')}</Typography>
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
                              router.push(`/dashboard/clientes?id=${relatedClient.id}`);
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
                              router.push(`/dashboard/propriedades?id=${relatedProperty.id}`);
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
                              router.push(`/dashboard/reservas?id=${relatedReservation.id}`);
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
    </Box>
  );
}