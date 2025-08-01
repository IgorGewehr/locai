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
import CreateVisitDialog from './components/CreateVisitDialog';

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
        border: `1px solid ${VISIT_STATUS_COLORS[visit.status]}40`,
        borderLeft: `4px solid ${VISIT_STATUS_COLORS[visit.status]}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
        '&:hover': {
          boxShadow: `0 8px 24px ${VISIT_STATUS_COLORS[visit.status]}20`,
          transform: 'translateY(-2px)',
          borderColor: VISIT_STATUS_COLORS[visit.status],
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 1,
                fontWeight: 600,
                fontSize: { xs: '1.1rem', sm: '1.25rem' }
              }}
            >
              <Home 
                fontSize="small" 
                sx={{ 
                  color: 'primary.main',
                  p: 0.5,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: 'white',
                  fontSize: 16
                }} 
              />
              {visit.propertyName}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'text.primary',
                fontWeight: 500
              }}
            >
              <Person fontSize="small" sx={{ color: 'text.secondary' }} />
              {visit.clientName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: 'column' }}>
            <Chip
              label={VISIT_STATUS_LABELS[visit.status]}
              size="small"
              sx={{
                backgroundColor: VISIT_STATUS_COLORS[visit.status],
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                height: 24,
                '& .MuiChip-label': {
                  px: 1.5
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" sx={{ p: 0.5, bgcolor: 'action.hover' }}>
                <Visibility fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ p: 0.5, bgcolor: 'action.hover' }}>
                <Edit fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2, 
          mt: 2,
          p: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 1.5,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {showDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday sx={{ fontSize: 18, color: VISIT_STATUS_COLORS[visit.status] }} />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Data
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {format(new Date(visit.scheduledDate), "dd/MM", { locale: ptBR })}
                </Typography>
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTime sx={{ fontSize: 18, color: VISIT_STATUS_COLORS[visit.status] }} />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Horário
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatTime(visit.scheduledTime)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone sx={{ fontSize: 18, color: VISIT_STATUS_COLORS[visit.status] }} />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Contato
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {visit.clientPhone}
              </Typography>
            </Box>
          </Box>
        </Box>

        {visit.notes && (
          <Box sx={{ 
            mt: 2, 
            p: 1.5, 
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: 1.5,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Observações:
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              {visit.notes}
            </Typography>
          </Box>
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

      {/* Enhanced Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        mb: 4,
        gap: { xs: 3, md: 0 }
      }}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              mb: { xs: 1, md: 0.5 },
              fontSize: { xs: '1.75rem', md: '2.125rem' }
            }}
          >
            <LocationOn sx={{ fontSize: { xs: 28, md: 32 }, color: 'primary.main' }} />
            Agenda de Visitas
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
          >
            Gerencie os agendamentos de visitas às propriedades com Sofia IA
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip 
              size="small" 
              label="Integração Sofia IA" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              size="small" 
              label={`${visits.length} visitas cadastradas`} 
              color="info" 
              variant="outlined"
            />
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', md: 'auto' }
        }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadVisits}
            disabled={loading}
            sx={{ 
              minWidth: { xs: 'auto', sm: 120 },
              borderRadius: 2
            }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b47a8 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Nova Visita
          </Button>
        </Box>
      </Box>

      {/* Enhanced Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)'
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              opacity: 0,
              transition: 'opacity 0.3s ease'
            },
            '&:hover::before': {
              opacity: 1
            }
          }}>
            <CalendarToday sx={{ fontSize: 32, mb: 1, opacity: 0.8 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {todayVisits.length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Visitas Hoje
            </Typography>
            {todayVisits.length > 0 && (
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                Próxima: {todayVisits[0]?.scheduledTime ? formatTime(todayVisits[0].scheduledTime) : 'N/A'}
              </Typography>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(240, 147, 251, 0.4)'
            }
          }}>
            <CheckCircle sx={{ fontSize: 32, mb: 1, opacity: 0.8 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {getVisitsByStatus(VisitStatus.CONFIRMED).length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Confirmadas
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
              {Math.round((getVisitsByStatus(VisitStatus.CONFIRMED).length / (visits.length || 1)) * 100)}% do total
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(79, 172, 254, 0.4)'
            }
          }}>
            <Schedule sx={{ fontSize: 32, mb: 1, opacity: 0.8 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {getVisitsByStatus(VisitStatus.SCHEDULED).length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Agendadas
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
              Aguardando confirmação
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            textAlign: 'center', 
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px rgba(250, 112, 154, 0.4)'
            }
          }}>
            <Event sx={{ fontSize: 32, mb: 1, opacity: 0.8 }} />
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '2rem', sm: '2.5rem' } }}>
              {upcomingVisits.length}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              Próximas
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
              Próximos 7 dias
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
          onClick={() => setShowCreateDialog(true)}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b47a8 100%)',
            }
          }}
        >
          <Add />
        </Fab>
      )}

      {/* Create Visit Dialog */}
      <CreateVisitDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          loadVisits();
          setShowCreateDialog(false);
        }}
      />
    </Box>
  );
}