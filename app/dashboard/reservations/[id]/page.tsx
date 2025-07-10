'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Cancel,
  CheckCircle,
  Payment,
  Person,
  Home,
  Calendar,
  Receipt,
  Phone,
  Email,
  Note,
  History,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reservation {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  propertyImages: string[];
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAvatar?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'cancelled';
  totalAmount: number;
  basePrice: number;
  fees: number;
  taxes: number;
  discounts: number;
  notes?: string;
  createdAt: Date;
  lastUpdated: Date;
  cancellationReason?: string;
}

interface Activity {
  id: string;
  type: 'created' | 'updated' | 'confirmed' | 'cancelled' | 'payment';
  description: string;
  timestamp: Date;
  user: string;
}

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadReservationData();
  }, [params.id]);

  const loadReservationData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockReservation: Reservation = {
        id: params.id as string,
        propertyId: 'prop-1',
        propertyName: 'Apartamento Vista Mar - Copacabana',
        propertyAddress: 'Av. Atlântica, 1000 - Copacabana, Rio de Janeiro',
        propertyImages: ['/images/property1.jpg'],
        clientId: 'client-1',
        clientName: 'João Silva',
        clientEmail: 'joao.silva@email.com',
        clientPhone: '+55 11 99999-9999',
        clientAvatar: '',
        checkIn: new Date('2024-02-01'),
        checkOut: new Date('2024-02-07'),
        guests: 4,
        status: 'confirmed',
        paymentStatus: 'paid',
        totalAmount: 3500,
        basePrice: 3000,
        fees: 300,
        taxes: 350,
        discounts: 150,
        notes: 'Cliente solicitou check-in antecipado.',
        createdAt: new Date('2024-01-15T10:30:00'),
        lastUpdated: new Date('2024-01-16T14:20:00'),
      };

      const mockActivities: Activity[] = [
        {
          id: '1',
          type: 'created',
          description: 'Reserva criada pelo cliente',
          timestamp: new Date('2024-01-15T10:30:00'),
          user: 'João Silva',
        },
        {
          id: '2',
          type: 'confirmed',
          description: 'Reserva confirmada automaticamente',
          timestamp: new Date('2024-01-15T11:00:00'),
          user: 'Sistema',
        },
        {
          id: '3',
          type: 'payment',
          description: 'Pagamento processado com sucesso',
          timestamp: new Date('2024-01-15T11:05:00'),
          user: 'Sistema',
        },
        {
          id: '4',
          type: 'updated',
          description: 'Anotações adicionadas',
          timestamp: new Date('2024-01-16T14:20:00'),
          user: 'Admin',
        },
      ];

      setReservation(mockReservation);
      setActivities(mockActivities);
      setNotes(mockReservation.notes || '');
      setNewStatus(mockReservation.status);
    } catch (err) {
      setError('Erro ao carregar dados da reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReservation = async () => {
    try {
      // API call to update reservation
      setReservation(prev => prev ? { ...prev, notes, status: newStatus as any } : null);
      setEditOpen(false);
    } catch (err) {
      setError('Erro ao atualizar reserva');
    }
  };

  const handleCancelReservation = async () => {
    try {
      // API call to cancel reservation
      setReservation(prev => prev ? { 
        ...prev, 
        status: 'cancelled', 
        cancellationReason: cancelReason 
      } : null);
      setCancelOpen(false);
    } catch (err) {
      setError('Erro ao cancelar reserva');
    }
  };

  if (loading) return <Box>Carregando...</Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!reservation) return <Alert severity="error">Reserva não encontrada</Alert>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'refunded': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created': return <Note color="primary" />;
      case 'confirmed': return <CheckCircle color="success" />;
      case 'cancelled': return <Cancel color="error" />;
      case 'payment': return <Payment color="info" />;
      case 'updated': return <Edit color="secondary" />;
      default: return <History />;
    }
  };

  const nights = differenceInDays(reservation.checkOut, reservation.checkIn);
  const averageNightPrice = reservation.basePrice / nights;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Reserva #{reservation.id.slice(-6).toUpperCase()}
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => setEditOpen(true)}
          >
            Editar
          </Button>
          {reservation.status !== 'cancelled' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Info */}
        <Grid item xs={12} md={8}>
          {/* Status Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  label={reservation.status}
                  color={getStatusColor(reservation.status) as any}
                  size="large"
                />
                <Chip
                  label={`Pagamento: ${reservation.paymentStatus}`}
                  color={getPaymentStatusColor(reservation.paymentStatus) as any}
                  variant="outlined"
                />
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Calendar color="primary" />
                    <Typography variant="h6">Datas</Typography>
                  </Box>
                  <Typography variant="body1">
                    <strong>Check-in:</strong> {format(reservation.checkIn, 'dd/MM/yyyy', { locale: ptBR })}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Check-out:</strong> {format(reservation.checkOut, 'dd/MM/yyyy', { locale: ptBR })}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {nights} {nights === 1 ? 'noite' : 'noites'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person color="primary" />
                    <Typography variant="h6">Hóspedes</Typography>
                  </Box>
                  <Typography variant="body1">
                    {reservation.guests} {reservation.guests === 1 ? 'pessoa' : 'pessoas'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Property Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Home color="primary" />
                <Typography variant="h6">Propriedade</Typography>
              </Box>
              
              <Typography variant="h6" gutterBottom>
                {reservation.propertyName}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {reservation.propertyAddress}
              </Typography>
              
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  [Imagem da Propriedade]
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Person color="primary" />
                <Typography variant="h6">Cliente</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar src={reservation.clientAvatar} sx={{ width: 50, height: 50 }}>
                  {reservation.clientName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{reservation.clientName}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" />
                    <Typography variant="body2">{reservation.clientEmail}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" />
                    <Typography variant="body2">{reservation.clientPhone}</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Price Breakdown */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Receipt color="primary" />
                <Typography variant="h6">Detalhes do Pagamento</Typography>
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Base ({nights} noites)</TableCell>
                      <TableCell align="right">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(reservation.basePrice)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Taxas de serviço</TableCell>
                      <TableCell align="right">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(reservation.fees)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Impostos</TableCell>
                      <TableCell align="right">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(reservation.taxes)}
                      </TableCell>
                    </TableRow>
                    {reservation.discounts > 0 && (
                      <TableRow>
                        <TableCell>Desconto</TableCell>
                        <TableCell align="right" sx={{ color: 'success.main' }}>
                          -{new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(reservation.discounts)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={2}>
                        <Divider />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell align="right">
                        <strong>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(reservation.totalAmount)}
                        </strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Média por noite: {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(averageNightPrice)}
              </Typography>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <History color="primary" />
                <Typography variant="h6">Histórico</Typography>
              </Box>
              
              <List dense>
                {activities.map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {activity.user}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {format(activity.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Reserva</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          >
            <MenuItem value="pending">Pendente</MenuItem>
            <MenuItem value="confirmed">Confirmada</MenuItem>
            <MenuItem value="completed">Concluída</MenuItem>
            <MenuItem value="cancelled">Cancelada</MenuItem>
          </TextField>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Anotações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione anotações sobre esta reserva..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdateReservation} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancelar Reserva</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita. O cliente será notificado automaticamente.
          </Alert>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo do cancelamento"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Informe o motivo do cancelamento..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Voltar</Button>
          <Button 
            onClick={handleCancelReservation} 
            variant="contained" 
            color="error"
            disabled={!cancelReason.trim()}
          >
            Confirmar Cancelamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}