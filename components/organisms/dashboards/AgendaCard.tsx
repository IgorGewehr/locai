'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Divider,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Schedule,
  CalendarToday,
  Person,
  Home,
  AccessTime,
  Add,
  Refresh,
  ArrowForward,
  CheckCircle,
  Groups,
  Task,
  Event as EventIcon,
} from '@mui/icons-material';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  VisitAppointment, 
  VisitStatus, 
  VISIT_STATUS_LABELS, 
  VISIT_STATUS_COLORS 
} from '@/lib/types/visit-appointment';
import { useTenant } from '@/contexts/TenantContext';
import { scrollbarStyles } from '@/styles/scrollbarStyles';

interface AgendaCardProps {
  onCreateEvent?: () => void;
}

export default function AgendaCard({ onCreateEvent }: AgendaCardProps) {
  const { tenantId } = useTenant();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    total: 0,
  });

  const loadAgendaEvents = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/visits?tenantId=${tenantId}&limit=10&upcoming=true`);
      
      if (response.ok) {
        const data = await response.json();
        const visits = data.data || [];
        
        // Filtrar apenas visitas futuras e ordenar por data/hora
        const now = new Date();
        const futureVisits = visits
          .filter((visit: VisitAppointment) => {
            const visitDateTime = new Date(visit.scheduledDate);
            visitDateTime.setHours(parseInt(visit.scheduledTime.split(':')[0]));
            visitDateTime.setMinutes(parseInt(visit.scheduledTime.split(':')[1]));
            return visitDateTime > now;
          })
          .sort((a: VisitAppointment, b: VisitAppointment) => {
            const dateA = new Date(a.scheduledDate);
            const dateB = new Date(b.scheduledDate);
            dateA.setHours(parseInt(a.scheduledTime.split(':')[0]));
            dateA.setMinutes(parseInt(a.scheduledTime.split(':')[1]));
            dateB.setHours(parseInt(b.scheduledTime.split(':')[0]));
            dateB.setMinutes(parseInt(b.scheduledTime.split(':')[1]));
            return dateA.getTime() - dateB.getTime();
          });
        
        // Por enquanto, vamos mostrar as visitas como eventos
        // TODO: Adicionar outros tipos de eventos (reuniões, tarefas, etc.)
        const events = futureVisits.map((visit: any) => ({
          ...visit,
          type: 'visit',
          title: `Visita - ${visit.propertyName}`,
          subtitle: visit.clientName,
          icon: 'home'
        }));
        
        setUpcomingEvents(events);
        
        // Calcular estatísticas
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const weekEnd = addDays(today, 7);
        
        const todayVisits = futureVisits.filter((visit: VisitAppointment) => 
          isToday(new Date(visit.scheduledDate))
        ).length;
        
        const tomorrowVisits = futureVisits.filter((visit: VisitAppointment) => 
          isTomorrow(new Date(visit.scheduledDate))
        ).length;
        
        const thisWeekVisits = futureVisits.filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          return visitDate >= today && visitDate <= weekEnd;
        }).length;
        
        setStats({
          today: todayVisits,
          tomorrow: tomorrowVisits,
          thisWeek: thisWeekVisits,
          total: futureVisits.length,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar visitas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgendaEvents();
  }, [tenantId]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMM", { locale: ptBR });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Remove segundos se houver
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <Home sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />;
      case 'meeting':
        return <Groups sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />;
      case 'task':
        return <Task sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />;
      default:
        return <EventIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />;
    }
  };

  return (
    <Card 
      sx={{ 
        height: { xs: 'auto', lg: 400 },
        minHeight: 350,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        }
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
              }}
            >
              <Schedule sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography 
                variant="h5" 
                component="h2"
                sx={{ 
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  mb: 0.5
                }}
              >
                Agenda
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem'
                }}
              >
                Próximos compromissos
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={loadAgendaEvents}
              disabled={loading}
              sx={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                '&:hover': {
                  background: 'rgba(139, 92, 246, 0.2)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <Refresh />
            </IconButton>
            {onCreateEvent && (
              <IconButton 
                onClick={onCreateEvent}
                sx={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  color: '#8b5cf6',
                  '&:hover': {
                    background: 'rgba(139, 92, 246, 0.2)',
                    transform: 'scale(1.05)',
                  }
                }}
              >
                <Add />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '-' : stats.today}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Hoje
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '-' : stats.tomorrow}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Amanhã
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
              {loading ? '-' : stats.thisWeek}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Esta Semana
            </Typography>
          </Box>
        </Box>

        {/* Upcoming Visits List */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto', ...scrollbarStyles.hidden }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} variant="rectangular" height={80} sx={{ borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
            ))
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.slice(0, 4).map((event) => (
              <Box 
                key={event.id}
                sx={{ 
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateX(4px)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '3px',
                    height: '100%',
                    background: event.type === 'visit' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 
                               event.type === 'meeting' ? '#3b82f6' : 
                               event.type === 'task' ? '#f59e0b' : '#10b981',
                    borderRadius: '3px',
                  }
                }}
                onClick={() => {
                  window.location.href = '/dashboard/agenda/visao-geral';
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {getEventIcon(event.type)}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#ffffff',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.title || event.propertyName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {event.subtitle || event.clientName}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {event.confirmedByClient && (
                      <Chip
                        icon={<CheckCircle sx={{ fontSize: 14 }} />}
                        size="small"
                        sx={{
                          height: 20,
                          bgcolor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          '& .MuiChip-icon': {
                            color: '#10b981',
                          },
                        }}
                      />
                    )}
                    <Chip
                      label={event.status ? VISIT_STATUS_LABELS[event.status] : 'Agendado'}
                      size="small"
                      sx={{
                        backgroundColor: event.status ? VISIT_STATUS_COLORS[event.status] + '20' : 'rgba(139, 92, 246, 0.2)',
                        color: event.status ? VISIT_STATUS_COLORS[event.status] : '#8b5cf6',
                        border: event.status ? `1px solid ${VISIT_STATUS_COLORS[event.status]}40` : '1px solid rgba(139, 92, 246, 0.3)',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarToday sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                        {getDateLabel(new Date(event.scheduledDate))}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTime sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                        {formatTime(event.scheduledTime)}
                      </Typography>
                    </Box>
                  </Box>
                  <ArrowForward sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                </Box>
              </Box>
            ))
          ) : (
            <Box 
              sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  background: 'rgba(139, 92, 246, 0.1)',
                }}
              >
                <Typography sx={{ fontSize: '2.5rem' }}>📅</Typography>
              </Box>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#ffffff', 
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                Nenhum compromisso agendado
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  textAlign: 'center',
                  maxWidth: '80%'
                }}
              >
                Organize seus compromissos e tarefas
              </Typography>
              {onCreateEvent && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onCreateEvent}
                  sx={{
                    mt: 2,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    px: 3,
                    borderRadius: '12px',
                  }}
                >
                  Criar Primeiro Compromisso
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Footer Actions */}
        {upcomingEvents.length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Schedule />}
                href="/dashboard/agenda/visao-geral"
                sx={{ 
                  flex: 1,
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  },
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: '12px',
                }}
              >
                Ver Agenda Completa
              </Button>
              {onCreateEvent && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={onCreateEvent}
                  sx={{ 
                    flex: 1,
                    color: '#8b5cf6',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    '&:hover': {
                      borderColor: 'rgba(139, 92, 246, 0.5)',
                      background: 'rgba(139, 92, 246, 0.1)',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    borderRadius: '12px',
                  }}
                >
                  Novo Compromisso
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}