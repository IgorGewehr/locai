'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { Lead } from '@/lib/types/crm';
import type { Conversation } from '@/lib/types/conversation';
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
  Chat,
  History,
  TrendingUp,
  LocationOn,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { safeFormatDate, DateFormats } from '@/lib/utils/date-formatter';
import { useAuth } from '@/lib/hooks/useAuth';
import CreateClientDialog from './components/CreateClientDialog';
import EditClientDialog from './components/EditClientDialog';
import ClientDetailsDialog from './components/ClientDetailsDialog';

interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { services, isReady } = useTenant();
  const [clients, setClients] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Lead | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    loadClients();
    loadConversations();
  }, [services, isReady]);

  const loadClients = async (isRefresh = false) => {
    if (!services || !isReady) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      }
      
      console.log('🔄 [Clients Dashboard] Carregando clientes...');
      
      // 1. Carregar leads (nova estrutura)
      const leadsData = await services.leads.getAll();
      console.log(`📊 [Clients Dashboard] ${leadsData.length} leads carregados`);
      
      // 2. Carregar clientes antigos (se existirem)
      let legacyClientsData: any[] = [];
      try {
        legacyClientsData = await services.clients.getAll();
        console.log(`👥 [Clients Dashboard] ${legacyClientsData.length} clientes legados encontrados`);
      } catch (clientsError) {
        console.log('ℹ️ [Clients Dashboard] Nenhum cliente legado encontrado ou erro ao carregar:', clientsError);
      }
      
      // 3. Migrar clientes legados para leads (se necessário)
      const migratedClients = await migrateClientsToLeads(legacyClientsData, leadsData);
      
      // 4. Combinar todos os dados
      const allClients = [...leadsData, ...migratedClients];
      
      // 5. Remover duplicatas por telefone (priorizar leads sobre clientes migrados)
      const uniqueClients = removeDuplicatesByPhone(allClients);
      
      // 6. Ordenar clientes: mais recentes primeiro
      const sortedClients = uniqueClients.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      console.log(`✅ [Clients Dashboard] ${sortedClients.length} clientes únicos carregados`);
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

  // Função para migrar clientes legados para formato Lead
  const migrateClientsToLeads = async (legacyClients: any[], existingLeads: Lead[]): Promise<Lead[]> => {
    if (!legacyClients.length || !services) return [];
    
    const migratedClients: Lead[] = [];
    
    for (const legacyClient of legacyClients) {
      // Verificar se já existe um lead com este telefone
      const existingLead = existingLeads.find(lead => lead.phone === legacyClient.phone);
      
      if (!existingLead) {
        console.log(`🔄 [Migration] Migrando cliente legado: ${legacyClient.name} (${legacyClient.phone})`);
        
        // Converter cliente legado para formato Lead
        const leadData: Omit<Lead, 'id'> = {
          name: legacyClient.name || 'Cliente Migrado',
          phone: legacyClient.phone,
          email: legacyClient.email || undefined,
          document: legacyClient.document || legacyClient.cpf || undefined,
          documentType: 'cpf',
          source: 'migrated' as any, // Fonte especial para clientes migrados
          status: 'contacted' as any,
          temperature: 'warm',
          score: 50,
          qualificationCriteria: {
            budget: false,
            authority: false,
            need: false,
            timeline: false
          },
          preferences: {
            propertyType: [],
            locations: [],
            amenities: [],
            priceRange: {}
          },
          tags: ['migrated', 'legacy_client'],
          notes: legacyClient.notes || legacyClient.observations || 'Cliente migrado da estrutura anterior',
          firstContactDate: legacyClient.createdAt || new Date(),
          lastContactDate: legacyClient.updatedAt || legacyClient.createdAt || new Date(),
          totalInteractions: 0,
          createdAt: legacyClient.createdAt || new Date(),
          updatedAt: new Date()
        };
        
        try {
          // Criar Lead no Firebase
          const leadId = await services.leads.create(leadData);
          
          // Adicionar à lista de migrados
          migratedClients.push({
            id: leadId,
            ...leadData
          });
          
          console.log(`✅ [Migration] Cliente migrado com sucesso: ${leadData.name} → Lead ID: ${leadId}`);
          
        } catch (migrationError) {
          console.error(`❌ [Migration] Erro ao migrar cliente ${legacyClient.name}:`, migrationError);
        }
      }
    }
    
    if (migratedClients.length > 0) {
      console.log(`🎉 [Migration] ${migratedClients.length} clientes migrados com sucesso!`);
      setMigrationMessage(`✅ ${migratedClients.length} cliente${migratedClients.length > 1 ? 's' : ''} migrado${migratedClients.length > 1 ? 's' : ''} da estrutura anterior para o novo sistema CRM!`);
    }
    
    return migratedClients;
  };

  // Função para remover duplicatas por telefone
  const removeDuplicatesByPhone = (clients: Lead[]): Lead[] => {
    const seen = new Set<string>();
    return clients.filter(client => {
      if (seen.has(client.phone)) {
        return false;
      }
      seen.add(client.phone);
      return true;
    });
  };

  const loadConversations = async () => {
    if (!services || !isReady) return;
    
    try {
      console.log('🔄 [Clients Dashboard] Carregando conversações...');
      const conversationsData = await services.conversations.getAll();
      console.log(`✅ [Clients Dashboard] ${conversationsData.length} conversações carregadas`);
      setConversations(conversationsData);
    } catch (error) {
      console.error('❌ [Clients Dashboard] Erro ao carregar conversações:', error);
    }
  };

  const handleAddClient = async () => {
    if (!services) return;
    
    try {
      console.log('➕ [Clients Dashboard] Criando novo cliente:', formData);
      
      const leadData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        source: 'manual',
        status: 'new' as const,
        temperature: 'warm' as const,
        score: 50,
        preferences: {
          propertyType: [],
          locations: [],
          amenities: []
        },
        tags: ['manual_entry'],
        notes: formData.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await services.leads.create(leadData as Omit<Lead, 'id'>);
      console.log('✅ [Clients Dashboard] Cliente criado');
      
      setShowAddDialog(false);
      setFormData({ name: '', phone: '', email: '', notes: '' });
      
      // Recarregar lista
      await loadClients();
    } catch (error) {
      console.error('❌ [Clients Dashboard] Erro ao criar cliente:', error);
      alert(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleClientClick = (client: Lead) => {
    setSelectedClient(client);
    setShowDetailsDialog(true);
  };

  const handleViewConversation = (phone: string) => {
    const conversation = conversations.find(conv => conv.whatsappPhone === phone);
    if (conversation) {
      router.push(`/dashboard/conversations/${conversation.id}`);
    } else {
      console.log('Nenhuma conversa encontrada para este cliente');
    }
  };

  const getClientConversation = (phone: string) => {
    return conversations.find(conv => conv.whatsappPhone === phone);
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

  const handleEditClick = (client: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(client);
    setShowEditDialog(true);
  };

  const toggleFavorite = async (client: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementation for favorite toggle - could update tags
    try {
      const updatedTags = client.tags?.includes('favorite') 
        ? client.tags.filter(tag => tag !== 'favorite')
        : [...(client.tags || []), 'favorite'];
      
      await services.leads.update(client.id!, { tags: updatedTags });
      await loadClients();
    } catch (error) {
      console.error('Erro ao favoritar cliente:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      client.phone.includes(searchTerm);

    if (selectedTab === 0) return matchesSearch; // Todos
    if (selectedTab === 1) return matchesSearch && ['won', 'opportunity', 'negotiation'].includes(client.status); // Ativos/Oportunidades
    if (selectedTab === 2) return matchesSearch && client.source === 'whatsapp_ai'; // WhatsApp
    if (selectedTab === 3) return matchesSearch && client.tags?.includes('favorite'); // Favoritos  
    if (selectedTab === 4) return matchesSearch && client.source === 'migrated'; // Migrados
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
                Oportunidades
                <Chip label={clients.filter(c => ['won', 'opportunity', 'negotiation'].includes(c.status)).length} size="small" color="success" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                WhatsApp
                <Chip label={clients.filter(c => c.source === 'whatsapp_ai').length} size="small" color="primary" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Favoritos
                <Chip label={clients.filter(c => c.tags?.includes('favorite')).length} size="small" color="warning" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Migrados
                <Chip label={clients.filter(c => c.source === 'migrated').length} size="small" color="info" />
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

      {/* Migration Success Alert */}
      {migrationMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMigrationMessage(null)}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History sx={{ fontSize: 20 }} />
            {migrationMessage}
          </Box>
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
                  {clients.filter(c => c.source === 'whatsapp_ai').length}
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
                  {clients.filter(c => ['won', 'opportunity', 'negotiation'].includes(c.status)).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Oportunidades
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {clients.filter(c => c.source === 'migrated').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clientes Migrados
                </Typography>
              </Box>
              <History sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
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
                        bgcolor: client.source === 'whatsapp_ai' ? 'success.main' : 'primary.main',
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
                        {client.source === 'whatsapp_ai' && (
                          <Chip 
                            label="WhatsApp" 
                            size="small" 
                            color="success" 
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {client.source === 'migrated' && (
                          <Chip 
                            label="📤 Migrado" 
                            size="small" 
                            color="warning" 
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {client.temperature && (
                          <Chip 
                            label={client.temperature === 'hot' ? '🔥 Quente' : client.temperature === 'warm' ? '🌡️ Morno' : '❄️ Frio'} 
                            size="small" 
                            color={client.temperature === 'hot' ? 'error' : client.temperature === 'warm' ? 'warning' : 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                        {client.tags?.includes('favorite') && (
                          <Chip 
                            label="⭐" 
                            size="small" 
                            color="warning"
                            sx={{ height: 20, fontSize: '0.7rem', minWidth: 'auto', px: 0.5 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" component="span">
                          📱 {formatPhone(client.phone)}
                          {client.email && ` • 📧 ${client.email}`}
                          {client.score && ` • 📊 Score: ${client.score}/100`}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" component="span">
                            Status: {client.status === 'new' ? '🆕 Novo' : 
                                    client.status === 'contacted' ? '📞 Contatado' :
                                    client.status === 'qualified' ? '✅ Qualificado' :
                                    client.status === 'opportunity' ? '🎯 Oportunidade' :
                                    client.status === 'negotiation' ? '💬 Negociação' :
                                    client.status === 'won' ? '🎉 Convertido' :
                                    client.status === 'lost' ? '❌ Perdido' : '📋 Em análise'}
                          </Typography>
                          {getClientConversation(client.phone) && (
                            <Typography variant="caption" color="primary.main" sx={{ cursor: 'pointer' }} component="span">
                              • 💬 Tem conversa WhatsApp
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" component="span">
                            • Cadastrado em {safeFormatDate(client.createdAt, DateFormats.SHORT, 'Não informado')}
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
                    {getClientConversation(client.phone) && (
                      <IconButton 
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewConversation(client.phone);
                        }}
                        title="Ver conversa WhatsApp"
                      >
                        <Chat />
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
                      title={client.tags?.includes('favorite') ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      {client.tags?.includes('favorite') ? <Star color="warning" /> : <StarBorder />}
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