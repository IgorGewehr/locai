/**
 * Property Completion Dialog
 *
 * Wizard profissional para completar dados após importação do Airbnb
 * Permite configurar preços, taxa de limpeza, sobretaxas e disponibilidade
 * antes de salvar a propriedade no banco de dados.
 */

'use client';

import React, { useState } from 'react';
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
  Chip,
  Card,
  CardContent,
  IconButton,
  Divider,
  Alert,
  useTheme,
  useMediaQuery,
  Slider,
  Stack,
} from '@mui/material';
import {
  AttachMoney,
  CleaningServices,
  Weekend,
  Celebration,
  CalendarMonth,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Close,
  Home,
  TrendingUp,
  Info,
} from '@mui/icons-material';
import { FormProvider, useForm } from 'react-hook-form';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropertyCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  propertyData: any; // Dados importados do Airbnb
  onComplete: (completedData: any) => Promise<void>;
}

const steps = [
  'Revisar Importação',
  'Configurar Preços',
  'Disponibilidade',
  'Confirmar'
];

export default function PropertyCompletionDialog({
  open,
  onClose,
  propertyData,
  onComplete,
}: PropertyCompletionDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form with default values from imported data
  const methods = useForm({
    defaultValues: {
      ...propertyData,
      // Ensure nested fields are properly flattened
      title: propertyData.title || propertyData.name || 'Nova Propriedade',
      bedrooms: propertyData.bedrooms || propertyData.guestCapacity?.bedrooms || 1,
      bathrooms: propertyData.bathrooms || propertyData.guestCapacity?.bathrooms || 1,
      maxGuests: propertyData.maxGuests || propertyData.guestCapacity?.guests || 2,
      capacity: propertyData.capacity || propertyData.guestCapacity?.guests || 2,
      // Pricing defaults
      basePrice: propertyData.basePrice || 200,
      cleaningFee: propertyData.cleaningFee || 80,
      weekendSurcharge: propertyData.weekendSurcharge || 30,
      holidaySurcharge: propertyData.holidaySurcharge || 50,
      decemberSurcharge: propertyData.decemberSurcharge || 20,
      minimumNights: propertyData.minimumNights || 2,
      pricePerExtraGuest: propertyData.pricePerExtraGuest || 50,
      unavailableDates: [],
      customPricing: {},
    },
  });

  const { watch, setValue } = methods;

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

      // Add unavailable dates from calendar selection
      if (selectedDates.length > 0) {
        formData.unavailableDates = selectedDates.map(d => d.toISOString());
      }

      // Debug logging
      console.log('[PropertyCompletionDialog] Submitting property data:', {
        title: formData.title,
        basePrice: formData.basePrice,
        cleaningFee: formData.cleaningFee,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        maxGuests: formData.maxGuests,
      });

      await onComplete(formData);
      console.log('[PropertyCompletionDialog] Property saved successfully');
      // Success - parent will handle closing
    } catch (error) {
      console.error('[PropertyCompletionDialog] Error completing property:', error);
      // Show error to user instead of silent fail
      alert(
        'Erro ao salvar propriedade:\n' +
        (error instanceof Error ? error.message : 'Erro desconhecido')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDateToggle = (date: Date) => {
    const exists = selectedDates.some(d => isSameDay(d, date));
    if (exists) {
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  // Step 1: Review Import
  const renderReviewStep = () => (
    <Box>
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
        Propriedade importada com sucesso do Airbnb! Agora vamos completar algumas informações importantes.
      </Alert>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Home color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h6">{propertyData.title || propertyData.name || 'Propriedade'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {propertyData.city || propertyData.address?.city || ''}{propertyData.neighborhood ? `, ${propertyData.neighborhood}` : ''}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Quartos</Typography>
              <Typography variant="h6">{propertyData.bedrooms || propertyData.guestCapacity?.bedrooms || 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Banheiros</Typography>
              <Typography variant="h6">{propertyData.bathrooms || propertyData.guestCapacity?.bathrooms || 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Hóspedes</Typography>
              <Typography variant="h6">{propertyData.maxGuests || propertyData.capacity || propertyData.guestCapacity?.guests || 0}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Fotos</Typography>
              <Typography variant="h6">{propertyData.photos?.length || 0}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Alert severity="info" icon={<Info />}>
        Nos próximos passos, você poderá configurar preços, taxas e disponibilidade do calendário.
      </Alert>
    </Box>
  );

  // Step 2: Pricing Configuration
  const renderPricingStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AttachMoney />
        Configure os Preços e Taxas
      </Typography>

      <Grid container spacing={3}>
        {/* Base Price */}
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
              helperText="Valor base por noite de estadia"
            />
          </Paper>
        </Grid>

        {/* Cleaning Fee */}
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
              helperText="Taxa única cobrada por reserva"
            />
          </Paper>
        </Grid>

        {/* Minimum Nights */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Mínimo de Diárias"
            value={watch('minimumNights')}
            onChange={(e) => setValue('minimumNights', Number(e.target.value))}
            inputProps={{ min: 1, max: 30 }}
            helperText="Estadia mínima obrigatória"
          />
        </Grid>

        {/* Price per Extra Guest */}
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
            helperText="Valor adicional por hóspede extra"
          />
        </Grid>

        {/* Weekend Surcharge */}
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.warning.main, 0.05) }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Weekend fontSize="small" />
                <Typography variant="subtitle2">Sobretaxa Fim de Semana</Typography>
              </Stack>
              <Slider
                value={watch('weekendSurcharge')}
                onChange={(_, value) => setValue('weekendSurcharge', value as number)}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
              <Typography variant="caption" color="text.secondary">
                {watch('weekendSurcharge')}% sobre o preço base
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* Holiday Surcharge */}
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.error.main, 0.05) }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Celebration fontSize="small" />
                <Typography variant="subtitle2">Sobretaxa Feriados</Typography>
              </Stack>
              <Slider
                value={watch('holidaySurcharge')}
                onChange={(_, value) => setValue('holidaySurcharge', value as number)}
                min={0}
                max={150}
                step={10}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
              <Typography variant="caption" color="text.secondary">
                {watch('holidaySurcharge')}% sobre o preço base
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        {/* December Surcharge */}
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarMonth fontSize="small" />
                <Typography variant="subtitle2">Sobretaxa Dezembro</Typography>
              </Stack>
              <Slider
                value={watch('decemberSurcharge')}
                onChange={(_, value) => setValue('decemberSurcharge', value as number)}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
              <Typography variant="caption" color="text.secondary">
                {watch('decemberSurcharge')}% sobre o preço base
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Price Example */}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>💡 Exemplo de Cálculo (3 diárias, 2 hóspedes)</Typography>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Diárias (3 × R$ {watch('basePrice')})</Typography>
            <Typography variant="body2" fontWeight={600}>R$ {watch('basePrice') * 3}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Taxa de limpeza</Typography>
            <Typography variant="body2" fontWeight={600}>R$ {watch('cleaningFee')}</Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h6">Total</Typography>
            <Typography variant="h6" color="primary">
              R$ {(watch('basePrice') * 3) + watch('cleaningFee')}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );

  // Step 3: Availability Calendar
  const renderAvailabilityStep = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <CalendarMonth />
          Marque Datas Indisponíveis (Opcional)
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Clique nas datas que já estão reservadas ou indisponíveis. Você pode pular esta etapa e configurar depois.
        </Alert>

        {/* Simple Calendar */}
        <Paper elevation={0} sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <IconButton onClick={() => setCurrentMonth(addDays(currentMonth, -30))}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Typography>
            <IconButton onClick={() => setCurrentMonth(addDays(currentMonth, 30))}>
              <ArrowForward />
            </IconButton>
          </Stack>

          <Grid container spacing={1}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Grid item xs={12 / 7} key={day}>
                <Typography variant="caption" align="center" display="block" fontWeight={600}>
                  {day}
                </Typography>
              </Grid>
            ))}

            {days.map((day) => {
              const isSelected = selectedDates.some(d => isSameDay(d, day));

              return (
                <Grid item xs={12 / 7} key={day.toString()}>
                  <Box
                    onClick={() => handleDateToggle(day)}
                    sx={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      borderRadius: 1,
                      backgroundColor: isSelected
                        ? alpha(theme.palette.error.main, 0.2)
                        : 'transparent',
                      border: `1px solid ${isSelected ? theme.palette.error.main : 'transparent'}`,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  >
                    <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                      {format(day, 'd')}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {selectedDates.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {selectedDates.length} data(s) marcada(s) como indisponível
            </Alert>
          )}
        </Paper>
      </Box>
    );
  };

  // Step 4: Confirmation
  const renderConfirmationStep = () => (
    <Box>
      <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
        Tudo pronto! Revise as informações abaixo antes de salvar.
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.background.paper, 0.5) }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              📋 Informações Gerais
            </Typography>
            <Typography variant="body2">{watch('title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {watch('bedrooms')} quartos • {watch('bathrooms')} banheiros • {watch('maxGuests')} hóspedes
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
          <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.warning.main, 0.05) }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              📈 Sobretaxas
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">Fim de semana: +{watch('weekendSurcharge')}%</Typography>
              <Typography variant="body2">Feriados: +{watch('holidaySurcharge')}%</Typography>
              <Typography variant="body2">Dezembro: +{watch('decemberSurcharge')}%</Typography>
            </Stack>
          </Paper>
        </Grid>

        {selectedDates.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha(theme.palette.error.main, 0.05) }}>
              <Typography variant="subtitle2" gutterBottom color="error">
                🚫 Datas Indisponíveis
              </Typography>
              <Typography variant="body2">
                {selectedDates.length} data(s) marcada(s) como indisponível
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderReviewStep();
      case 1:
        return renderPricingStep();
      case 2:
        return renderAvailabilityStep();
      case 3:
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
          minHeight: isMobile ? '100vh' : '600px',
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
          <Box sx={{ minHeight: 300 }}>
            {renderStepContent()}
          </Box>
        </FormProvider>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<ArrowBack />}
        >
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
          <Button
            onClick={handleNext}
            variant="contained"
            endIcon={<ArrowForward />}
          >
            Próximo
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
