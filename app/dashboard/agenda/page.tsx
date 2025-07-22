"use client";

import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Popover,
    Chip,
    Snackbar,
    Alert,
    CircularProgress,
    Avatar,
    Paper,
    Tooltip,
    useTheme,
    useMediaQuery,
    alpha,
    Drawer,
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    CalendarToday,
    AccessTime,
    Add,
    Today,
    ViewDay,
    ViewWeek,
    ViewModule,
    Menu as MenuIcon,
    Home,
    ArrowForward,
    CheckIn,
    CheckOut
} from '@mui/icons-material';
import { useReservations, useProperties, useClients } from '@/lib/firebase/hooks';
import { Reservation, ReservationStatus, RESERVATION_STATUS_LABELS } from '@/lib/types/reservation';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import EventoModal from './components/EventoModal';
import ViewReservationDialog from './components/ViewReservationDialog';
import {
    format,
    isToday,
    isSameDay,
    parseISO,
    addDays,
    subDays,
    addMonths,
    startOfMonth,
    endOfMonth,
    getDay,
    isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PeriodSelector from './components/PeriodSelector';

// Componente principal da agenda
const AgendaPage = forwardRef(({ initialReservationId }, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Estados
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeView, setActiveView] = useState('week');
    const [calendarAnchorEl, setCalendarAnchorEl] = useState(null);
    const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
    const [reservas, setReservas] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showEventoModal, setShowEventoModal] = useState(false);
    const [reservaSelecionada, setReservaSelecionada] = useState<Reservation | null>(null);
    const [notification, setNotification] = useState({ open: false, message: '', type: 'info' as 'info' | 'success' | 'error' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showReservationDialog, setShowReservationDialog] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    // Hooks do Firestore
    const { data: reservations, loading: loadingReservations } = useReservations();
    const { data: properties } = useProperties();
    const { data: clients } = useClients();

    // Constantes
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const timeSlots = useMemo(() => {
        return Array.from({ length: 24 }, (_, i) => i);
    }, []);

    // Carregar reservas
    useEffect(() => {
        if (reservations) {
            setReservas(reservations);
            setIsLoading(false);
        }
    }, [reservations]);

    // Abrir reserva específica se fornecida
    useEffect(() => {
        if (initialReservationId && reservas.length > 0) {
            const reservation = reservas.find(r => r.id === initialReservationId);
            if (reservation) {
                setSelectedReservation(reservation);
                setShowReservationDialog(true);
            }
        }
    }, [initialReservationId, reservas]);

    // Funções para manipulação de datas
    const formatDateForFirebase = (date: Date | string): string => {
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseAnyDate = (dateValue: any): Date | null => {
        if (dateValue == null) return null;
        if (dateValue instanceof Date) return dateValue;
        if (dateValue && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
        }
        if (typeof dateValue === 'string') {
            const parts = dateValue.split('-');
            if (parts.length === 3) {
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
            const parsed = new Date(dateValue);
            return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
    };

    // Criar objeto de evento padronizado para reservas
    const createReservationEvent = (reservation: Reservation, property?: Property, client?: Client) => {
        const checkInDate = parseAnyDate(reservation.checkIn);
        const checkOutDate = parseAnyDate(reservation.checkOut);
        
        if (!checkInDate || !checkOutDate) return null;

        const propertyName = property?.name || 'Propriedade não encontrada';
        const clientName = client?.name || 'Cliente não encontrado';

        return {
            id: reservation.id,
            title: `${propertyName} - ${clientName}`,
            propertyName,
            clientName,
            checkIn: formatDateForFirebase(checkInDate),
            checkOut: formatDateForFirebase(checkOutDate),
            status: reservation.status,
            guests: reservation.guests,
            totalAmount: reservation.totalAmount,
            paymentStatus: reservation.paymentStatus,
            source: reservation.source,
            specialRequests: reservation.specialRequests,
            observations: reservation.observations,
            propertyId: reservation.propertyId,
            clientId: reservation.clientId,
            checkInDateTime: checkInDate,
            checkOutDateTime: checkOutDate,
            nights: reservation.nights,
            originalReservation: reservation
        };
    };

    // Dias do mês
    const daysInMonth = useMemo(() => {
        return getMonthDays(currentDate);
    }, [currentDate]);

    const currentMonthName = useMemo(() => {
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    }, [currentDate]);

    // Navegação
    const goToToday = useCallback(() => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    }, []);

    const goToPrevious = useCallback(() => {
        const newDate = new Date(currentDate);
        if (activeView === 'day') {
            newDate.setDate(newDate.getDate() - 1);
        } else if (activeView === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else if (activeView === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
        setSelectedDate(newDate);
    }, [currentDate, activeView]);

    const goToNext = useCallback(() => {
        const newDate = new Date(currentDate);
        if (activeView === 'day') {
            newDate.setDate(newDate.getDate() + 1);
        } else if (activeView === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else if (activeView === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
        setSelectedDate(newDate);
    }, [currentDate, activeView]);

    // Encontrar reservas para data específica
    const findReservations = useCallback((day: Date, includeCheckOut = false) => {
        const dayString = formatDateForFirebase(day);

        return reservas
            .map(reservation => {
                const property = properties?.find(p => p.id === reservation.propertyId);
                const client = clients?.find(c => c.id === reservation.clientId);
                return createReservationEvent(reservation, property, client);
            })
            .filter(event => {
                if (!event) return false;
                
                // Para check-in: reservas que iniciam neste dia
                const isCheckIn = event.checkIn === dayString;
                // Para check-out: reservas que terminam neste dia
                const isCheckOut = event.checkOut === dayString;
                // Para estadias: reservas que estão ativas neste dia
                const checkInDate = new Date(event.checkIn + 'T00:00:00');
                const checkOutDate = new Date(event.checkOut + 'T00:00:00');
                const currentDayDate = new Date(dayString + 'T00:00:00');
                const isStaying = currentDayDate >= checkInDate && currentDayDate < checkOutDate;
                
                return isCheckIn || (includeCheckOut && isCheckOut) || isStaying;
            });
    }, [reservas, properties, clients]);

    // Handlers de eventos
    const changeView = useCallback((newView: string) => {
        setActiveView(newView);
    }, []);

    const selectDay = useCallback((day: Date) => {
        setSelectedDate(day);
        if (activeView === 'month') {
            setActiveView('day');
        }
    }, [activeView]);

    const handleEventClick = useCallback((event: any) => {
        setSelectedReservation(event.originalReservation);
        setShowReservationDialog(true);
    }, []);

    const handleCreateReservation = useCallback(() => {
        setReservaSelecionada(null);
        setShowEventoModal(true);
        setIsLoading(false);
    }, []);

    const handleCloseReservationModal = useCallback(() => {
        setShowEventoModal(false);
        setReservaSelecionada(null);
        setIsLoading(false);
    }, []);

    const handleSaveReservation = useCallback(async (reservationData: any) => {
        try {
            // Implementar salvamento da reserva
            console.log('Salvando reserva:', reservationData);
            setShowEventoModal(false);
            setReservaSelecionada(null);
            setIsLoading(false);
            
            setNotification({
                open: true,
                message: "Reserva salva com sucesso!",
                type: 'success'
            });
        } catch (error) {
            console.error("Erro ao salvar reserva:", error);
            setNotification({
                open: true,
                message: "Erro ao salvar reserva. Tente novamente.",
                type: 'error'
            });
            setIsLoading(false);
            throw error;
        }
    }, []);

    const handleEditFromDialog = (reservation: Reservation) => {
        setShowReservationDialog(false);
        setReservaSelecionada(reservation);
        setShowEventoModal(true);
    };

    const handleStatusChange = async (reservationId: string, newStatus: ReservationStatus) => {
        try {
            setIsLoading(true);
            // Implementar mudança de status
            console.log(`Alterando status da reserva ${reservationId} para ${newStatus}`);
            
            setNotification({
                open: true,
                message: `Status da reserva alterado para "${RESERVATION_STATUS_LABELS[newStatus]}"`,
                type: 'success'
            });
            
            setShowReservationDialog(false);
        } catch (error) {
            console.error("Erro ao alterar status da reserva:", error);
            setNotification({
                open: true,
                message: "Erro ao alterar status. Tente novamente.",
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Funções auxiliares
    function getWeekDays(date: Date) {
        const firstDay = new Date(date);
        const day = firstDay.getDay();
        firstDay.setDate(firstDay.getDate() - day);

        return Array(7).fill(null).map((_, i) => {
            const day = new Date(firstDay);
            day.setDate(firstDay.getDate() + i);
            return day;
        });
    }

    function getMonthDays(date: Date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = getDay(firstDay);
        const days = [];

        // Dias do mês anterior
        for (let i = 0; i < startDay; i++) {
            days.unshift(subDays(firstDay, i + 1));
        }

        // Dias do mês atual
        let currentDate = firstDay;
        while (currentDate <= lastDay) {
            days.push(currentDate);
            currentDate = addDays(currentDate, 1);
        }

        // Dias do próximo mês
        const daysAfterMonth = 6 - getDay(lastDay);
        for (let i = 1; i <= daysAfterMonth; i++) {
            days.push(addDays(lastDay, i));
        }

        return days;
    }

    // Cores por status
    const getStatusColors = (status: ReservationStatus) => {
        switch(status) {
            case ReservationStatus.CONFIRMED:
                return {
                    bg: '#E8F5E9',
                    color: '#388E3C',
                    border: '#4CAF50'
                };
            case ReservationStatus.CANCELLED:
                return {
                    bg: '#FFEBEE',
                    color: '#D32F2F',
                    border: '#F44336'
                };
            case ReservationStatus.CHECKED_IN:
                return {
                    bg: '#FFF8E1',
                    color: '#F57C00',
                    border: '#FFA000'
                };
            case ReservationStatus.CHECKED_OUT:
                return {
                    bg: '#E3F2FD',
                    color: '#1976D2',
                    border: '#2196F3'
                };
            default:
                return {
                    bg: '#F3E5F5',
                    color: '#7B1FA2',
                    border: '#9C27B0'
                };
        }
    };

    // Componente de evento
    const EventCard = ({ event, isCompact = false, onClick }: any) => {
        const colors = getStatusColors(event.status);

        return (
            <Box
                onClick={() => onClick(event)}
                sx={{
                    bgcolor: colors.bg,
                    borderLeft: `4px solid ${colors.border}`,
                    borderRadius: '8px',
                    p: isCompact ? 0.75 : 1.5,
                    mb: 1,
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)'
                    }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Home fontSize="small" sx={{ color: 'text.secondary', mr: 0.5, fontSize: '0.875rem' }} />
                        <Typography variant="caption" fontWeight={600} noWrap>
                            {event.propertyName}
                        </Typography>
                    </Box>

                    <Chip
                        label={RESERVATION_STATUS_LABELS[event.status]}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: colors.bg,
                            color: colors.color,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '10px'
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar
                        sx={{
                            width: 24,
                            height: 24,
                            fontSize: '0.75rem',
                            bgcolor: `${colors.color}20`,
                            color: colors.color
                        }}
                    >
                        {event.clientName.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" fontWeight={500} noWrap>
                        {event.clientName}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {event.guests} hóspede{event.guests !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" fontWeight={600} color={colors.color}>
                        R$ {event.totalAmount.toLocaleString('pt-BR')}
                    </Typography>
                </Box>
            </Box>
        );
    };

    // Exposer funções para o parent component
    useImperativeHandle(ref, () => ({
        openNewReservationModal: handleCreateReservation
    }));

    // Mini calendário
    const handleCalendarOpen = (event: any) => {
        setCalendarAnchorEl(event.currentTarget);
    };

    const handleCalendarClose = () => {
        setCalendarAnchorEl(null);
    };

    const isCalendarOpen = Boolean(calendarAnchorEl);

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    // Fechar notificação
    const handleCloseNotification = () => {
        setNotification(prev => ({ ...prev, open: false }));
    };

    // Mini Calendar
    const MiniCalendar = () => {
        return (
            <Box sx={{ width: 300, p: 2 }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    position: 'relative'
                }}>
                    <IconButton
                        size="small"
                        onClick={() => {
                            const newDate = new Date(miniCalendarDate);
                            newDate.setMonth(newDate.getMonth() - 1);
                            setMiniCalendarDate(newDate);
                        }}
                        sx={{ zIndex: 2 }}
                    >
                        <ChevronLeft />
                    </IconButton>

                    <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            textAlign: 'center'
                        }}
                    >
                        {format(miniCalendarDate, "MMMM yyyy", { locale: ptBR })}
                    </Typography>

                    <IconButton
                        size="small"
                        onClick={() => {
                            const newDate = new Date(miniCalendarDate);
                            newDate.setMonth(newDate.getMonth() + 1);
                            setMiniCalendarDate(newDate);
                        }}
                        sx={{ zIndex: 2 }}
                    >
                        <ChevronRight />
                    </IconButton>
                </Box>

                {/* Headers dos dias da semana */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
                    {weekdays.map((day, idx) => (
                        <Box key={idx} sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {day.charAt(0)}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Grade do calendário */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                    {getMonthDays(miniCalendarDate).map((day, idx) => {
                        const isTodayFlag = isToday(day);
                        const isSelectedFlag = isSameDay(selectedDate, day);
                        const isOutsideMonth = day.getMonth() !== miniCalendarDate.getMonth();
                        const hasReservations = findReservations(day).length > 0;

                        return (
                            <Box
                                key={idx}
                                onClick={() => {
                                    setSelectedDate(day);
                                    setCurrentDate(day);
                                    handleCalendarClose();
                                }}
                                sx={{
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    bgcolor: isSelectedFlag
                                        ? 'primary.main'
                                        : isTodayFlag
                                            ? alpha(theme.palette.primary.main, 0.1)
                                            : 'transparent',
                                    color: isSelectedFlag
                                        ? 'white'
                                        : isOutsideMonth
                                            ? 'text.disabled'
                                            : isTodayFlag
                                                ? 'primary.main'
                                                : 'text.primary',
                                    fontWeight: isTodayFlag || isSelectedFlag ? 600 : 400,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: isSelectedFlag
                                            ? 'primary.dark'
                                            : alpha(theme.palette.primary.main, 0.2)
                                    }
                                }}
                            >
                                {day.getDate()}
                                {hasReservations && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 3,
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            bgcolor: isSelectedFlag ? 'white' : 'primary.main'
                                        }}
                                    />
                                )}
                            </Box>
                        );
                    })}
                </Box>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => {
                            goToToday();
                            handleCalendarClose();
                        }}
                        sx={{
                            borderRadius: '50px',
                            textTransform: 'none',
                            fontWeight: 500
                        }}
                    >
                        Ir para hoje
                    </Button>
                </Box>
            </Box>
        );
    };

    // Próximas reservas
    const UpcomingReservations = () => {
        const today = new Date();
        const todayString = formatDateForFirebase(today);

        const upcomingReservations = reservas
            .map(reservation => {
                const property = properties?.find(p => p.id === reservation.propertyId);
                const client = clients?.find(c => c.id === reservation.clientId);
                return createReservationEvent(reservation, property, client);
            })
            .filter(event => {
                if (!event) return false;
                return event.checkIn >= todayString;
            })
            .sort((a, b) => {
                if (!a || !b) return 0;
                const dateA = new Date(a.checkIn);
                const dateB = new Date(b.checkIn);
                return dateA.getTime() - dateB.getTime();
            })
            .slice(0, 5);

        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Próximas Reservas
                </Typography>

                {upcomingReservations.length === 0 ? (
                    <Box sx={{
                        py: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: 'text.secondary'
                    }}>
                        <CalendarToday sx={{ fontSize: 40, color: alpha('#000', 0.1) }} />
                        <Typography variant="body2">
                            Sem reservas agendadas
                        </Typography>
                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<Add />}
                            onClick={handleCreateReservation}
                            sx={{ mt: 1, borderRadius: '50px', textTransform: 'none' }}
                        >
                            Nova Reserva
                        </Button>
                    </Box>
                ) : (
                    <>
                        {upcomingReservations.map((event) => {
                            if (!event) return null;
                            const eventDate = new Date(event.checkIn);
                            const isEventToday = isSameDay(eventDate, today);
                            const colors = getStatusColors(event.status);

                            return (
                                <Box
                                    key={event.id}
                                    sx={{
                                        mb: 2,
                                        p: 1.5,
                                        borderRadius: '10px',
                                        border: '1px solid #EAECEF',
                                        bgcolor: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                    onClick={() => handleEventClick(event)}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 38,
                                                    height: 38,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '8px',
                                                    bgcolor: isEventToday ? alpha(theme.palette.primary.main, 0.1) : '#F8F9FA',
                                                    border: isEventToday ? `1px solid ${theme.palette.primary.main}` : '1px solid #EAECEF'
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    color={isEventToday ? 'primary.main' : 'text.secondary'}
                                                    sx={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' }}
                                                >
                                                    {format(eventDate, 'MMM', { locale: ptBR })}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    color={isEventToday ? 'primary.main' : 'text.primary'}
                                                >
                                                    {eventDate.getDate()}
                                                </Typography>
                                            </Box>

                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {event.propertyName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {event.clientName}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Chip
                                            label={RESERVATION_STATUS_LABELS[event.status]}
                                            size="small"
                                            sx={{
                                                height: 24,
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                bgcolor: colors.bg,
                                                color: colors.color,
                                                borderRadius: '12px'
                                            }}
                                        />
                                    </Box>
                                </Box>
                            );
                        })}

                        <Button
                            variant="text"
                            endIcon={<ArrowForward />}
                            onClick={() => changeView('month')}
                            sx={{
                                width: '100%',
                                justifyContent: 'flex-end',
                                textTransform: 'none',
                                color: 'primary.main',
                                fontWeight: 500
                            }}
                        >
                            Ver todas as reservas
                        </Button>
                    </>
                )}
            </Box>
        );
    };

    // View selector
    const ViewSelector = () => {
        return (
            <Box
                sx={{
                    display: 'flex',
                    bgcolor: '#F5F7FA',
                    borderRadius: '50px',
                    border: '1px solid #CED4DA',
                    p: 0.5
                }}
            >
                <Button
                    variant="text"
                    startIcon={<ViewDay />}
                    onClick={() => changeView('day')}
                    sx={{
                        borderRadius: '50px',
                        bgcolor: activeView === 'day' ? 'white' : 'transparent',
                        color: activeView === 'day' ? 'primary.main' : 'text.secondary',
                        boxShadow: activeView === 'day' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                            bgcolor: activeView === 'day' ? 'white' : alpha(theme.palette.primary.main, 0.05)
                        }
                    }}
                >
                    Dia
                </Button>
                <Button
                    variant="text"
                    startIcon={<ViewWeek />}
                    onClick={() => changeView('week')}
                    sx={{
                        borderRadius: '50px',
                        bgcolor: activeView === 'week' ? 'white' : 'transparent',
                        color: activeView === 'week' ? 'primary.main' : 'text.secondary',
                        boxShadow: activeView === 'week' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                            bgcolor: activeView === 'week' ? 'white' : alpha(theme.palette.primary.main, 0.05)
                        }
                    }}
                >
                    Semana
                </Button>
                <Button
                    variant="text"
                    startIcon={<ViewModule />}
                    onClick={() => changeView('month')}
                    sx={{
                        borderRadius: '50px',
                        bgcolor: activeView === 'month' ? 'white' : 'transparent',
                        color: activeView === 'month' ? 'primary.main' : 'text.secondary',
                        boxShadow: activeView === 'month' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                            bgcolor: activeView === 'month' ? 'white' : alpha(theme.palette.primary.main, 0.05)
                        }
                    }}
                >
                    Mês
                </Button>
            </Box>
        );
    };

    // Render views
    const renderDayView = () => {
        const dayReservations = findReservations(selectedDate, true);
        const isTodayFlag = isToday(selectedDate);

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Box sx={{
                    p: isMobile ? 1.5 : 2,
                    borderBottom: '1px solid #EAECEF',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? 1 : 0,
                    bgcolor: 'white'
                }}>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                            {selectedDate.getFullYear() !== new Date().getFullYear() &&
                                ` de ${selectedDate.getFullYear()}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {format(selectedDate, "EEEE", { locale: ptBR })}
                        </Typography>
                    </Box>

                    {isTodayFlag && (
                        <Chip
                            label="Hoje"
                            color="primary"
                            size="small"
                            variant="outlined"
                            sx={{
                                height: 24,
                                borderRadius: '12px',
                                fontWeight: 600
                            }}
                        />
                    )}
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#F8FAFF' }}>
                    {dayReservations.length === 0 ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'text.secondary'
                        }}>
                            <CalendarToday sx={{ fontSize: 48, color: alpha('#000', 0.1), mb: 2 }} />
                            <Typography variant="body1" sx={{ mb: 1 }}>
                                Nenhuma reserva para esta data
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Add />}
                                onClick={handleCreateReservation}
                                sx={{
                                    mt: 2,
                                    borderRadius: '50px',
                                    textTransform: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            >
                                Nova Reserva
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            {dayReservations.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onClick={handleEventClick}
                                />
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    const currentWeek = useMemo(() => getWeekDays(currentDate), [currentDate]);

    const renderWeekView = () => {
        if (isMobile) {
            return (
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%', 
                    overflow: 'hidden',
                    bgcolor: '#F8FAFF'
                }}>
                    <Box sx={{ 
                        overflowY: 'auto', 
                        p: 2,
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { backgroundColor: '#ccc', borderRadius: '4px' }
                    }}>
                        {currentWeek.map((day, dayIndex) => {
                            const dayReservations = findReservations(day, true);
                            if (dayReservations.length === 0) return null;
                            
                            return (
                                <Box key={dayIndex} sx={{ mb: 3 }}>
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            mb: 2, 
                                            fontWeight: 600,
                                            color: 'text.primary',
                                            borderBottom: '2px solid',
                                            borderColor: isSameDay(day, new Date()) ? 'primary.main' : 'divider',
                                            pb: 1
                                        }}
                                    >
                                        {format(day, 'EEEE, dd/MM', { locale: ptBR })}
                                        {isSameDay(day, new Date()) && (
                                            <Chip 
                                                label="Hoje" 
                                                size="small" 
                                                color="primary" 
                                                sx={{ ml: 1, fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Typography>
                                    {dayReservations.map(event => (
                                        <Box key={event.id} sx={{ mb: 1 }}>
                                            <EventCard event={event} onClick={handleEventClick} />
                                        </Box>
                                    ))}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            );
        }

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Cabeçalho da semana */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '80px repeat(7, 1fr)',
                        bgcolor: 'white',
                        borderBottom: '1px solid #EAECEF'
                    }}
                >
                    <Box
                        sx={{
                            borderRight: '1px solid #EAECEF',
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            DATA
                        </Typography>
                    </Box>

                    {currentWeek.map((day, index) => (
                        <Box
                            key={index}
                            sx={{
                                textAlign: 'center',
                                p: 1,
                                borderRight: index < 6 ? '1px solid #EAECEF' : 'none',
                                borderBottom: `2px solid ${isToday(day) ? theme.palette.primary.main : 'transparent'}`,
                                bgcolor: isSameDay(selectedDate, day) ? alpha(theme.palette.primary.main, 0.05) : 'white',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                            onClick={() => selectDay(day)}
                        >
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 500 }}
                            >
                                {weekdays[day.getDay()]}
                            </Typography>
                            <Typography
                                variant="h6"
                                fontWeight={isToday(day) ? 700 : 500}
                                color={isToday(day) ? 'primary.main' : 'text.primary'}
                            >
                                {day.getDate()}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Conteúdo da semana */}
                <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#F8FAFF' }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRight: '1px solid #EAECEF',
                                borderBottom: '1px solid #EAECEF',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                bgcolor: 'white',
                                minHeight: '200px'
                            }}
                        >
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 500, mt: 1 }}
                            >
                                Reservas
                            </Typography>
                        </Box>

                        {currentWeek.map((day, dayIndex) => {
                            const dayReservations = findReservations(day, true);
                            return (
                                <Box
                                    key={dayIndex}
                                    sx={{
                                        p: 1,
                                        borderRight: dayIndex < 6 ? '1px solid #EAECEF' : 'none',
                                        borderBottom: '1px solid #EAECEF',
                                        minHeight: '200px',
                                        bgcolor: 'white'
                                    }}
                                >
                                    {dayReservations.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            onClick={handleEventClick}
                                            isCompact={true}
                                        />
                                    ))}
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        );
    };

    const renderMonthView = () => {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#F8FAFF' }}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    bgcolor: 'white',
                    borderBottom: '1px solid #EAECEF'
                }}>
                    {weekdays.map((day, index) => (
                        <Box
                            key={index}
                            sx={{
                                p: 1.5,
                                textAlign: 'center',
                                borderRight: index < 6 ? '1px solid #EAECEF' : 'none'
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                {day}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gridAutoRows: 'minmax(120px, 1fr)',
                    gap: 1,
                    p: 2,
                    flex: 1,
                    overflow: 'auto'
                }}>
                    {daysInMonth.map((day, index) => {
                        const dayReservations = findReservations(day, true);
                        const isTodayFlag = isToday(day);
                        const isSelectedFlag = isSameDay(selectedDate, day);
                        const isOutsideMonth = day.getMonth() !== currentDate.getMonth();

                        return (
                            <Paper
                                key={index}
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    borderRadius: '8px',
                                    border: `1px solid ${isOutsideMonth ? 'transparent' : '#EAECEF'}`,
                                    bgcolor: isSelectedFlag
                                        ? alpha(theme.palette.primary.main, 0.05)
                                        : isTodayFlag
                                            ? alpha(theme.palette.primary.main, 0.02)
                                            : 'white',
                                    opacity: isOutsideMonth ? 0.5 : 1,
                                    overflow: 'hidden',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
                                    }
                                }}
                                onClick={() => selectDay(day)}
                            >
                                <Box
                                    sx={{
                                        p: 0.5,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        borderBottom: '1px solid',
                                        borderColor: isTodayFlag ? theme.palette.primary.main : '#EAECEF',
                                        bgcolor: isTodayFlag ? alpha(theme.palette.primary.main, 0.05) : 'transparent'
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary">
                                        {weekdays[day.getDay()].slice(0, 3)}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        fontWeight={isTodayFlag ? 700 : 500}
                                        color={isTodayFlag ? 'primary.main' : 'text.primary'}
                                    >
                                        {day.getDate()}
                                    </Typography>
                                </Box>

                                <Box sx={{ p: 0.5, maxHeight: '100px', overflow: 'auto' }}>
                                    {dayReservations.length > 0 ? (
                                        dayReservations.slice(0, 2).map((event, idx) => {
                                            const colors = getStatusColors(event.status);
                                            return (
                                                <Box
                                                    key={idx}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        p: 0.5,
                                                        mb: 0.5,
                                                        borderRadius: '4px',
                                                        bgcolor: colors.bg,
                                                        fontSize: '0.7rem',
                                                        gap: 0.5,
                                                        '&:hover': {
                                                            bgcolor: `${colors.bg}CC`
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEventClick(event);
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            bgcolor: colors.border,
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                                                        {event.propertyName}
                                                    </Typography>
                                                </Box>
                                            );
                                        })
                                    ) : null}

                                    {dayReservations.length > 2 && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                textAlign: 'center',
                                                color: 'primary.main',
                                                fontWeight: 500,
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            +{dayReservations.length - 2} mais
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>
                        );
                    })}
                </Box>
            </Box>
        );
    };

    const renderActiveView = () => {
        if (isLoading || loadingReservations) {
            return (
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    bgcolor: '#F8FAFF'
                }}>
                    <CircularProgress />
                </Box>
            );
        }

        switch (activeView) {
            case 'day':
                return renderDayView();
            case 'week':
                return renderWeekView();
            case 'month':
                return renderMonthView();
            default:
                return renderWeekView();
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant={isMobile ? "temporary" : "persistent"}
                open={sidebarOpen}
                onClose={toggleSidebar}
                sx={{
                    width: sidebarOpen ? 280 : 0,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 280,
                        boxSizing: 'border-box',
                        borderRight: '1px solid #EAECEF',
                        boxShadow: 'none',
                        transition: 'width 0.3s ease, transform 0.5s ease',
                        overflowX: 'hidden',
                        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
                    },
                }}
            >
                <Box
                    sx={{
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        borderBottom: '1px solid #EAECEF'
                    }}
                >
                    <Typography variant="h6" fontWeight={600} sx={{ ml: 2 }}>
                        Agenda de Reservas
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    <IconButton
                        onClick={toggleSidebar}
                        sx={{
                            p: 0.5,
                            borderRadius: '50%',
                            border: '1.522px solid rgba(0, 0, 0, 0.20)',
                            backgroundColor: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.05)'
                            }
                        }}
                    >
                        <ChevronLeft />
                    </IconButton>
                </Box>

                <Box sx={{ p: 2, borderBottom: '1px solid #EAECEF' }}>
                    <MiniCalendar />
                </Box>

                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <UpcomingReservations />
                </Box>
            </Drawer>

            {/* Conteúdo principal */}
            <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden'
            }}>
                {/* Header do calendário */}
                <Box sx={{
                    p: isMobile ? 1.5 : 2,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? 1.5 : 0,
                    borderBottom: '1px solid #EAECEF',
                    bgcolor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? 1 : 2,
                        justifyContent: isMobile ? 'space-between' : 'flex-start',
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        {isMobile && (
                            <IconButton onClick={toggleSidebar} size="small">
                                <MenuIcon />
                            </IconButton>
                        )}

                        <Button
                            variant="outlined"
                            startIcon={<Today />}
                            onClick={handleCalendarOpen}
                            size={isMobile ? "small" : "medium"}
                            sx={{
                                borderRadius: '50px',
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: isMobile ? '0.8rem' : '0.875rem'
                            }}
                        >
                            Hoje
                        </Button>

                        <Box sx={{ 
                            display: 'flex', 
                            gap: isMobile ? 0.5 : 1,
                            alignItems: 'center'
                        }}>
                            <IconButton
                                onClick={goToPrevious}
                                size={isMobile ? "small" : "medium"}
                                sx={{
                                    width: isMobile ? 32 : 36,
                                    height: isMobile ? 32 : 36,
                                    border: '1px solid #CED4DA',
                                    borderRadius: '50%'
                                }}
                            >
                                <ChevronLeft />
                            </IconButton>
                            <IconButton
                                onClick={goToNext}
                                size={isMobile ? "small" : "medium"}
                                sx={{
                                    width: isMobile ? 32 : 36,
                                    height: isMobile ? 32 : 36,
                                    border: '1px solid #CED4DA',
                                    borderRadius: '50%'
                                }}
                            >
                                <ChevronRight />
                            </IconButton>
                        </Box>

                        <Typography 
                            variant={isMobile ? "body1" : "h6"} 
                            fontWeight={600}
                            sx={{ 
                                fontSize: isMobile ? '1rem' : '1.25rem',
                                textAlign: isMobile ? 'center' : 'left',
                                flex: isMobile ? 1 : 'initial'
                            }}
                        >
                            {currentMonthName}
                        </Typography>
                    </Box>

                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? 1 : 2,
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'center' : 'flex-end'
                    }}>
                        <PeriodSelector changeView={changeView} activeView={activeView} />

                        {!isMobile && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<Add />}
                                onClick={handleCreateReservation}
                                sx={{
                                    borderRadius: '50px',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            >
                                Nova Reserva
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Corpo do calendário */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                    {renderActiveView()}
                </Box>
            </Box>

            {/* Popover do mini calendário */}
            <Popover
                open={isCalendarOpen}
                anchorEl={calendarAnchorEl}
                onClose={handleCalendarClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                    }
                }}
            >
                <MiniCalendar />
            </Popover>

            {/* Modal para criar/editar reservas */}
            <EventoModal
                isOpen={showEventoModal}
                onClose={handleCloseReservationModal}
                onSave={handleSaveReservation}
                reservation={reservaSelecionada}
                properties={properties}
                clients={clients}
            />

            {/* Dialog para visualizar reserva */}
            <ViewReservationDialog
                open={showReservationDialog}
                onClose={() => setShowReservationDialog(false)}
                reservation={selectedReservation}
                property={selectedReservation ? properties?.find(p => p.id === selectedReservation.propertyId) : undefined}
                client={selectedReservation ? clients?.find(c => c.id === selectedReservation.clientId) : undefined}
                onEdit={handleEditFromDialog}
                onStatusChange={handleStatusChange}
            />

            {/* Notificações */}
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseNotification}
                    severity={notification.type}
                    sx={{
                        width: '100%',
                        borderRadius: '50px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                >
                    {notification.message}
                </Alert>
            </Snackbar>

            {/* FAB mobile */}
            {isMobile && (
                <Box sx={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    zIndex: 1200
                }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={handleCreateReservation}
                        sx={{
                            borderRadius: '50px',
                            boxShadow: '0 8px 24px rgba(24, 82, 254, 0.3)',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2.5,
                            py: 1.5,
                            fontSize: '0.9rem',
                            '&:hover': {
                                boxShadow: '0 12px 32px rgba(24, 82, 254, 0.4)',
                                transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Nova Reserva
                    </Button>
                </Box>
            )}
        </Box>
    );
});

AgendaPage.displayName = 'AgendaPage';

export default AgendaPage;