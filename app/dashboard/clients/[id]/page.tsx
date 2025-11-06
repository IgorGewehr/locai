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
  Skeleton,
  CircularProgress,
  MenuItem,
  Stack,
  useTheme,
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
  Chat,
  History,
  Bookmark,
  Visibility,
  Home,
  Payment,
  CheckCircle,
  Cancel,
  Schedule,
  Event,
} from '@mui/icons-material';
import { safeFormatDate, DateFormats } from '@/lib/utils/dateUtils';
import { clientServiceWrapper } from '@/lib/services/client-service';
import { useTenant } from '@/contexts/TenantContext';
import { ConversationList } from '@/components/organisms/ConversationList/ConversationList';
import { ConversationThread } from '@/components/organisms/ConversationThread/ConversationThread';
import { createConversationOptimizedService } from '@/lib/services/conversation-optimized-service';
import type { ConversationSummary, ConversationMessage } from '@/lib/types/conversation-optimized';

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
  propertyId: string;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out' | 'visit';
  total: number;
  paymentStatus?: string;
  guests?: number;
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
  const theme = useTheme();
  const { services, isReady } = useTenant();
  const [client, setClient] = useState<Client | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    notes: '',
    tags: [] as string[],
    status: 'active' as 'active' | 'inactive' | 'lead',
  });

  useEffect(() => {
    loadClientData();
  }, [params.id, services, isReady]);

  const loadConversationMessages = async (conversationId: string) => {
    if (!services || !isReady) return;

    try {
      setLoadingMessages(true);
      const conversationService = createConversationOptimizedService(services.tenantId);
      const messages = await conversationService.getConversationMessages(conversationId, 50, 'asc');
      setConversationMessages(messages);
      setSelectedConversationId(conversationId);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadClientData = async () => {
    if (!services || !isReady) return;
    
    try {
      setLoading(true);
      
      // Fetch client data using tenant-aware service
      const client = await services.clients.getById(params.id as string);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }
      
      // Fetch client reservations
      let reservations: Reservation[] = [];
      try {
        const reservationsData = await services.reservations.getWhere('clientId', '==', params.id as string);
        // Sort by check-in date descending
        reservations = reservationsData
          .map((res: any) => ({
            id: res.id,
            propertyId: res.propertyId,
            propertyName: res.propertyName || res.propertyId || 'Propriedade não identificada',
            checkIn: res.checkIn?.toDate ? res.checkIn.toDate() : new Date(res.checkIn),
            checkOut: res.checkOut?.toDate ? res.checkOut.toDate() : new Date(res.checkOut),
            status: res.status || 'pending',
            total: res.totalPrice || res.totalAmount || 0,
            paymentStatus: res.paymentStatus,
            guests: res.guests
          }))
          .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
      } catch (err) {
        console.log('Erro ao carregar reservas:', err);
      }
      
      // Fetch client conversations
      let conversations: Conversation[] = [];
      try {
        const conversationsData = await services.conversations.getWhere('clientId', '==', params.id as string);
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

      // Fetch optimized conversation summaries
      try {
        const conversationService = createConversationOptimizedService(services.tenantId);
        const summaries = await conversationService.getConversationSummaries(params.id as string, 20);
        setConversationSummaries(summaries);
      } catch (err) {
        console.log('Erro ao carregar sumários de conversas:', err);
      }
      
      // Process client data with safe date handling
      const processedClient = {
        ...client,
        createdAt: (client.createdAt as any)?.toDate ? (client.createdAt as any).toDate() : new Date(client.createdAt || Date.now()),
        lastContact: ((client as any).lastContact as any)?.toDate ? ((client as any).lastContact as any).toDate() : ((client as any).lastContact ? new Date((client as any).lastContact) : null),
        totalReservations: (client as any).totalReservations || reservations.length,
        totalSpent: (client as any).totalSpent || 0,
        tags: (client as any).tags || []
      } as any;

      setClient(processedClient);
      setReservations(reservations);
      setConversations(conversations);
      setNotes((client as any).notes || '');
      setClientName(client.name || '');
      
      // Initialize form data
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        document: (client as any).document || '',
        notes: (client as any).notes || '',
        tags: (client as any).tags || [],
        status: (client as any).status || 'active',
      });
    } catch (err) {
      console.error('Erro ao carregar dados do cliente:', err);
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!services) return;
    
    try {
      // Update notes using tenant-aware service
      await services.clients.update(params.id as string, { 
        notes,
        updatedAt: new Date()
      } as any);
      setClient(prev => prev ? { ...prev, notes } : null);
      setEditOpen(false);
    } catch (err) {
      console.error('Erro ao salvar anotações:', err);
      setError('Erro ao salvar anotações');
    }
  };

  const handleSaveName = async () => {
    if (!services) return;
    
    try {
      // Update name using tenant-aware service
      await services.clients.update(params.id as string, { 
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

  const handleSaveClient = async () => {
    setSaving(true);
    setError('');

    try {
      await clientServiceWrapper.update(params.id as string, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        document: formData.document,
        notes: formData.notes,
        tags: formData.tags,
        status: formData.status,
        updatedAt: new Date(),
      } as any);

      // Update local state
      setClient(prev => prev ? {
        ...prev,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        tags: formData.tags,
        status: formData.status,
      } : null);
      
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Skeleton variant="text" width={300} height={40} />
        </Box>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item>
                <Skeleton variant="circular" width={80} height={80} />
              </Grid>
              <Grid item xs>
                <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
                <Skeleton variant="text" width={250} height={20} sx={{ mb: 1 }} />
                <Skeleton variant="text" width={200} height={20} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="100%" height={24} />
                  <Skeleton variant="text" width="80%" height={40} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }
  
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
              {!editMode ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h5">
                      {client.name}
                    </Typography>
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
                      <Typography variant="body1">{client.email || 'Não informado'}</Typography>
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
                </>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nome"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Telefone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="E-mail"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Status"
                      select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <MenuItem value="active">Ativo</MenuItem>
                      <MenuItem value="inactive">Inativo</MenuItem>
                      <MenuItem value="lead">Lead</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="CPF/CNPJ"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>
            <Grid item>
              {!editMode ? (
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(true)}
                >
                  Editar Cliente
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditMode(false);
                      // Reset form data
                      setFormData({
                        name: client.name || '',
                        email: client.email || '',
                        phone: client.phone || '',
                        document: (client as any).document || '',
                        notes: (client as any).notes || '',
                        tags: client.tags || [],
                        status: client.status || 'active',
                      });
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleSaveClient}
                    disabled={saving}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Notes Section */}
      {(client.notes || editMode) && (
        <Card sx={{ mb: 3, backgroundColor: 'action.hover' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Anotações</Typography>
              {!editMode && (
                <IconButton size="small" onClick={() => setEditOpen(true)}>
                  <Edit fontSize="small" />
                </IconButton>
              )}
            </Box>
            {editMode ? (
              <TextField
                fullWidth
                multiline
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Adicione anotações sobre este cliente..."
              />
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {client.notes}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

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
          {reservations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">Nenhuma reserva encontrada</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Propriedade</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Hóspedes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Pagamento</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservations.map((reservation) => {
                    const isVisit = reservation.status === 'visit' || reservation.total === 0;
                    const isPast = new Date(reservation.checkOut) < new Date();
                    const isCurrent = new Date(reservation.checkIn) <= new Date() && new Date(reservation.checkOut) >= new Date();
                    
                    return (
                      <TableRow key={reservation.id} hover>
                        <TableCell>
                          {isVisit ? (
                            <Event sx={{ color: 'secondary.main' }} />
                          ) : (
                            <Home sx={{ color: 'primary.main' }} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<Home sx={{ fontSize: 16 }} />}
                            onClick={() => router.push(`/dashboard/properties/${reservation.propertyId}`)}
                            sx={{ textTransform: 'none' }}
                          >
                            {reservation.propertyName}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {safeFormatDate(reservation.checkIn, DateFormats.SHORT)} - {safeFormatDate(reservation.checkOut, DateFormats.SHORT)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (1000 * 60 * 60 * 24))} noites
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{reservation.guests || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              reservation.status === 'visit' ? 'Visita' :
                              reservation.status === 'confirmed' ? 'Confirmada' :
                              reservation.status === 'pending' ? (isVisit ? 'Visita Pendente' : 'Pendente') :
                              reservation.status === 'checked_in' ? 'Check-in' :
                              reservation.status === 'checked_out' ? 'Check-out' :
                              reservation.status === 'cancelled' ? 'Cancelada' : reservation.status
                            }
                            color={
                              reservation.status === 'confirmed' ? 'success' :
                              reservation.status === 'pending' ? 'warning' :
                              reservation.status === 'cancelled' ? 'error' :
                              reservation.status === 'checked_in' ? 'info' :
                              reservation.status === 'visit' ? 'secondary' :
                              'default'
                            }
                            size="small"
                            {...(isVisit ? { icon: <Event sx={{ fontSize: 14 }} /> } : {})}
                          />
                        </TableCell>
                        <TableCell>
                          {!isVisit && reservation.paymentStatus ? (
                            <Chip
                              label={
                                reservation.paymentStatus === 'paid' ? 'Pago' :
                                reservation.paymentStatus === 'pending' ? 'Pendente' :
                                reservation.paymentStatus === 'overdue' ? 'Atrasado' :
                                reservation.paymentStatus
                              }
                              color={
                                reservation.paymentStatus === 'paid' ? 'success' :
                                reservation.paymentStatus === 'pending' ? 'warning' :
                                reservation.paymentStatus === 'overdue' ? 'error' :
                                'default'
                              }
                              size="small"
                            />
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              {isVisit ? 'N/A' : '-'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(reservation.total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/dashboard/reservations/${reservation.id}`)}
                              title="Ver detalhes"
                            >
                              <Visibility sx={{ fontSize: 18 }} />
                            </IconButton>
                            {!isVisit && (
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/dashboard/financeiro?reservationId=${reservation.id}`)}
                                title="Ver pagamento"
                                color="primary"
                              >
                                <Payment sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <ConversationList
                conversations={conversationSummaries}
                loading={loadingConversations}
                onConversationClick={loadConversationMessages}
                selectedConversationId={selectedConversationId || undefined}
              />
            </Grid>
            <Grid item xs={12} md={7}>
              {selectedConversationId ? (
                <ConversationThread
                  messages={conversationMessages}
                  loading={loadingMessages}
                  conversationTitle={
                    conversationSummaries.find(c => c.id === selectedConversationId)?.clientName ||
                    conversationSummaries.find(c => c.id === selectedConversationId)?.clientPhone ||
                    'Conversa'
                  }
                />
              ) : (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight={400}
                  sx={{
                    border: `1px dashed ${theme.palette.divider}`,
                    borderRadius: 1,
                  }}
                >
                  <Stack spacing={2} alignItems="center">
                    <Chat sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary">
                      Selecione uma conversa para visualizar as mensagens
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Combine reservations and conversations into a timeline */}
            {(() => {
              const activities: any[] = [];
              
              // Add reservations to activities
              reservations.forEach(res => {
                const isVisit = res.status === 'visit' || res.total === 0;
                activities.push({
                  id: `res-${res.id}`,
                  type: 'reservation',
                  date: res.checkIn,
                  title: isVisit ? 'Visita agendada' : 'Reserva criada',
                  description: `${res.propertyName} - ${safeFormatDate(res.checkIn, DateFormats.SHORT)} a ${safeFormatDate(res.checkOut, DateFormats.SHORT)}`,
                  status: res.status,
                  link: `/dashboard/reservations/${res.id}`,
                  icon: isVisit ? <Event color="secondary" /> : <Home color="primary" />
                });
              });
              
              // Add conversations to activities
              conversations.forEach(conv => {
                activities.push({
                  id: `conv-${conv.id}`,
                  type: 'conversation',
                  date: conv.timestamp,
                  title: 'Conversa pelo WhatsApp',
                  description: conv.lastMessage,
                  status: conv.status,
                  link: `/dashboard/conversations/${conv.id}`,
                  icon: <WhatsApp color="success" />
                });
              });
              
              // Sort by date descending
              activities.sort((a, b) => b.date.getTime() - a.date.getTime());
              
              if (activities.length === 0) {
                return (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="textSecondary">Nenhuma atividade registrada</Typography>
                  </Box>
                );
              }
              
              return activities.map((activity) => (
                <Paper 
                  key={activity.id} 
                  sx={{ 
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)'
                    }
                  }}
                  onClick={() => router.push(activity.link)}
                >
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ pt: 0.5 }}>
                      {activity.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {activity.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {safeFormatDate(activity.date, DateFormats.LONG)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {activity.description}
                      </Typography>
                      {activity.status && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={
                              activity.status === 'confirmed' ? 'Confirmada' :
                              activity.status === 'pending' ? 'Pendente' :
                              activity.status === 'cancelled' ? 'Cancelada' :
                              activity.status === 'visit' ? 'Visita' :
                              activity.status === 'unread' ? 'Não lida' :
                              activity.status === 'read' ? 'Lida' :
                              activity.status
                            }
                            size="small"
                            color={
                              activity.status === 'confirmed' ? 'success' :
                              activity.status === 'pending' ? 'warning' :
                              activity.status === 'cancelled' ? 'error' :
                              activity.status === 'visit' ? 'secondary' :
                              'default'
                            }
                          />
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton size="small">
                        <Visibility sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ));
            })()}
          </Box>
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