'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Skeleton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  CalendarToday,
  Add,
  Refresh,
  Event,
  Home,
  Groups,
  Task,
  Schedule,
  ArrowForward,
  TrendingUp,
} from '@mui/icons-material';
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';

interface AgendaEvent {
  id: string;
  type: 'visit' | 'meeting' | 'task' | 'reservation';
  title: string;
  subtitle?: string;
  date: Date;
  time: string;
  status?: string;
  icon?: string;
  color?: string;
}

export default function AgendaVisaoGeralPage() {
  const router = useRouter();
  const { services, tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [stats, setStats] = useState({
    today: 0,
    tomorrow: 0,
    week: 0,
    total: 0,
  });

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (isReady && services && mounted) {
        await loadAllEvents();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [isReady, tenantId]); // Remove services from dependencies

  const loadAllEvents = async () => {
    if (!services) return;
    
    try {
      setLoading(true);
      const allEvents: AgendaEvent[] = [];
      
      // Load visits
      try {
        const response = await fetch(`/api/visits?tenantId=${tenantId}&limit=50&upcoming=true`);
        if (response.ok) {
          const data = await response.json();
          const visits = data.data || [];
          
          visits.forEach((visit: any) => {
            allEvents.push({
              id: visit.id,
              type: 'visit',
              title: `Visita - ${visit.propertyName}`,
              subtitle: visit.clientName,
              date: new Date(visit.scheduledDate),
              time: visit.scheduledTime,
              status: visit.status,
              color: '#8b5cf6',
            });
          });
        }
      } catch (error) {
        console.error('Error loading visits:', error);
      }
      
      // Load reservations
      try {
        const reservations = await services.reservations.getAll();
        reservations.forEach((reservation: any) => {
          allEvents.push({
            id: reservation.id,
            type: 'reservation',
            title: `Reserva - ${reservation.propertyName || 'Propriedade'}`,
            subtitle: reservation.clientName || 'Cliente',
            date: new Date(reservation.checkIn),
            time: '14:00',
            status: reservation.status,
            color: '#3b82f6',
          });
        });
      } catch (error) {
        console.error('Error loading reservations:', error);
      }
      
      // Sort events by date and time
      allEvents.sort((a, b) => {
        const dateA = new Date(`${format(a.date, 'yyyy-MM-dd')} ${a.time}`);
        const dateB = new Date(`${format(b.date, 'yyyy-MM-dd')} ${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      setEvents(allEvents);
      calculateStats(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (events: AgendaEvent[]) => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(today, 1));
    const weekEnd = endOfDay(addDays(today, 7));
    
    const stats = {
      today: 0,
      tomorrow: 0,
      week: 0,
      total: events.length,
    };
    
    events.forEach(event => {
      const eventDate = startOfDay(event.date);
      
      if (eventDate.getTime() === today.getTime()) {
        stats.today++;
      }
      if (eventDate.getTime() === tomorrow.getTime()) {
        stats.tomorrow++;
      }
      if (event.date >= today && event.date <= weekEnd) {
        stats.week++;
      }
    });
    
    setStats(stats);
  };

  const getFilteredEvents = () => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(addDays(today, 1));
    const weekEnd = endOfDay(addDays(today, 7));
    
    switch (selectedTab) {
      case 0: // Hoje
        return events.filter(event => 
          startOfDay(event.date).getTime() === today.getTime()
        );
      case 1: // Amanhã
        return events.filter(event => 
          startOfDay(event.date).getTime() === tomorrow.getTime()
        );
      case 2: // Esta Semana
        return events.filter(event => 
          event.date >= today && event.date <= weekEnd
        );
      case 3: // Todos
        return events;
      default:
        return events;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <Home sx={{ fontSize: 20 }} />;
      case 'meeting':
        return <Groups sx={{ fontSize: 20 }} />;
      case 'task':
        return <Task sx={{ fontSize: 20 }} />;
      case 'reservation':
        return <Event sx={{ fontSize: 20 }} />;
      default:
        return <Schedule sx={{ fontSize: 20 }} />;
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const handleEventClick = (event: AgendaEvent) => {
    switch (event.type) {
      case 'visit':
        router.push('/dashboard/agenda/visitas');
        break;
      case 'reservation':
        router.push('/dashboard/agenda');
        break;
      default:
        break;
    }
  };

  if (!isReady) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const filteredEvents = getFilteredEvents();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        mb: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
        p: 4,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                color: '#ffffff',
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.5rem' },
                mb: 1
              }}
            >
              Visão Geral da Agenda
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '1.1rem'
              }}
            >
              Todos os seus compromissos em um só lugar
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton 
              onClick={loadAllEvents}
              disabled={loading}
              sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.15)',
                }
              }}
            >
              <Refresh />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/dashboard/agenda')}
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                },
              }}
            >
              Novo Compromisso
            </Button>
          </Box>
        </Box>

        {/* Stats */}
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              textAlign: 'center',
              p: 2,
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                {stats.today}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Hoje
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              textAlign: 'center',
              p: 2,
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {stats.tomorrow}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Amanhã
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              textAlign: 'center',
              p: 2,
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {stats.week}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Esta Semana
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ 
              textAlign: 'center',
              p: 2,
              borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.1)',
              border: '1px solid rgba(236, 72, 153, 0.2)',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ec4899' }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Total
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={selectedTab} 
        onChange={(_, value) => setSelectedTab(value)}
        sx={{ mb: 3 }}
      >
        <Tab label={`Hoje (${stats.today})`} />
        <Tab label={`Amanhã (${stats.tomorrow})`} />
        <Tab label={`Esta Semana (${stats.week})`} />
        <Tab label={`Todos (${stats.total})`} />
      </Tabs>

      {/* Events List */}
      <Grid container spacing={3}>
        {filteredEvents.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              p: 6,
              textAlign: 'center',
            }}>
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                Nenhum compromisso encontrado
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => router.push('/dashboard/agenda')}
                sx={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  },
                }}
              >
                Criar Primeiro Compromisso
              </Button>
            </Card>
          </Grid>
        ) : (
          filteredEvents.map((event) => (
            <Grid item xs={12} md={6} lg={4} key={event.id}>
              <Card
                onClick={() => handleEventClick(event)}
                sx={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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
                    width: '4px',
                    height: '100%',
                    background: event.color || '#8b5cf6',
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        background: `${event.color}20` || 'rgba(139, 92, 246, 0.2)',
                        color: event.color || '#8b5cf6',
                      }}>
                        {getEventIcon(event.type)}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          {getDateLabel(event.date)}
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                          {event.time}
                        </Typography>
                      </Box>
                    </Box>
                    <ArrowForward sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }} />
                  </Box>

                  <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
                    {event.title}
                  </Typography>
                  {event.subtitle && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {event.subtitle}
                    </Typography>
                  )}

                  {event.status && (
                    <Chip
                      label={event.status}
                      size="small"
                      sx={{
                        mt: 2,
                        backgroundColor: `${event.color}20` || 'rgba(139, 92, 246, 0.2)',
                        color: event.color || '#8b5cf6',
                        border: `1px solid ${event.color}40` || '1px solid rgba(139, 92, 246, 0.4)',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}