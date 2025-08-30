'use client';

import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    Chip,
    Divider,
    Paper,
    IconButton,
    useTheme,
} from '@mui/material';
import {
    Close,
    Event,
    Person,
    Phone,
    Schedule,
    LocationOn,
    Notes,
    DirectionsCar,
    Home,
} from '@mui/icons-material';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VisitAppointment, VISIT_STATUS_LABELS, VisitStatus } from '@/lib/types/visit-appointment';
import { Reservation, RESERVATION_STATUS_LABELS, ReservationStatus } from '@/lib/types/reservation';

interface EventDetailsModalProps {
    open: boolean;
    onClose: () => void;
    event: {
        id: string;
        title: string;
        subtitle?: string;
        date: Date;
        type: 'reservation' | 'visit';
        status: string;
        statusColor: string;
        details: Reservation | VisitAppointment;
    } | null;
}

export default function EventDetailsModal({ open, onClose, event }: EventDetailsModalProps) {
    const theme = useTheme();

    if (!event) return null;

    const isVisit = event.type === 'visit';
    const visitDetails = isVisit ? event.details as VisitAppointment : null;
    const reservationDetails = !isVisit ? event.details as Reservation : null;

    // Calculate end time for visits (events)
    const getEndTime = () => {
        if (isVisit && visitDetails) {
            const duration = visitDetails.duration || 60;
            return addMinutes(event.date, duration);
        }
        return event.date;
    };

    const endTime = getEndTime();
    const isGenericEvent = visitDetails?.propertyId === 'GENERIC_EVENT';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: theme.shadows[8],
                }
            }}
        >
            <DialogTitle sx={{ 
                pb: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    {isVisit ? (
                        <DirectionsCar sx={{ color: 'primary.main' }} />
                    ) : (
                        <Home sx={{ color: 'secondary.main' }} />
                    )}
                    <Typography variant="h6" fontWeight={600}>
                        {isGenericEvent ? 'Detalhes do Evento' : (isVisit ? 'Detalhes da Visita' : 'Detalhes da Reserva')}
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
                <Stack spacing={3}>
                    {/* Status Chip */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip
                            label={isVisit 
                                ? VISIT_STATUS_LABELS[visitDetails?.status as VisitStatus] || visitDetails?.status
                                : RESERVATION_STATUS_LABELS[reservationDetails?.status as ReservationStatus] || reservationDetails?.status
                            }
                            color={event.statusColor as any}
                            variant="filled"
                            sx={{ 
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                px: 2,
                                py: 1,
                                height: 'auto'
                            }}
                        />
                    </Box>

                    {/* Title and Basic Info */}
                    <Paper sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Stack spacing={2}>
                            <Typography variant="h6" fontWeight={600} color="primary.main">
                                {event.title}
                            </Typography>
                            
                            {event.subtitle && (
                                <Typography variant="body2" color="text.secondary">
                                    {event.subtitle}
                                </Typography>
                            )}

                            <Divider />

                            {/* Date and Time */}
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Event sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                        {format(event.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {format(event.date, 'HH:mm')} 
                                        {isVisit && visitDetails?.duration && (
                                            <> - {format(endTime, 'HH:mm')} ({visitDetails.duration} min)</>
                                        )}
                                    </Typography>
                                </Box>
                            </Stack>

                            {/* Client Info */}
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Person sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>
                                        {isVisit ? visitDetails?.clientName : reservationDetails?.guestName || 'Cliente'}
                                    </Typography>
                                    {((isVisit && visitDetails?.clientPhone) || (!isVisit && reservationDetails?.guestPhone)) && (
                                        <Typography variant="caption" color="text.secondary">
                                            <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                            {isVisit ? visitDetails?.clientPhone : reservationDetails?.guestPhone}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>

                            {/* Location/Property */}
                            {((isVisit && visitDetails?.propertyAddress) || (!isVisit && reservationDetails?.propertyId)) && (
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <LocationOn sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Box>
                                        <Typography variant="body2" fontWeight={500}>
                                            {isVisit 
                                                ? (isGenericEvent ? 'Evento Geral' : visitDetails?.propertyName || 'Propriedade')
                                                : 'Reserva de Propriedade'
                                            }
                                        </Typography>
                                        {isVisit && visitDetails?.propertyAddress && !isGenericEvent && (
                                            <Typography variant="caption" color="text.secondary">
                                                {visitDetails.propertyAddress}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            )}

                            {/* Duration (for visits/events) */}
                            {isVisit && visitDetails?.duration && (
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Schedule sx={{ color: 'text.secondary', fontSize: 20 }} />
                                    <Typography variant="body2">
                                        Duração: {visitDetails.duration} minutos
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    </Paper>

                    {/* Description/Notes */}
                    {((isVisit && visitDetails?.notes) || (!isVisit && reservationDetails?.specialRequests)) && (
                        <Paper sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Stack direction="row" alignItems="flex-start" spacing={2}>
                                <Notes sx={{ color: 'text.secondary', fontSize: 20, mt: 0.5 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        {isVisit ? 'Observações' : 'Solicitações Especiais'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {isVisit ? visitDetails?.notes : reservationDetails?.specialRequests}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    )}

                    {/* Additional Info for Reservations */}
                    {!isVisit && reservationDetails && (
                        <Paper sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Informações da Reserva
                            </Typography>
                            <Stack spacing={1}>
                                {reservationDetails.checkOut && (
                                    <Typography variant="body2">
                                        <strong>Check-out:</strong> {format(new Date(reservationDetails.checkOut), "d 'de' MMMM", { locale: ptBR })}
                                    </Typography>
                                )}
                                {reservationDetails.guests && (
                                    <Typography variant="body2">
                                        <strong>Hóspedes:</strong> {reservationDetails.guests}
                                    </Typography>
                                )}
                                {reservationDetails.totalAmount && (
                                    <Typography variant="body2">
                                        <strong>Valor Total:</strong> R$ {reservationDetails.totalAmount.toLocaleString('pt-BR')}
                                    </Typography>
                                )}
                            </Stack>
                        </Paper>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
                <Button 
                    onClick={onClose}
                    variant="contained"
                    fullWidth
                    sx={{
                        borderRadius: 2,
                        py: 1.5,
                        fontWeight: 600
                    }}
                >
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
}