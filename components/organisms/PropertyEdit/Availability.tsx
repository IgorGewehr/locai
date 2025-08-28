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
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { Calendar } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, addDays, isSameDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/utils/logger';

export const PropertyAvailability: React.FC = () => {
  const theme = useTheme();
  const { control, watch, setValue } = useFormContext();
  
  const isActive = watch('isActive');
  const unavailableDates = watch('unavailableDates') || [];
  const customPricing = watch('customPricing') || {};
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [customPrice, setCustomPrice] = useState<number | null>(null);

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
  const handleAddCustomPricing = () => {
    if (!dateRange || !customPrice) return;
    
    const [start, end] = dateRange;
    const updated = { ...customPricing };
    let currentDate = start;
    
    while (currentDate <= end) {
      const key = format(currentDate, 'yyyy-MM-dd');
      updated[key] = customPrice;
      currentDate = addDays(currentDate, 1);
    }
    
    setValue('customPricing', updated);
    setDateRange(null);
    setCustomPrice(null);
    
    logger.info('Custom pricing added', { 
      days: Object.keys(updated).length - Object.keys(customPricing).length,
      price: customPrice 
    });
  };

  // Remove custom pricing
  const handleRemoveCustomPricing = (dateKey: string) => {
    const updated = { ...customPricing };
    delete updated[dateKey];
    setValue('customPricing', updated);
    logger.debug('Custom pricing removed', { date: dateKey });
  };

  // Calendar tile styling
  const getTileClassName = ({ date }: { date: Date }) => {
    const isUnavailable = unavailableDates.some((d: Date) => 
      isSameDay(new Date(d), date)
    );
    const dateKey = format(date, 'yyyy-MM-dd');
    const hasCustomPrice = customPricing[dateKey];
    
    if (isUnavailable) return 'unavailable-date';
    if (hasCustomPrice) return 'custom-price-date';
    return '';
  };

  // Calendar tile content
  const getTileContent = ({ date }: { date: Date }) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const price = customPricing[dateKey];
    
    if (price) {
      return (
        <Tooltip title={`R$ ${price}`}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.65rem',
              display: 'block',
              color: theme.palette.success.main,
              fontWeight: 600,
            }}
          >
            R${price}
          </Typography>
        </Tooltip>
      );
    }
    return null;
  };

  return (
    <Box>
      <Grid container spacing={3}>
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
            
            <Box sx={{ 
              '& .react-calendar': {
                width: '100%',
                border: 'none',
                borderRadius: 2,
                fontFamily: theme.typography.fontFamily,
              },
              '& .react-calendar__tile': {
                height: 60,
                fontSize: '0.9rem',
              },
              '& .react-calendar__tile--active': {
                backgroundColor: `${theme.palette.primary.main} !important`,
              },
              '& .unavailable-date': {
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.2),
                },
              },
              '& .custom-price-date': {
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.success.main, 0.2),
                },
              },
            }}>
              <Calendar
                locale="pt-BR"
                selectRange
                onChange={(value) => {
                  if (Array.isArray(value)) {
                    setDateRange(value as [Date, Date]);
                  } else {
                    setSelectedDate(value as Date);
                  }
                }}
                tileClassName={getTileClassName}
                tileContent={getTileContent}
                minDate={new Date()}
              />
            </Box>

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
                    onClick={handleAddUnavailableDates}
                    size="small"
                  >
                    Bloquear Período
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<LocalOffer />}
                    onClick={() => {
                      const price = prompt('Digite o preço customizado (R$):');
                      if (price && !isNaN(Number(price)) && Number(price) > 0) {
                        setCustomPrice(Number(price));
                        handleAddCustomPricing();
                      }
                    }}
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

      <style jsx global>{`
        .react-calendar__navigation button {
          font-size: 1rem;
          font-weight: 600;
        }
        
        .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .react-calendar__tile--now {
          background: ${alpha(theme.palette.info.main, 0.1)};
        }
        
        .react-calendar__tile--hasActive {
          background: ${theme.palette.primary.main};
        }
      `}</style>
    </Box>
  );
};