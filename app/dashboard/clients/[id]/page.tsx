'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  Email,
  Phone,
  WhatsApp,
  LocationOn,
  Edit,
  Delete,
  Message,
  History,
  Bookmark,
} from '@mui/icons-material';
import { safeFormatDate, DateFormats } from '@/lib/utils/date-utils';
import { clientService, reservationService, conversationService } from '@/lib/firebase/firestore';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  location?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'lead';
  tags: string[];
  notes?: string;
  createdAt: Date;
  lastContact?: Date;
  totalReservations: number;
  totalSpent: number;
}

interface Reservation {
  id: string;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  total: number;
}

interface Conversation {
  id: string;
  lastMessage: string;
  timestamp: Date;
  status: 'read' | 'unread';
  platform: 'whatsapp' | 'email' | 'phone';
}

function TabPanel({ children, value, index }: any) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    loadClientData();
  }, [params.id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      
      // Fetch client data directly from Firebase
      const client = await clientService.getById(params.id as string);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }
      
      // Fetch client reservations
      let reservations: Reservation[] = [];
      try {
        const reservationsData = await reservationService.getWhere('clientId', '==', params.id as string);
        reservations = reservationsData.map((res: any) => ({
          id: res.id,
          propertyName: res.propertyName || res.propertyId || 'Propriedade não identificada',
          checkIn: res.checkIn?.toDate ? res.checkIn.toDate() : new Date(res.checkIn),
          checkOut: res.checkOut?.toDate ? res.checkOut.toDate() : new Date(res.checkOut),
          status: res.status || 'pending',
          total: res.totalPrice || 0
        }));
      } catch (err) {
        console.log('Erro ao carregar reservas:', err);
      }
      
      // Fetch client conversations
      let conversations: Conversation[] = [];
      try {
        const conversationsData = await conversationService.getWhere('clientId', '==', params.id as string);
        conversations = conversationsData.slice(0, 10).map((conv: any) => ({
          id: conv.id,
          lastMessage: conv.lastMessage || 'Sem mensagens',
          timestamp: conv.updatedAt?.toDate ? conv.updatedAt.toDate() : new Date(conv.updatedAt || Date.now()),
          status: conv.status === 'active' ? 'unread' : 'read',
          platform: conv.platform || 'whatsapp'
        }));
      } catch (err) {
        console.log('Erro ao carregar conversas:', err);
      }
      
      // Process client data with safe date handling
      const processedClient = {
        ...client,
        createdAt: client.createdAt?.toDate ? client.createdAt.toDate() : new Date(client.createdAt || Date.now()),
        lastContact: client.lastContact?.toDate ? client.lastContact.toDate() : (client.lastContact ? new Date(client.lastContact) : null),
        totalReservations: client.totalReservations || reservations.length,
        totalSpent: client.totalSpent || 0,
        tags: client.tags || []
      } as Client;

      setClient(processedClient);
      setReservations(reservations);
      setConversations(conversations);
      setNotes((client as any).notes || '');
      setClientName(client.name || '');
    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      // Update notes directly in Firebase
      await clientService.update(params.id as string, { 
        notes,
        updatedAt: new Date()
      });
      setClient(prev => prev ? { ...prev, notes } : null);
      setEditOpen(false);
    } catch (err) {
      console.error('Erro ao salvar anotações:', err);
      setError('Erro ao salvar anotações');
    }
  };

  const handleSaveName = async () => {
    try {
      // Update name directly in Firebase
      await clientService.update(params.id as string, { 
        name: clientName,
        updatedAt: new Date()
      });
      setClient(prev => prev ? { ...prev, name: clientName } : null);
      setEditNameOpen(false);
    } catch (err) {
      console.error('Erro ao salvar nome:', err);
      setError('Erro ao salvar nome');
    }
  };

  if (loading) return <Box>Carregando...</Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!client) return <Alert severity="error">Cliente não encontrado</Alert>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'lead': return 'warning';
      default: return 'default';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return <WhatsApp color="success" />;
      case 'email': return <Email color="primary" />;
      case 'phone': return <Phone color="secondary" />;
      default: return <Message />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Detalhes do Cliente
        </Typography>
      </Box>

      {/* Client Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                {...(client.avatar && { src: client.avatar })}
                sx={{ width: 80, height: 80 }}
              >
                {client.name?.[0] || '?'}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h5">
                  {client.name}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setEditNameOpen(true)}
                  sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={client.status}
                  color={getStatusColor(client.status) as any}
                  size="small"
                />
                {(client.tags || []).map((tag) => (
                  <Chip key={tag} label={tag} variant="outlined" size="small" />
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email fontSize="small" />
                  <Typography variant="body1">{client.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone fontSize="small" />
                  <Typography variant="body1">{client.phone}</Typography>
                </Box>
                {client.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn fontSize="small" />
                    <Typography variant="body1">{client.location}</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditOpen(true)}
              >
                Editar Anotações
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total de Reservas
              </Typography>
              <Typography variant="h4">{client.totalReservations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Total Gasto
              </Typography>
              <Typography variant="h4">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(client.totalSpent)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Cliente desde
              </Typography>
              <Typography variant="h6">
                {safeFormatDate(client.createdAt, DateFormats.MONTH_YEAR, 'N/A')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="textSecondary" gutterBottom>
                Último Contato
              </Typography>
              <Typography variant="h6">
                {safeFormatDate(client.lastContact, DateFormats.SHORT, 'Nunca')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
            <Tab label="Reservas" icon={<Bookmark />} />
            <Tab label="Conversas" icon={<Message />} />
            <Tab label="Histórico" icon={<History />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Propriedade</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>{reservation.propertyName}</TableCell>
                    <TableCell>
                      {safeFormatDate(reservation.checkIn, DateFormats.SHORT)}
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(reservation.checkOut, DateFormats.SHORT)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reservation.status}
                        color={getStatusColor(reservation.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(reservation.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {conversations.map((conversation) => (
            <Box key={conversation.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getPlatformIcon(conversation.platform)}
                <Typography variant="caption" color="textSecondary">
                  {safeFormatDate(conversation.timestamp, DateFormats.LONG)}
                </Typography>
              </Box>
              <Typography variant="body2">{conversation.lastMessage}</Typography>
            </Box>
          ))}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="body2" color="textSecondary">
            Histórico de atividades em breve...
          </Typography>
        </TabPanel>
      </Card>

      {/* Edit Notes Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Anotações</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Adicione suas anotações sobre este cliente..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveNotes} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onClose={() => setEditNameOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Nome do Cliente</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nome completo do cliente"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNameOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveName} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}