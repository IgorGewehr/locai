'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { Client } from '@/lib/types';
import type { ConversationHeader } from '@/lib/types/conversation-optimized';
import { PaymentMethod } from '@/lib/types/reservation';
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Tabs,
  Tab,
  Badge,
  Tooltip,
} from '@mui/material';
import ModernButton from '@/components/atoms/ModernButton';
import {
  Search,
  Add,
  WhatsApp,
  Phone,
  Email,
  Person,
  FilterList,
  Download,
  Upload,
  Star,
  StarBorder,
  Schedule,
  CheckCircle,
  Edit,
  Refresh,
  Chat,
  FiberManualRecord,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { safeFormatDate, DateFormats } from '@/lib/utils/date-formatter';
import { useAuth } from '@/lib/hooks/useAuth';
import CreateClientDialog from './components/CreateClientDialog';
import EditClientDialog from './components/EditClientDialog';
import ClientDetailsDialog from './components/ClientDetailsDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  cpf?: string;
  notes?: string;
}

// Interface para cliente com dados de conversa
interface ClientWithConversation extends Client {
  lastConversation?: ConversationHeader;
  hasActiveConversation?: boolean;
  totalMessages?: number;
  lastMessageAt?: Date;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { services, isReady } = useTenant();
  const [clients, setClients] = useState<ClientWithConversation[]>([]);
  const [conversations, setConversations] = useState<ConversationHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedClient, setSelectedClient] = useState<ClientWithConversation | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, [services, isReady]);

  const loadClients = async (isRefresh = false) => {
    if (!services || !isReady) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      }

      // Buscar clientes e conversas em paralelo
      const [clientsData, conversationsData] = await Promise.all([
        services.clients.getAll(),
        services.conversations.getAll()
      ]);

      setConversations(conversationsData);

      // Criar um mapa de conversas por telefone para lookup rápido
      const conversationsByPhone = new Map<string, ConversationHeader[]>();
      conversationsData.forEach((conv: ConversationHeader) => {
        const phone = conv.clientPhone;
        if (!conversationsByPhone.has(phone)) {
          conversationsByPhone.set(phone, []);
        }
        conversationsByPhone.get(phone)!.push(conv);
      });

      // Enriquecer clientes com dados de conversas
      const enrichedClients: ClientWithConversation[] = clientsData.map((client: Client) => {
        const clientConvs = conversationsByPhone.get(client.phone) || [];

        // Ordenar conversas por última mensagem (mais recente primeiro)
        const sortedConvs = clientConvs.sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );

        const lastConversation = sortedConvs[0];
        const hasActiveConversation = clientConvs.some(c => c.status === 'active');
        const totalMessages = clientConvs.reduce((sum, c) => sum + (c.messageCount || 0), 0);
        const lastMessageAt = lastConversation?.lastMessageAt;

        return {
          ...client,
          lastConversation,
          hasActiveConversation,
          totalMessages,
          lastMessageAt
        };
      });

      // Ordenar clientes: conversas ativas primeiro, depois por última mensagem, depois por criação
      const sortedClients = enrichedClients.sort((a, b) => {
        // 1. Conversas ativas primeiro
        if (a.hasActiveConversation && !b.hasActiveConversation) return -1;
        if (!a.hasActiveConversation && b.hasActiveConversation) return 1;

        // 2. Última mensagem mais recente
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt && !b.lastMessageAt) return -1;
        if (!a.lastMessageAt && b.lastMessageAt) return 1;

        // 3. Criação mais recente
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setClients(sortedClients);
      setError(null);
    } catch (error) {
      setError('Erro ao carregar clientes. Tente novamente.');
      setClients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddClient = async () => {
    if (!services) return;
    
    try {
      
      const clientData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        document: formData.cpf || undefined,
        source: 'manual',
        isActive: true,
        totalReservations: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await services.clients.create(clientData as Omit<Client, 'id'>);
      
      setShowAddDialog(false);
      setFormData({ name: '', phone: '', email: '', cpf: '', notes: '' });
      
      // Recarregar lista
      await loadClients();
    } catch (error) {
      alert(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleClientClick = (client: ClientWithConversation) => {
    setSelectedClient(client);
    setShowDetailsDialog(true);
  };

  const handleWhatsAppClick = (client: ClientWithConversation, e: React.MouseEvent) => {
    e.stopPropagation();

    // Se o cliente tem conversa, abre a página de conversas diretamente na conversa dele
    if (client.lastConversation) {
      router.push(`/dashboard/conversas?conversation=${client.lastConversation.id}`);
    } else {
      // Se não tem conversa, abre o WhatsApp externo
      window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank');
    }
  };

  const handleEditClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowEditDialog(true);
  };

  const toggleFavorite = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementation for favorite toggle
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      client.phone.includes(searchTerm);

    if (selectedTab === 0) return matchesSearch; // Todos
    if (selectedTab === 1) return matchesSearch && client.lastConversation; // Com Conversas
    if (selectedTab === 2) return matchesSearch && client.hasActiveConversation; // Conversas Ativas
    if (selectedTab === 3) return matchesSearch && (client.totalReservations || 0) > 0; // Com Reservas
    return matchesSearch;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: 3,
        gap: 2
      }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Clientes
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2 
        }}>
          <ModernButton
            variant="elegant"
            size="large"
            icon={<Add />}
            onClick={() => setShowAddDialog(true)}
          >
            Adicionar Cliente
          </ModernButton>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={() => loadClients(true)} 
                    disabled={refreshing}
                    title="Atualizar lista"
                    sx={{ mr: 1 }}
                  >
                    <Refresh sx={{ 
                      animation: refreshing ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} />
                  </IconButton>
                  <IconButton onClick={() => setFilterOpen(!filterOpen)}>
                    <FilterList />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
          sx={{ px: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Todos
                <Chip label={clients.length} size="small" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Com Conversas
                <Chip label={clients.filter(c => c.lastConversation).length} size="small" color="primary" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Conversas Ativas
                <Chip label={clients.filter(c => c.hasActiveConversation).length} size="small" color="success" />
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Com Reservas
                <Chip label={clients.filter(c => (c.totalReservations || 0) > 0).length} size="small" color="info" />
              </Box>
            }
          />
        </Tabs>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {clients.length}
                </Typography>
                <Typography variant="body2">
                  Total de Clientes
                </Typography>
              </Box>
              <Person sx={{ fontSize: 40, opacity: 0.7 }} />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {clients.filter(c => c.hasActiveConversation).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Conversas Ativas
                </Typography>
              </Box>
              <Chat sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {conversations.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Conversas
                </Typography>
              </Box>
              <WhatsApp sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {clients.reduce((sum, c) => sum + (Number(c.totalReservations) || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Reservas
                </Typography>
              </Box>
              <Schedule sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Clients List - Contact Style */}
      <Card>
        <List sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">Carregando clientes...</Typography>
            </Box>
          ) : filteredClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Person sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? 'Nenhum cliente encontrado para esta busca' : 'Nenhum cliente cadastrado'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm 
                  ? 'Tente ajustar os filtros ou termo de busca'
                  : 'Clientes também são adicionados automaticamente via WhatsApp'
                }
              </Typography>
              {!searchTerm && (
                <ModernButton
                  variant="elegant"
                  size="medium"
                  icon={<Add />}
                  onClick={() => setShowAddDialog(true)}
                >
                  Adicionar Primeiro Cliente
                </ModernButton>
              )}
            </Box>
          ) : (
            filteredClients.map((client, index) => (
              <Box key={client.id}>
                <ListItemButton
                  onClick={() => handleClientClick(client)}
                  sx={{ py: 2 }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: client.source === 'whatsapp' ? 'success.main' : 'primary.main',
                        width: 48,
                        height: 48,
                      }}
                    >
                      {getInitials(client.name)}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight={500}>
                          {client.name}
                        </Typography>
                        {client.source === 'whatsapp' && (
                          <Chip
                            label="WhatsApp"
                            size="small"
                            color="success"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {client.hasActiveConversation && (
                          <Chip
                            icon={<FiberManualRecord sx={{ fontSize: 10 }} />}
                            label="Conversa Ativa"
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {client.totalMessages && client.totalMessages > 0 && (
                          <Chip
                            icon={<Chat sx={{ fontSize: 14 }} />}
                            label={`${client.totalMessages} msg${client.totalMessages > 1 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'block' }}>
                          {formatPhone(client.phone)}
                          {client.email && ` • ${client.email}`}
                        </Box>
                        {client.lastMessageAt && (() => {
                          try {
                            const lastMessageDate = typeof client.lastMessageAt === 'string'
                              ? new Date(client.lastMessageAt)
                              : client.lastMessageAt instanceof Date
                                ? client.lastMessageAt
                                : null;

                            if (!lastMessageDate || isNaN(lastMessageDate.getTime())) {
                              return null;
                            }

                            return (
                              <Box sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: client.hasActiveConversation ? 'success.main' : 'text.secondary' }}>
                                Última mensagem: {formatDistanceToNow(lastMessageDate, { addSuffix: true, locale: ptBR })}
                              </Box>
                            );
                          } catch (error) {
                            console.error('Erro ao formatar data:', error);
                            return null;
                          }
                        })()}
                        <Box sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                          {(Number(client.totalReservations) || 0) > 0 ? (
                            <>
                              {Number(client.totalReservations) || 0} reserva{(Number(client.totalReservations) || 0) > 1 ? 's' : ''} •
                              R$ {(Number(client.totalSpent) || 0).toLocaleString('pt-BR')} gastos
                            </>
                          ) : (
                            'Novo cliente - Nenhuma reserva ainda'
                          )}
                        </Box>
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip
                      title={client.lastConversation ? "Abrir conversa" : "Iniciar conversa no WhatsApp"}
                      arrow
                      placement="top"
                    >
                      <Box component="span">
                        <IconButton
                          size="medium"
                          color="success"
                          onClick={(e) => handleWhatsAppClick(client, e)}
                          sx={{
                            bgcolor: 'success.main',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'success.dark',
                              transform: 'scale(1.05)',
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                          <WhatsApp />
                        </IconButton>
                      </Box>
                    </Tooltip>
                    <Tooltip title="Editar cliente" arrow placement="top">
                      <Box component="span">
                        <IconButton
                          size="small"
                          onClick={(e) => handleEditClick(client, e)}
                        >
                          <Edit />
                        </IconButton>
                      </Box>
                    </Tooltip>
                  </Box>
                </ListItemButton>
                {index < filteredClients.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </List>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Cliente</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(21) 99999-9999"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CPF"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            Clientes também são adicionados automaticamente quando entram em contato pelo WhatsApp.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleAddClient}
            disabled={!formData.name || !formData.phone}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar Clientes</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Upload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Arraste um arquivo CSV aqui
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              ou clique para selecionar
            </Typography>
            <Button variant="outlined" component="label">
              Selecionar Arquivo
              <input type="file" hidden accept=".csv" />
            </Button>
          </Box>
          <Alert severity="info">
            O arquivo CSV deve conter as colunas: nome, telefone, email, cpf
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      {/* Client Dialogs */}
      <CreateClientDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={() => {
          loadClients();
          setShowAddDialog(false);
        }}
      />

      {selectedClient && (
        <>
          <EditClientDialog
            open={showEditDialog}
            client={selectedClient}
            onClose={() => {
              setShowEditDialog(false);
              setSelectedClient(null);
            }}
            onSuccess={() => {
              loadClients();
              setShowEditDialog(false);
              setSelectedClient(null);
            }}
          />

          <ClientDetailsDialog
            open={showDetailsDialog}
            client={selectedClient}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedClient(null);
            }}
            onEdit={() => {
              setShowDetailsDialog(false);
              setShowEditDialog(true);
            }}
          />
        </>
      )}

      {/* Speed Dial */}
      <SpeedDial
        ariaLabel="Ações rápidas"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<Upload />}
          tooltipTitle="Importar Clientes"
          onClick={() => setShowImportDialog(true)}
        />
        <SpeedDialAction
          icon={<Add />}
          tooltipTitle="Adicionar Cliente"
          onClick={() => setShowAddDialog(true)}
        />
      </SpeedDial>
    </Box>
  );
}