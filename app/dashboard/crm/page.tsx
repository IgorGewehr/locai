'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  LinearProgress,
  Stack,
  Paper,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  CircularProgress,
} from '@mui/material';
import ModernButton from '@/components/atoms/ModernButton';
import ModernFAB from '@/components/atoms/ModernFAB';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Phone,
  WhatsApp,
  Email,
  Event,
  TrendingUp,
  TrendingDown,
  AccessTime,
  AttachMoney,
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Schedule,
  Assignment,
  Person,
  Groups,
  LocalFireDepartment,
  AcUnit,
  WbSunny,
  Task as TaskIcon,
  History,
  Analytics,
  AutoAwesome,
  ArrowForward,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { crmService } from '@/lib/services/crm-service';
import { Lead, LeadStatus, Task, TaskStatus, Interaction } from '@/lib/types/crm';
import { Client } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import LeadDetailsDrawer from './components/LeadDetailsDrawer';
import CreateLeadDialog from './components/CreateLeadDialog';
import TaskDialog from './components/TaskDialog';
import KanbanBoard from './components/KanbanBoard';
import CRMStats from './components/CRMStats';
import AIInsights from './components/AIInsights';

const statusColumns = [
  { id: LeadStatus.NEW, title: 'Novos Leads', color: '#1976d2' },
  { id: LeadStatus.CONTACTED, title: 'Contatados', color: '#2196f3' },
  { id: LeadStatus.QUALIFIED, title: 'Qualificados', color: '#9c27b0' },
  { id: LeadStatus.OPPORTUNITY, title: 'Oportunidades', color: '#ff9800' },
  { id: LeadStatus.NEGOTIATION, title: 'Negociação', color: '#f44336' },
  { id: LeadStatus.WON, title: 'Ganhos', color: '#4caf50' },
];

export default function CRMPage() {
  const { user } = useAuth();
  const { services, isReady } = useTenant();
  const router = useRouter();
  const [view, setView] = useState<'pipeline' | 'list' | 'clients' | 'analytics'>('pipeline');
  const [leads, setLeads] = useState<Record<LeadStatus, Lead[]>>({
    [LeadStatus.NEW]: [],
    [LeadStatus.CONTACTED]: [],
    [LeadStatus.QUALIFIED]: [],
    [LeadStatus.OPPORTUNITY]: [],
    [LeadStatus.NEGOTIATION]: [],
    [LeadStatus.WON]: [],
    [LeadStatus.LOST]: [],
    [LeadStatus.NURTURING]: [],
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedLeadForTask, setSelectedLeadForTask] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'my' | 'hot' | 'cold'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hotLeads, setHotLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    if (isReady && services) {
      loadLeads();
      loadTasks();
      loadHotLeads();
      loadClients();
    }
  }, [services, isReady]);

  const loadLeads = async () => {
    if (!isReady || !services) return;
    
    try {
      setLoading(true);
      const leadsByStatus: Record<LeadStatus, Lead[]> = {
        [LeadStatus.NEW]: [],
        [LeadStatus.CONTACTED]: [],
        [LeadStatus.QUALIFIED]: [],
        [LeadStatus.OPPORTUNITY]: [],
        [LeadStatus.NEGOTIATION]: [],
        [LeadStatus.WON]: [],
        [LeadStatus.LOST]: [],
        [LeadStatus.NURTURING]: [],
      };

      // Load leads for each status using tenant services
      for (const status of Object.values(LeadStatus)) {
        if (status !== LeadStatus.LOST && status !== LeadStatus.NURTURING) {
          const statusLeads = await services.leads.getWhere('status', '==', status);
          leadsByStatus[status] = statusLeads;
        }
      }

      setLeads(leadsByStatus);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!isReady || !services || !user?.id) return;
    
    try {
      // Get tasks assigned to current user
      const userTasks = await services.tasks.getWhere('assignedTo', '==', user.id);
      setTasks(userTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadHotLeads = async () => {
    if (!isReady || !services) return;
    
    try {
      const hot = await services.leads.getWhere('temperature', '==', 'hot');
      setHotLeads(hot);
    } catch (error) {
      console.error('Error loading hot leads:', error);
    }
  };

  const loadClients = async () => {
    if (!isReady || !services) return;
    
    try {
      const clientList = await services.clients.getAll();
      setClients(clientList);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const sourceStatus = source.droppableId as LeadStatus;
    const destStatus = destination.droppableId as LeadStatus;
    const leadId = draggableId;

    // Update local state optimistically
    const sourceLead = leads[sourceStatus].find(l => l.id === leadId);
    if (!sourceLead) return;

    setLeads(prev => ({
      ...prev,
      [sourceStatus]: prev[sourceStatus].filter(l => l.id !== leadId),
      [destStatus]: [...prev[destStatus], { ...sourceLead, status: destStatus }]
    }));

    // Update in backend
    try {
      await crmService.updateLead(leadId, { status: destStatus });
    } catch (error) {
      console.error('Error updating lead status:', error);
      // Revert on error
      loadLeads();
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleCreateTask = (lead: Lead) => {
    setSelectedLeadForTask(lead);
    setTaskDialogOpen(true);
  };

  const handleQuickAction = async (lead: Lead, action: string) => {
    switch (action) {
      case 'whatsapp':
        window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank');
        break;
      case 'call':
        window.location.href = `tel:${lead.phone}`;
        break;
      case 'email':
        if (lead.email) {
          window.location.href = `mailto:${lead.email}`;
        }
        break;
      case 'task':
        handleCreateTask(lead);
        break;
    }
  };

  const getTemperatureIcon = (temperature: string) => {
    switch (temperature) {
      case 'hot':
        return <LocalFireDepartment sx={{ color: '#f44336' }} />;
      case 'warm':
        return <WbSunny sx={{ color: '#ff9800' }} />;
      case 'cold':
        return <AcUnit sx={{ color: '#2196f3' }} />;
      default:
        return null;
    }
  };

  const getFilteredLeads = () => {
    const allLeads = Object.values(leads).flat();
    
    let filtered = allLeads;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply other filters
    switch (selectedFilter) {
      case 'my':
        filtered = filtered.filter(lead => lead.assignedTo === user?.uid);
        break;
      case 'hot':
        filtered = filtered.filter(lead => lead.temperature === 'hot');
        break;
      case 'cold':
        filtered = filtered.filter(lead => lead.temperature === 'cold');
        break;
    }
    
    return filtered;
  };

  const totalLeads = Object.values(leads).reduce((sum, statusLeads) => sum + statusLeads.length, 0);
  const wonLeads = leads[LeadStatus.WON].length;
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  if (!isReady || !services) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxWidth: 'calc(100vw - 280px)', // Account for sidebar width
      pr: { xs: 1, sm: 2, md: 3, lg: 4 }, // Progressive right padding
      mr: { xs: 0, sm: 1, md: 2, lg: 3 }, // Progressive right margin
      overflow: 'hidden' // Prevent horizontal overflow
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 4, md: 5 } }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} sx={{ fontSize: { xs: '1.75rem', md: '2rem', lg: '2.25rem' } }}>
            CRM - Gestão de Relacionamento
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
            {totalLeads} leads • {conversionRate.toFixed(1)}% taxa de conversão
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Buscar leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          
          <IconButton onClick={(e) => setFilterMenuAnchor(e.currentTarget)}>
            <Badge badgeContent={selectedFilter !== 'all' ? 1 : 0} color="primary">
              <FilterList />
            </Badge>
          </IconButton>
          
          <ModernButton
            variant="gradient"
            size="large"
            icon={<Add />}
            onClick={() => setCreateLeadOpen(true)}
          >
            Novo Lead
          </ModernButton>
        </Box>
      </Box>

      {/* Quick Stats */}
      <CRMStats 
        totalLeads={totalLeads}
        hotLeads={hotLeads.length}
        tasksToday={tasks.filter(t => t.status === TaskStatus.PENDING).length}
        overdueTasks={tasks.filter(t => t.status === TaskStatus.OVERDUE).length}
        conversionRate={conversionRate}
      />

      {/* View Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={view} onChange={(_, v) => setView(v)}>
          <Tab label="Pipeline" value="pipeline" icon={<Analytics />} iconPosition="start" />
          <Tab label="Lista" value="list" icon={<Assignment />} iconPosition="start" />
          <Tab label="Clientes" value="clients" icon={<Groups />} iconPosition="start" />
          <Tab label="Insights IA" value="analytics" icon={<AutoAwesome />} iconPosition="start" />
        </Tabs>
      </Card>

      {/* Main Content */}
      {view === 'pipeline' && (
        <KanbanBoard
          leads={leads}
          statusColumns={statusColumns}
          onDragEnd={handleDragEnd}
          onLeadClick={handleLeadClick}
          onQuickAction={handleQuickAction}
          getTemperatureIcon={getTemperatureIcon}
          loading={loading}
        />
      )}

      {view === 'list' && (
        <Card>
          <List>
            {getFilteredLeads().map((lead, index) => (
              <Box key={lead.id}>
                <ListItemButton onClick={() => handleLeadClick(lead)}>
                  <ListItemIcon>
                    <Avatar>{lead.name ? lead.name.charAt(0).toUpperCase() : '?'}</Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {lead.name}
                        {getTemperatureIcon(lead.temperature)}
                        <Chip
                          label={lead.status}
                          size="small"
                          color={lead.status === LeadStatus.WON ? 'success' : 'default'}
                        />
                      </Box>
                    }
                    secondary={`${lead.phone} • ${lead.source} • Score: ${lead.score}`}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleQuickAction(lead, 'whatsapp'); }}>
                      <WhatsApp />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleQuickAction(lead, 'task'); }}>
                      <TaskIcon />
                    </IconButton>
                  </Box>
                </ListItemButton>
                {index < getFilteredLeads().length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Card>
      )}

      {view === 'clients' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Lista de Clientes ({clients.length})
              </Typography>
              <TextField
                size="small"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 300 }}
              />
            </Box>
            <List>
              {clients
                .filter(client => 
                  client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  client.phone?.includes(searchTerm) ||
                  client.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((client, index) => (
                  <Box key={client.id}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: client.isActive ? 'success.main' : 'grey.400' }}>
                          {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {client.name}
                            </Typography>
                            <Chip
                              label={client.isActive ? 'Ativo' : 'Inativo'}
                              size="small"
                              color={client.isActive ? 'success' : 'default'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {client.phone} • {client.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Total gasto: R$ {client.totalSpent?.toFixed(2) || '0,00'} • 
                              Reservas: {client.reservations?.length || 0}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="WhatsApp">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              if (client.phone) {
                                window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank');
                              }
                            }}
                          >
                            <WhatsApp />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ligar">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              if (client.phone) {
                                window.location.href = `tel:${client.phone}`;
                              }
                            }}
                          >
                            <Phone />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Email">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              if (client.email) {
                                window.location.href = `mailto:${client.email}`;
                              }
                            }}
                          >
                            <Email />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                    {index < clients.length - 1 && <Divider />}
                  </Box>
                ))}
              {clients.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum cliente encontrado
                  </Typography>
                </Box>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      {view === 'analytics' && (
        <AIInsights
          leads={Object.values(leads).flat()}
          onActionClick={(lead, action) => handleQuickAction(lead, action)}
          onRefresh={() => loadLeads()}
        />
      )}

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setSelectedFilter('all'); setFilterMenuAnchor(null); }}>
          Todos os Leads
        </MenuItem>
        <MenuItem onClick={() => { setSelectedFilter('my'); setFilterMenuAnchor(null); }}>
          Meus Leads
        </MenuItem>
        <MenuItem onClick={() => { setSelectedFilter('hot'); setFilterMenuAnchor(null); }}>
          Leads Quentes
        </MenuItem>
        <MenuItem onClick={() => { setSelectedFilter('cold'); setFilterMenuAnchor(null); }}>
          Leads Frios
        </MenuItem>
      </Menu>

      {/* Dialogs and Drawers */}
      {selectedLead && (
        <LeadDetailsDrawer
          lead={selectedLead}
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedLead(null);
          }}
          onUpdate={() => loadLeads()}
        />
      )}

      <CreateLeadDialog
        open={createLeadOpen}
        onClose={() => setCreateLeadOpen(false)}
        onSuccess={() => {
          loadLeads();
          setCreateLeadOpen(false);
        }}
      />

      {selectedLeadForTask && (
        <TaskDialog
          open={taskDialogOpen}
          onClose={() => {
            setTaskDialogOpen(false);
            setSelectedLeadForTask(null);
          }}
          leadId={selectedLeadForTask.id}
          leadName={selectedLeadForTask.name}
          onSuccess={() => {
            loadTasks();
            setTaskDialogOpen(false);
          }}
        />
      )}

      {/* FAB for quick add */}
      <ModernFAB
        variant="glass"
        size="large"
        tooltip="Novo Lead"
        icon={<Add />}
        onClick={() => setCreateLeadOpen(true)}
      />
    </Box>
  );
}