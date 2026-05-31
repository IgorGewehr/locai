/**
 * Property Completion Dialog V2 - REVOLUCIONÁRIO
 *
 * Wizard profissional e intuitivo para completar dados após importação do Airbnb
 * com edição completa, preços dinâmicos visuais e calendário unificado.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Grid,
  TextField,
  InputAdornment,
  Paper,
  alpha,
  Card,
  CardContent,
  IconButton,
  Divider,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import {
  AttachMoney,
  CleaningServices,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Close,
  Home,
  Edit,
  CalendarMonth,
  Add,
  Delete,
  ChevronLeft,
  ChevronRight,
  Weekend,
  Celebration,
  EventBusy,
  Info,
} from '@mui/icons-material';
import { FormProvider, useForm } from 'react-hook-form';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWeekend,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  parseISO,
  differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';

interface PropertyCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  propertyData: any;
  onComplete: (completedData: any) => Promise<void>;
}

interface PriceRule {
  id: string;
  type: 'single' | 'range' | 'weekend' | 'weekday' | 'month';
  label: string;
  dates: Date[];
  price: number;
}

const steps = [
  'Informações Básicas',
  'Preços Base',
  'Preços Dinâmicos',
  'Disponibilidade',
  'Confirmar'
];

export default function PropertyCompletionDialogV2({
  open,
  onClose,
  propertyData,
  onComplete,
}: PropertyCompletionDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getFirebaseToken } = useAuth();
  const { tenantId } = useTenant();

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Pricing rules state
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempPrice, setTempPrice] = useState('');
  const [priceMode, setPriceMode] = useState<'single' | 'range' | 'weekend' | 'weekday'>('single');

  // Availability state
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  // Reservas removidas do sistema. Mantemos arrays vazios para compatibilidade
  // com a UI legada deste dialog até ser refeito.
  const reservations: any[] = [];
  const loadingReservations = false;

  // Form with default values
  const methods = useForm({
    defaultValues: {
      ...propertyData,
      title: propertyData.title || '',
      description: propertyData.description || '',
      bedrooms: propertyData.guestCapacity?.bedrooms || 1,
      bathrooms: propertyData.guestCapacity?.bathrooms || 1,
      maxGuests: propertyData.guestCapacity?.guests || 2,
      basePrice: propertyData.basePrice || 200,
      cleaningFee: propertyData.cleaningFee || 80,
      minimumNights: propertyData.minimumNights || 2,
      pricePerExtraGuest: propertyData.pricePerExtraGuest || 50,
    },
  });

  const { watch, setValue } = methods;

  // loadReservations removida — sistema não gerencia reservas (Airbnb cuida).

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const formData = methods.getValues();

      // Convert price rules to customPricing format
      const customPricing: Record<string, number> = {};
      priceRules.forEach(rule => {
        rule.dates.forEach(date => {
          const dateKey = format(date, 'yyyy-MM-dd');
          customPricing[dateKey] = rule.price;
        });
      });

      const completedData = {
        ...formData,
        guestCapacity: {
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          guests: formData.maxGuests,
        },
        customPricing,
        unavailableDates,
      };

      await onComplete(completedData);
    } catch (error) {
      console.error('Error completing property:', error);
    } finally {
      setSaving(false);
    }
  };

  // Price rules management
  const handleDateClick = (date: Date) => {
    // Weekend and weekday modes don't need date selection
    if (priceMode === 'weekend' || priceMode === 'weekday') {
      return;
    }

    if (priceMode === 'single') {
      setSelectedDates([date]);
    } else {
      // Range mode
      if (selectedDates.length === 0) {
        setSelectedDates([date]);
      } else if (selectedDates.length === 1) {
        const start = selectedDates[0];
        const days = eachDayOfInterval({ start, end: date }).sort((a, b) => a.getTime() - b.getTime());
        setSelectedDates(days);
      } else {
        setSelectedDates([date]);
      }
    }
  };

  const addPriceRule = () => {
    if (!tempPrice) return;

    let dates: Date[] = [];
    let label = '';
    let type: PriceRule['type'] = priceMode;

    if (priceMode === 'weekend') {
      // Generate all weekends for next 12 months
      const start = new Date();
      const end = addMonths(start, 12);
      const allDays = eachDayOfInterval({ start, end });
      dates = allDays.filter(day => isWeekend(day));
      label = 'Todos os Fins de Semana (próximos 12 meses)';
    } else if (priceMode === 'weekday') {
      // Generate all weekdays for next 12 months
      const start = new Date();
      const end = addMonths(start, 12);
      const allDays = eachDayOfInterval({ start, end });
      dates = allDays.filter(day => !isWeekend(day));
      label = 'Todos os Dias de Semana (próximos 12 meses)';
    } else {
      // Single or range mode - require date selection
      if (selectedDates.length === 0) return;
      dates = selectedDates;
      label = selectedDates.length === 1
        ? format(selectedDates[0], "dd 'de' MMMM", { locale: ptBR })
        : `${format(selectedDates[0], 'dd/MM', { locale: ptBR })} - ${format(
            selectedDates[selectedDates.length - 1],
            'dd/MM',
            { locale: ptBR }
          )}`;
    }

    const newRule: PriceRule = {
      id: Date.now().toString(),
      type,
      label,
      dates,
      price: Number(tempPrice),
    };

    setPriceRules([...priceRules, newRule]);
    setSelectedDates([]);
    setTempPrice('');
  };

  const removePriceRule = (ruleId: string) => {
    setPriceRules(priceRules.filter(r => r.id !== ruleId));
  };

  const addQuickRule = (type: 'december' | 'weekends') => {
    const currentYear = new Date().getFullYear();

    if (type === 'december') {
      const start = new Date(currentYear, 11, 1);
      const end = new Date(currentYear, 11, 31);
      const dates = eachDayOfInterval({ start, end });

      const rule: PriceRule = {
        id: Date.now().toString(),
        type: 'month',
        label: 'Todo Dezembro',
        dates,
        price: Number(tempPrice) || watch('basePrice') * 1.5,
      };

      setPriceRules([...priceRules, rule]);
    }
  };

  // Availability management
  const handleAvailabilityClick = (date: Date) => {
    // Check if date is reserved
    const isReserved = reservations.some(r => {
      const checkIn = parseISO(r.checkIn);
      const checkOut = parseISO(r.checkOut);
      return date >= checkIn && date <= checkOut;
    });

    if (isReserved) {
      alert('Esta data já possui uma reserva confirmada e não pode ser bloqueada.');
      return;
    }

    const exists = unavailableDates.some(d => isSameDay(d, date));
    if (exists) {
      setUnavailableDates(unavailableDates.filter(d => !isSameDay(d, date)));
    } else {
      setUnavailableDates([...unavailableDates, date]);
    }
  };

  const isDateReserved = (date: Date): boolean => {
    return reservations.some(r => {
      const checkIn = parseISO(r.checkIn);
      const checkOut = parseISO(r.checkOut);
      return date >= checkIn && date <= checkOut;
    });
  };

  const isDateUnavailable = (date: Date): boolean => {
    return unavailableDates.some(d => isSameDay(d, date));
  };

  // Step 1: Basic Info
  const renderBasicInfoStep = () => (
    <Box>
      <Alert severity="info" icon={<Edit />} sx={{ mb: 3 }}>
        Revise e edite as informações importadas do Airbnb conforme necessário
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Título da Propriedade"
            value={watch('title')}
            onChange={(e) => setValue('title', e.target.value)}
            helperText="Nome que aparecerá nas buscas e reservas"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Descrição"
            value={watch('description')}
            onChange={(e) => setValue('description', e.target.value)}
            helperText="Descrição detalhada da propriedade"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Quartos"
            value={watch('bedrooms')}
            onChange={(e) => setValue('bedrooms', Number(e.target.value))}
            inputProps={{ min: 0, max: 20 }}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Banheiros"
            value={watch('bathrooms')}
            onChange={(e) => setValue('bathrooms', Number(e.target.value))}
            inputProps={{ min: 0, max: 10, step: 0.5 }}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Máximo de Hóspedes"
            value={watch('maxGuests')}
            onChange={(e) => setValue('maxGuests', Number(e.target.value))}
            inputProps={{ min: 1, max: 50 }}
          />
        </Grid>
      </Grid>
    </Box>
  );

  // Step 2: Base Pricing
  const renderBasePricingStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AttachMoney />
        Configure os Preços Base
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
            <TextField
              fullWidth
              type="number"
              label="Preço por Diária"
              value={watch('basePrice')}
              onChange={(e) => setValue('basePrice', Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
              helperText="Valor padrão por noite"
            />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.success.main, 0.05) }}>
            <TextField
              fullWidth
              type="number"
              label="Taxa de Limpeza"
              value={watch('cleaningFee')}
              onChange={(e) => setValue('cleaningFee', Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <CleaningServices />
                  </InputAdornment>
                ),
              }}
              helperText="Taxa única por reserva"
            />
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Mínimo de Diárias"
            value={watch('minimumNights')}
            onChange={(e) => setValue('minimumNights', Number(e.target.value))}
            inputProps={{ min: 1, max: 30 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Por Pessoa Extra"
            value={watch('pricePerExtraGuest')}
            onChange={(e) => setValue('pricePerExtraGuest', Number(e.target.value))}
            InputProps={{
              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            }}
          />
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          💡 Exemplo: 3 diárias, 2 hóspedes
        </Typography>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Diárias (3 × R$ {watch('basePrice')})</Typography>
            <Typography variant="body2" fontWeight={600}>
              R$ {watch('basePrice') * 3}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Taxa de limpeza</Typography>
            <Typography variant="body2" fontWeight={600}>
              R$ {watch('cleaningFee')}
            </Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">Total</Typography>
            <Typography variant="h6" color="primary">
              R$ {watch('basePrice') * 3 + watch('cleaningFee')}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );

  // Step 3: Dynamic Pricing - REVOLUCIONÁRIO
  const renderDynamicPricingStep = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const getPriceForDate = (date: Date): number | null => {
      const rule = priceRules.find(r => r.dates.some(d => isSameDay(d, date)));
      return rule?.price || null;
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          🎯 Preços Dinâmicos - Controle Total
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Como usar:</strong>
          <br />
          <strong>Data/Período:</strong> Clique no calendário para selecionar datas → Digite o preço → Adicionar Regra
          <br />
          <strong>Fins de Semana/Dias de Semana:</strong> Digite o preço → Adicionar Regra (aplica automaticamente para próximos 12 meses)
        </Alert>

        {/* Mode Selector */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
          <ToggleButtonGroup
            value={priceMode}
            exclusive
            onChange={(_, value) => value && setPriceMode(value)}
            size="small"
          >
            <ToggleButton value="single">
              <CalendarMonth sx={{ mr: 0.5 }} fontSize="small" />
              Data
            </ToggleButton>
            <ToggleButton value="range">
              <CalendarMonth sx={{ mr: 0.5 }} fontSize="small" />
              Período
            </ToggleButton>
            <ToggleButton value="weekend">
              <Weekend sx={{ mr: 0.5 }} fontSize="small" />
              Fins de Semana
            </ToggleButton>
            <ToggleButton value="weekday">
              <CalendarMonth sx={{ mr: 0.5 }} fontSize="small" />
              Dias de Semana
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            type="number"
            label="Preço"
            value={tempPrice}
            onChange={(e) => setTempPrice(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">R$</InputAdornment>,
            }}
            sx={{ width: 150 }}
          />

          <Button
            variant="contained"
            onClick={addPriceRule}
            disabled={!tempPrice || (priceMode !== 'weekend' && priceMode !== 'weekday' && selectedDates.length === 0)}
            startIcon={<Add />}
          >
            Adicionar Regra
          </Button>
        </Stack>

        {/* Calendar */}
        <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight />
            </IconButton>
          </Stack>

          <Grid container spacing={0.5}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Grid item xs={12 / 7} key={day}>
                <Typography variant="caption" align="center" display="block" fontWeight={600}>
                  {day}
                </Typography>
              </Grid>
            ))}

            {days.map((day) => {
              const isSelected = selectedDates.some(d => isSameDay(d, day));
              const customPrice = getPriceForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayWeekend = isWeekend(day);
              const isHighlighted = (priceMode === 'weekend' && isDayWeekend) ||
                                    (priceMode === 'weekday' && !isDayWeekend);

              return (
                <Grid item xs={12 / 7} key={day.toString()}>
                  <Tooltip
                    title={customPrice ? `R$ ${customPrice}` : `R$ ${watch('basePrice')} (padrão)`}
                  >
                    <Box
                      onClick={() => handleDateClick(day)}
                      sx={{
                        aspectRatio: '1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: priceMode === 'weekend' || priceMode === 'weekday' ? 'default' : 'pointer',
                        borderRadius: 1,
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.3)
                          : isHighlighted
                          ? alpha(theme.palette.info.main, 0.15)
                          : customPrice
                          ? alpha(theme.palette.success.main, 0.15)
                          : 'transparent',
                        border: `1px solid ${
                          isSelected
                            ? theme.palette.primary.main
                            : isHighlighted
                            ? alpha(theme.palette.info.main, 0.5)
                            : customPrice
                            ? alpha(theme.palette.success.main, 0.5)
                            : 'transparent'
                        }`,
                        opacity: isCurrentMonth ? 1 : 0.3,
                        '&:hover': {
                          backgroundColor: priceMode === 'weekend' || priceMode === 'weekday'
                            ? undefined
                            : alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                        {format(day, 'd')}
                      </Typography>
                      {customPrice && (
                        <Typography variant="caption" color="success.main" fontWeight={600}>
                          R$ {customPrice}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                </Grid>
              );
            })}
          </Grid>

          {selectedDates.length > 0 && priceMode !== 'weekend' && priceMode !== 'weekday' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {selectedDates.length} data(s) selecionada(s)
            </Alert>
          )}

          {priceMode === 'weekend' && (
            <Alert severity="success" sx={{ mt: 2 }} icon={<Weekend />}>
              <strong>Todos os fins de semana</strong> (sábados e domingos) dos próximos 12 meses serão configurados com este preço. Dias destacados em azul no calendário.
            </Alert>
          )}

          {priceMode === 'weekday' && (
            <Alert severity="success" sx={{ mt: 2 }} icon={<CalendarMonth />}>
              <strong>Todos os dias de semana</strong> (segunda a sexta) dos próximos 12 meses serão configurados com este preço. Dias destacados em azul no calendário.
            </Alert>
          )}
        </Paper>

        {/* Price Rules List */}
        {priceRules.length > 0 && (
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Regras de Preço Criadas ({priceRules.length})
            </Typography>
            <List dense>
              {priceRules.map((rule) => (
                <ListItem key={rule.id}>
                  <ListItemText
                    primary={rule.label}
                    secondary={`R$ ${rule.price} • ${rule.dates.length} dia(s)`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => removePriceRule(rule.id)} size="small">
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    );
  };

  // Step 4: Unified Availability Calendar
  const renderAvailabilityStep = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          📅 Disponibilidade e Reservas
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Legenda:</strong>
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip label="Disponível" size="small" sx={{ bgcolor: 'white', border: '1px solid #ddd' }} />
            <Chip label="Reservado" size="small" color="primary" />
            <Chip label="Bloqueado" size="small" color="error" />
          </Stack>
        </Alert>

        {loadingReservations && (
          <Alert severity="info">Carregando reservas...</Alert>
        )}

        {/* Calendar */}
        <Paper elevation={0} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <IconButton onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            <IconButton onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight />
            </IconButton>
          </Stack>

          <Grid container spacing={0.5}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Grid item xs={12 / 7} key={day}>
                <Typography variant="caption" align="center" display="block" fontWeight={600}>
                  {day}
                </Typography>
              </Grid>
            ))}

            {days.map((day) => {
              const isReserved = isDateReserved(day);
              const isBlocked = isDateUnavailable(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <Grid item xs={12 / 7} key={day.toString()}>
                  <Tooltip
                    title={
                      isReserved
                        ? 'Reservado'
                        : isBlocked
                        ? 'Bloqueado manualmente'
                        : 'Disponível - Clique para bloquear'
                    }
                  >
                    <Box
                      onClick={() => !isReserved && handleAvailabilityClick(day)}
                      sx={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isReserved ? 'not-allowed' : 'pointer',
                        borderRadius: 1,
                        backgroundColor: isReserved
                          ? alpha(theme.palette.primary.main, 0.3)
                          : isBlocked
                          ? alpha(theme.palette.error.main, 0.3)
                          : 'transparent',
                        border: `1px solid ${
                          isReserved
                            ? theme.palette.primary.main
                            : isBlocked
                            ? theme.palette.error.main
                            : 'transparent'
                        }`,
                        opacity: isCurrentMonth ? 1 : 0.3,
                        '&:hover': {
                          backgroundColor: isReserved
                            ? undefined
                            : alpha(theme.palette.error.main, 0.1),
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={isReserved || isBlocked ? 600 : 400}>
                        {format(day, 'd')}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              );
            })}
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            {reservations.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {reservations.length} reserva(s) confirmada(s)
              </Typography>
            )}
            {unavailableDates.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {unavailableDates.length} data(s) bloqueada(s)
              </Typography>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  };

  // Step 5: Confirmation
  const renderConfirmationStep = () => (
    <Box>
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
        Perfeito! Revise as informações antes de salvar.
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              📋 Informações Gerais
            </Typography>
            <Typography variant="body2">{watch('title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {watch('bedrooms')} quartos • {watch('bathrooms')} banheiros • {watch('maxGuests')}{' '}
              hóspedes
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              💰 Preços
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">Diária: R$ {watch('basePrice')}</Typography>
              <Typography variant="body2">Limpeza: R$ {watch('cleaningFee')}</Typography>
              <Typography variant="body2">Mín. diárias: {watch('minimumNights')}</Typography>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.success.main, 0.05) }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              📈 Preços Dinâmicos
            </Typography>
            <Typography variant="body2">
              {priceRules.length > 0
                ? `${priceRules.length} regra(s) de preço criada(s)`
                : 'Nenhuma regra customizada'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.error.main, 0.05) }}>
            <Typography variant="subtitle2" gutterBottom color="error">
              🚫 Disponibilidade
            </Typography>
            <Typography variant="body2">
              {unavailableDates.length} data(s) bloqueada(s) manualmente
            </Typography>
            <Typography variant="body2">{reservations.length} reserva(s) confirmada(s)</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderBasePricingStep();
      case 2:
        return renderDynamicPricingStep();
      case 3:
        return renderAvailabilityStep();
      case 4:
        return renderConfirmationStep();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          minHeight: isMobile ? '100vh' : '700px',
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Completar Dados da Propriedade</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel={isMobile}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent dividers>
        <FormProvider {...methods}>
          <Box sx={{ minHeight: 400 }}>{renderStepContent()}</Box>
        </FormProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleBack} disabled={activeStep === 0} startIcon={<ArrowBack />}>
          Voltar
        </Button>

        <Box sx={{ flex: 1 }} />

        <Button onClick={onClose} variant="outlined">
          Cancelar
        </Button>

        {activeStep === steps.length - 1 ? (
          <Button
            onClick={handleComplete}
            variant="contained"
            disabled={saving}
            startIcon={<CheckCircle />}
          >
            {saving ? 'Salvando...' : 'Salvar Propriedade'}
          </Button>
        ) : (
          <Button onClick={handleNext} variant="contained" endIcon={<ArrowForward />}>
            Próximo
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
