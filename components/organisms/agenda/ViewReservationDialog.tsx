"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    Button,
    Chip,
    IconButton,
    Divider,
    Grid,
    Paper,
    Card,
    CardContent,
    useTheme,
    useMediaQuery,
    Slide,
    Fade,
    Avatar,
} from "@mui/material";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Ícones
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PeopleIcon from "@mui/icons-material/People";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BedIcon from "@mui/icons-material/Bed";
import BathtubIcon from "@mui/icons-material/Bathtub";
import CheckInIcon from "@mui/icons-material/Login";
import CheckOutIcon from "@mui/icons-material/Logout";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HotelIcon from "@mui/icons-material/Hotel";
import WarningIcon from "@mui/icons-material/Warning";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
    Reservation, 
    ReservationStatus, 
    RESERVATION_STATUS_LABELS, 
    PAYMENT_STATUS_LABELS, 
    PAYMENT_METHOD_LABELS,
    RESERVATION_SOURCE_LABELS
} from '@/lib/types/reservation';
import { Property } from '@/lib/types/property';
import { Client } from '@/lib/types/client';

// Tema personalizado
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#2563EB',
            light: '#EEF2FF',
            dark: '#1E40AF',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#7C3AED',
            light: '#F5F3FF',
            dark: '#5B21B6',
            contrastText: '#FFFFFF',
        },
        status: {
            pending: {
                main: '#F59E0B',
                light: '#FFFBEB',
                dark: '#D97706',
                contrastText: '#FFFFFF',
                background: '#FFFBEB',
                gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
            },
            confirmed: {
                main: '#10B981',
                light: '#ECFDF5',
                dark: '#059669',
                contrastText: '#FFFFFF',
                background: '#F0FFF4',
                gradient: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)',
            },
            checkedIn: {
                main: '#3B82F6',
                light: '#EFF6FF',
                dark: '#1D4ED8',
                contrastText: '#FFFFFF',
                background: '#F0F7FF',
                gradient: 'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
            },
            checkedOut: {
                main: '#8B5CF6',
                light: '#F5F3FF',
                dark: '#7C3AED',
                contrastText: '#FFFFFF',
                background: '#FAF5FF',
                gradient: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)',
            },
            cancelled: {
                main: '#EF4444',
                light: '#FEF2F2',
                dark: '#DC2626',
                contrastText: '#FFFFFF',
                background: '#FFF5F5',
                gradient: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
            },
            noShow: {
                main: '#6B7280',
                light: '#F9FAFB',
                dark: '#4B5563',
                contrastText: '#FFFFFF',
                background: '#F9FAFB',
                gradient: 'linear-gradient(135deg, #F3F4F6 0%, #F9FAFB 100%)',
            }
        },
        grey: {
            100: '#F9FAFB',
            200: '#F3F4F6',
            300: '#E5E7EB',
            400: '#9CA3AF',
            500: '#6B7280',
            800: '#1F2937',
        }
    },
    typography: {
        fontFamily: '"Gellix", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h5: {
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.01em',
        },
        h6: {
            fontWeight: 600,
            fontSize: '1.125rem',
            letterSpacing: '-0.01em',
        },
        subtitle1: {
            fontWeight: 600,
            fontSize: '1rem',
        },
        body1: {
            fontSize: '0.9375rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        caption: {
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 24,
                    boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.12)'
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 50,
                    padding: '8px 18px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'none',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.12)',
                    }
                },
                contained: {
                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)',
                }
            }
        }
    }
});

// Transição para o Dialog
const Transition = React.forwardRef(function Transition(props: any, ref: any) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Componente de item de informação
const InfoItem = ({ icon, label, value, sx, isMobile }: any) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                transition: 'all 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)'
                },
                ...sx
            }}
        >
            <Box
                sx={{
                    width: isMobile ? 36 : 42,
                    height: isMobile ? 36 : 42,
                    borderRadius: '12px',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                    transition: 'all 0.2s'
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        display: 'block',
                        mb: 0.5,
                        fontWeight: 500
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant={isMobile ? "body2" : "body1"}
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        wordBreak: 'break-word',
                        fontSize: isMobile ? '14px' : '16px'
                    }}
                >
                    {value || '-'}
                </Typography>
            </Box>
        </Box>
    );
};

interface ViewReservationDialogProps {
    open: boolean;
    onClose: () => void;
    reservation: Reservation | null;
    property?: Property;
    client?: Client;
    onEdit: (reservation: Reservation) => void;
    onStatusChange: (reservationId: string, newStatus: ReservationStatus) => void;
}

const ViewReservationDialog: React.FC<ViewReservationDialogProps> = ({
    open,
    onClose,
    reservation,
    property,
    client,
    onEdit,
    onStatusChange
}) => {
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    const fullScreen = isMobile;

    const [statusChangeConfirm, setStatusChangeConfirm] = useState<ReservationStatus | null>(null);

    // Cores por tipo de status
    const getStatusColor = (status: ReservationStatus) => {
        switch(status) {
            case ReservationStatus.CONFIRMED:
                return theme.palette.status.confirmed;
            case ReservationStatus.CANCELLED:
                return theme.palette.status.cancelled;
            case ReservationStatus.CHECKED_IN:
                return theme.palette.status.checkedIn;
            case ReservationStatus.CHECKED_OUT:
                return theme.palette.status.checkedOut;
            case ReservationStatus.NO_SHOW:
                return theme.palette.status.noShow;
            default:
                return theme.palette.status.pending;
        }
    };

    const formatDate = (date: Date | string): string => {
        if (!date) return '';
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) return '';
        return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleEdit = () => {
        if (reservation && onEdit) {
            onEdit(reservation);
        }
    };

    const handleStatusChangeClick = (newStatus: ReservationStatus) => {
        setStatusChangeConfirm(newStatus);
    };

    const handleStatusChangeConfirm = async () => {
        if (onStatusChange && statusChangeConfirm && reservation) {
            await onStatusChange(reservation.id, statusChangeConfirm);
            setStatusChangeConfirm(null);
        }
    };

    const handleStatusChangeCancel = () => {
        setStatusChangeConfirm(null);
    };

    if (!reservation) return null;

    const statusColor = getStatusColor(reservation.status);

    return (
        <ThemeProvider theme={theme}>
            <Dialog
                open={open}
                onClose={onClose}
                fullWidth
                maxWidth={isMobile ? false : isTablet ? "md" : "lg"}
                fullScreen={fullScreen}
                TransitionComponent={Transition}
                PaperProps={{
                    sx: {
                        borderRadius: isMobile ? 0 : isTablet ? '16px' : '24px',
                        overflow: 'hidden',
                        boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.15)',
                        height: fullScreen ? '100%' : 'auto',
                        maxHeight: fullScreen ? '100%' : '90vh',
                        margin: isMobile ? 0 : 1,
                        width: isMobile ? '100%' : 'auto'
                    }
                }}
            >
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${alpha(statusColor.main, 0.2)}`,
                        background: statusColor.gradient,
                        p: isMobile ? 2 : isTablet ? 2.5 : 3.5,
                        transition: 'all 0.3s'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Fade in={true} timeout={800}>
                            <Avatar
                                sx={{
                                    bgcolor: statusColor.main,
                                    color: 'white',
                                    width: isMobile ? 40 : isTablet ? 48 : 56,
                                    height: isMobile ? 40 : isTablet ? 48 : 56,
                                    mr: 2.5,
                                    display: { xs: 'none', sm: 'flex' },
                                    boxShadow: `0 8px 16px ${alpha(statusColor.main, 0.4)}`,
                                    border: '3px solid white',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <HotelIcon fontSize="large" />
                            </Avatar>
                        </Fade>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.8 }}>
                                <Typography 
                                    variant={isMobile ? "h6" : "h5"} 
                                    sx={{ 
                                        fontWeight: 700, 
                                        color: statusColor.dark, 
                                        letterSpacing: '-0.02em',
                                        fontSize: isMobile ? '14px' : isTablet ? '16px' : '20px'
                                    }}
                                >
                                    Reserva: {property?.name || 'Propriedade não encontrada'}
                                </Typography>
                                <Chip
                                    label={RESERVATION_STATUS_LABELS[reservation.status]}
                                    size="small"
                                    sx={{
                                        bgcolor: statusColor.main,
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        height: '24px',
                                        borderRadius: '12px',
                                        boxShadow: `0 4px 8px ${alpha(statusColor.main, 0.3)}`,
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 6px 12px ${alpha(statusColor.main, 0.4)}`
                                        }
                                    }}
                                />
                            </Box>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: alpha(statusColor.dark, 0.8),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.8,
                                    fontWeight: 500
                                }}
                            >
                                <CalendarTodayIcon sx={{ fontSize: '0.875rem' }} />
                                <Typography variant="body2" component="div">
                                    {formatDate(reservation.checkIn)} - {formatDate(reservation.checkOut)}
                                </Typography>
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={onClose}
                        sx={{
                            color: statusColor.dark,
                            backgroundColor: alpha('#fff', 0.3),
                            width: 42,
                            height: 42,
                            transition: 'all 0.2s',
                            '&:hover': {
                                backgroundColor: alpha('#fff', 0.4),
                                transform: 'scale(1.05)'
                            }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Body */}
                <DialogContent
                    sx={{
                        p: isMobile ? 0 : 0,
                        '&::-webkit-scrollbar': {
                            width: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.2),
                            borderRadius: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        }
                    }}
                >
                    <Box
                        sx={{
                            height: '100%',
                            p: isMobile ? 2 : isTablet ? 2.5 : 4,
                            overflow: 'auto',
                            backgroundColor: '#FBFCFF'
                        }}
                    >
                        {/* Informações da reserva - Cards */}
                        <Grid container spacing={isMobile ? 2 : isTablet ? 2.5 : 3} sx={{ mb: isMobile ? 3 : 4 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: '20px',
                                        height: '100%',
                                        overflow: 'hidden',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                                        }
                                    }}
                                >
                                    <Box sx={{ height: 6, backgroundColor: statusColor.main }} />
                                    <Box sx={{ p: 2.5 }}>
                                        <InfoItem
                                            icon={<CheckInIcon sx={{ color: statusColor.main }} />}
                                            label="Check-in"
                                            value={formatDate(reservation.checkIn)}
                                            isMobile={isMobile}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: '20px',
                                        height: '100%',
                                        overflow: 'hidden',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                                        }
                                    }}
                                >
                                    <Box sx={{ height: 6, backgroundColor: statusColor.main }} />
                                    <Box sx={{ p: 2.5 }}>
                                        <InfoItem
                                            icon={<CheckOutIcon sx={{ color: statusColor.main }} />}
                                            label="Check-out"
                                            value={formatDate(reservation.checkOut)}
                                            isMobile={isMobile}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: '20px',
                                        height: '100%',
                                        overflow: 'hidden',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                                        }
                                    }}
                                >
                                    <Box sx={{ height: 6, backgroundColor: statusColor.main }} />
                                    <Box sx={{ p: 2.5 }}>
                                        <InfoItem
                                            icon={<PeopleIcon sx={{ color: statusColor.main }} />}
                                            label="Hóspedes"
                                            value={`${reservation.guests} ${reservation.guests === 1 ? 'hóspede' : 'hóspedes'}`}
                                            isMobile={isMobile}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: '20px',
                                        height: '100%',
                                        overflow: 'hidden',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)'
                                        }
                                    }}
                                >
                                    <Box sx={{ height: 6, backgroundColor: '#10B981' }} />
                                    <Box sx={{ p: 2.5 }}>
                                        <InfoItem
                                            icon={<AttachMoneyIcon sx={{ color: '#10B981' }} />}
                                            label="Valor Total"
                                            value={formatCurrency(reservation.totalAmount)}
                                            isMobile={isMobile}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Informações da Propriedade */}
                        {property && (
                            <Box sx={{ mb: 4 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 3,
                                        position: 'relative',
                                        paddingLeft: 2,
                                        '&:before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            height: '80%',
                                            width: 6,
                                            borderRadius: 8,
                                            backgroundColor: theme.palette.primary.main,
                                        }
                                    }}
                                >
                                    <HomeIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                                    Propriedade
                                </Typography>

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 0,
                                        borderRadius: '24px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        backdropFilter: 'blur(20px)',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                                            transform: 'translateY(-4px)'
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            p: 3.5,
                                            backgroundImage: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
                                            borderBottom: `1px solid ${theme.palette.grey[200]}`
                                        }}
                                    >
                                        <Grid container spacing={isMobile ? 2 : isTablet ? 2.5 : 3}>
                                            <Grid item xs={12} sm={8}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Avatar
                                                        sx={{
                                                            width: 60,
                                                            height: 60,
                                                            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                                            border: '3px solid white',
                                                            bgcolor: theme.palette.primary.main,
                                                            mr: 2
                                                        }}
                                                    >
                                                        <HomeIcon />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: theme.palette.grey[800],
                                                                letterSpacing: '-0.02em'
                                                            }}
                                                        >
                                                            {property.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                                                            <LocationOnIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                {property.address}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={12} sm={4}>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <Box sx={{ textAlign: 'center' }}>
                                                        <BedIcon sx={{ color: theme.palette.primary.main, mb: 0.5 }} />
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {property.bedrooms}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Quartos
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ textAlign: 'center' }}>
                                                        <BathtubIcon sx={{ color: theme.palette.primary.main, mb: 0.5 }} />
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {property.bathrooms}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Banheiros
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Paper>
                            </Box>
                        )}

                        {/* Informações do Cliente */}
                        {client && (
                            <Box sx={{ mb: 4 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 3,
                                        position: 'relative',
                                        paddingLeft: 2,
                                        '&:before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            height: '80%',
                                            width: 6,
                                            borderRadius: 8,
                                            backgroundColor: theme.palette.primary.main,
                                        }
                                    }}
                                >
                                    <PersonIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
                                    Cliente
                                </Typography>

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3.5,
                                        borderRadius: '24px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        backdropFilter: 'blur(20px)',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                                        transition: 'all 0.3s',
                                        '&:hover': {
                                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                                            transform: 'translateY(-4px)'
                                        }
                                    }}
                                >
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Avatar
                                                    sx={{
                                                        width: 60,
                                                        height: 60,
                                                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                                        border: '3px solid white',
                                                        bgcolor: theme.palette.secondary.main,
                                                        mr: 2
                                                    }}
                                                >
                                                    {client.name.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: theme.palette.grey[800],
                                                            letterSpacing: '-0.02em'
                                                        }}
                                                    >
                                                        {client.name}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                {client.phone && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <PhoneIcon sx={{ color: theme.palette.primary.main }} />
                                                        <Typography variant="body1" fontWeight={500}>
                                                            {client.phone}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {client.email && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <EmailIcon sx={{ color: theme.palette.primary.main }} />
                                                        <Typography variant="body1" fontWeight={500}>
                                                            {client.email}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Box>
                        )}

                        {/* Detalhes Financeiros */}
                        <Box sx={{ mb: 4 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    color: 'text.primary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 3,
                                    position: 'relative',
                                    paddingLeft: 2,
                                    '&:before': {
                                        content: '""',
                                        position: 'absolute',
                                        left: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        height: '80%',
                                        width: 6,
                                        borderRadius: 8,
                                        backgroundColor: '#10B981',
                                    }
                                }}
                            >
                                <AttachMoneyIcon sx={{ mr: 1.5, color: '#10B981' }} />
                                Detalhes Financeiros
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #EAECEF' }}>
                                        <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Valor Total
                                            </Typography>
                                            <Typography variant="h6" fontWeight={700} color="#10B981">
                                                {formatCurrency(reservation.totalAmount)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #EAECEF' }}>
                                        <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Valor Pago
                                            </Typography>
                                            <Typography variant="h6" fontWeight={700} color="#10B981">
                                                {formatCurrency(reservation.paidAmount)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #EAECEF' }}>
                                        <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Pendente
                                            </Typography>
                                            <Typography variant="h6" fontWeight={700} color="#F59E0B">
                                                {formatCurrency(reservation.pendingAmount)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #EAECEF' }}>
                                        <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Pagamento
                                            </Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {PAYMENT_METHOD_LABELS[reservation.paymentMethod]}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Observações */}
                        {(reservation.specialRequests || reservation.observations) && (
                            <Box sx={{ mb: 4 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 700,
                                        color: 'text.primary',
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 3,
                                        position: 'relative',
                                        paddingLeft: 2,
                                        '&:before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            height: '80%',
                                            width: 6,
                                            borderRadius: 8,
                                            backgroundColor: theme.palette.primary.main,
                                        }
                                    }}
                                >
                                    Observações
                                </Typography>

                                <Grid container spacing={3}>
                                    {reservation.specialRequests && (
                                        <Grid item xs={12} sm={6}>
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    borderRadius: '16px',
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    backdropFilter: 'blur(20px)',
                                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                                }}
                                            >
                                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                                                    Solicitações Especiais
                                                </Typography>
                                                <Typography variant="body2">
                                                    {reservation.specialRequests}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    )}

                                    {reservation.observations && (
                                        <Grid item xs={12} sm={6}>
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    borderRadius: '16px',
                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                    backdropFilter: 'blur(20px)',
                                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                                }}
                                            >
                                                <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                                                    Observações Internas
                                                </Typography>
                                                <Typography variant="body2">
                                                    {reservation.observations}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        )}
                    </Box>
                </DialogContent>

                {/* Footer */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: isMobile ? 2 : 0,
                        p: isMobile ? 2 : isTablet ? 2.5 : 3.5,
                        borderTop: '1px solid #EAECEF',
                        backgroundColor: 'white'
                    }}
                >
                    {statusChangeConfirm ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                    mr: 2.5,
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                                }}
                            >
                                <WarningIcon sx={{ color: theme.palette.primary.main, fontSize: '1.5rem' }} />
                            </Box>
                            <Typography sx={{ 
                                color: theme.palette.primary.main, 
                                fontWeight: 600, 
                                mr: 'auto', 
                                letterSpacing: '-0.01em',
                                fontSize: isMobile ? '14px' : '16px'
                            }}>
                                Alterar status da reserva para "{RESERVATION_STATUS_LABELS[statusChangeConfirm]}"?
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={handleStatusChangeCancel}
                                size={isMobile ? "medium" : "large"}
                                sx={{
                                    mr: isMobile ? 0 : 1.5,
                                    borderColor: theme.palette.grey[300],
                                    color: theme.palette.grey[700],
                                    minWidth: isMobile ? 'auto' : 100,
                                    borderRadius: '12px',
                                    fontSize: isMobile ? '14px' : '16px'
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleStatusChangeConfirm}
                                size={isMobile ? "medium" : "large"}
                                sx={{
                                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    minWidth: isMobile ? 'auto' : 120,
                                    borderRadius: '12px',
                                    fontSize: isMobile ? '14px' : '16px',
                                    mt: isMobile ? 1 : 0
                                }}
                            >
                                Confirmar
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ 
                                width: '100%', 
                                display: 'flex', 
                                flexDirection: isMobile ? 'column' : 'row',
                                justifyContent: 'flex-end', 
                                gap: isMobile ? 1.5 : 1.5 
                            }}>
                                {reservation.status !== ReservationStatus.CHECKED_OUT && 
                                 reservation.status !== ReservationStatus.CANCELLED && (
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        {reservation.status === ReservationStatus.PENDING && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<CheckCircleOutlineIcon />}
                                                onClick={() => handleStatusChangeClick(ReservationStatus.CONFIRMED)}
                                                sx={{
                                                    borderColor: '#10B981',
                                                    color: '#10B981',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#10B981', 0.04),
                                                        borderColor: '#059669',
                                                        boxShadow: `0 6px 16px ${alpha('#10B981', 0.2)}`
                                                    }
                                                }}
                                            >
                                                Confirmar
                                            </Button>
                                        )}

                                        {reservation.status === ReservationStatus.CONFIRMED && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<CheckInIcon />}
                                                onClick={() => handleStatusChangeClick(ReservationStatus.CHECKED_IN)}
                                                sx={{
                                                    borderColor: '#3B82F6',
                                                    color: '#3B82F6',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#3B82F6', 0.04),
                                                        borderColor: '#1D4ED8',
                                                        boxShadow: `0 6px 16px ${alpha('#3B82F6', 0.2)}`
                                                    }
                                                }}
                                            >
                                                Check-in
                                            </Button>
                                        )}

                                        {reservation.status === ReservationStatus.CHECKED_IN && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<CheckOutIcon />}
                                                onClick={() => handleStatusChangeClick(ReservationStatus.CHECKED_OUT)}
                                                sx={{
                                                    borderColor: '#8B5CF6',
                                                    color: '#8B5CF6',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#8B5CF6', 0.04),
                                                        borderColor: '#7C3AED',
                                                        boxShadow: `0 6px 16px ${alpha('#8B5CF6', 0.2)}`
                                                    }
                                                }}
                                            >
                                                Check-out
                                            </Button>
                                        )}

                                        {reservation.status !== ReservationStatus.CANCELLED && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<CancelOutlinedIcon />}
                                                onClick={() => handleStatusChangeClick(ReservationStatus.CANCELLED)}
                                                sx={{
                                                    borderColor: '#EF4444',
                                                    color: '#EF4444',
                                                    '&:hover': {
                                                        backgroundColor: alpha('#EF4444', 0.04),
                                                        borderColor: '#DC2626',
                                                        boxShadow: `0 6px 16px ${alpha('#EF4444', 0.2)}`
                                                    }
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                        )}
                                    </Box>
                                )}

                                <Button
                                    variant="contained"
                                    startIcon={<EditIcon />}
                                    onClick={handleEdit}
                                    sx={{
                                        backgroundColor: statusColor.main,
                                        color: 'white',
                                        boxShadow: `0 6px 16px ${alpha(statusColor.main, 0.3)}`,
                                        '&:hover': {
                                            backgroundColor: statusColor.dark,
                                            boxShadow: `0 8px 24px ${alpha(statusColor.main, 0.4)}`
                                        },
                                        fontSize: '0.95rem',
                                        height: 46
                                    }}
                                >
                                    Editar Reserva
                                </Button>
                            </Box>
                        </>
                    )}
                </Box>
            </Dialog>
        </ThemeProvider>
    );
};

export default ViewReservationDialog;