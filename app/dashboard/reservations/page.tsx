'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { reservationService, propertyService, clientService } from '@/lib/firebase/firestore';
import type { Reservation, Property, Client } from '@/lib/types';
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
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Avatar,
  Tooltip,
  Badge,
  Fab,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Visibility,
  Edit,
  Delete,
  WhatsApp,
  Payment,
  CheckCircle,
  Cancel,
  Schedule,
  Download,
  Refresh
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReservationWithDetails extends Reservation {
  propertyName: string;
  clientName: string;
  clientPhone: string;
  nights: number;
}

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<ReservationWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter reservations based on search and filters
  useEffect(() => {
    let filtered = reservations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(reservation =>
        reservation.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(reservation => reservation.status === statusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(reservation => reservation.paymentStatus === paymentFilter);
    }

    setFilteredReservations(filtered);
  }, [reservations, searchTerm, statusFilter, paymentFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'checked_in': return 'info';
      case 'checked_out': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whatsapp_ai': return <WhatsApp sx={{ fontSize: 16 }} />;
      default: return <Schedule sx={{ fontSize: 16 }} />;
    }
  };

  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setDetailsOpen(true);
  };

  // Load reservations from Firebase
  useEffect(() => {
    const loadReservations = async () => {
      try {
        const [reservationsData, propertiesData, clientsData] = await Promise.all([
          reservationService.getAll(),
          propertyService.getAll(),
          clientService.getAll()
        ]);

        // Create maps for quick lookup
        const propertiesMap = new Map(propertiesData.map(p => [p.id, p]));
        const clientsMap = new Map(clientsData.map(c => [c.id, c]));

        // Combine reservation data with property and client details
        const reservationsWithDetails: ReservationWithDetails[] = reservationsData.map(reservation => {
          const property = propertiesMap.get(reservation.propertyId);
          const client = clientsMap.get(reservation.clientId);
          const checkInDate = new Date(reservation.checkIn);
          const checkOutDate = new Date(reservation.checkOut);
          const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

          return {
            ...reservation,
            propertyName: property?.name || 'Propriedade não encontrada',
            clientName: client?.name || 'Cliente não encontrado',
            clientPhone: client?.phone || 'Telefone não encontrado',
            nights
          };
        });

        setReservations(reservationsWithDetails);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };

    loadReservations();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    // Reload data from Firebase
    const [reservationsData, propertiesData, clientsData] = await Promise.all([
      reservationService.getAll(),
      propertyService.getAll(),
      clientService.getAll()
    ]);

    const propertiesMap = new Map(propertiesData.map(p => [p.id, p]));
    const clientsMap = new Map(clientsData.map(c => [c.id, c]));

    const reservationsWithDetails: ReservationWithDetails[] = reservationsData.map(reservation => {
      const property = propertiesMap.get(reservation.propertyId);
      const client = clientsMap.get(reservation.clientId);
      const checkInDate = new Date(reservation.checkIn);
      const checkOutDate = new Date(reservation.checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...reservation,
        propertyName: property?.name || 'Propriedade não encontrada',
        clientName: client?.name || 'Cliente não encontrado',
        clientPhone: client?.phone || 'Telefone não encontrado',
        nights
      };
    });

    setReservations(reservationsWithDetails);
    setLoading(false);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Reservas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => {/* Implementar export */}}
          >
            Exportar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/dashboard/reservations/create')}
          >
            Nova Reserva
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por cliente, propriedade ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="confirmed">Confirmada</MenuItem>
                  <MenuItem value="checked_in">Check-in</MenuItem>
                  <MenuItem value="checked_out">Check-out</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Pagamento</InputLabel>
                <Select
                  value={paymentFilter}
                  label="Pagamento"
                  onChange={(e) => setPaymentFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="paid">Pago</MenuItem>
                  <MenuItem value="overdue">Atrasado</MenuItem>
                  <MenuItem value="refunded">Reembolsado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <IconButton onClick={refreshData} disabled={loading}>
                  <Refresh />
                </IconButton>
                <Chip 
                  label={`${filteredReservations.length} reservas`} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Propriedade</TableCell>
                <TableCell>Período</TableCell>
                <TableCell>Hóspedes</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Pagamento</TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Carregando reservas...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Nenhuma reserva encontrada</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((reservation) => (
                <TableRow key={reservation.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {reservation.id}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                        {reservation.clientName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.clientName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reservation.clientPhone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {reservation.propertyName}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {format(reservation.checkIn, 'dd/MM', { locale: ptBR })} - {format(reservation.checkOut, 'dd/MM/yyyy', { locale: ptBR })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {reservation.nights} noites
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Badge badgeContent={reservation.guests} color="primary">
                      <Typography variant="body2">pessoas</Typography>
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      R$ {reservation.totalPrice.toLocaleString('pt-BR')}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={reservation.status}
                      color={getStatusColor(reservation.status) as any}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={reservation.paymentStatus}
                      color={getPaymentStatusColor(reservation.paymentStatus) as any}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <Tooltip title="Manual">
                      <Schedule sx={{ fontSize: 16 }} />
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewDetails(reservation)}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Reservation Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes da Reserva - {selectedReservation?.id}
        </DialogTitle>
        <DialogContent>
          {selectedReservation && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Informações do Cliente
                </Typography>
                <Typography><strong>Nome:</strong> {selectedReservation.clientName}</Typography>
                <Typography><strong>Telefone:</strong> {selectedReservation.clientPhone}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Detalhes da Estadia
                </Typography>
                <Typography><strong>Propriedade:</strong> {selectedReservation.propertyName}</Typography>
                <Typography><strong>Check-in:</strong> {format(selectedReservation.checkIn, 'dd/MM/yyyy')}</Typography>
                <Typography><strong>Check-out:</strong> {format(selectedReservation.checkOut, 'dd/MM/yyyy')}</Typography>
                <Typography><strong>Hóspedes:</strong> {selectedReservation.guests}</Typography>
                <Typography><strong>Noites:</strong> {selectedReservation.nights}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Financeiro
                </Typography>
                <Typography><strong>Valor Total:</strong> R$ {selectedReservation.totalPrice.toLocaleString('pt-BR')}</Typography>
                <Typography><strong>Status Pagamento:</strong> {selectedReservation.paymentStatus}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Status
                </Typography>
                <Typography><strong>Status:</strong> {selectedReservation.status}</Typography>
                <Typography><strong>Origem:</strong> Manual</Typography>
                <Typography><strong>Criado em:</strong> {format(selectedReservation.createdAt, 'dd/MM/yyyy HH:mm')}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Fechar
          </Button>
          <Button variant="contained">
            Editar Reserva
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Quick Add */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => router.push('/dashboard/reservations/create')}
      >
        <Add />
      </Fab>
    </Box>
  );
}