'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Home,
  CalendarMonth,
  Receipt,
  Edit,
  Delete,
  AttachMoney,
  Category,
  Payment,
  Description,
  EventNote,
  AccountBalance,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenantServices } from '@/lib/hooks/useTenantServices';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod: string;
  clientId?: string;
  reservationId?: string;
  propertyId?: string;
  notes?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Reservation {
  id: string;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
}

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const services = useTenantServices();
  const isReady = !!services;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isReady && services) {
      loadTransactionDetails();
    }
  }, [params.id, isReady, services]);

  const loadTransactionDetails = async () => {
    if (!services) return;
    
    try {
      setLoading(true);
      
      // Load transaction
      const transactionData = await services.transactions.getById(params.id as string);
      if (!transactionData) {
        throw new Error('Transação não encontrada');
      }

      setTransaction(transactionData as Transaction);

      // Load related client
      if (transactionData.clientId) {
        const clientData = await services.clients.getById(transactionData.clientId);
        if (clientData) {
          setClient(clientData);
        }
      }

      // Load related reservation
      if (transactionData.reservationId) {
        const reservationData = await services.reservations.getById(transactionData.reservationId);
        if (reservationData) {
          setReservation({
            id: reservationData.id,
            propertyName: reservationData.propertyName || 'Propriedade',
            checkIn: reservationData.checkIn?.toDate ? reservationData.checkIn.toDate() : new Date(reservationData.checkIn),
            checkOut: reservationData.checkOut?.toDate ? reservationData.checkOut.toDate() : new Date(reservationData.checkOut),
            status: reservationData.status,
          });
        }
      }

      // Load related property
      if (transactionData.propertyId) {
        const propertyData = await services.properties.getById(transactionData.propertyId);
        if (propertyData) {
          setProperty({
            id: propertyData.id,
            name: propertyData.name || propertyData.title,
            location: propertyData.location,
          });
        }
      }

    } catch (err) {
      console.error('Error loading transaction:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar transação');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/financeiro/transacoes?edit=${transaction?.id}`);
  };

  const handleDelete = async () => {
    if (!services || !transaction) return;
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      setDeleting(true);
      await services.transactions.delete(transaction.id);
      router.push('/dashboard/financeiro/transacoes');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Erro ao excluir transação');
    } finally {
      setDeleting(false);
    }
  };

  const navigateToClient = () => {
    if (client) {
      router.push(`/dashboard/clientes/${client.id}`);
    }
  };

  const navigateToReservation = () => {
    if (reservation) {
      router.push(`/dashboard/reservas/${reservation.id}`);
    }
  };

  const navigateToProperty = () => {
    if (property) {
      router.push(`/dashboard/propriedades/${property.id}`);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      reservation: 'Reserva',
      maintenance: 'Manutenção',
      cleaning: 'Limpeza',
      utilities: 'Utilidades',
      marketing: 'Marketing',
      taxes: 'Impostos',
      other: 'Outros'
    };
    return labels[category] || category;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      cash: 'Dinheiro',
      bank_transfer: 'Transferência Bancária',
      other: 'Outros'
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Box>
    );
  }

  if (!transaction) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Transação não encontrada</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">
            Detalhes da Transação
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
            disabled={deleting}
          >
            Excluir
          </Button>
        </Box>
      </Box>

      {/* Main Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Valor
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: transaction.type === 'income' ? 'success.main' : 'error.main',
                  fontWeight: 600 
                }}
              >
                {transaction.type === 'expense' && '-'} R$ {transaction.amount.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip
                label={getStatusLabel(transaction.status)}
                color={getStatusColor(transaction.status) as any}
                size="small"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Data
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventNote fontSize="small" color="action" />
                <Typography>
                  {format(transaction.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Categoria
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Category fontSize="small" color="action" />
                <Typography>{getCategoryLabel(transaction.category)}</Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Método de Pagamento
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment fontSize="small" color="action" />
                <Typography>{getPaymentMethodLabel(transaction.paymentMethod)}</Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Descrição
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description fontSize="small" color="action" />
                <Typography>{transaction.description}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {transaction.notes && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Observações
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {transaction.notes}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Related Records */}
      {(client || reservation || property) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Registros Relacionados
          </Typography>
          
          <Grid container spacing={2}>
            {client && (
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    }
                  }}
                  onClick={navigateToClient}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      Cliente
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {client.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {client.phone}
                  </Typography>
                  {client.email && (
                    <Typography variant="body2" color="text.secondary">
                      {client.email}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}

            {reservation && (
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    }
                  }}
                  onClick={navigateToReservation}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CalendarMonth color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      Reserva #{reservation.id}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {reservation.propertyName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(() => {
                      try {
                        const checkIn = reservation.checkIn instanceof Date ? reservation.checkIn : new Date(reservation.checkIn);
                        const checkOut = reservation.checkOut instanceof Date ? reservation.checkOut : new Date(reservation.checkOut);
                        
                        if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
                          return `${format(checkIn, 'dd/MM/yyyy')} - ${format(checkOut, 'dd/MM/yyyy')}`;
                        }
                        return 'Datas não informadas';
                      } catch (error) {
                        return 'Datas não informadas';
                      }
                    })()}
                  </Typography>
                  <Chip
                    label={reservation.status}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Grid>
            )}

            {property && (
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main',
                    }
                  }}
                  onClick={navigateToProperty}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Home color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      Propriedade
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {property.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {property.location}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Metadata */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Criado em: {format(transaction.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Atualizado em: {format(transaction.updatedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </Typography>
      </Box>
    </Box>
  );
}