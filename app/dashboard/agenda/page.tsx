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
} from '@mui/material';
import {
    CalendarToday,
    Add,
    Home,
    Person,
    Phone,
    AccessTime,
    Refresh,
} from '@mui/icons-material';
import { useReservations, useProperties, useClients } from '@/lib/firebase/hooks';
import { useTodayVisits, useUpcomingVisits } from '@/lib/firebase/hooks/useVisits';
import { Reservation, ReservationStatus, RESERVATION_STATUS_LABELS } from '@/lib/types/reservation';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';
import { VisitAppointment, VISIT_STATUS_LABELS } from '@/lib/types/visit-appointment';
import EventoModal from './components/EventoModal';
import ViewReservationDialog from './components/ViewReservationDialog';
import { format, isToday, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';
import { useTenant } from '@/contexts/TenantContext';

export default function AgendaPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Estados simplificados
    const [currentDate] = useState(new Date());
    const [showEventoModal, setShowEventoModal] = useState(false);
    const [reservaSelecionada, setReservaSelecionada] = useState<Reservation | null>(null);
    const [showReservationDialog, setShowReservationDialog] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    // Hooks do Firestore
    const { data: reservations, loading: loadingReservations, error: reservationsError } = useReservations();
    const { data: properties } = useProperties();
    const { data: clients } = useClients();
    const { data: todayVisits, loading: loadingTodayVisits } = useTodayVisits();
    const { data: upcomingVisits, loading: loadingUpcomingVisits } = useUpcomingVisits(7);

    // Funções auxiliares para filtrar reservas
    const getTodayReservations = () => {
        if (!reservations) return [];
        const today = new Date();
        return reservations.filter(reservation => {
            const checkIn = new Date(reservation.checkIn);
            const checkOut = new Date(reservation.checkOut);
            return isSameDay(checkIn, today) || isSameDay(checkOut, today) || 
                   (checkIn <= today && checkOut >= today);
        });
    };

    const getUpcomingReservations = () => {
        if (!reservations) return [];
        const today = new Date();
        return reservations
            .filter(reservation => new Date(reservation.checkIn) > today)
            .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
            .slice(0, 5);
    };

    const getRecentReservations = () => {
        if (!reservations) return [];
        return reservations
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 10);
    };

    // Handlers
    const handleCreateReservation = () => {
        setReservaSelecionada(null);
        setShowEventoModal(true);
    };

    const handleViewReservation = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setShowReservationDialog(true);
    };

    const handleEditReservation = (reservation: Reservation) => {
        setReservaSelecionada(reservation);
        setShowEventoModal(true);
    };

    const handleCloseReservationModal = () => {
        setShowEventoModal(false);
        setReservaSelecionada(null);
    };

    const { services } = useTenant();

    const handleSaveReservation = async (reservationData: any) => {
        try {
            logger.info('Salvando reserva', { 
                reservationData,
                component: 'AgendaPage',
                operation: 'handleSaveReservation'
            });

            if (!services) {
                throw new Error('Serviços não disponíveis');
            }

            // Se tem ID, é uma atualização
            if (reservationData.id) {
                await services.reservations.update(reservationData.id, reservationData);
            } else {
                // Senão, é uma nova reserva
                await services.reservations.create(reservationData);
            }

            setShowEventoModal(false);
            setReservaSelecionada(null);
        } catch (error) {
            logger.error('Erro ao salvar reserva', { 
                error,
                component: 'AgendaPage',
                operation: 'handleSaveReservation'
            });
            throw error;
        }
    };

    const handleEditFromDialog = (reservation: Reservation) => {
        setShowReservationDialog(false);
        setReservaSelecionada(reservation);
        setShowEventoModal(true);
    };

    const handleStatusChange = async (reservationId: string, newStatus: ReservationStatus) => {
        try {
            logger.info('Alterando status da reserva', { 
                reservationId,
                newStatus,
                component: 'AgendaPage',
                operation: 'handleStatusChange'
            });
            setShowReservationDialog(false);
        } catch (error) {
            logger.error('Erro ao alterar status da reserva', { 
                error,
                reservationId,
                newStatus,
                component: 'AgendaPage',
                operation: 'handleStatusChange'
            });
        }
    };

    // Cores por status
    const getStatusColors = (status: ReservationStatus) => {
        switch(status) {
            case ReservationStatus.CONFIRMED:
                return { bg: '#E8F5E9', color: '#388E3C', border: '#4CAF50' };
            case ReservationStatus.CANCELLED:
                return { bg: '#FFEBEE', color: '#D32F2F', border: '#F44336' };
            case ReservationStatus.CHECKED_IN:
                return { bg: '#FFF8E1', color: '#F57C00', border: '#FFA000' };
            case ReservationStatus.CHECKED_OUT:
                return { bg: '#E3F2FD', color: '#1976D2', border: '#2196F3' };
            default:
                return { bg: '#F3E5F5', color: '#7B1FA2', border: '#9C27B0' };
        }
    };

    // Componente de card de reserva
    const ReservationCard = ({ reservation, compact = false }: { reservation: Reservation; compact?: boolean }) => {
        const property = properties?.find(p => p.id === reservation.propertyId);
        const client = clients?.find(c => c.id === reservation.clientId);
        const colors = getStatusColors(reservation.status);

        return (
            <Card
                sx={{
                    mb: 2,
                    border: `2px solid ${colors.border}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)'
                    }
                }}
                onClick={() => handleViewReservation(reservation)}
            >
                <CardContent sx={{ p: compact ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Home />
                                {property?.name || 'Propriedade não encontrada'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person />
                                {client?.name || 'Cliente não encontrado'}
                            </Typography>
                        </Box>
                        <Chip
                            label={RESERVATION_STATUS_LABELS[reservation.status]}
                            sx={{
                                backgroundColor: colors.bg,
                                color: colors.color,
                                border: `1px solid ${colors.border}`,
                                fontWeight: 600
                            }}
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarToday sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                        Check-in
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(new Date(reservation.checkIn), "dd/MM/yyyy", { locale: ptBR })}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccessTime sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                        Check-out
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(new Date(reservation.checkOut), "dd/MM/yyyy", { locale: ptBR })}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                        {reservation.guests} hóspede{reservation.guests !== 1 ? 's' : ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        R$ {reservation.totalAmount?.toLocaleString('pt-BR') || '0,00'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {reservation.observations && (
                        <Typography variant="body2" sx={{ 
                            mt: 2, 
                            p: 1.5, 
                            backgroundColor: 'grey.50', 
                            borderRadius: 1,
                            fontStyle: 'italic'
                        }}>
                            "{reservation.observations}"
                        </Typography>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (loadingReservations) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (reservationsError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    Erro ao carregar reservas: {reservationsError}
                </Alert>
            </Box>
        );
    }

    const todayReservations = getTodayReservations();
    const upcomingReservations = getUpcomingReservations();
    const recentReservations = getRecentReservations();

    return (
        <Box sx={{ p: 3 }}>
            <DashboardBreadcrumb 
                items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Agenda', href: '/dashboard/agenda' }
                ]} 
            />

            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', md: 'center' }, 
                mb: 4,
                gap: { xs: 2, md: 0 }
            }}>
                <Box>
                    <Typography 
                        variant="h4" 
                        fontWeight={700} 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2,
                            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                        }}
                    >
                        <CalendarToday sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: 'primary.main' }} />
                        Agenda de Reservas
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                        Gerencie todas as suas reservas de forma organizada
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignSelf: { xs: 'stretch', md: 'auto' } }}>
                    <IconButton onClick={() => window.location.reload()}>
                        <Refresh />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreateReservation}
                        sx={{ 
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        Nova Reserva
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
                <Grid item xs={6} sm={6} md={3}>
                    <Card sx={{ 
                        textAlign: 'center', 
                        p: { xs: 2, md: 3 },
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.75rem', md: '3rem' } }}>
                            {todayReservations.length}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                            Reservas Hoje
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <Card sx={{ 
                        textAlign: 'center', 
                        p: { xs: 2, md: 3 },
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.75rem', md: '3rem' } }}>
                            {upcomingReservations.length}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                            Próximas Reservas
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <Card sx={{ 
                        textAlign: 'center', 
                        p: { xs: 2, md: 3 },
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.75rem', md: '3rem' } }}>
                            {reservations?.length || 0}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                            Total de Reservas
                        </Typography>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={6} md={3}>
                    <Card sx={{ 
                        textAlign: 'center', 
                        p: { xs: 2, md: 3 },
                        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                        color: 'white'
                    }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.75rem', md: '3rem' } }}>
                            {reservations?.filter(r => r.status === ReservationStatus.CONFIRMED).length || 0}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                            Confirmadas
                        </Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Conteúdo principal */}
            <Grid container spacing={{ xs: 2, md: 4 }}>
                {/* Reservas de hoje */}
                <Grid item xs={12} lg={6}>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday color="primary" />
                        Reservas de Hoje
                    </Typography>
                    
                    {todayReservations.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Nenhuma reserva para hoje.
                        </Alert>
                    ) : (
                        <Box sx={{ maxHeight: '500px', overflow: 'auto', ...scrollbarStyles.hidden }}>
                            {todayReservations.map(reservation => (
                                <ReservationCard key={reservation.id} reservation={reservation} compact />
                            ))}
                        </Box>
                    )}
                </Grid>

                {/* Próximas reservas */}
                <Grid item xs={12} lg={6}>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime color="primary" />
                        Próximas Reservas
                    </Typography>
                    
                    {upcomingReservations.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Nenhuma reserva próxima agendada.
                        </Alert>
                    ) : (
                        <Box sx={{ maxHeight: '500px', overflow: 'auto', ...scrollbarStyles.hidden }}>
                            {upcomingReservations.map(reservation => (
                                <ReservationCard key={reservation.id} reservation={reservation} compact />
                            ))}
                        </Box>
                    )}
                </Grid>

                {/* Visitas Agendadas */}
                <Grid item xs={12}>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday color="secondary" />
                        Visitas Agendadas ({(todayVisits?.length || 0) + (upcomingVisits?.length || 0)})
                    </Typography>
                    
                    {!todayVisits?.length && !upcomingVisits?.length ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Nenhuma visita agendada.
                        </Alert>
                    ) : (
                        <Grid container spacing={2}>
                            {/* Visitas de hoje */}
                            {todayVisits && todayVisits.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
                                        Hoje
                                    </Typography>
                                    {todayVisits.map((visit) => (
                                        <Card key={visit.id} sx={{ mb: 2, border: '1px solid', borderColor: 'secondary.light' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        {visit.propertyName}
                                                    </Typography>
                                                    <Chip 
                                                        label={VISIT_STATUS_LABELS[visit.status]} 
                                                        size="small"
                                                        color="secondary"
                                                    />
                                                </Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                                    {visit.clientName} - {visit.clientPhone}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                                    {visit.scheduledTime}
                                                </Typography>
                                                {visit.notes && (
                                                    <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                                                        {visit.notes}
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Grid>
                            )}
                            
                            {/* Próximas visitas */}
                            {upcomingVisits && upcomingVisits.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
                                        Próximos Dias
                                    </Typography>
                                    {upcomingVisits.map((visit) => (
                                        <Card key={visit.id} sx={{ mb: 2, border: '1px solid', borderColor: 'secondary.light' }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        {visit.propertyName}
                                                    </Typography>
                                                    <Chip 
                                                        label={format(new Date(visit.scheduledDate), 'dd/MM', { locale: ptBR })} 
                                                        size="small"
                                                        variant="outlined"
                                                        color="secondary"
                                                    />
                                                </Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    <Person sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                                    {visit.clientName} - {visit.clientPhone}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                                    {format(new Date(visit.scheduledDate), 'EEEE', { locale: ptBR })} às {visit.scheduledTime}
                                                </Typography>
                                                {visit.notes && (
                                                    <Typography variant="caption" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                                                        {visit.notes}
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Grid>
                            )}
                        </Grid>
                    )}
                </Grid>

                {/* Todas as reservas */}
                <Grid item xs={12}>
                    <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Home color="primary" />
                        Todas as Reservas ({reservations?.length || 0})
                    </Typography>
                    
                    {recentReservations.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Nenhuma reserva cadastrada ainda.
                            <Button 
                                variant="outlined" 
                                startIcon={<Add />}
                                onClick={handleCreateReservation}
                                sx={{ ml: 2 }}
                            >
                                Criar primeira reserva
                            </Button>
                        </Alert>
                    ) : (
                        <Box>
                            {recentReservations.map(reservation => (
                                <ReservationCard key={reservation.id} reservation={reservation} />
                            ))}
                        </Box>
                    )}
                </Grid>
            </Grid>

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
        </Box>
    );
}