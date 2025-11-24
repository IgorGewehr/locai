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

export interface ReservationPeriod {
  id: string;
  checkIn: Date;
  checkOut: Date;
  guestName?: string;
  status?: 'confirmed' | 'pending' | 'cancelled';
}

interface PricingCalendarProps {
  basePrice: number;
  specialPrices: Record<string, number>;
  onPricesChange?: (prices: Record<string, number>) => void;
  weekendSurcharge?: number;
  holidaySurcharge?: number;
  decemberSurcharge?: number;
  highSeasonSurcharge?: number;
  highSeasonMonths?: number[];
  reservations?: ReservationPeriod[];
  readOnly?: boolean;
  showReservations?: boolean;
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
  highSeasonSurcharge = 0,
  highSeasonMonths = [],
  reservations = [],
  readOnly = false,
  showReservations = true,
}) => {
  // Garantir que basePrice é sempre um número válido
  const safeBasePrice = Number(basePrice) || 0;
  const safeWeekendSurcharge = Number(weekendSurcharge) || 0;
  const safeHolidaySurcharge = Number(holidaySurcharge) || 0;
  const safeDecemberSurcharge = Number(decemberSurcharge) || 0;
  const safeHighSeasonSurcharge = Number(highSeasonSurcharge) || 0;
  const safeSpecialPrices = specialPrices || {};

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
    try {
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } catch (error) {
      return [];
    }
  }, [calendarStart, calendarEnd]);

  const isHoliday = (date: Date): boolean => {
    const monthDay = format(date, 'MM-dd');
    return monthDay in brazilianHolidays;
  };

  const getHolidayName = (date: Date): string => {
    const monthDay = format(date, 'MM-dd');
    return brazilianHolidays[monthDay] || '';
  };

  // Calcula o preço final para uma data (lógica igual ao pricing.ts)
  const getComputedPrice = (date: Date): {
    finalPrice: number;
    appliedRule: 'custom' | 'holiday' | 'weekend' | 'december' | 'highSeason' | 'base';
    surchargePercentage: number;
  } => {
    const dateKey = format(date, 'yyyy-MM-dd');

    // 1. Prioridade: Preço customizado
    if (safeSpecialPrices[dateKey]) {
      return {
        finalPrice: safeSpecialPrices[dateKey],
        appliedRule: 'custom',
        surchargePercentage: safeBasePrice > 0 ? ((safeSpecialPrices[dateKey] / safeBasePrice) - 1) * 100 : 0,
      };
    }

    // 2. Aplicar acréscimos automáticos (não-cumulativo - apenas o maior)
    const dateIsWeekend = isWeekend(date);
    const dateIsHoliday = isHoliday(date);
    const dateIsDecember = date.getMonth() === 11;
    const dateIsHighSeason = highSeasonMonths.includes(date.getMonth() + 1);

    let maxSurcharge = 0;
    let appliedRule: 'holiday' | 'weekend' | 'december' | 'highSeason' | 'base' = 'base';

    if (dateIsHoliday && safeHolidaySurcharge > maxSurcharge) {
      maxSurcharge = safeHolidaySurcharge;
      appliedRule = 'holiday';
    }

    if (dateIsWeekend && safeWeekendSurcharge > maxSurcharge) {
      maxSurcharge = safeWeekendSurcharge;
      appliedRule = 'weekend';
    }

    if (dateIsDecember && safeDecemberSurcharge > maxSurcharge) {
      maxSurcharge = safeDecemberSurcharge;
      appliedRule = 'december';
    }

    if (dateIsHighSeason && safeHighSeasonSurcharge > maxSurcharge) {
      maxSurcharge = safeHighSeasonSurcharge;
      appliedRule = 'highSeason';
    }

    const finalPrice = Math.round(safeBasePrice * (1 + maxSurcharge / 100));

    return {
      finalPrice,
      appliedRule,
      surchargePercentage: maxSurcharge,
    };
  };

  const getPriceForDate = (date: Date): number => {
    return getComputedPrice(date).finalPrice;
  };

  // Verifica se uma data tem reserva
  const getReservationForDate = (date: Date): ReservationPeriod | null => {
    if (!showReservations || reservations.length === 0) return null;

    return reservations.find(reservation => {
      const checkIn = new Date(reservation.checkIn);
      const checkOut = new Date(reservation.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      return date >= checkIn && date < checkOut;
    }) || null;
  };

  const isDateReserved = (date: Date): boolean => {
    return getReservationForDate(date) !== null;
  };

  const handleDateClick = (date: Date) => {
    // Não permite edição se readOnly ou se data está reservada
    if (readOnly || isDateReserved(date)) {
      return;
    }

    if (selectionMode === 'single') {
      setSelectedDate(date);
      const dateKey = format(date, 'yyyy-MM-dd');
      setPriceInput(safeSpecialPrices[dateKey]?.toString() || '');
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
    if (!onPricesChange) return;

    const newPrices = { ...safeSpecialPrices };

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
          price = safeBasePrice * (1 + percentage / 100);
        }
      }

      dates.forEach(date => {
        // Não aplica em datas reservadas
        if (isDateReserved(date)) return;

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
    const newPrices = { ...safeSpecialPrices };

    if (preset === 'weekend') {
      if (days && days.length > 0) {
        days.forEach(date => {
          if (isWeekend(date) && isSameMonth(date, currentMonth)) {
            const dateKey = format(date, 'yyyy-MM-dd');
            newPrices[dateKey] = safeBasePrice * (1 + safeWeekendSurcharge / 100);
          }
        });
      }
    } else if (preset === 'holiday') {
      if (days && days.length > 0) {
        days.forEach(date => {
          if (isHoliday(date) && isSameMonth(date, currentMonth)) {
            const dateKey = format(date, 'yyyy-MM-dd');
            newPrices[dateKey] = safeBasePrice * (1 + safeHolidaySurcharge / 100);
          }
        });
      }
    } else if (preset === 'december') {
      const year = currentMonth.getFullYear();
      const december = new Date(year, 11, 1);
      const decemberDays = eachDayOfInterval({
        start: startOfMonth(december),
        end: endOfMonth(december),
      });
      decemberDays.forEach(date => {
        const dateKey = format(date, 'yyyy-MM-dd');
        newPrices[dateKey] = safeBasePrice * (1 + safeDecemberSurcharge / 100);
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
              <Typography variant="h6">
                {readOnly ? 'Visualização de Preços' : 'Valores das Diárias'}
              </Typography>
              {!readOnly && (
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
              )}
            </Stack>

            {!readOnly && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Tooltip title={`Aplicar ${safeWeekendSurcharge}% de aumento nos fins de semana`}>
                  <Chip
                    icon={<Weekend />}
                    label={`FDS (+${safeWeekendSurcharge}%)`}
                    onClick={() => handleQuickPreset('weekend')}
                    color="primary"
                    variant="outlined"
                    clickable
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={`Aplicar ${safeHolidaySurcharge}% de aumento nos feriados`}>
                  <Chip
                    icon={<Celebration />}
                    label={`Feriados (+${safeHolidaySurcharge}%)`}
                    onClick={() => handleQuickPreset('holiday')}
                    color="secondary"
                    variant="outlined"
                    clickable
                    size="small"
                  />
                </Tooltip>
                <Tooltip title={`Aplicar ${safeDecemberSurcharge}% de aumento em dezembro`}>
                  <Chip
                    icon={<TrendingUp />}
                    label={`Dez (+${safeDecemberSurcharge}%)`}
                    onClick={() => handleQuickPreset('december')}
                    color="success"
                    variant="outlined"
                    clickable
                    size="small"
                  />
                </Tooltip>
              </Stack>
            )}
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
            {days && days.length > 0 && days.map((date, index) => {
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isInRange = isDateInRange(date);
              const isRangeStart = rangeStart && isSameDay(date, rangeStart);
              const isRangeEnd = rangeEnd && isSameDay(date, rangeEnd);
              const dateIsWeekend = isWeekend(date);
              const dateIsHoliday = isHoliday(date);

              // Usar o preço computado com acréscimos
              const { finalPrice, appliedRule, surchargePercentage } = getComputedPrice(date);
              const dateKey = format(date, 'yyyy-MM-dd');
              const hasCustomPrice = !!safeSpecialPrices[dateKey];

              // Verificar se tem reserva
              const reservation = getReservationForDate(date);
              const hasReservation = !!reservation;

              return (
                <Tooltip
                  key={index}
                  title={
                    <Stack spacing={0.5}>
                      {hasReservation && (
                        <Typography variant="caption" fontWeight={600} color="error.light">
                          Reservado{reservation?.guestName ? ` - ${reservation.guestName}` : ''}
                        </Typography>
                      )}
                      {dateIsHoliday && (
                        <Typography variant="caption">🎉 {getHolidayName(date)}</Typography>
                      )}
                      <Typography variant="caption">
                        R$ {finalPrice.toFixed(2)}
                        {surchargePercentage > 0 && ` (+${surchargePercentage.toFixed(0)}%)`}
                      </Typography>
                      {hasCustomPrice && (
                        <Typography variant="caption" color="secondary.light">Preço customizado</Typography>
                      )}
                    </Stack>
                  }
                  arrow
                >
                  <Paper
                    elevation={isSelected || isInRange ? 2 : 0}
                    onClick={() => isCurrentMonth && handleDateClick(date)}
                    sx={{
                      p: 0.5,
                      minHeight: 70,
                      cursor: isCurrentMonth && !readOnly && !hasReservation ? 'pointer' : 'default',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      position: 'relative',
                      bgcolor:
                        hasReservation ? 'error.light' :
                        isSelected || isRangeStart || isRangeEnd ? 'primary.main' :
                        isInRange ? 'primary.light' :
                        hasCustomPrice ? 'secondary.light' :
                        dateIsHoliday ? 'warning.light' :
                        dateIsWeekend ? 'action.hover' :
                        'background.paper',
                      color:
                        hasReservation ? 'error.contrastText' :
                        isSelected || isRangeStart || isRangeEnd ? 'primary.contrastText' :
                        isInRange ? 'primary.contrastText' :
                        'text.primary',
                      border: isToday ? 2 : 0,
                      borderColor: 'primary.main',
                      '&:hover': isCurrentMonth && !readOnly && !hasReservation ? {
                        bgcolor: hasReservation ? 'error.light' : 'action.selected',
                        transform: 'scale(1.05)',
                      } : {},
                      transition: 'all 0.2s',
                    }}
                  >
                    <Stack spacing={0.5} alignItems="center">
                      <Typography variant="body2" fontWeight={isToday ? 'bold' : 'normal'}>
                        {format(date, 'd')}
                      </Typography>

                      {/* Sempre mostra o preço calculado */}
                      <Typography
                        variant="caption"
                        fontWeight={hasCustomPrice ? 'bold' : 600}
                        sx={{ fontSize: hasCustomPrice ? '0.75rem' : '0.7rem' }}
                      >
                        R$ {finalPrice.toFixed(0)}
                      </Typography>

                      {/* Ícones de indicação */}
                      <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {hasReservation && <EventBusy sx={{ fontSize: 14, color: 'error.dark' }} />}
                        {dateIsHoliday && <Celebration sx={{ fontSize: 14, color: 'warning.dark' }} />}
                        {surchargePercentage > 0 && !hasCustomPrice && (
                          <Chip
                            label={`+${surchargePercentage.toFixed(0)}%`}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: '0.6rem',
                              '& .MuiChip-label': { px: 0.5 }
                            }}
                          />
                        )}
                      </Box>
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
              helperText={`Valor base: R$ ${safeBasePrice.toFixed(2)}`}
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