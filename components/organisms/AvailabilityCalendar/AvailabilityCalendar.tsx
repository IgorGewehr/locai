'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Tooltip,
  Button,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Block,
  CheckCircle,
  Info,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AvailabilityCalendarProps {
  unavailableDates: Date[];
  onDatesChange: (dates: Date[]) => void;
}

type SelectionMode = 'single' | 'range';

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  unavailableDates,
  onDatesChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const unavailableDateStrings = useMemo(() => {
    return new Set(unavailableDates.map(date => format(date, 'yyyy-MM-dd')));
  }, [unavailableDates]);

  const isDateUnavailable = (date: Date): boolean => {
    return unavailableDateStrings.has(format(date, 'yyyy-MM-dd'));
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;

    if (selectionMode === 'single') {
      const dateStr = format(date, 'yyyy-MM-dd');
      const newDates = [...unavailableDates];
      
      if (unavailableDateStrings.has(dateStr)) {
        // Remove date
        const index = newDates.findIndex(d => format(d, 'yyyy-MM-dd') === dateStr);
        if (index > -1) {
          newDates.splice(index, 1);
        }
      } else {
        // Add date
        newDates.push(date);
      }
      
      onDatesChange(newDates);
    } else {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(date);
        setRangeEnd(null);
      } else {
        if (date >= rangeStart) {
          setRangeEnd(date);
          // Apply range selection
          const rangeDates = eachDayOfInterval({ start: rangeStart, end: date });
          const newDates = [...unavailableDates];
          
          rangeDates.forEach(rangeDate => {
            if (!isPastDate(rangeDate)) {
              const dateStr = format(rangeDate, 'yyyy-MM-dd');
              if (!unavailableDateStrings.has(dateStr)) {
                newDates.push(rangeDate);
              }
            }
          });
          
          onDatesChange(newDates);
          setRangeStart(null);
          setRangeEnd(null);
        } else {
          setRangeStart(date);
          setRangeEnd(null);
        }
      }
    }
  };

  const clearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
  };

  const clearAllDates = () => {
    onDatesChange([]);
  };

  const isDateInRange = (date: Date): boolean => {
    if (!rangeStart || !rangeEnd) return false;
    return date >= rangeStart && date <= rangeEnd;
  };

  const getMonthSummary = () => {
    const monthDates = days.filter(date => isSameMonth(date, currentMonth));
    const unavailableCount = monthDates.filter(date => isDateUnavailable(date)).length;
    const availableCount = monthDates.filter(date => !isDateUnavailable(date) && !isPastDate(date)).length;
    
    return { unavailableCount, availableCount };
  };

  const { unavailableCount, availableCount } = getMonthSummary();

  return (
    <Box>
      <Stack spacing={2}>
        {/* Header Controls */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Disponibilidade</Typography>
              <ToggleButtonGroup
                value={selectionMode}
                exclusive
                onChange={(e, value) => value && setSelectionMode(value)}
                size="small"
              >
                <ToggleButton value="single">
                  <Typography variant="body2">Dia</Typography>
                </ToggleButton>
                <ToggleButton value="range">
                  <Typography variant="body2">Intervalo</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            
            <Stack direction="row" spacing={1}>
              {(rangeStart || rangeEnd) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={clearSelection}
                  startIcon={<Info />}
                >
                  Limpar Seleção
                </Button>
              )}
              {unavailableDates.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={clearAllDates}
                  startIcon={<Block />}
                >
                  Limpar Todas
                </Button>
              )}
            </Stack>
          </Stack>
          
          {/* Month Summary */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Chip
              size="small"
              icon={<Block />}
              label={`${unavailableCount} indisponíveis`}
              color="error"
              variant="outlined"
            />
            <Chip
              size="small"
              icon={<CheckCircle />}
              label={`${availableCount} disponíveis`}
              color="success"
              variant="outlined"
            />
          </Stack>
        </Paper>

        {/* Calendar Navigation */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h6">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </Typography>
          <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight />
          </IconButton>
        </Box>

        {/* Calendar Grid */}
        <Box>
          <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5} mb={1}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <Typography key={day} align="center" variant="caption" fontWeight="bold">
                {day}
              </Typography>
            ))}
          </Box>
          
          <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" gap={0.5}>
            {days.map((date, index) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());
              const isUnavailable = isDateUnavailable(date);
              const isPast = isPastDate(date);
              const isInRange = isDateInRange(date);
              const isRangeStart = rangeStart && isSameDay(date, rangeStart);
              const isRangeEnd = rangeEnd && isSameDay(date, rangeEnd);
              
              return (
                <Tooltip
                  key={index}
                  title={
                    isPast ? 'Data passada' :
                    isUnavailable ? 'Indisponível' :
                    'Disponível'
                  }
                  arrow
                >
                  <Paper
                    elevation={isInRange ? 2 : 0}
                    onClick={() => isCurrentMonth && !isPast && handleDateClick(date)}
                    sx={{
                      p: 1,
                      minHeight: 60,
                      cursor: isCurrentMonth && !isPast ? 'pointer' : 'default',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      bgcolor: 
                        isRangeStart || isRangeEnd ? 'primary.main' :
                        isInRange ? 'primary.light' :
                        isUnavailable ? 'error.light' :
                        isPast ? 'action.disabledBackground' :
                        'background.paper',
                      color: 
                        isRangeStart || isRangeEnd ? 'primary.contrastText' :
                        isInRange ? 'primary.contrastText' :
                        isUnavailable ? 'error.contrastText' :
                        isPast ? 'text.disabled' :
                        'text.primary',
                      border: isToday ? 2 : 0,
                      borderColor: 'primary.main',
                      position: 'relative',
                      '&:hover': isCurrentMonth && !isPast ? {
                        bgcolor: isUnavailable ? 'error.main' : 'action.hover',
                        transform: 'scale(1.05)',
                      } : {},
                      transition: 'all 0.2s',
                    }}
                  >
                    <Stack spacing={0.5} alignItems="center">
                      <Typography 
                        variant="body2" 
                        fontWeight={isToday ? 'bold' : 'normal'}
                      >
                        {format(date, 'd')}
                      </Typography>
                      {isUnavailable && (
                        <Block fontSize="small" />
                      )}
                    </Stack>
                  </Paper>
                </Tooltip>
              );
            })}
          </Box>
        </Box>

        {/* Legend */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" gutterBottom>
            Legenda:
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 20, height: 20, bgcolor: 'error.light', borderRadius: 1 }} />
              <Typography variant="caption">Indisponível</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 20, height: 20, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }} />
              <Typography variant="caption">Disponível</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 20, height: 20, bgcolor: 'action.disabledBackground', borderRadius: 1 }} />
              <Typography variant="caption">Data passada</Typography>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
};

export default AvailabilityCalendar;