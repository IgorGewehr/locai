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
    Skeleton,
    Chip,
    IconButton,
    useTheme,
    useMediaQuery,
    Paper,
    Stack,
    Avatar,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    CalendarToday,
    Refresh,
    NavigateBefore,
    NavigateNext,
    CalendarMonth,
    ViewDay,
    ViewWeek,
    DirectionsCar,
    EventAvailable,
} from '@mui/icons-material';
import { useVisits, useTodayVisits, useUpcomingVisits } from '@/lib/firebase/hooks/useVisits';
import { VisitAppointment, VISIT_STATUS_LABELS, VisitStatus } from '@/lib/types/visit-appointment';
import CreateVisitDialog from '@/components/organisms/agenda/CreateVisitDialog';
import EventDetailsModal from '@/components/organisms/agenda/EventDetailsModal';
import { format, isToday, isSameDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, subMonths, addMonths, subWeeks, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';

// === Paleta dark + vermelho (AlugaZap) ===
const C = {
    bg: '#0b0f1a',
    panel: '#111827',
    panelAlt: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    borderHover: 'rgba(220,38,38,0.5)',
    text: '#f1f5f9',
    textDim: 'rgba(255,255,255,0.5)',
    red: '#dc2626',
    redHover: '#b91c1c',
    redLight: '#ef4444',
    redLighter: '#f87171',
    redSoft: 'rgba(220,38,38,0.12)',
    skeleton: 'rgba(255,255,255,0.06)',
};

// Cores de status das visitas (sem azul/indigo/roxo)
const VISIT_STATUS_COLORS: Record<string, string> = {
    [VisitStatus.SCHEDULED]: '#f59e0b',          // âmbar - agendada
    [VisitStatus.CONFIRMED]: '#10b981',          // verde - confirmada
    [VisitStatus.IN_PROGRESS]: C.redLight,       // vermelho claro - em andamento
    [VisitStatus.COMPLETED]: '#34d399',          // verde claro - concluída
    [VisitStatus.CANCELLED_BY_CLIENT]: C.red,    // vermelho - cancelada
    [VisitStatus.CANCELLED_BY_AGENT]: C.red,     // vermelho - cancelada
    [VisitStatus.NO_SHOW]: C.textDim,            // cinza - não compareceu
    [VisitStatus.RESCHEDULED]: '#fbbf24',        // âmbar claro - reagendada
};

const getVisitStatusColor = (status: VisitStatus | string): string =>
    VISIT_STATUS_COLORS[status] || C.textDim;

const getVisitStatusLabel = (status: VisitStatus | string): string =>
    VISIT_STATUS_LABELS[status as VisitStatus] || String(status);

// Evento da agenda (visita / compromisso)
interface AgendaEvent {
    id: string;
    title: string;
    subtitle?: string;
    date: Date;
    status: string;
    statusColor: string;
    details: VisitAppointment;
}

const getEventEndTime = (startDate: Date, duration: number): Date =>
    new Date(startDate.getTime() + duration * 60000);

const getEventTimeRange = (event: AgendaEvent): string => {
    const startTime = format(event.date, 'HH:mm');
    const duration = event.details.duration || 60;
    const endTime = format(getEventEndTime(event.date, duration), 'HH:mm');
    return `${startTime} - ${endTime}`;
};

// Skeleton elegante (dark) imitando o layout do calendário
function AgendaSkeleton() {
    const sk = { bgcolor: C.skeleton } as const;
    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ mb: 4, p: 3, bgcolor: C.panel, borderRadius: '14px', border: `1px solid ${C.border}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Skeleton variant="rounded" animation="wave" width={180} height={34} sx={{ ...sk, mb: 1 }} />
                        <Skeleton variant="rounded" animation="wave" width={260} height={18} sx={sk} />
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <Skeleton variant="rounded" animation="wave" width={120} height={40} sx={sk} />
                        <Skeleton variant="rounded" animation="wave" width={150} height={40} sx={sk} />
                    </Stack>
                </Stack>
            </Box>

            {/* Cards de estatísticas */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Skeleton variant="rounded" animation="wave" height={110} sx={{ ...sk, borderRadius: '14px' }} />
                    </Grid>
                ))}
            </Grid>

            {/* Barra de controles */}
            <Skeleton variant="rounded" animation="wave" height={72} sx={{ ...sk, borderRadius: '14px', mb: 3 }} />

            {/* Grade do calendário (semana) */}
            <Paper sx={{ p: 3, bgcolor: C.panel, border: `1px solid ${C.border}`, borderRadius: '14px', boxShadow: 'none' }}>
                <Grid container spacing={2}>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <Grid item xs={12} sm={6} md={12 / 7} key={i}>
                            <Skeleton variant="rounded" animation="wave" height={220} sx={{ ...sk, borderRadius: '12px' }} />
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Box>
    );
}

export default function UnifiedAgendaPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estados principais
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
    const [showVisitDialog, setShowVisitDialog] = useState(false);
    const [allVisits, setAllVisits] = useState<VisitAppointment[]>([]);
    const [loadingVisits, setLoadingVisits] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
    const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);

    // Hooks de dados (somente visitas/compromissos)
    const todayVisits = useTodayVisits();
    const upcomingVisits = useUpcomingVisits(7);
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
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Converter visitas em eventos da agenda
    const getAllEvents = (): AgendaEvent[] => {
        const events: AgendaEvent[] = [];

        if (allVisits && Array.isArray(allVisits)) {
            allVisits.forEach(visit => {
                const visitDate = visit.scheduledDate
                    ? (typeof visit.scheduledDate === 'string'
                        ? parseISO(visit.scheduledDate)
                        : visit.scheduledDate instanceof Date
                            ? visit.scheduledDate
                            : new Date(visit.scheduledDate))
                    : new Date();

                const status = visit.status || VisitStatus.SCHEDULED;
                events.push({
                    id: visit.id,
                    title: visit.clientName,
                    subtitle: visit.propertyAddress || visit.propertyName,
                    date: visitDate,
                    status,
                    statusColor: getVisitStatusColor(status),
                    details: visit
                });
            });
        }

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    // Filtrar eventos por período
    const getFilteredEvents = () => {
        switch (viewMode) {
            case 'day':
                return allEvents.filter(event => isSameDay(event.date, currentDate));
            case 'week': {
                const weekStart = startOfWeek(currentDate, { locale: ptBR });
                const weekEnd = endOfWeek(currentDate, { locale: ptBR });
                return allEvents.filter(event => event.date >= weekStart && event.date <= weekEnd);
            }
            case 'month':
                return allEvents.filter(event => isSameMonth(event.date, currentDate));
            default:
                return allEvents;
        }
    };

    // Eventos (calculados apenas quando os dados estão carregados)
    const allEvents = React.useMemo(() => {
        if (loadingVisits) return [];
        return getAllEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allVisits, loadingVisits]);

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

    // Clique simples = detalhes; clique duplo = detalhes (unificado)
    const handleEventClick = (event: AgendaEvent) => {
        setSelectedEvent(event);
        setShowEventDetailsModal(true);
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        switch (viewMode) {
            case 'day':
                setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1));
                break;
            case 'week':
                setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
                break;
            case 'month':
                setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
                break;
        }
    };

    const getDateRangeText = () => {
        switch (viewMode) {
            case 'day':
                return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
            case 'week': {
                const weekStart = startOfWeek(currentDate, { locale: ptBR });
                const weekEnd = endOfWeek(currentDate, { locale: ptBR });
                if (isSameMonth(weekStart, weekEnd)) {
                    return `${format(weekStart, 'd')} - ${format(weekEnd, "d 'de' MMMM", { locale: ptBR })}`;
                }
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
                        <Typography variant="h6" sx={{ mb: 2, color: C.text }}>
                            {events.length} compromisso(s) para este dia
                        </Typography>
                        <Stack spacing={2}>
                            {events.map(event => (
                                <Card
                                    key={event.id}
                                    sx={{
                                        bgcolor: C.panelAlt,
                                        border: `1px solid ${C.border}`,
                                        borderLeft: `4px solid ${event.statusColor}`,
                                        borderRadius: '12px',
                                        boxShadow: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            borderColor: C.borderHover,
                                            bgcolor: 'rgba(255,255,255,0.05)'
                                        }
                                    }}
                                    onClick={() => handleEventClick(event)}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar sx={{ bgcolor: C.redSoft, color: C.redLight, width: 40, height: 40 }}>
                                                <DirectionsCar />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: C.text }}>
                                                    {event.title}
                                                </Typography>
                                                <Typography variant="body2" gutterBottom sx={{ color: C.textDim }}>
                                                    {event.subtitle}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: C.textDim }}>
                                                    {getEventTimeRange(event)} • Visita
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={getVisitStatusLabel(event.status)}
                                                variant="outlined"
                                                size="small"
                                                sx={{
                                                    borderColor: event.statusColor,
                                                    color: event.statusColor,
                                                    bgcolor: 'transparent'
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
                                    bgcolor: C.panelAlt,
                                    borderRadius: '12px',
                                    border: `1px dashed ${C.border}`
                                }}>
                                    <Typography variant="body2" sx={{ color: C.textDim }} gutterBottom>
                                        Nenhuma visita agendada para este dia
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: C.textDim }}>
                                        Use o botão acima para agendar uma nova visita
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                );

            case 'week': {
                const weekDays = eachDayOfInterval({
                    start: startOfWeek(currentDate, { locale: ptBR }),
                    end: endOfWeek(currentDate, { locale: ptBR })
                });

                return (
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        {weekDays.map(day => {
                            const dayEvents = events.filter(e => isSameDay(e.date, day));
                            const dayIsToday = isSameDay(day, new Date());

                            return (
                                <Grid item xs={12} sm={6} md={12 / 7} key={day.toISOString()}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            minHeight: 220,
                                            bgcolor: C.panelAlt,
                                            border: `1px solid ${dayIsToday ? C.red : C.border}`,
                                            borderTop: `4px solid ${dayIsToday ? C.red : C.border}`,
                                            borderRadius: '12px',
                                            boxShadow: 'none',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={600}
                                            sx={{ mb: 0.5, textTransform: 'capitalize', color: C.textDim }}
                                        >
                                            {format(day, 'EEE', { locale: ptBR })}
                                        </Typography>
                                        <Typography
                                            variant="h5"
                                            fontWeight={dayIsToday ? 700 : 500}
                                            sx={{ mb: 2, color: dayIsToday ? C.redLight : C.text }}
                                        >
                                            {format(day, 'd')}
                                        </Typography>

                                        <Stack spacing={1}>
                                            {dayEvents.slice(0, 4).map(event => (
                                                <Box
                                                    key={event.id}
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: '10px',
                                                        bgcolor: 'rgba(255,255,255,0.03)',
                                                        border: `1px solid ${C.border}`,
                                                        borderLeft: `3px solid ${event.statusColor}`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            borderColor: C.borderHover,
                                                            bgcolor: C.redSoft,
                                                            transform: 'translateX(2px)'
                                                        }
                                                    }}
                                                    onClick={() => handleEventClick(event)}
                                                >
                                                    <Typography variant="caption" fontWeight={600} sx={{ color: event.statusColor }}>
                                                        {getEventTimeRange(event)}
                                                    </Typography>
                                                    <Typography variant="caption" display="block" noWrap fontWeight={500} sx={{ color: C.text }}>
                                                        {event.title}
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {dayEvents.length > 4 && (
                                                <Typography variant="caption" sx={{ textAlign: 'center', py: 0.5, color: C.textDim }}>
                                                    +{dayEvents.length - 4} mais
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                );
            }

            case 'month': {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const calendarStart = startOfWeek(monthStart, { locale: ptBR });
                const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
                const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

                return (
                    <Box sx={{ mt: 3 }}>
                        <Grid container>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <Grid item xs={12 / 7} key={day}>
                                    <Typography variant="subtitle2" fontWeight={600} align="center" sx={{ py: 1, color: C.textDim }}>
                                        {day}
                                    </Typography>
                                </Grid>
                            ))}
                        </Grid>
                        <Grid container>
                            {calendarDays.map(day => {
                                const dayEvents = events.filter(e => isSameDay(e.date, day));
                                const isCurrentMonth = isSameMonth(day, currentDate);
                                const dayIsToday = isSameDay(day, new Date());

                                return (
                                    <Grid item xs={12 / 7} key={day.toISOString()}>
                                        <Paper
                                            sx={{
                                                minHeight: 100,
                                                p: 1,
                                                m: 0.5,
                                                opacity: isCurrentMonth ? 1 : 0.4,
                                                bgcolor: dayIsToday ? C.redSoft : C.panelAlt,
                                                border: `1px solid ${dayIsToday ? C.red : C.border}`,
                                                borderRadius: '10px',
                                                boxShadow: 'none'
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                fontWeight={dayIsToday ? 700 : 400}
                                                sx={{ color: dayIsToday ? C.redLight : C.text }}
                                            >
                                                {format(day, 'd')}
                                            </Typography>

                                            {dayEvents.slice(0, 2).map(event => (
                                                <Box
                                                    key={event.id}
                                                    onClick={() => handleEventClick(event)}
                                                    sx={{
                                                        mt: 0.5,
                                                        px: 0.75,
                                                        py: 0.25,
                                                        borderRadius: '6px',
                                                        bgcolor: 'rgba(255,255,255,0.04)',
                                                        borderLeft: `3px solid ${event.statusColor}`,
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        '&:hover': { bgcolor: C.redSoft }
                                                    }}
                                                >
                                                    <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem', color: C.text }}>
                                                        {event.title}
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: C.textDim }}>
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
        }
    };

    if (loadingVisits) {
        return (
            <Box sx={{ width: '100%', ...scrollbarStyles.light }}>
                <DashboardBreadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Agenda' }]} />
                <AgendaSkeleton />
            </Box>
        );
    }

    // Estilo dos cards de estatística
    const statCardSx = (accent: string) => ({
        bgcolor: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        '&:hover': { borderColor: accent }
    });

    return (
        <Box sx={{ width: '100%', ...scrollbarStyles.light }}>
            <DashboardBreadcrumb
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Agenda' }
                ]}
            />

            {/* Header */}
            <Box sx={{
                mb: 4,
                p: 3,
                bgcolor: C.panel,
                borderRadius: '14px',
                border: `1px solid ${C.border}`
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: C.text }}>
                            Agenda
                        </Typography>
                        <Typography variant="body1" sx={{ color: C.textDim }}>
                            Visitas e compromissos da AlugaZap em um só lugar
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
                                borderColor: C.border,
                                color: C.textDim,
                                borderRadius: '12px',
                                textTransform: 'none',
                                '&:hover': { borderColor: C.red, bgcolor: C.redSoft, color: C.text }
                            }}
                        >
                            Atualizar
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<DirectionsCar />}
                            onClick={() => setShowVisitDialog(true)}
                            sx={{
                                bgcolor: C.red,
                                borderRadius: '12px',
                                textTransform: 'none',
                                boxShadow: 'none',
                                '&:hover': { bgcolor: C.redHover, boxShadow: 'none' }
                            }}
                        >
                            Nova Visita
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {/* Cards de estatísticas */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={statCardSx(C.red)}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: C.redLight }}>
                                        {todayEvents.length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: C.textDim }}>
                                        Visitas Hoje
                                    </Typography>
                                </Box>
                                <CalendarToday sx={{ fontSize: 32, color: C.redLight, opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={statCardSx(C.red)}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: C.text }}>
                                        {weekEvents.length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: C.textDim }}>
                                        Esta Semana
                                    </Typography>
                                </Box>
                                <ViewWeek sx={{ fontSize: 32, color: C.textDim, opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={statCardSx(C.red)}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: C.text }}>
                                        {monthEvents.length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: C.textDim }}>
                                        Este Mês
                                    </Typography>
                                </Box>
                                <CalendarMonth sx={{ fontSize: 32, color: C.textDim, opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={statCardSx(C.red)}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="h4" fontWeight={700} sx={{ color: C.text }}>
                                        {allEvents.length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: C.textDim }}>
                                        Total de Visitas
                                    </Typography>
                                </Box>
                                <EventAvailable sx={{ fontSize: 32, color: C.textDim, opacity: 0.7 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Controles de visualização */}
            <Paper sx={{
                p: 3,
                mb: 3,
                bgcolor: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: '14px',
                boxShadow: 'none'
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton
                            onClick={() => handleNavigate('prev')}
                            sx={{ color: C.text, bgcolor: 'rgba(255,255,255,0.04)', '&:hover': { bgcolor: C.redSoft } }}
                        >
                            <NavigateBefore />
                        </IconButton>

                        <Typography variant="h6" fontWeight={500} sx={{ minWidth: 250, textAlign: 'center', color: C.text, textTransform: 'capitalize' }}>
                            {getDateRangeText()}
                        </Typography>

                        <IconButton
                            onClick={() => handleNavigate('next')}
                            sx={{ color: C.text, bgcolor: 'rgba(255,255,255,0.04)', '&:hover': { bgcolor: C.redSoft } }}
                        >
                            <NavigateNext />
                        </IconButton>

                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setCurrentDate(new Date())}
                            sx={{
                                ml: 2,
                                borderColor: C.border,
                                color: C.text,
                                borderRadius: '10px',
                                textTransform: 'none',
                                '&:hover': { bgcolor: C.redSoft, borderColor: C.red }
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
                                border: `1px solid ${C.border}`,
                                color: C.textDim,
                                textTransform: 'none',
                                '&:hover': { bgcolor: C.redSoft, borderColor: C.red },
                                '&.Mui-selected': {
                                    bgcolor: C.red,
                                    color: '#ffffff',
                                    borderColor: C.red,
                                    '&:hover': { bgcolor: C.redHover }
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

            {/* Área do calendário */}
            <Paper sx={{
                p: 3,
                bgcolor: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: '14px',
                boxShadow: 'none'
            }}>
                {renderCalendarView()}
            </Paper>

            {/* Diálogos */}
            <CreateVisitDialog
                open={showVisitDialog}
                onClose={() => {
                    logger.info('🔄 [Agenda] Fechando dialog de visita');
                    setShowVisitDialog(false);
                }}
                onSuccess={async () => {
                    setShowVisitDialog(false);
                    logger.info('✅ [Agenda] Visita criada, atualizando lista');
                    setTimeout(() => {
                        allVisitsHook.refetch();
                    }, 1000);
                }}
            />

            <EventDetailsModal
                open={showEventDetailsModal}
                onClose={() => {
                    setShowEventDetailsModal(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent ? { ...selectedEvent, type: 'visit' as const } : null}
            />
        </Box>
    );
}
