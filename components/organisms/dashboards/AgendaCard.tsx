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
  Stack,
  LinearProgress,
  CircularProgress,
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
  TrendingUp,
  EventAvailable,
  EventBusy,
} from '@mui/icons-material';
import { format, isToday, isTomorrow, addDays, differenceInHours } from 'date-fns';
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
        
        setUpcomingEvents(events.slice(0, 3)); // Show only 3 events
        
        // Calcular estatísticas
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const weekFromNow = addDays(today, 7);
        
        const todayEvents = futureVisits.filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          return isToday(visitDate);
        });
        
        const tomorrowEvents = futureVisits.filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          return isTomorrow(visitDate);
        });
        
        const weekEvents = futureVisits.filter((visit: VisitAppointment) => {
          const visitDate = new Date(visit.scheduledDate);
          return visitDate <= weekFromNow;
        });
        
        setStats({
          today: todayEvents.length,
          tomorrow: tomorrowEvents.length,
          thisWeek: weekEvents.length,
          total: futureVisits.length,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar eventos da agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgendaEvents();
  }, [tenantId]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'visit':
        return <Home sx={{ fontSize: 16 }} />;
      case 'meeting':
        return <Groups sx={{ fontSize: 16 }} />;
      case 'task':
        return <Task sx={{ fontSize: 16 }} />;
      default:
        return <EventIcon sx={{ fontSize: 16 }} />;
    }
  };

  const formatEventTime = (date: string, time: string) => {
    const eventDate = new Date(date);
    const [hours, minutes] = time.split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes));
    
    const now = new Date();
    const hoursUntil = differenceInHours(eventDate, now);
    
    if (hoursUntil < 1 && hoursUntil >= 0) {
      return 'Em breve';
    } else if (hoursUntil < 24 && hoursUntil >= 1) {
      return `Em ${hoursUntil}h`;
    } else if (isToday(eventDate)) {
      return `Hoje às ${time}`;
    } else if (isTomorrow(eventDate)) {
      return `Amanhã às ${time}`;
    } else {
      return format(eventDate, "dd/MM 'às' HH:mm", { locale: ptBR });
    }
  };

  if (loading) {
    return (
      <Card 
        sx={{ 
          height: { xs: 'auto', lg: 400 },
          minHeight: 350,
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={40} />
      </Card>
    );
  }

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
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Schedule sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
                Agenda
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Próximos compromissos
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={loadAgendaEvents}
              disabled={loading}
              sx={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.2)',
                },
              }}
            >
              <Refresh sx={{ fontSize: 20 }} />
            </IconButton>
            <IconButton 
              onClick={onCreateEvent}
              sx={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#6366f1',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.2)',
                },
              }}
            >
              <Add sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Grid */}
        <Box sx={{ mb: 3 }}>
          <Stack spacing={2}>
            {/* Today and Tomorrow */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ 
                flex: 1, 
                textAlign: 'center',
                p: 2,
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#6366f1', mb: 0.5 }}>
                  {stats.today}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Hoje
                </Typography>
              </Box>
              <Box sx={{ 
                flex: 1, 
                textAlign: 'center',
                p: 2,
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#8b5cf6', mb: 0.5 }}>
                  {stats.tomorrow}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Amanhã
                </Typography>
              </Box>
            </Box>

            {/* Week Progress */}
            <Box sx={{ 
              p: 2,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                  Esta Semana
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }}>
                  {stats.thisWeek} eventos
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.thisWeek > 0 ? Math.min((stats.thisWeek / 20) * 100, 100) : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  },
                }}
              />
            </Box>
          </Stack>
        </Box>

        {/* Events List */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
              Próximos Eventos
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
              href="/dashboard/agenda"
              sx={{
                color: '#6366f1',
                textTransform: 'none',
                fontSize: '0.875rem',
                '&:hover': {
                  background: 'rgba(99, 102, 241, 0.1)',
                },
              }}
            >
              Ver todos
            </Button>
          </Box>

          {upcomingEvents.length > 0 ? (
            <Stack spacing={1.5}>
              {upcomingEvents.map((event, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        background: event.type === 'visit' 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : 'rgba(99, 102, 241, 0.2)',
                        color: event.type === 'visit' ? '#22c55e' : '#6366f1',
                      }}
                    >
                      {getEventIcon(event.type)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#ffffff' }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {event.subtitle}
                      </Typography>
                    </Box>
                    <Chip
                      label={formatEventTime(event.scheduledDate, event.scheduledTime)}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <EventAvailable sx={{ fontSize: 48, color: 'rgba(255, 255, 255, 0.3)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Nenhum evento agendado
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}