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
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  Paper,
  Badge,
} from '@mui/material';
import {
  CalendarMonth,
  ViewDay,
  ViewWeek,
  ViewModule,
  Add,
  Refresh,
  Event,
  Home,
  Groups,
  Task,
  Schedule,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Person,
  LocationOn,
  AccessTime,
  CalendarToday,
  FilterList,
  MoreVert,
} from '@mui/icons-material';
import { 
  format, 
  isToday, 
  isTomorrow, 
  addDays, 
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isBefore,
  isAfter,
  eachDayOfInterval,
  getDay,
  isValid,
} from 'date-fns';
import { safeFormatDate, safeParseDate } from '@/lib/utils/dateUtils';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';

interface AgendaEvent {
  id: string;
  type: 'visit' | 'meeting' | 'task' | 'reservation';
  title: string;
  subtitle?: string;
  date: Date;
  time: string;
  endTime?: string;
  status?: string;
  icon?: string;
  color?: string;
  location?: string;
  participants?: string[];
}

type ViewMode = 'day' | 'week' | 'month';

export default function AgendaVisaoGeralPage() {
  const router = useRouter();
  const { services, tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);

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
  }, [isReady, tenantId]);

  const loadAllEvents = async () => {
    if (!services) return;
    
    try {
      setLoading(true);
      const allEvents: AgendaEvent[] = [];
      
      // Load visits
      try {
        const response = await fetch(`/api/visits?tenantId=${tenantId}&limit=100&upcoming=true`);
        if (response.ok) {
          const data = await response.json();
          const visits = data.data || [];
          
          visits.forEach((visit: any) => {
            const scheduledDate = safeParseDate(visit.scheduledDate);
            if (scheduledDate && visit.scheduledTime) {
              allEvents.push({
                id: visit.id,
                type: 'visit',
                title: `Visita - ${visit.propertyName}`,
                subtitle: visit.clientName,
                date: scheduledDate,
                time: visit.scheduledTime,
                endTime: addHours(visit.scheduledTime, 1),
                status: visit.status,
                color: '#8b5cf6',
                location: visit.propertyAddress,
                participants: [visit.clientName],
              });
            }
          });
        }
      } catch (error) {
        console.error('Error loading visits:', error);
      }
      
      // Load reservations
      try {
        const reservations = await services.reservations.getAll();
        reservations.forEach((reservation: any) => {
          const checkInDate = safeParseDate(reservation.checkIn);
          if (checkInDate) {
            allEvents.push({
              id: reservation.id,
              type: 'reservation',
              title: `Reserva - ${reservation.propertyName || 'Propriedade'}`,
              subtitle: reservation.clientName || 'Cliente',
              date: checkInDate,
              time: '14:00',
              endTime: '12:00',
              status: reservation.status,
              color: '#3b82f6',
              location: reservation.propertyAddress,
              participants: [reservation.clientName],
            });
          }
        });
      } catch (error) {
        console.error('Error loading reservations:', error);
      }
      
      // Sort events by date and time (with safety checks)
      allEvents.sort((a, b) => {
        try {
          // Safely format dates and validate them
          const dateStrA = isValid(a.date) ? format(a.date, 'yyyy-MM-dd') : '1970-01-01';
          const dateStrB = isValid(b.date) ? format(b.date, 'yyyy-MM-dd') : '1970-01-01';
          
          const dateA = new Date(`${dateStrA} ${a.time || '00:00'}`);
          const dateB = new Date(`${dateStrB} ${b.time || '00:00'}`);
          
          // Additional validation for the constructed dates
          if (!isValid(dateA) || !isValid(dateB)) {
            // Fallback to original date comparison
            return a.date.getTime() - b.date.getTime();
          }
          
          return dateA.getTime() - dateB.getTime();
        } catch (error) {
          console.error('Error sorting events:', error, { eventA: a.id, eventB: b.id });
          // Fallback sorting by original date
          return a.date.getTime() - b.date.getTime();
        }
      });
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const addHours = (time: string, hours: number): string => {
    const [h, m] = time.split(':').map(Number);
    const newHour = (h + hours) % 24;
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getDateRangeTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ptBR });
        const weekEnd = endOfWeek(currentDate, { locale: ptBR });
        return `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`;
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <Home sx={{ fontSize: 16 }} />;
      case 'meeting':
        return <Groups sx={{ fontSize: 16 }} />;
      case 'task':
        return <Task sx={{ fontSize: 16 }} />;
      case 'reservation':
        return <Event sx={{ fontSize: 16 }} />;
      default:
        return <Schedule sx={{ fontSize: 16 }} />;
    }
  };

  const handleEventClick = (event: AgendaEvent) => {
    setSelectedEvent(event);
    switch (event.type) {
      case 'visit':
        router.push('/dashboard/agenda/visitas');
        break;
      case 'reservation':
        router.push('/dashboard/agenda');
        break;
    }
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <Paper sx={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: 3,
        overflow: 'hidden',
        height: 'calc(100vh - 300px)',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-thumb': { 
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
        },
      }}>
        {hours.map(hour => {
          const hourEvents = dayEvents.filter(event => {
            const eventHour = parseInt(event.time.split(':')[0]);
            return eventHour === hour;
          });

          return (
            <Box key={hour} sx={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <Box sx={{ 
                width: 80, 
                p: 2, 
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
              }}>
                {hour.toString().padStart(2, '0')}:00
              </Box>
              <Box sx={{ flex: 1, minHeight: 60, p: 1 }}>
                {hourEvents.map(event => (
                  <Box
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    sx={{
                      background: `${event.color}20`,
                      borderLeft: `3px solid ${event.color}`,
                      borderRadius: '6px',
                      p: 1.5,
                      mb: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {getEventIcon(event.type)}
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                        {event.time} - {event.title}
                      </Typography>
                    </Box>
                    {event.subtitle && (
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {event.subtitle}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Paper>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(currentDate, { locale: ptBR }),
    });

    return (
      <Grid container spacing={1}>
        {weekDays.map(day => {
          const dayEvents = getEventsForDate(day);
          const isCurrentDay = isToday(day);

          return (
            <Grid item xs key={day.toISOString()}>
              <Paper sx={{ 
                background: isCurrentDay ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2,
                height: 'calc(100vh - 350px)',
                overflow: 'hidden',
                border: isCurrentDay ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
              }}>
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  textAlign: 'center',
                }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                    {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: isCurrentDay ? '#8b5cf6' : '#fff',
                    }}
                  >
                    {format(day, 'dd')}
                  </Typography>
                </Box>
                <Box sx={{ 
                  p: 1, 
                  overflowY: 'auto',
                  height: 'calc(100% - 80px)',
                  '&::-webkit-scrollbar': { width: '4px' },
                  '&::-webkit-scrollbar-thumb': { 
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                  },
                }}>
                  {dayEvents.map(event => (
                    <Box
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      sx={{
                        background: `${event.color}20`,
                        borderRadius: '6px',
                        p: 1,
                        mb: 0.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderLeft: `2px solid ${event.color}`,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, color: event.color, display: 'block' }}>
                        {event.time}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#fff', display: 'block' }}>
                        {event.title}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <Grid container spacing={1}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <Grid item xs key={day}>
            <Typography variant="caption" sx={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              textAlign: 'center', 
              display: 'block',
              p: 1,
            }}>
              {day}
            </Typography>
          </Grid>
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          const isCurrentDay = isToday(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <Grid item xs key={day.toISOString()}>
              <Paper sx={{ 
                background: isCurrentDay ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: 1,
                height: 100,
                p: 1,
                opacity: isCurrentMonth ? 1 : 0.4,
                border: isCurrentDay ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.05)',
                },
              }}
              onClick={() => {
                setCurrentDate(day);
                setViewMode('day');
              }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: isCurrentDay ? 700 : 500,
                    color: isCurrentDay ? '#8b5cf6' : '#fff',
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                {dayEvents.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    {dayEvents.slice(0, 2).map(event => (
                      <Box
                        key={event.id}
                        sx={{
                          width: '100%',
                          height: 4,
                          background: event.color,
                          borderRadius: 1,
                          mb: 0.3,
                        }}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        +{dayEvents.length - 2}
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  if (!isReady) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      <DashboardBreadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Agenda', href: '/dashboard/agenda' },
        { label: 'Visão Geral' },
      ]} />

      {/* Header */}
      <Box sx={{ 
        mb: 3,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        p: 3,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => navigateDate('prev')}
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton 
              onClick={() => navigateDate('next')}
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ChevronRight />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff', minWidth: 200, textAlign: 'center' }}>
              {getDateRangeTitle()}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={goToToday}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                }
              }}
            >
              Hoje
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, value) => value && setViewMode(value)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  '&.Mui-selected': {
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#8b5cf6',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.05)',
                  }
                }
              }}
            >
              <ToggleButton value="day">
                <ViewDay sx={{ mr: 0.5, fontSize: 18 }} />
                Dia
              </ToggleButton>
              <ToggleButton value="week">
                <ViewWeek sx={{ mr: 0.5, fontSize: 18 }} />
                Semana
              </ToggleButton>
              <ToggleButton value="month">
                <ViewModule sx={{ mr: 0.5, fontSize: 18 }} />
                Mês
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            <IconButton 
              onClick={loadAllEvents}
              disabled={loading}
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              {loading ? <CircularProgress size={20} /> : <Refresh />}
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
              Novo Evento
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Calendar View */}
      <Box sx={{ mb: 3 }}>
        {loading ? (
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        ) : (
          <>
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </>
        )}
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 2,
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                {events.filter(e => isToday(e.date)).length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Eventos Hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 2,
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                {events.filter(e => e.type === 'reservation').length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Reservas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 2,
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                {events.filter(e => e.type === 'visit').length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Visitas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'rgba(236, 72, 153, 0.05)',
            border: '1px solid rgba(236, 72, 153, 0.2)',
            borderRadius: 2,
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ec4899' }}>
                {events.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Total de Eventos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}