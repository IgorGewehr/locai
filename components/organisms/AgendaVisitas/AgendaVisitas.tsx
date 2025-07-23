'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday,
  Schedule,
  Person,
  LocationOn,
  Phone,
  Event,
  FilterList,
  Refresh,
  MoreVert,
  CheckCircle,
  Cancel,
  AccessTime,
  Home,
  Edit,
  ArrowBackIos,
  ArrowForwardIos,
} from '@mui/icons-material';
import { format, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  VisitAppointment, 
  VisitStatus, 
  VISIT_STATUS_LABELS, 
  VISIT_STATUS_COLORS,
  AvailableTimeSlot,
} from '@/lib/types/visit-appointment';
import { Property, Client } from '@/lib/types';
import { useTenant } from '@/lib/hooks/useTenant';

interface AgendaVisitasProps {
  onCreateVisit?: () => void;
  onEditVisit?: (visit: VisitAppointment) => void;
  onViewVisit?: (visit: VisitAppointment) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visit-tabpanel-${index}`}
      aria-labelledby={`visit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AgendaVisitas({ onCreateVisit, onEditVisit, onViewVisit }: AgendaVisitasProps) {
  const { tenantId } = useTenant();
  const [currentTab, setCurrentTab] = useState(0);
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitAppointment | null>(null);

  // Estados para modal de criação rápida
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Carregar visitas, propriedades e clientes
      const [visitsResponse, propertiesResponse, clientsResponse] = await Promise.all([
        fetch(`/api/visits?tenantId=${tenantId}`),
        fetch(`/api/properties?tenantId=${tenantId}`),
        fetch(`/api/clients?tenantId=${tenantId}`),
      ]);

      if (!visitsResponse.ok || !propertiesResponse.ok || !clientsResponse.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const [visitsData, propertiesData, clientsData] = await Promise.all([
        visitsResponse.json(),
        propertiesResponse.json(),
        clientsResponse.json(),
      ]);

      setVisits(visitsData.data || []);
      setProperties(propertiesData.data || []);
      setClients(clientsData.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, visit: VisitAppointment) => {
    setAnchorEl(event.currentTarget);
    setSelectedVisit(visit);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVisit(null);
  };

  const handleViewVisit = () => {
    if (selectedVisit && onViewVisit) {
      onViewVisit(selectedVisit);
    }
    handleMenuClose();
  };

  const handleEditVisit = () => {
    if (selectedVisit && onEditVisit) {
      onEditVisit(selectedVisit);
    }
    handleMenuClose();
  };

  const getVisitsByStatus = (status: VisitStatus) => {
    return visits.filter(visit => visit.status === status);
  };

  const getVisitsByWeek = () => {
    const weekStart = startOfWeek(selectedWeek, { locale: ptBR });
    const weekEnd = endOfWeek(selectedWeek, { locale: ptBR });
    
    return visits.filter(visit => {
      const visitDate = new Date(visit.scheduledDate);
      return visitDate >= weekStart && visitDate <= weekEnd;
    });
  };

  const getTodayVisits = () => {
    const today = new Date();
    return visits.filter(visit => isSameDay(new Date(visit.scheduledDate), today));
  };

  const getUpcomingVisits = () => {
    const today = new Date();
    return visits.filter(visit => {
      const visitDate = new Date(visit.scheduledDate);
      return visitDate > today && visit.status !== VisitStatus.CANCELLED_BY_CLIENT && visit.status !== VisitStatus.CANCELLED_BY_AGENT;
    }).slice(0, 5);
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Propriedade não encontrada';
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente não encontrado';
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Remove segundos se houver
  };

  const renderVisitCard = (visit: VisitAppointment, showDate = true) => (
    <Paper
      key={visit.id}
      sx={{
        p: 2,
        mb: 2,
        border: `2px solid ${VISIT_STATUS_COLORS[visit.status]}`,
        borderRadius: 2,
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Home size={20} />
            {getPropertyName(visit.propertyId)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Person size={16} />
            {getClientName(visit.clientId)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={VISIT_STATUS_LABELS[visit.status]}
            size="small"
            sx={{
              backgroundColor: VISIT_STATUS_COLORS[visit.status],
              color: 'white',
              fontWeight: 'bold',
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => handleMenuClick(e, visit)}
          >
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
        {showDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2">
              {format(new Date(visit.scheduledDate), "dd 'de' MMMM", { locale: ptBR })}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            {formatTime(visit.scheduledTime)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2">
            {visit.clientPhone}
          </Typography>
        </Box>
      </Box>

      {visit.notes && (
        <Typography variant="body2" sx={{ mt: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
          {visit.notes}
        </Typography>
      )}
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={loadData} sx={{ ml: 2 }}>
          Tentar Novamente
        </Button>
      </Alert>
    );
  }

  const todayVisits = getTodayVisits();
  const upcomingVisits = getUpcomingVisits();
  const weekVisits = getVisitsByWeek();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Agenda de Visitas
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar dados">
            <IconButton onClick={loadData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateVisit}
            sx={{ borderRadius: 2 }}
          >
            Nova Visita
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
              {todayVisits.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visitas Hoje
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="success.main" sx={{ fontWeight: 'bold' }}>
              {getVisitsByStatus(VisitStatus.CONFIRMED).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Confirmadas
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="warning.main" sx={{ fontWeight: 'bold' }}>
              {getVisitsByStatus(VisitStatus.SCHEDULED).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Agendadas
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h3" color="info.main" sx={{ fontWeight: 'bold' }}>
              {upcomingVisits.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Próximas
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="Agenda de visitas tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Badge badgeContent={todayVisits.length} color="error">
                Hoje
              </Badge>
            } 
          />
          <Tab label="Próximas" />
          <Tab label="Semana" />
          <Tab label="Todas" />
        </Tabs>

        {/* Hoje */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday />
            Visitas de Hoje ({format(new Date(), "dd 'de' MMMM", { locale: ptBR })})
          </Typography>
          {todayVisits.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhuma visita agendada para hoje.
            </Alert>
          ) : (
            todayVisits.map(visit => renderVisitCard(visit, false))
          )}
        </TabPanel>

        {/* Próximas */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            Próximas Visitas
          </Typography>
          {upcomingVisits.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhuma visita agendada para os próximos dias.
            </Alert>
          ) : (
            upcomingVisits.map(visit => renderVisitCard(visit))
          )}
        </TabPanel>

        {/* Semana */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Event />
              Visitas da Semana
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}>
                <ArrowBackIos />
              </IconButton>
              <Typography variant="body1">
                {format(startOfWeek(selectedWeek, { locale: ptBR }), "dd 'de' MMM", { locale: ptBR })} - {format(endOfWeek(selectedWeek, { locale: ptBR }), "dd 'de' MMM", { locale: ptBR })}
              </Typography>
              <IconButton onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}>
                <ArrowForwardIos />
              </IconButton>
            </Box>
          </Box>
          {weekVisits.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhuma visita agendada para esta semana.
            </Alert>
          ) : (
            weekVisits.map(visit => renderVisitCard(visit))
          )}
        </TabPanel>

        {/* Todas */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            Todas as Visitas ({visits.length})
          </Typography>
          {visits.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Nenhuma visita cadastrada ainda.
            </Alert>
          ) : (
            visits.map(visit => renderVisitCard(visit))
          )}
        </TabPanel>
      </Paper>

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewVisit}>
          <CheckCircle sx={{ mr: 1 }} />
          Ver Detalhes
        </MenuItem>
        <MenuItem onClick={handleEditVisit}>
          <Edit sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <Cancel sx={{ mr: 1 }} />
          Cancelar Visita
        </MenuItem>
      </Menu>
    </Box>
  );
}