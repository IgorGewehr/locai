'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  AttachMoney,
  Weekend,
  EventBusy,
  Celebration,
  TrendingUp,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWeekend, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PricingCalendarProps {
  basePrice: number;
  specialPrices: Record<string, number>;
  onPricesChange: (prices: Record<string, number>) => void;
  weekendSurcharge?: number;
  holidaySurcharge?: number;
  decemberSurcharge?: number;
}

type SelectionMode = 'single' | 'range';

const brazilianHolidays: Record<string, string> = {
  '01-01': 'Ano Novo',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '12-25': 'Natal',
};

const PricingCalendar: React.FC<PricingCalendarProps> = ({
  basePrice,
  specialPrices,
  onPricesChange,
  weekendSurcharge = 30,
  holidaySurcharge = 50,
  decemberSurcharge = 10,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [applyToWeekends, setApplyToWeekends] = useState(false);
  const [applyToHolidays, setApplyToHolidays] = useState(false);
  const [percentageIncrease, setPercentageIncrease] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const isHoliday = (date: Date): boolean => {
    const monthDay = format(date, 'MM-dd');
    return monthDay in brazilianHolidays;
  };

  const getHolidayName = (date: Date): string => {
    const monthDay = format(date, 'MM-dd');
    return brazilianHolidays[monthDay] || '';
  };

  const getPriceForDate = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return specialPrices[dateKey] || basePrice || 0;
  };

  const handleDateClick = (date: Date) => {
    if (selectionMode === 'single') {
      setSelectedDate(date);
      setPriceInput(getPriceForDate(date).toString());
      setDialogOpen(true);
    } else {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(date);
        setRangeEnd(null);
      } else {
        if (date >= rangeStart) {
          setRangeEnd(date);
          setPriceInput('');
          setDialogOpen(true);
        } else {
          setRangeStart(date);
          setRangeEnd(null);
        }
      }
    }
  };

  const handlePriceSubmit = () => {
    const newPrices = { ...specialPrices };
    
    if (selectionMode === 'single' && selectedDate) {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      const price = parseFloat(priceInput);
      if (!isNaN(price) && price > 0) {
        newPrices[dateKey] = price;
      } else {
        delete newPrices[dateKey];
      }
    } else if (selectionMode === 'range' && rangeStart && rangeEnd) {
      const dates = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      let price = parseFloat(priceInput);
      
      if (percentageIncrease) {
        const percentage = parseFloat(percentageIncrease);
        if (!isNaN(percentage)) {
          price = (basePrice || 0) * (1 + percentage / 100);
        }
      }
      
      dates.forEach(date => {
        const shouldApply = 
          (!applyToWeekends && !applyToHolidays) ||
          (applyToWeekends && isWeekend(date)) ||
          (applyToHolidays && isHoliday(date));
          
        if (shouldApply && !isNaN(price) && price > 0) {
          const dateKey = format(date, 'yyyy-MM-dd');
          newPrices[dateKey] = price;
        }
      });
    }
    
    onPricesChange(newPrices);
    handleDialogClose();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDate(null);
    setRangeStart(null);
    setRangeEnd(null);
    setPriceInput('');
    setPercentageIncrease('');
    setApplyToWeekends(false);
    setApplyToHolidays(false);
  };

  const handleQuickPreset = (preset: 'weekend' | 'holiday' | 'december') => {
    const newPrices = { ...specialPrices };
    
    if (preset === 'weekend') {
      days.forEach(date => {
        if (isWeekend(date) && isSameMonth(date, currentMonth)) {
          const dateKey = format(date, 'yyyy-MM-dd');
          newPrices[dateKey] = (basePrice || 0) * (1 + weekendSurcharge / 100);
        }
      });
    } else if (preset === 'holiday') {
      days.forEach(date => {
        if (isHoliday(date) && isSameMonth(date, currentMonth)) {
          const dateKey = format(date, 'yyyy-MM-dd');
          newPrices[dateKey] = (basePrice || 0) * (1 + holidaySurcharge / 100);
        }
      });
    } else if (preset === 'december') {
      const year = currentMonth.getFullYear();
      const december = new Date(year, 11, 1);
      const decemberDays = eachDayOfInterval({
        start: startOfMonth(december),
        end: endOfMonth(december),
      });
      decemberDays.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        newPrices[dateKey] = (basePrice || 0) * (1 + decemberSurcharge / 100);
      });
    }
    
    onPricesChange(newPrices);
  };

  const isDateInRange = (date: Date): boolean => {
    if (!rangeStart || !rangeEnd) return false;
    return date >= rangeStart && date <= rangeEnd;
  };

  return (
    <Box>
      <Stack spacing={2}>
        {/* Header Controls */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Valores das Diárias</Typography>
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
              <Tooltip title={`Aplicar ${weekendSurcharge}% de aumento nos fins de semana`}>
                <Chip
                  icon={<Weekend />}
                  label={`Fins de Semana (+${weekendSurcharge}%)`}
                  onClick={() => handleQuickPreset('weekend')}
                  color="primary"
                  variant="outlined"
                  clickable
                />
              </Tooltip>
              <Tooltip title={`Aplicar ${holidaySurcharge}% de aumento nos feriados`}>
                <Chip
                  icon={<Celebration />}
                  label={`Feriados (+${holidaySurcharge}%)`}
                  onClick={() => handleQuickPreset('holiday')}
                  color="secondary"
                  variant="outlined"
                  clickable
                />
              </Tooltip>
              <Tooltip title={`Aplicar ${decemberSurcharge}% de aumento em dezembro`}>
                <Chip
                  icon={<TrendingUp />}
                  label={`Dezembro (+${decemberSurcharge}%)`}
                  onClick={() => handleQuickPreset('december')}
                  color="success"
                  variant="outlined"
                  clickable
                />
              </Tooltip>
            </Stack>
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
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isInRange = isDateInRange(date);
              const isRangeStart = rangeStart && isSameDay(date, rangeStart);
              const isRangeEnd = rangeEnd && isSameDay(date, rangeEnd);
              const dateIsWeekend = isWeekend(date);
              const dateIsHoliday = isHoliday(date);
              const price = getPriceForDate(date);
              const hasSpecialPrice = price !== (basePrice || 0);
              
              return (
                <Tooltip
                  key={index}
                  title={
                    dateIsHoliday ? getHolidayName(date) : 
                    hasSpecialPrice ? `R$ ${price.toFixed(2)}` : ''
                  }
                  arrow
                >
                  <Paper
                    elevation={isSelected || isInRange ? 2 : 0}
                    onClick={() => isCurrentMonth && handleDateClick(date)}
                    sx={{
                      p: 1,
                      minHeight: 70,
                      cursor: isCurrentMonth ? 'pointer' : 'default',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      bgcolor: 
                        isSelected || isRangeStart || isRangeEnd ? 'primary.main' :
                        isInRange ? 'primary.light' :
                        dateIsHoliday ? 'warning.light' :
                        dateIsWeekend ? 'action.hover' :
                        'background.paper',
                      color: 
                        isSelected || isRangeStart || isRangeEnd ? 'primary.contrastText' :
                        isInRange ? 'primary.contrastText' :
                        'text.primary',
                      border: isToday ? 2 : 0,
                      borderColor: 'primary.main',
                      '&:hover': isCurrentMonth ? {
                        bgcolor: 'action.selected',
                        transform: 'scale(1.05)',
                      } : {},
                      transition: 'all 0.2s',
                    }}
                  >
                    <Stack spacing={0.5} alignItems="center">
                      <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
                        {format(date, 'd')}
                      </Typography>
                      {hasSpecialPrice && (
                        <Typography variant="caption" fontWeight="bold">
                          R$ {price.toFixed(0)}
                        </Typography>
                      )}
                      {dateIsHoliday && <EventBusy fontSize="small" />}
                    </Stack>
                  </Paper>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Stack>

      {/* Price Setting Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectionMode === 'single' && selectedDate
            ? `Definir preço para ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}`
            : rangeStart && rangeEnd
            ? `Definir preço de ${format(rangeStart, 'dd/MM')} a ${format(rangeEnd, 'dd/MM')}`
            : 'Definir preço'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Valor da diária"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText={`Valor base: R$ ${(basePrice || 0).toFixed(2)}`}
            />
            
            {selectionMode === 'range' && (
              <>
                <TextField
                  fullWidth
                  label="Ou aplicar aumento percentual"
                  value={percentageIncrease}
                  onChange={(e) => setPercentageIncrease(e.target.value)}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  helperText="Deixe em branco para usar o valor fixo acima"
                />
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Aplicar apenas em:
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={applyToWeekends}
                          onChange={(e) => setApplyToWeekends(e.target.checked)}
                        />
                      }
                      label="Fins de semana"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={applyToHolidays}
                          onChange={(e) => setApplyToHolidays(e.target.checked)}
                        />
                      }
                      label="Feriados"
                    />
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancelar</Button>
          <Button 
            onClick={handlePriceSubmit} 
            variant="contained"
            disabled={!priceInput && !percentageIncrease}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PricingCalendar;