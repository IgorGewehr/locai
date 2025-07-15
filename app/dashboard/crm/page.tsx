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
} from '@mui/material';
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
import { useAuth } from '@/lib/hooks/useAuth';
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
  const router = useRouter();
  const [view, setView] = useState<'pipeline' | 'list' | 'analytics'>('pipeline');
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

  useEffect(() => {
    loadLeads();
    loadTasks();
    loadHotLeads();
  }, [user]);

  const loadLeads = async () => {
    if (!user?.tenantId) return;
    
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

      // Load leads for each status
      for (const status of Object.values(LeadStatus)) {
        if (status !== LeadStatus.LOST && status !== LeadStatus.NURTURING) {
          const statusLeads = await crmService.getLeadsByStatus(status, user.tenantId);
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
    if (!user?.uid) return;
    
    try {
      const todayTasks = await crmService.getTodayTasks(user.uid);
      const overdueTasks = await crmService.getOverdueTasks(user.uid);
      setTasks([...overdueTasks, ...todayTasks]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadHotLeads = async () => {
    if (!user?.tenantId) return;
    
    try {
      const hot = await crmService.getHotLeads(user.tenantId);
      setHotLeads(hot);
    } catch (error) {
      console.error('Error loading hot leads:', error);
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600}>
            CRM - Gestão de Relacionamento
          </Typography>
          <Typography variant="body2" color="text.secondary">
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
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateLeadOpen(true)}
          >
            Novo Lead
          </Button>
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
                    <Avatar>{lead.name.charAt(0).toUpperCase()}</Avatar>
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

      {view === 'analytics' && (
        <AIInsights
          leads={Object.values(leads).flat()}
          hotLeads={hotLeads}
          tasks={tasks}
          tenantId={user?.tenantId || ''}
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
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateLeadOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
}