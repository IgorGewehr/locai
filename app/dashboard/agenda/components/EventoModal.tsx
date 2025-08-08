"use client";

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Divider,
    Chip,
    IconButton,
    Autocomplete,
    InputAdornment,
    Alert,
} from '@mui/material';
import {
    Close as CloseIcon,
    CalendarToday,
    Person,
    Home,
    AttachMoney,
    People,
    Edit,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { Reservation, ReservationStatus, PaymentMethod, ReservationSource, RESERVATION_STATUS_LABELS } from '@/lib/types/reservation';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';

interface EventoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (reservationData: any) => Promise<void>;
    reservation?: Reservation | null;
    properties?: Property[];
    clients?: Client[];
}

const EventoModal: React.FC<EventoModalProps> = ({
    isOpen,
    onClose,
    onSave,
    reservation,
    properties = [],
    clients = []
}) => {
    const [formData, setFormData] = useState({
        propertyId: '',
        clientId: '',
        checkIn: new Date(),
        checkOut: new Date(),
        guests: 1,
        totalAmount: 0,
        paymentMethod: PaymentMethod.PIX,
        status: ReservationStatus.PENDING,
        source: ReservationSource.MANUAL,
        specialRequests: '',
        observations: ''
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (reservation) {
            setFormData({
                propertyId: reservation.propertyId,
                clientId: reservation.clientId,
                checkIn: new Date(reservation.checkIn),
                checkOut: new Date(reservation.checkOut),
                guests: reservation.guests,
                totalAmount: reservation.totalAmount,
                paymentMethod: reservation.paymentMethod,
                status: reservation.status,
                source: reservation.source,
                specialRequests: reservation.specialRequests || '',
                observations: reservation.observations || ''
            });
        } else {
            // Limpar o formulário para nova reserva
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            setFormData({
                propertyId: '',
                clientId: '',
                checkIn: tomorrow,
                checkOut: dayAfter,
                guests: 1,
                totalAmount: 0,
                paymentMethod: PaymentMethod.PIX,
                status: ReservationStatus.PENDING,
                source: ReservationSource.MANUAL,
                specialRequests: '',
                observations: ''
            });
        }
        setErrors({});
        setSaveError(null);
    }, [reservation, isOpen]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.propertyId) {
            newErrors.propertyId = 'Selecione uma propriedade';
        }

        if (!formData.clientId) {
            newErrors.clientId = 'Selecione um cliente';
        }

        if (!formData.checkIn) {
            newErrors.checkIn = 'Data de check-in é obrigatória';
        }

        if (!formData.checkOut) {
            newErrors.checkOut = 'Data de check-out é obrigatória';
        }

        if (formData.checkIn && formData.checkOut && formData.checkIn >= formData.checkOut) {
            newErrors.checkOut = 'Check-out deve ser após o check-in';
        }

        if (formData.guests < 1) {
            newErrors.guests = 'Número de hóspedes deve ser maior que zero';
        }

        if (formData.totalAmount < 0) {
            newErrors.totalAmount = 'Valor total não pode ser negativo';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Limpar erro do campo quando alterado
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const calculateNights = () => {
        if (formData.checkIn && formData.checkOut) {
            const diffTime = formData.checkOut.getTime() - formData.checkIn.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(1, diffDays);
        }
        return 1;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const nights = calculateNights();
            const reservationData = {
                ...formData,
                nights,
                paidAmount: 0,
                pendingAmount: formData.totalAmount,
                paymentStatus: 'pending' as const,
                ...(reservation && { id: reservation.id })
            };

            await onSave(reservationData);
            onClose();
        } catch (error) {
            logger.error('Erro ao salvar reserva', { 
                error, 
                component: 'EventoModal',
                operation: 'handleSave',
                reservationData 
            });
            setSaveError('Erro ao salvar reserva. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedProperty = () => {
        return properties?.find(p => p.id === formData.propertyId);
    };

    const getSelectedClient = () => {
        return clients?.find(c => c.id === formData.clientId);
    };

    const getStatusColor = (status: ReservationStatus) => {
        switch (status) {
            case ReservationStatus.CONFIRMED:
                return 'success';
            case ReservationStatus.CANCELLED:
                return 'error';
            case ReservationStatus.CHECKED_IN:
                return 'warning';
            case ReservationStatus.CHECKED_OUT:
                return 'info';
            default:
                return 'default';
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <Dialog
                open={isOpen}
                onClose={onClose}
                maxWidth="md"
                fullWidth
                fullScreen={false}
                PaperProps={{
                    sx: {
                        borderRadius: { xs: '16px 16px 0 0', sm: '16px' },
                        maxHeight: { xs: '95vh', sm: '90vh' },
                        margin: { xs: 0, sm: '32px' },
                        width: { xs: '100%', sm: 'auto' },
                    }
                }}
            >
                <DialogTitle sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'white',
                    py: 2,
                    px: { xs: 2, sm: 3 }
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                        <CalendarToday sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        <Typography variant="h6" fontWeight={600} sx={{ 
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                            truncate: true,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {reservation ? 'Editar Reserva' : 'Nova Reserva'}
                        </Typography>
                        {reservation && (
                            <Chip
                                label={RESERVATION_STATUS_LABELS[formData.status]}
                                size="small"
                                color={getStatusColor(formData.status) as any}
                                sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }}
                            />
                        )}
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{ color: 'white' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {saveError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
                            {saveError}
                        </Alert>
                    )}
                    
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Home color="primary" />
                            Propriedade e Cliente
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth error={!!errors.propertyId}>
                                    <Autocomplete
                                        value={getSelectedProperty() || null}
                                        onChange={(_, value) => handleChange('propertyId', value?.id || '')}
                                        options={properties || []}
                                        getOptionLabel={(option) => option.name}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Propriedade"
                                                error={!!errors.propertyId}
                                                helperText={errors.propertyId}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Home color="primary" />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <Box component="li" {...props}>
                                                <Box>
                                                    <Typography variant="body1" fontWeight={500}>
                                                        {option.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.address} • {option.bedrooms} quartos
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    />
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth error={!!errors.clientId}>
                                    <Autocomplete
                                        value={getSelectedClient() || null}
                                        onChange={(_, value) => handleChange('clientId', value?.id || '')}
                                        options={clients || []}
                                        getOptionLabel={(option) => option.name}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Cliente"
                                                error={!!errors.clientId}
                                                helperText={errors.clientId}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <Person color="primary" />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <Box component="li" {...props}>
                                                <Box>
                                                    <Typography variant="body1" fontWeight={500}>
                                                        {option.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.phone} • {option.email}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <CalendarToday color="primary" />
                            Datas e Hóspedes
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <DatePicker
                                    label="Check-in"
                                    value={formData.checkIn}
                                    onChange={(date) => handleChange('checkIn', date)}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: !!errors.checkIn,
                                            helperText: errors.checkIn,
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <DatePicker
                                    label="Check-out"
                                    value={formData.checkOut}
                                    onChange={(date) => handleChange('checkOut', date)}
                                    minDate={formData.checkIn}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: !!errors.checkOut,
                                            helperText: errors.checkOut,
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Número de Hóspedes"
                                    type="number"
                                    value={formData.guests}
                                    onChange={(e) => handleChange('guests', parseInt(e.target.value) || 1)}
                                    error={!!errors.guests}
                                    helperText={errors.guests}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <People color="primary" />
                                            </InputAdornment>
                                        ),
                                        inputProps: { min: 1 }
                                    }}
                                />
                            </Grid>
                        </Grid>

                        {formData.checkIn && formData.checkOut && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                                <Typography variant="body2" color="primary.dark">
                                    <strong>{calculateNights()}</strong> diária{calculateNights() !== 1 ? 's' : ''}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <AttachMoney color="primary" />
                            Valores e Pagamento
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Valor Total"
                                    type="number"
                                    value={formData.totalAmount}
                                    onChange={(e) => handleChange('totalAmount', parseFloat(e.target.value) || 0)}
                                    error={!!errors.totalAmount}
                                    helperText={errors.totalAmount}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                        inputProps: { min: 0, step: 0.01 }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Forma de Pagamento</InputLabel>
                                    <Select
                                        value={formData.paymentMethod}
                                        onChange={(e) => handleChange('paymentMethod', e.target.value)}
                                        label="Forma de Pagamento"
                                    >
                                        <MenuItem value={PaymentMethod.PIX}>PIX</MenuItem>
                                        <MenuItem value={PaymentMethod.CREDIT_CARD}>Cartão de Crédito</MenuItem>
                                        <MenuItem value={PaymentMethod.DEBIT_CARD}>Cartão de Débito</MenuItem>
                                        <MenuItem value={PaymentMethod.CASH}>Dinheiro</MenuItem>
                                        <MenuItem value={PaymentMethod.BANK_TRANSFER}>Transferência</MenuItem>
                                        <MenuItem value={PaymentMethod.BANK_SLIP}>Boleto</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Status da Reserva</InputLabel>
                                    <Select
                                        value={formData.status}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                        label="Status da Reserva"
                                    >
                                        <MenuItem value={ReservationStatus.PENDING}>
                                            {RESERVATION_STATUS_LABELS[ReservationStatus.PENDING]}
                                        </MenuItem>
                                        <MenuItem value={ReservationStatus.CONFIRMED}>
                                            {RESERVATION_STATUS_LABELS[ReservationStatus.CONFIRMED]}
                                        </MenuItem>
                                        <MenuItem value={ReservationStatus.CHECKED_IN}>
                                            {RESERVATION_STATUS_LABELS[ReservationStatus.CHECKED_IN]}
                                        </MenuItem>
                                        <MenuItem value={ReservationStatus.CHECKED_OUT}>
                                            {RESERVATION_STATUS_LABELS[ReservationStatus.CHECKED_OUT]}
                                        </MenuItem>
                                        <MenuItem value={ReservationStatus.CANCELLED}>
                                            {RESERVATION_STATUS_LABELS[ReservationStatus.CANCELLED]}
                                        </MenuItem>
                                        <MenuItem value={ReservationStatus.NO_SHOW}>
                                            {RESERVATION_STATUS_LABELS[ReservationStatus.NO_SHOW]}
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Edit color="primary" />
                            Observações
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Solicitações Especiais"
                                    multiline
                                    rows={3}
                                    value={formData.specialRequests}
                                    onChange={(e) => handleChange('specialRequests', e.target.value)}
                                    placeholder="Ex: Check-in antecipado, berço para bebê, etc."
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Observações Internas"
                                    multiline
                                    rows={3}
                                    value={formData.observations}
                                    onChange={(e) => handleChange('observations', e.target.value)}
                                    placeholder="Observações para uso interno"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    gap: 1,
                    flexDirection: { xs: 'column', sm: 'row' }
                }}>
                    <Button
                        onClick={onClose}
                        color="inherit"
                        sx={{ 
                            borderRadius: '50px', 
                            px: 3,
                            width: { xs: '100%', sm: 'auto' },
                            order: { xs: 2, sm: 1 }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        sx={{
                            borderRadius: '50px',
                            px: 3,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            width: { xs: '100%', sm: 'auto' },
                            order: { xs: 1, sm: 2 }
                        }}
                    >
                        {loading ? 'Salvando...' : reservation ? 'Atualizar' : 'Criar'} Reserva
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default EventoModal;