'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import type { Reservation, Client } from '@/lib/types';
import type { Property } from '@/lib/types/property';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
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
  CircularProgress,
  Link
} from '@mui/material';
import ModernButton from '@/components/atoms/ModernButton';
import ModernFAB from '@/components/atoms/ModernFAB';
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
  Refresh,
  Home,
  Person,
  Receipt,
  Event,
  House,
  LocationOn
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
  const { services, isReady } = useTenant();
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<ReservationWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // New filter for reservation vs visit
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

    // Type filter (reservation vs visit)
    if (typeFilter !== 'all') {
      if (typeFilter === 'visit') {
        filtered = filtered.filter(reservation => 
          reservation.status === 'visit' || 
          ((reservation.totalPrice || 0) === 0 && reservation.status === 'pending')
        );
      } else if (typeFilter === 'reservation') {
        filtered = filtered.filter(reservation => 
          reservation.status !== 'visit' && 
          !((reservation.totalPrice || 0) === 0 && reservation.status === 'pending')
        );
      }
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
  }, [reservations, searchTerm, statusFilter, typeFilter, paymentFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'checked_in': return 'info';
      case 'checked_out': return 'default';
      case 'cancelled': return 'error';
      case 'visit': return 'secondary';
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

  const handleViewDetails = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation);
    setDetailsOpen(true);
  };

  // Load reservations from Firebase
  useEffect(() => {
    const loadReservations = async () => {
      if (!isReady || !services) {
        return;
      }

      try {
        const [reservationsData, propertiesData, clientsData] = await Promise.all([
          services.reservations.getAll(),
          services.properties.getAll(),
          services.clients.getAll()
        ]);

        // Create maps for quick lookup
        const propertiesMap = new Map(propertiesData.map(p => [p.id, p]));
        const clientsMap = new Map(clientsData.map(c => [c.id, c]));

        // Combine reservation data with property and client details
        const reservationsWithDetails: ReservationWithDetails[] = reservationsData.map(reservation => {
          const property = propertiesMap.get(reservation.propertyId);
          const client = clientsMap.get(reservation.clientId);
          
          // Convert Firebase Timestamps to JavaScript Dates
          const checkInDate = reservation.checkIn instanceof Date 
            ? reservation.checkIn 
            : reservation.checkIn?.toDate ? reservation.checkIn.toDate() : new Date(reservation.checkIn);
          const checkOutDate = reservation.checkOut instanceof Date 
            ? reservation.checkOut 
            : reservation.checkOut?.toDate ? reservation.checkOut.toDate() : new Date(reservation.checkOut);
          const createdAtDate = reservation.createdAt instanceof Date
            ? reservation.createdAt
            : reservation.createdAt?.toDate ? reservation.createdAt.toDate() : new Date(reservation.createdAt);
            
          const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

          return {
            ...reservation,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            createdAt: createdAtDate,
            propertyName: property?.title || 'Propriedade não encontrada',
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
  }, [services, isReady]);

  const refreshData = async () => {
    if (!isReady || !services) {
      return;
    }

    setLoading(true);
    try {
      // Reload data from Firebase
      const [reservationsData, propertiesData, clientsData] = await Promise.all([
        services.reservations.getAll(),
        services.properties.getAll(),
        services.clients.getAll()
      ]);

      const propertiesMap = new Map(propertiesData.map(p => [p.id, p]));
      const clientsMap = new Map(clientsData.map(c => [c.id, c]));

      const reservationsWithDetails: ReservationWithDetails[] = reservationsData.map(reservation => {
        const property = propertiesMap.get(reservation.propertyId);
        const client = clientsMap.get(reservation.clientId);
        
        // Convert Firebase Timestamps to JavaScript Dates
        const checkInDate = reservation.checkIn instanceof Date 
          ? reservation.checkIn 
          : reservation.checkIn?.toDate ? reservation.checkIn.toDate() : new Date(reservation.checkIn);
        const checkOutDate = reservation.checkOut instanceof Date 
          ? reservation.checkOut 
          : reservation.checkOut?.toDate ? reservation.checkOut.toDate() : new Date(reservation.checkOut);
        const createdAtDate = reservation.createdAt instanceof Date
          ? reservation.createdAt
          : reservation.createdAt?.toDate ? reservation.createdAt.toDate() : new Date(reservation.createdAt);
          
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...reservation,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          createdAt: createdAtDate,
          propertyName: property?.title || 'Propriedade não encontrada',
          clientName: client?.name || 'Cliente não encontrado',
          clientPhone: client?.phone || 'Telefone não encontrado',
          nights
        };
      });

      setReservations(reservationsWithDetails);
    } catch (error) {
      console.error('Error refreshing reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        gap: 2,
        mb: 3 
      }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Reservas e Visitas
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <ModernButton
            variant="elegant"
            size="large"
            icon={<Add />}
            onClick={() => router.push('/dashboard/reservations/create')}
          >
            Nova Reserva
          </ModernButton>
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

            <Grid item xs={6} sm={3} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={typeFilter}
                  label="Tipo"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="reservation">Reservas</MenuItem>
                  <MenuItem value="visit">Visitas</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
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
                  <MenuItem value="visit">Visita Agendada</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={3} md={2}>
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

            <Grid item xs={12} sm={6} md={2}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <IconButton onClick={refreshData} disabled={loading || !isReady}>
                  <Refresh />
                </IconButton>
                <Chip 
                  label={`${filteredReservations.length} registros`} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card sx={{ overflowX: 'auto', ...scrollbarStyles.table }}>
        <TableContainer sx={{ 
          minWidth: { xs: 300, sm: 600, md: 900 },
          overflowX: 'auto',
          ...scrollbarStyles.table
        }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>ID</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Cliente</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Propriedade</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Período</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Hóspedes</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Valor</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Pagamento</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Origem</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, px: { xs: 1, sm: 2 } }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading || !isReady ? (
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
                filteredReservations.map((reservation) => {
                  const isVisit = reservation.status === 'visit' || ((reservation.totalPrice || 0) === 0 && reservation.status === 'pending');
                  
                  return (
                  <TableRow key={reservation.id} hover>
                    <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isVisit ? (
                          <Event sx={{ fontSize: 18, color: 'secondary.main' }} />
                        ) : (
                          <House sx={{ fontSize: 18, color: 'primary.main' }} />
                        )}
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          #{reservation.id.slice(-6).toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>

                  <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                      <Avatar sx={{ width: { xs: 24, sm: 32 }, height: { xs: 24, sm: 32 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, display: { xs: 'none', sm: 'flex' } }}>
                        {reservation.clientName ? reservation.clientName.charAt(0) : '?'}
                      </Avatar>
                      <Box>
                        <Link
                          href={`/dashboard/clients/${reservation.clientId}`}
                          sx={{ 
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          <Person sx={{ fontSize: 16 }} />
                          <Typography variant="body2" fontWeight="medium" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {reservation.clientName}
                          </Typography>
                        </Link>
                        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: { xs: '0.625rem', sm: '0.75rem' } }}>
                          {reservation.clientPhone}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>
                    <Link
                      href={`/dashboard/properties/${reservation.propertyId}`}
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      <Home sx={{ fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {reservation.propertyName}
                      </Typography>
                    </Link>
                  </TableCell>

                  <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        {format(reservation.checkIn, 'dd/MM', { locale: ptBR })} - {format(reservation.checkOut, 'dd/MM', { locale: ptBR })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, fontSize: { xs: '0.625rem', sm: '0.75rem' } }}>
                        {reservation.nights} noites
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Badge badgeContent={reservation.guests} color="primary">
                      <Typography variant="body2">pessoas</Typography>
                    </Badge>
                  </TableCell>

                  <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      R$ {(reservation.totalPrice || 0).toLocaleString('pt-BR')}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ px: { xs: 1, sm: 2 }, display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip
                      label={
                        reservation.status === 'visit' ? 'Visita Agendada' :
                        reservation.status === 'confirmed' ? 'Confirmada' :
                        reservation.status === 'pending' ? (isVisit ? 'Visita Pendente' : 'Pendente') :
                        reservation.status === 'checked_in' ? 'Check-in' :
                        reservation.status === 'checked_out' ? 'Check-out' :
                        reservation.status === 'cancelled' ? 'Cancelada' : reservation.status
                      }
                      color={getStatusColor(reservation.status) as any}
                      size="small"
                      sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                      icon={isVisit ? <Event sx={{ fontSize: 14 }} /> : undefined}
                    />
                  </TableCell>

                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {!isVisit ? (
                      <Chip
                        label={reservation.paymentStatus}
                        color={getPaymentStatusColor(reservation.paymentStatus) as any}
                        size="small"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                    <Tooltip title="Manual">
                      <Schedule sx={{ fontSize: 16 }} />
                    </Tooltip>
                  </TableCell>

                  <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                    <Box sx={{ display: 'flex', gap: { xs: 0, sm: 0.5 }, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                      <Tooltip title="Ver pagamento">
                        <IconButton 
                          size="small" 
                          onClick={() => router.push(`/dashboard/financeiro?reservationId=${reservation.id}`)}
                          color="primary"
                          sx={{ p: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          <Payment sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver detalhes">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(reservation)}
                          sx={{ p: { xs: 0.5, sm: 1 } }}
                        >
                          <Visibility sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small"
                          onClick={() => router.push(`/dashboard/reservations/${reservation.id}/edit`)}
                          sx={{ p: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          <Edit sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          size="small" 
                          color="error"
                          sx={{ p: { xs: 0.5, sm: 1 }, display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                          <Delete sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
                );
              }))}
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
                <Typography><strong>Valor Total:</strong> R$ {(selectedReservation.totalPrice || 0).toLocaleString('pt-BR')}</Typography>
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
          <Button 
            startIcon={<Payment />}
            onClick={() => {
              setDetailsOpen(false);
              router.push(`/dashboard/financeiro?reservationId=${selectedReservation?.id}`);
            }}
          >
            Ver Pagamento
          </Button>
          <Button 
            startIcon={<Person />}
            onClick={() => {
              setDetailsOpen(false);
              router.push(`/dashboard/clients/${selectedReservation?.clientId}`);
            }}
          >
            Ver Cliente
          </Button>
          <Button 
            startIcon={<Home />}
            onClick={() => {
              setDetailsOpen(false);
              router.push(`/dashboard/properties/${selectedReservation?.propertyId}`);
            }}
          >
            Ver Propriedade
          </Button>
          <Button onClick={() => setDetailsOpen(false)}>
            Fechar
          </Button>
          <Button variant="contained">
            Editar Reserva
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Quick Add - Mobile Only */}
      <ModernFAB
        variant="gradient"
        size="large"
        tooltip="Nova Reserva"
        icon={<Add />}
        onClick={() => router.push('/dashboard/reservations/create')}
        sx={{ display: { xs: 'flex', sm: 'none' } }}
      />
    </Box>
  );
}