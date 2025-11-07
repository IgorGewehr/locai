'use client';

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
  Button,
  useTheme,
  alpha,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  CalendarMonth,
  EventBusy,
  Info,
  Delete,
  Add,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Block,
  LocalOffer,
  Clear,
  ChevronLeft,
  ChevronRight,
  AutoAwesome,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { 
  format, 
  addDays, 
  isSameDay, 
  isAfter, 
  isBefore, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  startOfWeek, 
  endOfWeek,
  getDay,
  isWeekend,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/utils/logger';
import AvailabilityInsights from '@/components/organisms/AvailabilityInsights/AvailabilityInsights';
import AvailabilityRulesManager from '@/components/organisms/AvailabilityRulesManager/AvailabilityRulesManager';
import CalendarExportMenu from '@/components/organisms/CalendarExportMenu/CalendarExportMenu';
import { AvailabilityCalendarDay } from '@/lib/types/availability';

type ViewMode = 'calendar' | 'insights' | 'rules';

export const PropertyAvailability: React.FC = () => {
  const theme = useTheme();
  const { control, watch, setValue } = useFormContext();

  const isActive = watch('isActive');
  const unavailableDates = watch('unavailableDates') || [];
  const customPricing = watch('customPricing') || {};

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [dialogPrice, setDialogPrice] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Get property data for export and insights
  const propertyId = watch('id');
  const propertyName = watch('name') || 'Propriedade';
  const property = watch(); // Get entire property object

  // Toggle property status
  const handleStatusToggle = (checked: boolean) => {
    setValue('isActive', checked);
    logger.info('Property status changed', { isActive: checked });
  };

  // Add unavailable dates
  const handleAddUnavailableDates = () => {
    if (!dateRange) return;
    
    const [start, end] = dateRange;
    const dates = [];
    let currentDate = start;
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    const updated = [...unavailableDates, ...dates];
    setValue('unavailableDates', updated);
    setDateRange(null);
    
    logger.info('Unavailable dates added', { count: dates.length });
  };

  // Remove unavailable date
  const handleRemoveUnavailableDate = (dateToRemove: Date) => {
    const updated = unavailableDates.filter((date: Date) => 
      !isSameDay(new Date(date), new Date(dateToRemove))
    );
    setValue('unavailableDates', updated);
    logger.debug('Unavailable date removed', { date: dateToRemove });
  };

  // Clear all unavailable dates
  const handleClearUnavailableDates = () => {
    setValue('unavailableDates', []);
    logger.info('All unavailable dates cleared');
  };

  // Add custom pricing
  const handleAddCustomPricing = (price: number) => {
    if (!dateRange || !price) return;
    
    const [start, end] = dateRange;
    const updated = { ...customPricing };
    let currentDate = start;
    
    while (currentDate <= end) {
      const key = format(currentDate, 'yyyy-MM-dd');
      updated[key] = price;
      currentDate = addDays(currentDate, 1);
    }
    
    setValue('customPricing', updated);
    setDateRange(null);
    
    logger.info('Custom pricing added', { 
      days: Object.keys(updated).length - Object.keys(customPricing).length,
      price 
    });
  };

  // Remove custom pricing
  const handleRemoveCustomPricing = (dateKey: string) => {
    const updated = { ...customPricing };
    delete updated[dateKey];
    setValue('customPricing', updated);
    logger.debug('Custom pricing removed', { date: dateKey });
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  // Date selection handlers
  const handleDateClick = (date: Date) => {
    if (isBefore(date, new Date())) return;

    if (!dragStart) {
      setDragStart(date);
      setDateRange([date, date]);
      setIsSelecting(true);
    } else {
      const start = isBefore(dragStart, date) ? dragStart : date;
      const end = isBefore(dragStart, date) ? date : dragStart;
      setDateRange([start, end]);
      setDragStart(null);
      setIsSelecting(false);
    }
  };

  const handleDateMouseEnter = (date: Date) => {
    if (isSelecting && dragStart) {
      const start = isBefore(dragStart, date) ? dragStart : date;
      const end = isBefore(dragStart, date) ? date : dragStart;
      setDateRange([start, end]);
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  // Calculate statistics
  const calculateStats = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const futureAndCurrentDays = daysInMonth.filter(d => !isBefore(d, startOfDay(new Date())));
    const blockedDays = futureAndCurrentDays.filter(d =>
      unavailableDates.some((ud: Date) => isSameDay(new Date(ud), d))
    );
    const daysWithCustomPrice = futureAndCurrentDays.filter(d => {
      const key = format(d, 'yyyy-MM-dd');
      return customPricing[key];
    });

    const availableDays = futureAndCurrentDays.length - blockedDays.length;
    const occupancyRate = futureAndCurrentDays.length > 0
      ? ((blockedDays.length / futureAndCurrentDays.length) * 100).toFixed(0)
      : '0';

    // Calculate potential revenue
    const basePrice = watch('basePrice') || 0;
    const potentialRevenue = daysWithCustomPrice.reduce((sum, d) => {
      const key = format(d, 'yyyy-MM-dd');
      return sum + (customPricing[key] || basePrice);
    }, availableDays * basePrice);

    return {
      totalDays: futureAndCurrentDays.length,
      availableDays,
      blockedDays: blockedDays.length,
      daysWithCustomPrice: daysWithCustomPrice.length,
      occupancyRate,
      potentialRevenue
    };
  };

  const stats = calculateStats();

  // Get date status
  const getDateStatus = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const isUnavailable = unavailableDates.some((d: Date) =>
      isSameDay(new Date(d), date)
    );
    const hasCustomPrice = customPricing[dateKey];
    const isPast = isBefore(date, new Date());
    const isInRange = dateRange &&
      isAfter(date, dateRange[0]) &&
      isBefore(date, dateRange[1]) ||
      (dateRange && (isSameDay(date, dateRange[0]) || isSameDay(date, dateRange[1])));

    return {
      isUnavailable,
      hasCustomPrice,
      isPast,
      isInRange,
      price: customPricing[dateKey]
    };
  };

  // Generate calendar days for export (only available dates from current month)
  const getCalendarDaysForExport = (): AvailabilityCalendarDay[] => {
    const days = generateCalendarDays();
    return days.map(date => {
      const status = getDateStatus(date);
      const dateKey = format(date, 'yyyy-MM-dd');

      return {
        date,
        status: status.isUnavailable ? 'blocked' as any : 'available' as any,
        isWeekend: isWeekend(date),
        isHoliday: false, // Simplified
        isToday: isToday(date),
        isPast: status.isPast,
        price: status.price,
        reason: status.isUnavailable ? 'Bloqueado' : undefined,
      };
    }).filter(day => isSameMonth(day.date, currentMonth));
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* View Mode Toggle */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => {
                if (newMode !== null) {
                  setViewMode(newMode);
                }
              }}
              aria-label="modo de visualização"
            >
              <ToggleButton value="calendar" aria-label="calendário">
                <CalendarMonth sx={{ mr: 1 }} />
                Calendário
              </ToggleButton>
              <ToggleButton value="insights" aria-label="insights">
                <TrendingUp sx={{ mr: 1 }} />
                Insights
              </ToggleButton>
              <ToggleButton value="rules" aria-label="regras">
                <AutoAwesome sx={{ mr: 1 }} />
                Regras
              </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'calendar' && (
              <CalendarExportMenu
                property={property}
                propertyName={propertyName}
                calendarDays={getCalendarDaysForExport()}
              />
            )}
          </Box>
        </Grid>

        {/* Insights View */}
        {viewMode === 'insights' && property && (
          <Grid item xs={12}>
            <AvailabilityInsights property={property} />
          </Grid>
        )}

        {/* Rules View */}
        {viewMode === 'rules' && propertyId && (
          <Grid item xs={12}>
            <AvailabilityRulesManager propertyId={propertyId} />
          </Grid>
        )}

        {/* Calendar View (existing) */}
        {viewMode === 'calendar' && (
          <>
        {/* Statistics Dashboard */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp fontSize="small" />
              Estatísticas - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {stats.availableDays}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dias Disponíveis
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {stats.blockedDays}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dias Bloqueados
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {stats.daysWithCustomPrice}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Preços Especiais
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {stats.occupancyRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Taxa de Bloqueio
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {stats.potentialRevenue > 0 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Receita Potencial (se todos os dias disponíveis forem ocupados):
                </Typography>
                <Typography variant="h6" fontWeight={600} color="success.main">
                  R$ {stats.potentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Status Control */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: isActive 
                ? alpha(theme.palette.success.main, 0.05)
                : alpha(theme.palette.error.main, 0.05),
              border: `1px solid ${
                isActive 
                  ? alpha(theme.palette.success.main, 0.2)
                  : alpha(theme.palette.error.main, 0.2)
              }`,
              borderRadius: 2,
              transition: 'all 0.3s ease',
            }}
          >
            <Grid container alignItems="center" spacing={3}>
              <Grid item xs>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {isActive ? (
                    <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
                  ) : (
                    <Cancel sx={{ fontSize: 48, color: 'error.main' }} />
                  )}
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Status da Propriedade
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isActive 
                        ? 'Propriedade está ativa e disponível para reservas'
                        : 'Propriedade está inativa e não aparece nas buscas'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          {...field}
                          checked={field.value || false}
                          color={field.value ? 'success' : 'default'}
                          size="medium"
                        />
                      }
                      label={
                        <Chip
                          label={field.value ? 'Ativa' : 'Inativa'}
                          color={field.value ? 'success' : 'default'}
                          size="small"
                        />
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Calendar and Controls */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: 'background.paper',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth />
              Calendário de Disponibilidade
            </Typography>
            
            {/* Calendar Header */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2,
              p: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
            }}>
              <IconButton onClick={handlePrevMonth}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={600}>
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </Typography>
              <IconButton onClick={handleNextMonth}>
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Weekdays Header */}
            <Grid container spacing={0} sx={{ mb: 1 }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <Grid item xs key={day} sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="caption" 
                    fontWeight={600}
                    color="text.secondary"
                    sx={{ 
                      display: 'block',
                      p: 1,
                      textTransform: 'uppercase'
                    }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Calendar Grid */}
            <Grid container spacing={0}>
              {generateCalendarDays().map((date, index) => {
                const status = getDateStatus(date);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const dateKey = format(date, 'yyyy-MM-dd');

                // Tooltip content
                const getTooltipContent = () => {
                  if (status.isPast) return 'Data passada';
                  if (status.isUnavailable && status.hasCustomPrice) {
                    return `Bloqueado • Preço: R$ ${status.price}`;
                  }
                  if (status.isUnavailable) return 'Data bloqueada';
                  if (status.hasCustomPrice) {
                    return `Preço especial: R$ ${status.price}`;
                  }
                  if (isWeekend(date)) return 'Fim de semana';
                  return 'Disponível';
                };

                return (
                  <Grid item xs key={index}>
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="caption" fontWeight={600}>
                            {format(date, 'dd/MM/yyyy', { locale: ptBR })}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {getTooltipContent()}
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Box
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => {
                          handleDateMouseEnter(date);
                          setHoveredDate(date);
                        }}
                        onMouseLeave={() => setHoveredDate(null)}
                        sx={{
                          height: 60,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: status.isPast ? 'not-allowed' : 'pointer',
                          opacity: !isCurrentMonth ? 0.3 : 1,
                          position: 'relative',
                          border: '1px solid',
                          borderColor: hoveredDate && isSameDay(hoveredDate, date)
                            ? theme.palette.primary.main
                            : theme.palette.divider,
                          backgroundColor:
                            status.isUnavailable ? alpha(theme.palette.error.main, 0.1) :
                            status.hasCustomPrice ? alpha(theme.palette.success.main, 0.1) :
                            status.isInRange ? alpha(theme.palette.primary.main, 0.1) :
                            isToday(date) ? alpha(theme.palette.info.main, 0.1) :
                            'background.paper',
                          '&:hover': !status.isPast ? {
                            backgroundColor:
                              status.isUnavailable ? alpha(theme.palette.error.main, 0.2) :
                              status.hasCustomPrice ? alpha(theme.palette.success.main, 0.2) :
                              alpha(theme.palette.primary.main, 0.1),
                            transform: 'scale(1.05)',
                            zIndex: 1,
                            boxShadow: 1,
                          } : {},
                          transition: 'all 0.2s',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={isToday(date) ? 600 : 400}
                          color={
                            status.isPast ? 'text.disabled' :
                            status.isUnavailable ? 'error.main' :
                            status.hasCustomPrice ? 'success.main' :
                            'text.primary'
                          }
                        >
                          {format(date, 'd')}
                        </Typography>

                        {status.hasCustomPrice && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.6rem',
                              color: 'success.main',
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            R${status.price}
                          </Typography>
                        )}

                        {status.isUnavailable && (
                          <Block sx={{
                            fontSize: 12,
                            color: 'error.main',
                            position: 'absolute',
                            top: 2,
                            right: 2,
                          }} />
                        )}

                        {isWeekend(date) && !status.isUnavailable && !status.isPast && (
                          <Box sx={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'info.main',
                          }} />
                        )}
                      </Box>
                    </Tooltip>
                  </Grid>
                );
              })}
            </Grid>

            {/* Action Buttons */}
            {dateRange && (
              <Box sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: alpha(theme.palette.info.main, 0.05),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth fontSize="small" />
                  Período selecionado: {format(dateRange[0], 'dd/MM')} - {format(dateRange[1], 'dd/MM')}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Block />}
                    onClick={() => {
                      handleAddUnavailableDates();
                      setDateRange(null);
                    }}
                    size="small"
                  >
                    Bloquear Período
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<LocalOffer />}
                    onClick={() => setShowPriceDialog(true)}
                    size="small"
                  >
                    Preço Especial
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={() => setDateRange(null)}
                    size="small"
                  >
                    Cancelar
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Summary Panel */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            {/* Unavailable Dates List */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.error.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Block fontSize="small" />
                    Datas Bloqueadas ({unavailableDates.length})
                  </Typography>
                  {unavailableDates.length > 0 && (
                    <Tooltip title="Limpar todas as datas bloqueadas">
                      <IconButton size="small" onClick={handleClearUnavailableDates} color="error">
                        <Clear fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                
                {unavailableDates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma data bloqueada
                  </Typography>
                ) : (
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {unavailableDates.slice(0, 10).map((date: Date, index: number) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleRemoveUnavailableDate(date)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {unavailableDates.length > 10 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                        +{unavailableDates.length - 10} mais...
                      </Typography>
                    )}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Custom Pricing List */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  borderRadius: 2,
                }}
              >
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalOffer fontSize="small" />
                  Preços Especiais ({Object.keys(customPricing).length})
                </Typography>
                
                {Object.keys(customPricing).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum preço especial definido
                  </Typography>
                ) : (
                  <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {Object.entries(customPricing).slice(0, 10).map(([date, price]) => (
                      <ListItem key={date}>
                        <ListItemText
                          primary={format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}
                          secondary={`R$ ${price}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => handleRemoveCustomPricing(date)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {Object.keys(customPricing).length > 10 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                        +{Object.keys(customPricing).length - 10} mais...
                      </Typography>
                    )}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Legend */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<Info />}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Como usar o calendário:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: alpha(theme.palette.error.main, 0.2),
                    borderRadius: 0.5,
                  }} />
                  <Typography variant="body2">
                    Datas bloqueadas (indisponíveis para reserva)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    borderRadius: 0.5,
                  }} />
                  <Typography variant="body2">
                    Datas com preço especial
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  • Selecione um período arrastando no calendário
                  • Use os botões para marcar como indisponível ou definir preço especial
                </Typography>
              </Grid>
            </Grid>
          </Alert>
        </Grid>
      </Grid>

      {/* Price Dialog */}
      <Dialog open={showPriceDialog} onClose={() => setShowPriceDialog(false)}>
        <DialogTitle>Definir Preço Especial</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preço (R$)"
            type="number"
            fullWidth
            variant="outlined"
            value={dialogPrice}
            onChange={(e) => setDialogPrice(e.target.value)}
            inputProps={{ min: 0, step: 10 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowPriceDialog(false);
            setDialogPrice('');
          }}>Cancelar</Button>
          <Button 
            onClick={() => {
              const price = Number(dialogPrice);
              if (price > 0) {
                handleAddCustomPricing(price);
                setShowPriceDialog(false);
                setDialogPrice('');
                setDateRange(null);
              }
            }}
            variant="contained"
            disabled={!dialogPrice || Number(dialogPrice) <= 0}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
      </>
        )}
      </Grid>
    </Box>
  );
};