'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { Client } from '@/lib/types';
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
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/hooks/useAuth';
import CreateClientDialog from './components/CreateClientDialog';
import EditClientDialog from './components/EditClientDialog';
import ClientDetailsDialog from './components/ClientDetailsDialog';

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  cpf?: string;
  notes?: string;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { services, isReady } = useTenant();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
      
      console.log('🔄 [Clients Dashboard] Carregando clientes...');
      const clientsData = await services.clients.getAll();
      console.log(`✅ [Clients Dashboard] ${clientsData.length} clientes carregados`, clientsData);
      
      // Ordenar clientes: mais recentes primeiro
      const sortedClients = clientsData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setClients(sortedClients);
      setError(null);
    } catch (error) {
      console.error('❌ [Clients Dashboard] Erro ao carregar clientes:', error);
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
      console.log('➕ [Clients Dashboard] Criando novo cliente:', formData);
      
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
      console.log('✅ [Clients Dashboard] Cliente criado');
      
      setShowAddDialog(false);
      setFormData({ name: '', phone: '', email: '', cpf: '', notes: '' });
      
      // Recarregar lista
      await loadClients();
    } catch (error) {
      console.error('❌ [Clients Dashboard] Erro ao criar cliente:', error);
      alert(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsDialog(true);
  };

  const handleWhatsAppClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  const handleCallClick = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleEmailClick = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `mailto:${email}`;
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
    if (selectedTab === 1) return matchesSearch && client.isActive; // Ativos
    if (selectedTab === 2) return matchesSearch && client.source === 'whatsapp'; // WhatsApp
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
                Ativos
                <Chip label={clients.filter(c => c.isActive).length} size="small" color="success" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                WhatsApp
                <Chip label={clients.filter(c => c.source === 'whatsapp').length} size="small" color="primary" />
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
                  {clients.filter(c => c.source === 'whatsapp').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Via WhatsApp
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
                  {clients.reduce((sum, c) => sum + c.totalReservations, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Reservas
                </Typography>
              </Box>
              <Schedule sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {clients.filter(c => c.isActive).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clientes Ativos
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          📱 {formatPhone(client.phone)}
                          {client.email && ` • 📧 ${client.email}`}
                          {client.document && ` • 📄 CPF: ${client.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                          {(client.totalReservations || 0) > 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              🏠 {client.totalReservations || 0} reserva{(client.totalReservations || 0) > 1 ? 's' : ''} • 
                              💰 R$ {(client.totalSpent || 0).toLocaleString('pt-BR')} gastos
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Novo cliente - Nenhuma reserva ainda
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            • Cadastrado em {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <IconButton 
                      size="small" 
                      color="success"
                      onClick={(e) => handleWhatsAppClick(client.phone, e)}
                    >
                      <WhatsApp />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={(e) => handleCallClick(client.phone, e)}
                    >
                      <Phone />
                    </IconButton>
                    {client.email && (
                      <IconButton 
                        size="small"
                        onClick={(e) => handleEmailClick(client.email!, e)}
                      >
                        <Email />
                      </IconButton>
                    )}
                    <IconButton 
                      size="small"
                      onClick={(e) => handleEditClick(client, e)}
                      title="Editar cliente"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={(e) => toggleFavorite(client, e)}
                    >
                      <StarBorder />
                    </IconButton>
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