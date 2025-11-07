'use client';

import { useState, useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/lib/utils/logger';
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
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
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
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, LeadStatus, Task, TaskStatus, Interaction } from '@/lib/types/crm';
import { Client } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { useTenant } from '@/contexts/TenantContext';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import LeadDetailsDrawer from './components/LeadDetailsDrawer';
import CreateLeadDialog from './components/CreateLeadDialog';
import TaskDialog from './components/TaskDialog';
import KanbanBoard from './components/KanbanBoard';
import CRMStats from './components/CRMStats';
import AIInsights from './components/AIInsights';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import LeadPerformanceTracker from './components/LeadPerformanceTracker';

const statusColumns = [
  { id: LeadStatus.NEW, title: 'Novos Leads', color: '#1976d2' },
  { id: LeadStatus.CONTACTED, title: 'Contatados', color: '#2196f3' },
  { id: LeadStatus.QUALIFIED, title: 'Qualificados', color: '#9c27b0' },
  { id: LeadStatus.OPPORTUNITY, title: 'Oportunidades', color: '#ff9800' },
  { id: LeadStatus.NEGOTIATION, title: 'Negociação', color: '#f44336' },
  { id: LeadStatus.WON, title: 'Ganhos', color: '#4caf50' },
];

function CRMPageContent() {
  const { user } = useAuth();
  const services = useTenantServices();
  const { isReady } = useTenant();
  const router = useRouter();
  const [view, setView] = useState<'pipeline' | 'list' | 'clients' | 'analytics' | 'advanced-analytics' | 'performance'>('pipeline');
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
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 🛡️ PROTEÇÃO: Try-catch para evitar crashes no useEffect
    const loadData = async () => {
      if (!isReady || !services) return;

      try {
        await Promise.all([
          loadLeads(),
          loadTasks(),
          loadHotLeads(),
          loadClients()
        ]);
        setError(null); // Clear errors on successful load
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('❌ [CRM] Failed to load data', {
          error: errorMsg,
          retryCount
        });
        setError(errorMsg);
        setLoading(false);
      }
    };

    loadData();
  }, [services, isReady, retryCount]);

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
      logger.info('✅ [CRM] Leads loaded successfully', {
        totalLeads: Object.values(leadsByStatus).flat().length
      });
    } catch (error) {
      logger.error('❌ [CRM] Failed to load leads', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error; // Re-throw to be caught by parent
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
      logger.info('✅ [CRM] Tasks loaded successfully', {
        taskCount: userTasks.length
      });
    } catch (error) {
      logger.error('❌ [CRM] Failed to load tasks', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  const loadHotLeads = async () => {
    if (!isReady || !services) return;

    try {
      const hot = await services.leads.getWhere('temperature', '==', 'hot');
      setHotLeads(hot);
      logger.info('✅ [CRM] Hot leads loaded successfully', {
        hotLeadsCount: hot.length
      });
    } catch (error) {
      logger.error('❌ [CRM] Failed to load hot leads', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };

  const loadClients = async () => {
    if (!isReady || !services) return;

    try {
      const clientList = await services.clients.getAll();
      setClients(clientList);
      logger.info('✅ [CRM] Clients loaded successfully', {
        clientCount: clientList.length
      });
    } catch (error) {
      logger.error('❌ [CRM] Failed to load clients', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
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

    // Update in backend using tenant services
    try {
      await services.leads.update(leadId, { status: destStatus, updatedAt: new Date() });
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      // Revert on error
      loadLeads();
    }
  };

  const handleMoveLeadToStatus = async (lead: Lead, newStatus: LeadStatus) => {
    if (!services) return;
    
    const oldStatus = lead.status;
    
    // Update local state optimistically
    setLeads(prev => ({
      ...prev,
      [oldStatus]: prev[oldStatus].filter(l => l.id !== lead.id),
      [newStatus]: [...prev[newStatus], { ...lead, status: newStatus }]
    }));

    // Update in backend
    try {
      await services.leads.update(lead.id, { status: newStatus, updatedAt: new Date() });
    } catch (error) {
      console.error('Erro ao mover lead para nova fase:', error);
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

  // 🛡️ ERROR STATE UI
  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="error">
            Erro ao Carregar Dados
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setError(null);
              setRetryCount(prev => prev + 1);
            }}
            startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
          >
            Tentar Novamente
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Modern Header with Glass Effect */}
      <Box sx={{ 
        mb: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        p: { xs: 2, sm: 3, md: 4 },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        }
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'center', md: 'flex-start' }, 
          mb: 3,
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 3, lg: 0 },
        }}>
          <Box>
            <Typography 
              variant="h3" 
              component="h1" 
              fontWeight="700"
              sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1,
                fontSize: { xs: '2rem', md: '2.5rem', lg: '3rem' }
              }}
            >
              CRM Inteligente
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.85)', 
                fontWeight: 500,
                fontSize: { xs: '1rem', md: '1.125rem' }
              }}
            >
              Gestão avançada de relacionamento com clientes
            </Typography>
          </Box>
          
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: { xs: 1.5, sm: 2 },
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                fontWeight="700" 
                color="primary"
                sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
              >
                {totalLeads}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Total Leads
              </Typography>
            </Box>
            <Box sx={{ 
              width: '1px', 
              height: '40px', 
              bgcolor: 'rgba(255, 255, 255, 0.2)' 
            }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                fontWeight="700" 
                color="success.main"
                sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
              >
                {conversionRate.toFixed(1)}%
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Conversão
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Search and Actions Bar */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar leads, clientes ou empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                </InputAdornment>
              ),
            }}
            sx={{ 
              flex: 1,
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.12)',
                },
                '&.Mui-focused': {
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'primary.main',
                },
              }
            }}
          />
          
          <IconButton 
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.12)',
                transform: 'scale(1.05)',
              }
            }}
          >
            <Badge badgeContent={selectedFilter !== 'all' ? 1 : 0} color="primary">
              <FilterList sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
            </Badge>
          </IconButton>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<Add />}
            onClick={() => setCreateLeadOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FF6B9D 100%)',
              border: 'none',
              borderRadius: '16px',
              px: 3,
              py: 1.5,
              minWidth: 140,
              boxShadow: '0 8px 24px rgba(255, 107, 107, 0.35)',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)',
                borderRadius: '16px',
                zIndex: 0,
              },
              '&:hover': {
                background: 'linear-gradient(135deg, #FF5252 0%, #FF7043 50%, #E91E63 100%)',
                transform: 'translateY(-3px) scale(1.02)',
                boxShadow: '0 16px 40px rgba(255, 107, 107, 0.5)',
                '& .MuiSvgIcon-root': {
                  transform: 'rotate(90deg) scale(1.1)',
                }
              },
              '&:active': {
                transform: 'translateY(-1px) scale(0.98)',
                boxShadow: '0 8px 20px rgba(255, 107, 107, 0.4)',
              },
              '& .MuiSvgIcon-root': {
                fontSize: '1.25rem',
                transition: 'all 0.3s ease',
                zIndex: 1,
                position: 'relative',
              },
              '& .MuiButton-startIcon': {
                marginRight: 1,
              },
              '&::after': {
                content: '"✨"',
                position: 'absolute',
                top: '50%',
                right: 12,
                transform: 'translateY(-50%)',
                fontSize: '0.875rem',
                opacity: 0.8,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.8, transform: 'translateY(-50%) scale(1)' },
                  '50%': { opacity: 1, transform: 'translateY(-50%) scale(1.1)' },
                },
              }
            }}
          >
            Novo Lead
          </Button>
        </Box>
      </Box>

      {/* Quick Stats - Moved and modernized */}
      <CRMStats 
        totalLeads={totalLeads}
        hotLeads={hotLeads.length}
        tasksToday={tasks.filter(t => t.status === TaskStatus.PENDING).length}
        overdueTasks={tasks.filter(t => t.status === TaskStatus.OVERDUE).length}
        conversionRate={conversionRate}
      />

      {/* Modern Navigation Tabs */}
      <Box sx={{ 
        mb: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        p: 1,
      }}>
        <Tabs 
          value={view} 
          onChange={(_, v) => setView(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            ...scrollbarStyles.hidden,
            '& .MuiTab-root': {
              borderRadius: '16px',
              mx: 0.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 56,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.9)',
              },
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            }
          }}
        >
          <Tab 
            label="Pipeline" 
            value="pipeline" 
            icon={<Analytics />} 
            iconPosition="start" 
          />
          <Tab 
            label="Todos os Leads" 
            value="clients" 
            icon={<Groups />} 
            iconPosition="start" 
          />
          <Tab
            label="Insights IA"
            value="analytics"
            icon={<AutoAwesome />}
            iconPosition="start"
          />
          <Tab
            label="Analytics Avançado"
            value="advanced-analytics"
            icon={<Analytics />}
            iconPosition="start"
          />
          <Tab
            label="Performance"
            value="performance"
            icon={<TrendingUp />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Main Content */}
      {view === 'pipeline' && (
        <KanbanBoard
          leads={leads}
          statusColumns={statusColumns}
          onDragEnd={handleDragEnd}
          onLeadClick={handleLeadClick}
          onQuickAction={handleQuickAction}
          onMoveLeadToStatus={handleMoveLeadToStatus}
          getTemperatureIcon={getTemperatureIcon}
          loading={loading}
        />
      )}


      {view === 'clients' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Todos os Leads ({Object.values(leads).flat().length})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Visão completa de todos os leads no sistema
                </Typography>
              </Box>
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
            </Box>
            <List>
              {getFilteredLeads()
                .sort((a, b) => {
                  const dateA = a.updatedAt instanceof Date ? a.updatedAt :
                    (typeof a.updatedAt === 'string' ? parseISO(a.updatedAt) : new Date());
                  const dateB = b.updatedAt instanceof Date ? b.updatedAt :
                    (typeof b.updatedAt === 'string' ? parseISO(b.updatedAt) : new Date());
                  return (isValid(dateB) ? dateB : new Date()).getTime() - (isValid(dateA) ? dateA : new Date()).getTime();
                })
                .map((lead, index) => (
                  <Box key={lead.id}>
                    <ListItemButton onClick={() => handleLeadClick(lead)} sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Avatar sx={{ 
                          bgcolor: lead.temperature === 'hot' ? 'error.main' : 
                                   lead.temperature === 'warm' ? 'warning.main' : 'info.main',
                          width: 48,
                          height: 48,
                        }}>
                          {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {lead.name}
                            </Typography>
                            {getTemperatureIcon(lead.temperature)}
                            <Chip
                              label={lead.status.replace('_', ' ').toUpperCase()}
                              size="small"
                              color={lead.status === LeadStatus.WON ? 'success' : 
                                     lead.status === LeadStatus.NEGOTIATION ? 'warning' : 'default'}
                            />
                            <Chip
                              label={`Score: ${lead.score}%`}
                              size="small"
                              variant="outlined"
                              color={lead.score > 70 ? 'success' : lead.score > 40 ? 'warning' : 'error'}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              📞 {lead.phone} • 📧 {lead.email || 'Não informado'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              🏷️ {lead.source} • 💬 {lead.totalInteractions} interações • 
                              🕒 {(() => {
                                const lastContactDate = lead.lastContactDate instanceof Date ? lead.lastContactDate :
                                  (typeof lead.lastContactDate === 'string' ? parseISO(lead.lastContactDate) : new Date());
                                return isValid(lastContactDate) ? format(lastContactDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inválida';
                              })()}
                            </Typography>
                            {lead.preferences.priceRange && (
                              <Typography variant="body2" color="text.secondary">
                                💰 Orçamento: R$ {lead.preferences.priceRange.min.toLocaleString()} - R$ {lead.preferences.priceRange.max.toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="WhatsApp">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(lead, 'whatsapp');
                            }}
                          >
                            <WhatsApp />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ligar">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(lead, 'call');
                            }}
                          >
                            <Phone />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Criar Tarefa">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(lead, 'task');
                            }}
                          >
                            <TaskIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItemButton>
                    {index < getFilteredLeads().length - 1 && <Divider />}
                  </Box>
                ))}
              {getFilteredLeads().length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum lead encontrado
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

      {view === 'advanced-analytics' && (
        <AdvancedAnalytics
          leads={Object.values(leads).flat()}
          onRefresh={() => loadLeads()}
        />
      )}

      {view === 'performance' && (
        <LeadPerformanceTracker
          leads={Object.values(leads).flat()}
          onLeadClick={handleLeadClick}
          onQuickAction={handleQuickAction}
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

// 🛡️ WRAP WITH ERROR BOUNDARY
export default function CRMPage() {
  return (
    <ErrorBoundary
      componentName="CRM Dashboard"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <CRMPageContent />
    </ErrorBoundary>
  );
}