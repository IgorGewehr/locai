'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { scrollbarStyles } from '@/styles/scrollbarStyles';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    CircularProgress,
    Alert,
    Chip,
    IconButton,
    useTheme,
    useMediaQuery,
    Paper,
    Stack,
    Avatar,
    Divider,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Badge,
    Tabs,
    Tab,
    Fade,
    Grow,
} from '@mui/material';
import {
    CalendarToday,
    Add,
    Home,
    Person,
    Phone,
    AccessTime,
    Refresh,
    Event,
    Group,
    AttachMoney,
    CheckCircle,
    Schedule,
    Warning,
    NavigateBefore,
    NavigateNext,
    CalendarMonth,
    ViewDay,
    ViewWeek,
    LocationOn,
    Email,
    WhatsApp,
    DirectionsCar,
    Groups,
    TrendingUp,
    AutoAwesome,
} from '@mui/icons-material';
import { useReservations, useProperties, useClients } from '@/lib/firebase/hooks';
import { useVisits, useTodayVisits, useUpcomingVisits } from '@/lib/firebase/hooks/useVisits';
import { Reservation, ReservationStatus, RESERVATION_STATUS_LABELS } from '@/lib/types/reservation';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import { VisitAppointment, VISIT_STATUS_LABELS, VisitStatus } from '@/lib/types/visit-appointment';
import EventoModal from './components/EventoModal';
import ViewReservationDialog from './components/ViewReservationDialog';
import CreateVisitDialog from './components/CreateVisitDialog';
import EventDetailsModal from './components/EventDetailsModal';
import { format, isToday, isSameDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameWeek, isSameMonth, parseISO, subMonths, addMonths, subWeeks, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';

// Unified event interface for calendar
interface AgendaEvent {
    id: string;
    title: string;
    subtitle?: string;
    date: Date;
    type: 'reservation' | 'visit';
    status: string;
    statusColor: string;
    icon: React.ReactNode;
    details: Reservation | VisitAppointment;
}

// Helper function to calculate end time for events
const getEventEndTime = (startDate: Date, duration: number): Date => {
    return new Date(startDate.getTime() + (duration * 60000));
};

// Helper function to format time range for events
const getEventTimeRange = (event: AgendaEvent): string => {
    const startTime = format(event.date, 'HH:mm');
    
    if (event.type === 'visit') {
        const visitEvent = event.details as VisitAppointment;
        const duration = visitEvent.duration || 60;
        const endTime = format(getEventEndTime(event.date, duration), 'HH:mm');
        return `${startTime} - ${endTime}`;
    }
    
    // For reservations, just show check-in time
    return startTime;
};

export default function UnifiedAgendaPage() {
    const theme = useTheme();
    const router = useRouter();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { services, isReady } = useTenant();
    
    // Estados principais
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
    const [selectedTab, setSelectedTab] = useState(0);
    const [showEventoModal, setShowEventoModal] = useState(false);
    const [showVisitDialog, setShowVisitDialog] = useState(false);
    const [reservaSelecionada, setReservaSelecionada] = useState<Reservation | null>(null);
    const [showReservationDialog, setShowReservationDialog] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<VisitAppointment | null>(null);
    const [allVisits, setAllVisits] = useState<VisitAppointment[]>([]);
    const [loadingVisits, setLoadingVisits] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
    const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
    
    // Hooks de dados
    const { 
        reservations: allReservations, 
        loading: loadingReservations 
    } = useReservations();
    const { properties } = useProperties();
    const { clients } = useClients();
    const todayVisits = useTodayVisits();
    const upcomingVisits = useUpcomingVisits(7);
    
    // ✅ CORREÇÃO: Usar hook corrigido em vez de fetch manual
    const allVisitsHook = useVisits();

    // Sincronizar estado local com hook
    useEffect(() => {
        const visits = allVisitsHook.data || [];
        logger.info('📅 [Agenda] Visitas atualizadas', {
            count: visits.length,
            firstVisit: visits[0] ? {
                id: visits[0].id,
                clientName: visits[0].clientName,
                scheduledDate: visits[0].scheduledDate
            } : null
        });
        setAllVisits(visits);
        setLoadingVisits(allVisitsHook.loading);
    }, [allVisitsHook.data, allVisitsHook.loading]);

    // Auto-refresh a cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            logger.info('🔄 [Agenda] Auto-refresh de visitas');
            allVisitsHook.refetch();
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, []);

    // Converter dados em eventos unificados
    const getAllEvents = (): AgendaEvent[] => {
        const events: AgendaEvent[] = [];
        
        // Adicionar reservas como eventos (com verificação de segurança)
        if (allReservations && Array.isArray(allReservations)) {
            allReservations.forEach(reservation => {
                const property = properties?.find(p => p.id === reservation.propertyId);
                const client = clients?.find(c => c.id === reservation.clientId);
                
                const checkInDate = reservation.checkIn instanceof Date 
                    ? reservation.checkIn 
                    : new Date(reservation.checkIn);
                    
                events.push({
                    id: reservation.id,
                    title: property?.name || 'Propriedade',
                    subtitle: client?.name || 'Cliente',
                    date: checkInDate,
                    type: 'reservation',
                    status: reservation.status,
                    statusColor: getReservationStatusColor(reservation.status),
                    icon: <Home />,
                    details: reservation
                });
            });
        }
        
        // Adicionar visitas como eventos (com verificação de segurança)
        if (allVisits && Array.isArray(allVisits)) {
            allVisits.forEach(visit => {
                // Usar scheduledDate ao invés de date
                const visitDate = visit.scheduledDate 
                    ? (typeof visit.scheduledDate === 'string' 
                        ? parseISO(visit.scheduledDate)
                        : visit.scheduledDate instanceof Date 
                            ? visit.scheduledDate 
                            : new Date(visit.scheduledDate))
                    : new Date();
                        
                events.push({
                    id: visit.id,
                    title: visit.clientName,
                    subtitle: visit.propertyAddress,
                    date: visitDate,
                    type: 'visit',
                    status: visit.status || 'scheduled',
                    statusColor: getVisitStatusColor(visit.status || 'scheduled'),
                    icon: <DirectionsCar />,
                    details: visit
                });
            });
        }
        
        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    };
    
    const getReservationStatusColor = (status: ReservationStatus) => {
        const colors = {
            [ReservationStatus.CONFIRMED]: 'success',
            [ReservationStatus.PENDING]: 'warning',
            [ReservationStatus.CANCELLED]: 'error',
            [ReservationStatus.COMPLETED]: 'info',
        };
        return colors[status] || 'default';
    };
    
    const getVisitStatusColor = (status: VisitStatus) => {
        const colors = {
            [VisitStatus.SCHEDULED]: 'info',
            [VisitStatus.CONFIRMED]: 'success',
            [VisitStatus.COMPLETED]: 'default',
            [VisitStatus.CANCELLED]: 'error',
            [VisitStatus.NO_SHOW]: 'warning',
        };
        return colors[status] || 'default';
    };
    
    // Filtrar eventos por período
    const getFilteredEvents = () => {
        switch (viewMode) {
            case 'day':
                return allEvents.filter(event => isSameDay(event.date, currentDate));
            case 'week':
                const weekStart = startOfWeek(currentDate, { locale: ptBR });
                const weekEnd = endOfWeek(currentDate, { locale: ptBR });
                return allEvents.filter(event => 
                    event.date >= weekStart && event.date <= weekEnd
                );
            case 'month':
                return allEvents.filter(event => isSameMonth(event.date, currentDate));
            default:
                return allEvents;
        }
    };
    
    // Estatísticas (calculadas apenas quando os dados estão carregados)
    const allEvents = React.useMemo(() => {
        if (loadingReservations || loadingVisits) return [];
        return getAllEvents();
    }, [allReservations, allVisits, properties, clients, loadingReservations, loadingVisits]);

    const todayEvents = React.useMemo(() => 
        allEvents.filter(e => isToday(e.date)), 
        [allEvents]
    );
    
    const weekEvents = React.useMemo(() => {
        const weekStart = startOfWeek(new Date(), { locale: ptBR });
        const weekEnd = endOfWeek(new Date(), { locale: ptBR });
        return allEvents.filter(e => e.date >= weekStart && e.date <= weekEnd);
    }, [allEvents]);
    
    const monthEvents = React.useMemo(() => 
        allEvents.filter(e => isSameMonth(e.date, new Date())), 
        [allEvents]
    );
    
    // Track double-click for event details
    const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
    const [clickCount, setClickCount] = useState(0);

    const handleEventClick = (event: AgendaEvent) => {
        setClickCount(prev => prev + 1);
        
        if (clickTimeout) {
            clearTimeout(clickTimeout);
        }
        
        const timeout = setTimeout(() => {
            if (clickCount === 0) {
                // Single click - original behavior
                if (event.type === 'reservation') {
                    setReservaSelecionada(event.details as Reservation);
                    setShowReservationDialog(true);
                } else {
                    setSelectedVisit(event.details as VisitAppointment);
                }
            } else {
                // Double click - show event details modal
                setSelectedEvent(event);
                setShowEventDetailsModal(true);
            }
            setClickCount(0);
        }, 250);
        
        setClickTimeout(timeout);
    };
    
    const handleNavigate = (direction: 'prev' | 'next') => {
        switch (viewMode) {
            case 'day':
                setCurrentDate(direction === 'next' 
                    ? addDays(currentDate, 1) 
                    : addDays(currentDate, -1)
                );
                break;
            case 'week':
                setCurrentDate(direction === 'next'
                    ? addWeeks(currentDate, 1)
                    : subWeeks(currentDate, 1)
                );
                break;
            case 'month':
                setCurrentDate(direction === 'next'
                    ? addMonths(currentDate, 1)
                    : subMonths(currentDate, 1)
                );
                break;
        }
    };
    
    const getDateRangeText = () => {
        switch (viewMode) {
            case 'day':
                return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
            case 'week':
                const weekStart = startOfWeek(currentDate, { locale: ptBR });
                const weekEnd = endOfWeek(currentDate, { locale: ptBR });
                if (isSameMonth(weekStart, weekEnd)) {
                    return `${format(weekStart, 'd')} - ${format(weekEnd, "d 'de' MMMM", { locale: ptBR })}`;
                } else {
                    return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`;
                }
            case 'month':
                return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
            default:
                return '';
        }
    };
    
    const renderCalendarView = () => {
        const events = getFilteredEvents();
        
        switch (viewMode) {
            case 'day':
                return (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            {events.length} evento(s) para hoje
                        </Typography>
                        <Stack spacing={3}>
                            {events.map(event => (
                                <Card 
                                    key={event.id}
                                    sx={{ 
                                        bgcolor: 'background.paper',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderLeft: '4px solid',
                                        borderLeftColor: `${event.statusColor}.main`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: 1,
                                        '&:hover': {
                                            boxShadow: 2,
                                            borderColor: `${event.statusColor}.main`
                                        }
                                    }}
                                    onClick={() => handleEventClick(event)}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar sx={{ 
                                                bgcolor: `${event.statusColor}.main`,
                                                width: 40,
                                                height: 40
                                            }}>
                                                {event.icon}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                                    {event.title}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {event.subtitle}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {getEventTimeRange(event)} • {event.type === 'reservation' ? 'Reserva' : 'Evento'}
                                                </Typography>
                                            </Box>
                                            <Chip 
                                                label={event.status}
                                                variant="outlined"
                                                size="small"
                                                sx={{
                                                    borderColor: `${event.statusColor}.main`,
                                                    color: `${event.statusColor}.main`,
                                                    bgcolor: `${event.statusColor}.50`
                                                }}
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                            {events.length === 0 && (
                                <Box sx={{ 
                                    textAlign: 'center', 
                                    py: 6, 
                                    bgcolor: 'background.default',
                                    borderRadius: 2,
                                    border: '1px dashed',
                                    borderColor: 'divider'
                                }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Nenhum evento agendado para este dia
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Clique nos botões acima para criar uma nova reserva ou evento
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                );
                
            case 'week':
                const weekDays = eachDayOfInterval({
                    start: startOfWeek(currentDate, { locale: ptBR }),
                    end: endOfWeek(currentDate, { locale: ptBR })
                });
                
                return (
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        {weekDays.map(day => {
                            const dayEvents = events.filter(e => isSameDay(e.date, day));
                            const isToday = isSameDay(day, new Date());
                            
                            return (
                                <Grid item xs={12} sm={6} md={12/7} key={day.toISOString()}>
                                    <Paper 
                                        sx={{ 
                                            p: 2,
                                            minHeight: 220,
                                            bgcolor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: isToday ? 'primary.main' : 'divider',
                                            borderWidth: isToday ? '2px' : '1px',
                                            borderTop: isToday ? '4px solid' : '1px solid',
                                            borderTopColor: isToday ? 'primary.main' : 'divider',
                                            boxShadow: isToday ? 2 : 1,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Typography 
                                            variant="subtitle2" 
                                            fontWeight={600}
                                            color="text.secondary"
                                            sx={{ mb: 0.5, textTransform: 'capitalize' }}
                                        >
                                            {format(day, 'EEE', { locale: ptBR })}
                                        </Typography>
                                        <Typography 
                                            variant="h5" 
                                            fontWeight={isToday ? 700 : 500}
                                            color={isToday ? 'primary.main' : 'text.primary'}
                                            sx={{ mb: 2 }}
                                        >
                                            {format(day, 'd')}
                                        </Typography>
                                        
                                        <Stack spacing={1}>
                                            {dayEvents.slice(0, 4).map(event => (
                                                <Box
                                                    key={event.id}
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: 1,
                                                        bgcolor: 'background.default',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        borderLeft: '3px solid',
                                                        borderLeftColor: `${event.statusColor}.main`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            borderColor: `${event.statusColor}.main`,
                                                            bgcolor: `${event.statusColor}.50`,
                                                            transform: 'translateX(2px)'
                                                        }
                                                    }}
                                                    onClick={() => handleEventClick(event)}
                                                >
                                                    <Typography variant="caption" fontWeight={600} color={`${event.statusColor}.main`}>
                                                        {getEventTimeRange(event)}
                                                    </Typography>
                                                    <Typography variant="caption" display="block" noWrap fontWeight={500}>
                                                        {event.title}
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {dayEvents.length > 4 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 0.5 }}>
                                                    +{dayEvents.length - 4} mais evento(s)
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                );
                
            case 'month':
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const calendarStart = startOfWeek(monthStart, { locale: ptBR });
                const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
                const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                
                return (
                    <Box sx={{ mt: 3 }}>
                        <Grid container>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <Grid item xs={12/7} key={day}>
                                    <Typography 
                                        variant="subtitle2" 
                                        fontWeight={600}
                                        align="center"
                                        sx={{ py: 1 }}
                                    >
                                        {day}
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                        <Grid container>
                            {calendarDays.map(day => {
                                const dayEvents = events.filter(e => isSameDay(e.date, day));
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const isToday = isSameDay(day, new Date());
                                
                                return (
                                    <Grid item xs={12/7} key={day.toISOString()}>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                minHeight: 100,
                                                p: 1,
                                                m: 0.5,
                                                opacity: isCurrentMonth ? 1 : 0.5,
                                                bgcolor: isToday ? 'primary.50' : 'background.paper',
                                                borderColor: isToday ? 'primary.main' : 'divider',
                                                borderWidth: isToday ? 2 : 1,
                                            }}
                                        >
                                            <Typography 
                                                variant="body2" 
                                                fontWeight={isToday ? 700 : 400}
                                                color={isToday ? 'primary.main' : 'text.primary'}
                                            >
                                                {format(day, 'd')}
                                            </Typography>
                                            
                                            {dayEvents.slice(0, 2).map(event => (
                                                <Chip
                                                    key={event.id}
                                                    label={event.title}
                                                    size="small"
                                                    color={event.statusColor as any}
                                                    sx={{ 
                                                        mt: 0.5,
                                                        width: '100%',
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => handleEventClick(event)}
                                                />
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <Typography 
                                                    variant="caption" 
                                                    color="text.secondary"
                                                    sx={{ display: 'block', mt: 0.5 }}
                                                >
                                                    +{dayEvents.length - 2}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                );
        }
    };
    
    if (loadingReservations || loadingVisits) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }
    
    return (
        <Box sx={{ width: '100%', ...scrollbarStyles.light }}>
            <DashboardBreadcrumb 
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Agenda' }
                ]} 
            />
            
            {/* Header Clean e Profissional */}
            <Box sx={{ 
                mb: 4,
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" fontWeight={600} gutterBottom color="text.primary">
                            Agenda
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Gerencie reservas e eventos em um só lugar
                        </Typography>
                    </Box>
                    
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={() => {
                                logger.info('🔄 [Agenda] Refresh manual');
                                allVisitsHook.refetch();
                            }}
                            sx={{
                                borderColor: 'divider',
                                color: 'text.secondary',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'action.hover'
                                }
                            }}
                        >
                            Atualizar
                        </Button>
                        
                        <Button
                            variant="contained"
                            startIcon={<DirectionsCar />}
                            onClick={() => setShowVisitDialog(true)}
                            sx={{
                                bgcolor: 'primary.main',
                                boxShadow: 1,
                                '&:hover': {
                                    boxShadow: 2
                                }
                            }}
                        >
                            Novo Evento
                        </Button>
                    </Stack>
                </Stack>
            </Box>
            
            {/* Cards de estatísticas clean */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                        '&:hover': {
                            boxShadow: 2,
                            borderColor: 'primary.main'
                        },
                        transition: 'all 0.2s ease'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={600} color="primary.main">
                                        {todayEvents.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Eventos Hoje
                                    </Typography>
                                </Box>
                                <CalendarToday sx={{ fontSize: 32, color: 'primary.main', opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                        '&:hover': {
                            boxShadow: 2,
                            borderColor: 'secondary.main'
                        },
                        transition: 'all 0.2s ease'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={600} color="secondary.main">
                                        {weekEvents.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Esta Semana
                                    </Typography>
                                </Box>
                                <ViewWeek sx={{ fontSize: 32, color: 'secondary.main', opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                        '&:hover': {
                            boxShadow: 2,
                            borderColor: 'info.main'
                        },
                        transition: 'all 0.2s ease'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={600} color="info.main">
                                        {monthEvents.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Este Mês
                                    </Typography>
                                </Box>
                                <CalendarMonth sx={{ fontSize: 32, color: 'info.main', opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                        '&:hover': {
                            boxShadow: 2,
                            borderColor: 'success.main'
                        },
                        transition: 'all 0.2s ease'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={600} color="success.main">
                                        {allEvents.filter(e => e.type === 'visit').length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Eventos
                                    </Typography>
                                </Box>
                                <DirectionsCar sx={{ fontSize: 32, color: 'success.main', opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            
            {/* Controles de visualização clean */}
            <Paper sx={{ 
                p: 3, 
                mb: 3, 
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton 
                            onClick={() => handleNavigate('prev')}
                            sx={{
                                bgcolor: 'action.hover',
                                '&:hover': {
                                    bgcolor: 'action.selected'
                                }
                            }}
                        >
                            <NavigateBefore />
                        </IconButton>
                        
                        <Typography variant="h6" fontWeight={500} sx={{ minWidth: 250, textAlign: 'center' }}>
                            {getDateRangeText()}
                        </Typography>
                        
                        <IconButton 
                            onClick={() => handleNavigate('next')}
                            sx={{
                                bgcolor: 'action.hover',
                                '&:hover': {
                                    bgcolor: 'action.selected'
                                }
                            }}
                        >
                            <NavigateNext />
                        </IconButton>
                        
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setCurrentDate(new Date())}
                            sx={{ 
                                ml: 2,
                                borderColor: 'divider',
                                color: 'text.primary',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main'
                                }
                            }}
                        >
                            Hoje
                        </Button>
                    </Stack>
                    
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, newMode) => newMode && setViewMode(newMode)}
                        size="small"
                        sx={{
                            '& .MuiToggleButton-root': {
                                border: '1px solid',
                                borderColor: 'divider',
                                color: 'text.secondary',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    borderColor: 'primary.main'
                                },
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    borderColor: 'primary.main',
                                    '&:hover': {
                                        bgcolor: 'primary.dark'
                                    }
                                }
                            }
                        }}
                    >
                        <ToggleButton value="day">
                            <ViewDay sx={{ mr: 1 }} />
                            Dia
                        </ToggleButton>
                        <ToggleButton value="week">
                            <ViewWeek sx={{ mr: 1 }} />
                            Semana
                        </ToggleButton>
                        <ToggleButton value="month">
                            <CalendarMonth sx={{ mr: 1 }} />
                            Mês
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </Paper>
            
            {/* Área de calendário clean */}
            <Paper sx={{ 
                p: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1
            }}>
                {renderCalendarView()}
            </Paper>
            
            
            {/* Diálogos */}
            <EventoModal
                open={showEventoModal}
                onClose={() => setShowEventoModal(false)}
                reservaSelecionada={reservaSelecionada}
            />
            
            <CreateVisitDialog
                open={showVisitDialog}
                onClose={() => {
                    logger.info('🔄 [Agenda] Fechando dialog de visita');
                    setShowVisitDialog(false);
                }}
                onSuccess={async () => {
                    setShowVisitDialog(false);
                    // ✅ CORREÇÃO: Usar refetch do hook para recarregar visitas
                    logger.info('✅ [Agenda] Visita criada, atualizando lista');
                    
                    // Aguardar um momento antes de fazer refetch para garantir que o Firebase sincronizou
                    setTimeout(() => {
                        allVisitsHook.refetch();
                    }, 1000);
                }}
            />
            
            {reservaSelecionada && (
                <ViewReservationDialog
                    open={showReservationDialog}
                    onClose={() => {
                        setShowReservationDialog(false);
                        setReservaSelecionada(null);
                    }}
                    reservation={reservaSelecionada}
                />
            )}

            <EventDetailsModal
                open={showEventDetailsModal}
                onClose={() => {
                    setShowEventDetailsModal(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent}
            />
        </Box>
    );
}