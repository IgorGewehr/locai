'use client';

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  IconButton,
  Chip,
  Button,
  Stack,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Block,
  EventAvailable,
  Info,
  Clear,
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
  isToday,
  isBefore,
  startOfDay,
  isWeekend,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isHoliday } from '@/lib/utils/holidays';

interface SimpleAvailabilityPickerProps {
  unavailableDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  minDate?: Date;
  maxMonthsAhead?: number;
  showLegend?: boolean;
  height?: number;
}

export default function SimpleAvailabilityPicker({
  unavailableDates = [],
  onDatesChange,
  minDate = new Date(),
  maxMonthsAhead = 12,
  showLegend = true,
  height = 400,
}: SimpleAvailabilityPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Navigate months
  const handlePreviousMonth = () => {
    const prevMonth = subMonths(currentMonth, 1);
    if (!isBefore(prevMonth, startOfMonth(minDate))) {
      setCurrentMonth(prevMonth);
    }
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    const maxDate = addMonths(minDate, maxMonthsAhead);
    if (!isBefore(maxDate, nextMonth)) {
      setCurrentMonth(nextMonth);
    }
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Toggle date selection
  const handleDateClick = (date: Date) => {
    // Don't allow selecting past dates
    if (isBefore(date, startOfDay(minDate))) return;

    const isBlocked = unavailableDates.some(d => isSameDay(d, date));
    
    if (isBlocked) {
      // Remove from blocked dates
      const newDates = unavailableDates.filter(d => !isSameDay(d, date));
      onDatesChange(newDates);
    } else {
      // Add to blocked dates
      onDatesChange([...unavailableDates, date]);
    }
  };

  // Bulk selection handlers
  const handleSelectWeekends = () => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const weekendDays = monthDays.filter(day => 
      isWeekend(day) && !isBefore(day, startOfDay(minDate))
    );
    
    // Add weekends that aren't already blocked
    const newBlockedDates = [...unavailableDates];
    weekendDays.forEach(day => {
      if (!unavailableDates.some(d => isSameDay(d, day))) {
        newBlockedDates.push(day);
      }
    });
    
    onDatesChange(newBlockedDates);
  };

  const handleSelectHolidays = () => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const holidayDays = monthDays.filter(day => 
      isHoliday(day) && !isBefore(day, startOfDay(minDate))
    );
    
    // Add holidays that aren't already blocked
    const newBlockedDates = [...unavailableDates];
    holidayDays.forEach(day => {
      if (!unavailableDates.some(d => isSameDay(d, day))) {
        newBlockedDates.push(day);
      }
    });
    
    onDatesChange(newBlockedDates);
  };

  const handleClearMonth = () => {
    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);
    
    // Remove all blocked dates from current month
    const newBlockedDates = unavailableDates.filter(date => 
      !isSameDay(date, startDate) && !isBefore(date, startDate) && !isBefore(endDate, date)
    );
    
    onDatesChange(newBlockedDates);
  };

  const handleClearAll = () => {
    onDatesChange([]);
  };

  // Get calendar days for current month view
  const getCalendarDays = () => {
    const startDate = startOfWeek(startOfMonth(currentMonth), { locale: ptBR });
    const endDate = endOfWeek(endOfMonth(currentMonth), { locale: ptBR });
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return allDays.map(date => {
      const isBlocked = unavailableDates.some(d => isSameDay(d, date));
      const isSelected = selectedDates.some(d => isSameDay(d, date));
      const isCurrentMonth = isSameMonth(date, currentMonth);
      const isTodayDate = isToday(date);
      const isPastDate = isBefore(date, startOfDay(minDate));
      const isWeekendDay = isWeekend(date);
      const isHolidayDay = isHoliday(date);

      return {
        date,
        isBlocked,
        isSelected,
        isCurrentMonth,
        isToday: isTodayDate,
        isPast: isPastDate,
        isWeekend: isWeekendDay,
        isHoliday: isHolidayDay,
      };
    });
  };

  // Render individual day cell
  const renderDayCell = (day: ReturnType<typeof getCalendarDays>[0]) => {
    const { 
      date, 
      isBlocked, 
      isCurrentMonth, 
      isToday: isTodayDate, 
      isPast,
      isWeekend: isWeekendDay,
      isHoliday: isHolidayDay
    } = day;

    let bgColor = 'background.paper';
    let textColor = 'text.primary';
    let borderColor = 'divider';
    
    if (isBlocked) {
      bgColor = 'error.light';
      textColor = 'error.contrastText';
    } else if (isHolidayDay) {
      bgColor = 'warning.light';
      textColor = 'warning.contrastText';
    } else if (isWeekendDay) {
      bgColor = 'info.light';
      textColor = 'info.contrastText';
    }
    
    if (isPast) {
      bgColor = 'action.disabledBackground';
      textColor = 'text.disabled';
    }

    return (
      <Paper
        key={date.toISOString()}
        sx={{
          minHeight: 40,
          p: 0.5,
          cursor: isPast ? 'not-allowed' : 'pointer',
          bgcolor: bgColor,
          color: textColor,
          border: '1px solid',
          borderColor: isTodayDate ? 'primary.main' : borderColor,
          borderWidth: isTodayDate ? 2 : 1,
          opacity: isCurrentMonth ? 1 : 0.5,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': isPast ? {} : {
            transform: 'scale(1.05)',
            boxShadow: 2,
            borderColor: 'primary.main'
          },
        }}
        onClick={() => !isPast && handleDateClick(date)}
      >
        <Typography 
          variant="body2" 
          fontWeight={isTodayDate ? 700 : 500}
        >
          {format(date, 'd')}
        </Typography>
      </Paper>
    );
  };

  const calendarDays = getCalendarDays();
  const blockedCount = unavailableDates.length;

  return (
    <Box>
      {/* Header Controls */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handlePreviousMonth} size="small">
              <ChevronLeft />
            </IconButton>
            
            <Typography variant="h6" sx={{ minWidth: 150, textAlign: 'center' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            
            <IconButton onClick={handleNextMonth} size="small">
              <ChevronRight />
            </IconButton>
            
            <IconButton onClick={handleToday} size="small" color="primary">
              <Today />
            </IconButton>
          </Box>

          <Chip 
            label={`${blockedCount} dias bloqueados`}
            color={blockedCount > 0 ? "error" : "default"}
            size="small"
          />
        </Box>

        {/* Quick Actions */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Block />}
            onClick={handleSelectWeekends}
          >
            Bloquear Fins de Semana
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Block />}
            onClick={handleSelectHolidays}
          >
            Bloquear Feriados
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Clear />}
            onClick={handleClearMonth}
          >
            Limpar Mês
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Clear />}
            onClick={handleClearAll}
            disabled={blockedCount === 0}
          >
            Limpar Tudo
          </Button>
        </Stack>
      </Stack>

      {/* Calendar Grid */}
      <Paper sx={{ p: 2, height }}>
        {/* Weekday Headers */}
        <Grid container spacing={0.5} sx={{ mb: 1 }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <Grid item xs={12/7} key={day}>
              <Typography variant="caption" align="center" display="block" fontWeight={600}>
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar Days */}
        <Grid container spacing={0.5}>
          {calendarDays.map((day, index) => (
            <Grid item xs={12/7} key={index}>
              {renderDayCell(day)}
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Legend */}
      {showLegend && (
        <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: 'error.light', borderRadius: 0.5 }} />
            <Typography variant="caption">Bloqueado</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', borderRadius: 0.5 }} />
            <Typography variant="caption">Disponível</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: 'info.light', borderRadius: 0.5 }} />
            <Typography variant="caption">Fim de Semana</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: 'warning.light', borderRadius: 0.5 }} />
            <Typography variant="caption">Feriado</Typography>
          </Box>
        </Stack>
      )}

      {/* Info Alert */}
      <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
        Clique nos dias para bloquear ou desbloquear. Dias bloqueados não estarão disponíveis para reserva.
      </Alert>
    </Box>
  );
}