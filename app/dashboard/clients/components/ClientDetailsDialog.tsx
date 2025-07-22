'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Phone,
  WhatsApp,
  Email,
  Edit,
  Person,
  AttachMoney,
  Event,
  Description,
  CalendarToday,
  LocationOn,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { reservationService } from '@/lib/firebase/firestore';
import type { Client } from '@/lib/types';
import type { Reservation } from '@/lib/types/reservation';

interface ClientDetailsDialogProps {
  open: boolean;
  client: Client;
  onClose: () => void;
  onEdit: () => void;
}

export default function ClientDetailsDialog({ open, client, onClose, onEdit }: ClientDetailsDialogProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      loadReservations();
    }
  }, [open, client]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const clientReservations = await reservationService.getWhere('clientId', '==', client.id);
      setReservations(clientReservations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading reservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Concluída';
      default: return status;
    }
  };

  const totalSpent = reservations
    .filter(r => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + (r.totalValue || 0), 0);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: client.source === 'whatsapp' ? 'success.main' : 'primary.main',
              width: 56,
              height: 56,
            }}
          >
            {getInitials(client.name)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {client.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={client.isActive ? 'Ativo' : 'Inativo'}
                size="small"
                color={client.isActive ? 'success' : 'default'}
              />
              {client.source === 'whatsapp' && (
                <Chip
                  label="WhatsApp"
                  size="small"
                  color="primary"
                />
              )}
              {totalSpent > 5000 && (
                <Chip
                  label="VIP"
                  size="small"
                  color="warning"
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onEdit}>
            <Edit />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Informações Básicas */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Informações Pessoais
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Phone />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Telefone" 
                      secondary={formatPhone(client.phone)} 
                    />
                    <IconButton 
                      size="small" 
                      color="success"
                      onClick={() => window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank')}
                    >
                      <WhatsApp />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => window.location.href = `tel:${client.phone}`}
                    >
                      <Phone />
                    </IconButton>
                  </ListItem>
                  
                  {client.email && (
                    <ListItem>
                      <ListItemIcon>
                        <Email />
                      </ListItemIcon>
                      <ListItemText 
                        primary="E-mail" 
                        secondary={client.email} 
                      />
                      <IconButton 
                        size="small"
                        onClick={() => window.location.href = `mailto:${client.email}`}
                      >
                        <Email />
                      </IconButton>
                    </ListItem>
                  )}
                  
                  {client.document && (
                    <ListItem>
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText 
                        primary="CPF" 
                        secondary={formatCPF(client.document)} 
                      />
                    </ListItem>
                  )}
                  
                  <ListItem>
                    <ListItemIcon>
                      <CalendarToday />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Cadastrado em" 
                      secondary={format(new Date(client.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} 
                    />
                  </ListItem>
                </List>

                {client.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Observações:
                    </Typography>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      {client.notes}
                    </Alert>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Estatísticas */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney /> Estatísticas
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                      <Typography variant="h4" fontWeight={600} color="primary.contrastText">
                        {reservations.length}
                      </Typography>
                      <Typography variant="body2" color="primary.contrastText">
                        Total de Reservas
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="h4" fontWeight={600} color="success.contrastText">
                        R$ {totalSpent.toLocaleString('pt-BR')}
                      </Typography>
                      <Typography variant="body2" color="success.contrastText">
                        Total Gasto
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h4" fontWeight={600} color="info.contrastText">
                        {reservations.filter(r => r.status === 'confirmed').length}
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        Confirmadas
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                      <Typography variant="h4" fontWeight={600} color="warning.contrastText">
                        {reservations.filter(r => r.status === 'pending').length}
                      </Typography>
                      <Typography variant="body2" color="warning.contrastText">
                        Pendentes
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Histórico de Reservas */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Event /> Histórico de Reservas
                </Typography>
                
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : reservations.length === 0 ? (
                  <Alert severity="info">
                    Este cliente ainda não possui reservas.
                  </Alert>
                ) : (
                  <List>
                    {reservations.map((reservation, index) => (
                      <Box key={reservation.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2">
                                  Reserva #{reservation.id.slice(-6)}
                                </Typography>
                                <Chip
                                  label={getStatusLabel(reservation.status)}
                                  size="small"
                                  color={getStatusColor(reservation.status)}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Check-in: {format(new Date(reservation.checkIn), 'dd/MM/yyyy', { locale: ptBR })} • 
                                  Check-out: {format(new Date(reservation.checkOut), 'dd/MM/yyyy', { locale: ptBR })}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Valor: R$ {(reservation.totalValue || 0).toLocaleString('pt-BR')} • 
                                  Hóspedes: {reservation.guestCount}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Criada em: {format(new Date(reservation.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < reservations.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Fechar
        </Button>
        <Button onClick={onEdit} variant="contained">
          Editar Cliente
        </Button>
      </DialogActions>
    </Dialog>
  );
}