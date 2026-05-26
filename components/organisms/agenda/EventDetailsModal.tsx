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
} from '@mui/icons-material';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VisitAppointment, VISIT_STATUS_LABELS, VisitStatus } from '@/lib/types/visit-appointment';

// === Paleta dark + vermelho (AlugaZap) ===
const C = {
    panel: '#111827',
    panelAlt: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    text: '#f1f5f9',
    textDim: 'rgba(255,255,255,0.5)',
    red: '#dc2626',
    redLight: '#ef4444',
    redSoft: 'rgba(220,38,38,0.12)',
};

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
        details: VisitAppointment;
    } | null;
}

export default function EventDetailsModal({ open, onClose, event }: EventDetailsModalProps) {
    if (!event) return null;

    const visitDetails = event.details;
    const duration = visitDetails?.duration || 60;
    const endTime = addMinutes(event.date, duration);
    const isGenericEvent = visitDetails?.propertyId === 'GENERIC_EVENT';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '14px',
                    bgcolor: C.panel,
                    border: `1px solid ${C.border}`,
                    backgroundImage: 'none',
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
                    <DirectionsCar sx={{ color: C.redLight }} />
                    <Typography variant="h6" fontWeight={600} sx={{ color: C.text }}>
                        {isGenericEvent ? 'Detalhes do Compromisso' : 'Detalhes da Visita'}
                    </Typography>
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: C.textDim }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
                <Stack spacing={3}>
                    {/* Status Chip */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip
                            label={VISIT_STATUS_LABELS[visitDetails?.status as VisitStatus] || visitDetails?.status}
                            variant="outlined"
                            sx={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                px: 2,
                                py: 1,
                                height: 'auto',
                                borderColor: event.statusColor,
                                color: event.statusColor,
                                bgcolor: 'transparent'
                            }}
                        />
                    </Box>

                    {/* Title and Basic Info */}
                    <Paper sx={{ p: 3, bgcolor: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: '12px', boxShadow: 'none', backgroundImage: 'none' }}>
                        <Stack spacing={2}>
                            <Typography variant="h6" fontWeight={600} sx={{ color: C.redLight }}>
                                {event.title}
                            </Typography>

                            {event.subtitle && (
                                <Typography variant="body2" sx={{ color: C.textDim }}>
                                    {event.subtitle}
                                </Typography>
                            )}

                            <Divider sx={{ borderColor: C.border }} />

                            {/* Date and Time */}
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Event sx={{ color: C.textDim, fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500} sx={{ color: C.text, textTransform: 'capitalize' }}>
                                        {format(event.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: C.textDim }}>
                                        {format(event.date, 'HH:mm')} - {format(endTime, 'HH:mm')} ({duration} min)
                                    </Typography>
                                </Box>
                            </Stack>

                            {/* Client Info */}
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Person sx={{ color: C.textDim, fontSize: 20 }} />
                                <Box>
                                    <Typography variant="body2" fontWeight={500} sx={{ color: C.text }}>
                                        {visitDetails?.clientName || 'Cliente'}
                                    </Typography>
                                    {visitDetails?.clientPhone && (
                                        <Typography variant="caption" sx={{ color: C.textDim }}>
                                            <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                                            {visitDetails.clientPhone}
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>

                            {/* Location/Property */}
                            {(visitDetails?.propertyAddress || visitDetails?.propertyName) && (
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <LocationOn sx={{ color: C.textDim, fontSize: 20 }} />
                                    <Box>
                                        <Typography variant="body2" fontWeight={500} sx={{ color: C.text }}>
                                            {isGenericEvent ? 'Compromisso Geral' : visitDetails?.propertyName || 'Propriedade'}
                                        </Typography>
                                        {visitDetails?.propertyAddress && !isGenericEvent && (
                                            <Typography variant="caption" sx={{ color: C.textDim }}>
                                                {visitDetails.propertyAddress}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            )}

                            {/* Duration */}
                            {visitDetails?.duration && (
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Schedule sx={{ color: C.textDim, fontSize: 20 }} />
                                    <Typography variant="body2" sx={{ color: C.text }}>
                                        Duração: {visitDetails.duration} minutos
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    </Paper>

                    {/* Notes */}
                    {visitDetails?.notes && (
                        <Paper sx={{ p: 3, bgcolor: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: '12px', boxShadow: 'none', backgroundImage: 'none' }}>
                            <Stack direction="row" alignItems="flex-start" spacing={2}>
                                <Notes sx={{ color: C.textDim, fontSize: 20, mt: 0.5 }} />
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ color: C.text }}>
                                        Observações
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: C.textDim, whiteSpace: 'pre-wrap' }}>
                                        {visitDetails.notes}
                                    </Typography>
                                </Box>
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
                        borderRadius: '12px',
                        py: 1.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        bgcolor: C.red,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#b91c1c', boxShadow: 'none' }
                    }}
                >
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
