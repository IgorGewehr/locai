'use client';

import { useState, useEffect } from 'react';
import { clientService } from '@/lib/firebase/firestore';
import type { Client } from '@/lib/types/client';
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
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { safeFormatDate, DateFormats } from '@/lib/utils/date-utils';
import { ptBR } from 'date-fns/locale';

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  cpf?: string;
  notes?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
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
  }, []);

  const loadClients = async () => {
    try {
      const clientsData = await clientService.getAll();
      setClients(clientsData as unknown as Client[]);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    try {
      const newClient: any = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || '',
        document: formData.cpf || '',
        documentType: 'cpf',
        preferences: {
          communicationPreference: 'whatsapp',
          preferredPaymentMethod: PaymentMethod.PIX,
          petOwner: false,
          smoker: false,
          marketingOptIn: true
        },
        totalSpent: 0,
        totalReservations: 0,
        isActive: true,
        source: 'manual',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await clientService.create(newClient);
      setShowAddDialog(false);
      setFormData({ name: '', phone: '', email: '', cpf: '', notes: '' });
      loadClients();
    } catch (error) {

    }
  };

  const handleClientClick = (client: Client) => {
    router.push(`/dashboard/clients/${client.id}`);
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

  const handleEditClick = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/clients/${clientId}/edit`);
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
    if (selectedTab === 2) return matchesSearch && (client as any).source === 'whatsapp'; // WhatsApp
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
                <Chip label={clients.filter(c => (c as any).source === 'whatsapp').length} size="small" color="primary" />
              </Box>
            } 
          />
        </Tabs>
      </Card>

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
                  {clients.filter(c => (c as any).source === 'whatsapp').length}
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
                Nenhum cliente encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Adicione seu primeiro cliente ou ajuste os filtros
              </Typography>
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
                        bgcolor: (client as any).source === 'whatsapp' ? 'success.main' : 'primary.main',
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
                        {(client as any).source === 'whatsapp' && (
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
                          {formatPhone(client.phone)}
                          {client.email && ` • ${client.email}`}
                        </Typography>
                        {client.totalReservations > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {client.totalReservations} reservas • 
                            Última em {safeFormatDate(client.updatedAt, DateFormats.SHORT, 'N/A')}
                          </Typography>
                        )}
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
                      onClick={(e) => handleEditClick(client.id, e)}
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