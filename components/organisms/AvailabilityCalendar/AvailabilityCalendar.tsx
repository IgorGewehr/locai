'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Event,
  EventAvailable,
  EventBusy,
  Build,
  Block,
  Today,
  Refresh,
  Save,
} from '@mui/icons-material';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AvailabilityStatus, AvailabilityCalendarDay, CalendarSyncStatus } from '@/lib/types/availability';
import { AvailabilityService } from '@/lib/services/availability-service';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';

interface AvailabilityCalendarProps {
  propertyId: string;
  onDateSelect?: (dates: Date[]) => void;
  onStatusChange?: (dates: Date[], status: AvailabilityStatus) => void;
  readOnly?: boolean;
  height?: number;
  showLegend?: boolean;
  showStats?: boolean;
}

const statusConfig = {
  [AvailabilityStatus.AVAILABLE]: {
    color: '#4caf50',
    bgColor: '#e8f5e8',
    icon: <EventAvailable />,
    label: 'Disponível'
  },
  [AvailabilityStatus.RESERVED]: {
    color: '#ff9800',
    bgColor: '#fff3e0',
    icon: <Event />,
    label: 'Reservado'
  },
  [AvailabilityStatus.BLOCKED]: {
    color: '#f44336',
    bgColor: '#ffebee',
    icon: <Block />,
    label: 'Bloqueado'
  },
  [AvailabilityStatus.MAINTENANCE]: {
    color: '#9c27b0',
    bgColor: '#f3e5f5',
    icon: <Build />,
    label: 'Manutenção'
  },
  [AvailabilityStatus.PENDING]: {
    color: '#ff5722',
    bgColor: '#fbe9e7',
    icon: <EventBusy />,
    label: 'Pendente'
  }
};

export default function AvailabilityCalendar({
  propertyId,
  onDateSelect,
  onStatusChange,
  readOnly = false,
  height = 600,
  showLegend = true,
  showStats = true
}: AvailabilityCalendarProps) {
  const { tenantId } = useTenant();
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [calendarData, setCalendarData] = useState<AvailabilityCalendarDay[]>([]);
  const [syncStatus, setSyncStatus] = useState<CalendarSyncStatus>(CalendarSyncStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // Update dialog state
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>(AvailabilityStatus.AVAILABLE);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    totalDays: 0,
    availableDays: 0,
    reservedDays: 0,
    blockedDays: 0,
    occupancyRate: 0
  });

  const availabilityService = tenantId ? new AvailabilityService(tenantId) : null;

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!availabilityService || !propertyId) return;

    try {
      setSyncStatus(CalendarSyncStatus.SYNCING);
      setError(null);

      const startDate = startOfWeek(startOfMonth(currentMonth), { locale: ptBR });
      const endDate = endOfWeek(endOfMonth(currentMonth), { locale: ptBR });

      const response = await availabilityService.getAvailability({
        propertyId,
        startDate,
        endDate,
        includeReservations: true,
        includePricing: true
      });

      setCalendarData(response.calendar);
      setStats(response.summary);
      setSyncStatus(CalendarSyncStatus.SUCCESS);

      logger.info('Calendar data loaded successfully', {
        propertyId,
        month: format(currentMonth, 'yyyy-MM'),
        daysLoaded: response.calendar.length
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar calendário';
      setError(errorMessage);
      setSyncStatus(CalendarSyncStatus.ERROR);
      
      logger.error('Error loading calendar data', {
        propertyId,
        error: errorMessage
      });
    }
  }, [availabilityService, propertyId, currentMonth]);

  // Load data when component mounts or month changes
  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Handle date selection
  const handleDateClick = (date: Date) => {
    if (readOnly) return;

    const isSelected = selectedDates.some(d => isSameDay(d, date));
    let newSelectedDates: Date[];

    if (isSelected) {
      newSelectedDates = selectedDates.filter(d => !isSameDay(d, date));
    } else {
      newSelectedDates = [...selectedDates, date];
    }

    setSelectedDates(newSelectedDates);
    onDateSelect?.(newSelectedDates);
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!availabilityService || selectedDates.length === 0) return;

    try {
      setSyncStatus(CalendarSyncStatus.SYNCING);
      
      await availabilityService.bulkUpdateAvailability({
        propertyId,
        updates: selectedDates.map(date => ({
          date,
          status: selectedStatus,
          reason: reason || undefined
        }))
      }, 'user');

      // Reload calendar data
      await loadCalendarData();
      
      // Clear selection and close dialog
      setSelectedDates([]);
      setUpdateDialogOpen(false);
      setReason('');
      setNotes('');
      
      onStatusChange?.(selectedDates, selectedStatus);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar disponibilidade';
      setError(errorMessage);
      setSyncStatus(CalendarSyncStatus.ERROR);
    }
  };

  // Get calendar days for current month view
  const getCalendarDays = () => {
    const startDate = startOfWeek(startOfMonth(currentMonth), { locale: ptBR });
    const endDate = endOfWeek(endOfMonth(currentMonth), { locale: ptBR });
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return allDays.map(date => {
      const dayData = calendarData.find(d => isSameDay(d.date, date));
      const isSelected = selectedDates.some(d => isSameDay(d, date));
      const isCurrentMonth = isSameMonth(date, currentMonth);
      const isTodayDate = isToday(date);

      return {
        date,
        data: dayData,
        isSelected,
        isCurrentMonth,
        isToday: isTodayDate
      };
    });
  };

  // Render individual day cell
  const renderDayCell = (day: ReturnType<typeof getCalendarDays>[0]) => {
    const { date, data, isSelected, isCurrentMonth, isToday: isTodayDate } = day;
    const status = data?.status || AvailabilityStatus.AVAILABLE;
    const config = statusConfig[status];

    return (
      <Paper
        key={date.toISOString()}
        sx={{
          minHeight: 48,
          p: 1,
          cursor: readOnly ? 'default' : 'pointer',
          bgcolor: isSelected 
            ? 'primary.main' 
            : isTodayDate 
              ? 'primary.50'
              : config.bgColor,
          color: isSelected 
            ? 'primary.contrastText'
            : isCurrentMonth 
              ? config.color 
              : 'text.disabled',
          border: '1px solid',
          borderColor: isTodayDate ? 'primary.main' : 'divider',
          borderWidth: isTodayDate ? 2 : 1,
          opacity: isCurrentMonth ? 1 : 0.5,
          transition: 'all 0.2s',
          '&:hover': readOnly ? {} : {
            transform: 'scale(1.05)',
            boxShadow: 2,
            borderColor: 'primary.main'
          },
          position: 'relative'
        }}
        onClick={() => handleDateClick(date)}
      >
        <Typography 
          variant="body2" 
          fontWeight={isTodayDate ? 700 : 500}
          align="center"
        >
          {format(date, 'd')}
        </Typography>
        
        {data?.reservationId && (
          <Tooltip title={`Reserva: ${data.reservationId.slice(-8)}`}>
            <Box
              sx={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'primary.main'
              }}
            />
          </Tooltip>
        )}
      </Paper>
    );
  };

  const calendarDays = getCalendarDays();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Calendário de Disponibilidade
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            {syncStatus === CalendarSyncStatus.SYNCING && (
              <CircularProgress size={20} />
            )}
            
            <IconButton onClick={loadCalendarData} size="small">
              <Refresh />
            </IconButton>
            
            {selectedDates.length > 0 && !readOnly && (
              <Button
                variant="contained"
                size="small"
                startIcon={<Save />}
                onClick={() => setUpdateDialogOpen(true)}
              >
                Atualizar ({selectedDates.length})
              </Button>
            )}
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Month Navigation */}
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
          <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </Typography>
          
          <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight />
          </IconButton>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<Today />}
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoje
          </Button>
        </Stack>
      </Box>

      {/* Stats */}
      {showStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Taxa de Ocupação
                </Typography>
                <Typography variant="h6" color="primary">
                  {stats.occupancyRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" color="success.main">
                  Disponível
                </Typography>
                <Typography variant="h6">
                  {stats.availableDays}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" color="warning.main">
                  Reservado
                </Typography>
                <Typography variant="h6">
                  {stats.reservedDays}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={3}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" color="error.main">
                  Bloqueado
                </Typography>
                <Typography variant="h6">
                  {stats.blockedDays}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Calendar Grid */}
      <Card variant="outlined" sx={{ height, overflow: 'hidden' }}>
        <CardContent sx={{ p: 2, height: '100%' }}>
          {/* Week headers */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Grid item xs={12/7} key={day}>
                <Typography 
                  variant="caption" 
                  fontWeight={600} 
                  align="center" 
                  display="block"
                  color="text.secondary"
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar days */}
          <Grid container spacing={1}>
            {calendarDays.map((day) => (
              <Grid item xs={12/7} key={day.date.toISOString()}>
                {renderDayCell(day)}
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Legend */}
      {showLegend && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Legenda:
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {Object.entries(statusConfig).map(([status, config]) => (
              <Chip
                key={status}
                icon={config.icon}
                label={config.label}
                size="small"
                sx={{
                  bgcolor: config.bgColor,
                  color: config.color,
                  '& .MuiChip-icon': {
                    color: config.color
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Atualizar Disponibilidade
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedDates.length} dia(s) selecionado(s)
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as AvailabilityStatus)}
              label="Status"
            >
              {Object.entries(statusConfig).map(([status, config]) => (
                <MenuItem key={status} value={status}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {config.icon}
                    <Typography>{config.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Manutenção programada, evento especial..."
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Observações (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações adicionais..."
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleStatusUpdate}
            disabled={syncStatus === CalendarSyncStatus.SYNCING}
          >
            {syncStatus === CalendarSyncStatus.SYNCING ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}