'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add,
  CalendarToday,
  Person,
  Home,
  Phone,
  AccessTime,
  LocationOn,
  Refresh,
  CheckCircle,
  Schedule,
  Event,
  FilterList,
  Visibility,
  Edit,
  Cancel
} from '@mui/icons-material';
import { format, isSameDay, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { VisitAppointment, VisitStatus, VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '@/lib/types/visit-appointment';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';

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

export default function VisitasPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { tenantId, isReady } = useTenant();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [visits, setVisits] = useState<VisitAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  useEffect(() => {
    if (isReady && tenantId) {
      loadVisits();
    }
  }, [isReady, tenantId]);

  const loadVisits = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/visits?tenantId=${tenantId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar visitas');
      }

      const data = await response.json();
      
      if (data.success) {
        setVisits(data.data || []);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (err) {
      logger.error('Erro ao carregar visitas', { error: err, tenantId });
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getVisitsByStatus = (status: VisitStatus) => {
    return visits.filter(visit => visit.status === status);
  };

  const getTodayVisits = () => {
    const today = new Date();
    return visits.filter(visit => isSameDay(new Date(visit.scheduledDate), today));
  };

  const getUpcomingVisits = () => {
    const today = new Date();
    return visits.filter(visit => {
      const visitDate = new Date(visit.scheduledDate);
      return visitDate > today && 
             visit.status !== VisitStatus.CANCELLED_BY_CLIENT && 
             visit.status !== VisitStatus.CANCELLED_BY_AGENT;
    }).slice(0, 5);
  };

  const getVisitsByWeek = () => {
    const weekStart = startOfWeek(selectedWeek, { locale: ptBR });
    const weekEnd = endOfWeek(selectedWeek, { locale: ptBR });
    
    return visits.filter(visit => {
      const visitDate = new Date(visit.scheduledDate);
      return visitDate >= weekStart && visitDate <= weekEnd;
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Remove segundos se houver
  };

  const renderVisitCard = (visit: VisitAppointment, showDate = true) => (
    <Card
      key={visit.id}
      sx={{
        mb: 2,
        border: `2px solid ${VISIT_STATUS_COLORS[visit.status]}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        },
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Home fontSize="small" />
              {visit.propertyName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person fontSize="small" />
              {visit.clientName}
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
          <Typography variant="body2" sx={{ 
            mt: 1, 
            p: 1, 
            backgroundColor: 'grey.50', 
            borderRadius: 1,
            fontStyle: 'italic'
          }}>
            {visit.notes}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <DashboardBreadcrumb 
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Agenda', href: '/dashboard/agenda' },
            { label: 'Visitas', href: '/dashboard/agenda/visitas' }
          ]} 
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
          <Button onClick={loadVisits} sx={{ ml: 2 }}>
            Tentar Novamente
          </Button>
        </Alert>
      </Box>
    );
  }

  const todayVisits = getTodayVisits();
  const upcomingVisits = getUpcomingVisits();
  const weekVisits = getVisitsByWeek();

  return (
    <Box sx={{ p: 3 }}>
      <DashboardBreadcrumb 
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Agenda', href: '/dashboard/agenda' },
          { label: 'Visitas', href: '/dashboard/agenda/visitas' }
        ]} 
      />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocationOn sx={{ fontSize: 32, color: 'primary.main' }} />
            Agenda de Visitas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie os agendamentos de visitas às propriedades
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={loadVisits}>
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ 
              borderRadius: 3,
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Nova Visita
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {todayVisits.length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Visitas Hoje
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: 3,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {getVisitsByStatus(VisitStatus.CONFIRMED).length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Confirmadas
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: 3,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {getVisitsByStatus(VisitStatus.SCHEDULED).length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Agendadas
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: 3,
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white'
          }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              {upcomingVisits.length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Próximas
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
            '& .MuiTab-root': {
              minHeight: 64,
              fontWeight: 600,
            }
          }}
        >
          <Tab 
            label={
              <Badge badgeContent={todayVisits.length} color="error">
                Hoje
              </Badge>
            } 
            icon={<CalendarToday />}
            iconPosition="start"
          />
          <Tab 
            label="Próximas" 
            icon={<Schedule />}
            iconPosition="start"
          />
          <Tab 
            label="Semana" 
            icon={<Event />}
            iconPosition="start"
          />
          <Tab 
            label="Todas" 
            icon={<FilterList />}
            iconPosition="start"
          />
        </Tabs>

        {/* Hoje */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday color="primary" />
            Visitas de Hoje ({format(new Date(), "dd 'de' MMMM", { locale: ptBR })})
          </Typography>
          {todayVisits.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Nenhuma visita agendada para hoje.
            </Alert>
          ) : (
            <Box>
              {todayVisits.map(visit => renderVisitCard(visit, false))}
            </Box>
          )}
        </TabPanel>

        {/* Próximas */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule color="primary" />
            Próximas Visitas
          </Typography>
          {upcomingVisits.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Nenhuma visita agendada para os próximos dias.
            </Alert>
          ) : (
            <Box>
              {upcomingVisits.map(visit => renderVisitCard(visit))}
            </Box>
          )}
        </TabPanel>

        {/* Semana */}  
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Event color="primary" />
              Visitas da Semana
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}>
                <CalendarToday />
              </IconButton>
              <Typography variant="body1">
                {format(startOfWeek(selectedWeek, { locale: ptBR }), "dd 'de' MMM", { locale: ptBR })} - {format(endOfWeek(selectedWeek, { locale: ptBR }), "dd 'de' MMM", { locale: ptBR })}
              </Typography>
              <IconButton onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}>
                <CalendarToday />
              </IconButton>
            </Box>
          </Box>
          {weekVisits.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Nenhuma visita agendada para esta semana.
            </Alert>
          ) : (
            <Box>
              {weekVisits.map(visit => renderVisitCard(visit))}
            </Box>
          )}
        </TabPanel>

        {/* Todas */}
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList color="primary" />
            Todas as Visitas ({visits.length})
          </Typography>
          {visits.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Nenhuma visita cadastrada ainda.
              <Button 
                variant="outlined" 
                startIcon={<Add />}
                sx={{ ml: 2 }}
              >
                Criar primeira visita
              </Button>
            </Alert>
          ) : (
            <Box>
              {visits.map(visit => renderVisitCard(visit))}
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* FAB Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000
          }}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
}