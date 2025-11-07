'use client';

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AttachMoney,
  NightlightRound as Nights,
  CleaningServices,
  Celebration,
  Weekend,
  CalendarMonth,
  Info,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { logger } from '@/lib/utils/logger';
import PricingCalendar, { ReservationPeriod } from '@/components/organisms/PricingCalendar/PricingCalendar';

interface PropertyPricingProps {
  reservations?: ReservationPeriod[];
}

export const PropertyPricing: React.FC<PropertyPricingProps> = ({ reservations = [] }) => {
  const theme = useTheme();
  const formContext = useFormContext();
  const { control, watch, setValue, formState: { errors } = {} } = formContext || {};
  
  const basePrice = watch('basePrice');
  const cleaningFee = watch('cleaningFee');
  const pricePerExtraGuest = watch('pricePerExtraGuest');
  const minimumNights = watch('minimumNights');
  const customPricing = watch('customPricing') || {};
  const weekendSurcharge = watch('weekendSurcharge') || 0;
  const holidaySurcharge = watch('holidaySurcharge') || 0;
  const decemberSurcharge = watch('decemberSurcharge') || 0;
  const highSeasonSurcharge = watch('highSeasonSurcharge') || 0;
  const highSeasonMonths = watch('highSeasonMonths') || [];

  const handleCustomPricingChange = (prices: Record<string, number>) => {
    if (setValue && typeof setValue === 'function') {
      setValue('customPricing', prices);
    }
    logger.debug('Custom pricing updated', { priceCount: Object.keys(prices).length });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Base Pricing */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney />
              Preços Base
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Controller
                  name="basePrice"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Preço por Diária"
                      error={!!errors.basePrice}
                      helperText={errors.basePrice?.message || 'Valor base por noite'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        step: 10,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="pricePerExtraGuest"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Por Pessoa Extra"
                      error={!!errors.pricePerExtraGuest}
                      helperText={errors.pricePerExtraGuest?.message || 'Valor adicional por pessoa'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        step: 5,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="cleaningFee"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Taxa de Limpeza"
                      error={!!errors.cleaningFee}
                      helperText={errors.cleaningFee?.message || 'Taxa única por reserva'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <CleaningServices fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      inputProps={{
                        min: 0,
                        step: 10,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="minimumNights"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Mínimo de Diárias"
                      error={!!errors.minimumNights}
                      helperText={errors.minimumNights?.message || 'Estadia mínima'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Nights fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      inputProps={{
                        min: 1,
                        max: 30,
                        step: 1,
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Payment method surcharges removed - now managed at tenant level via Negotiation Settings */}

        {/* Seasonal Surcharges */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth />
              Acréscimos Sazonais
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Controller
                  name="weekendSurcharge"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Final de Semana"
                      helperText="% de acréscimo"
                      InputProps={{
                        startAdornment: <Weekend fontSize="small" sx={{ mr: 1 }} />,
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: 5,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="holidaySurcharge"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Feriados"
                      helperText="% de acréscimo"
                      InputProps={{
                        startAdornment: <Celebration fontSize="small" sx={{ mr: 1 }} />,
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: 5,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="decemberSurcharge"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Dezembro"
                      helperText="% de acréscimo"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: 5,
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="highSeasonSurcharge"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Alta Temporada"
                      helperText="% de acréscimo"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        max: 100,
                        step: 5,
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Price Simulator removed - discounts managed in Negotiation Settings */}

        {/* Custom Pricing Calendar */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth />
              Preços Dinâmicos por Data
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure preços específicos para datas especiais, fins de semana ou feriados
            </Typography>

            <PricingCalendar
              basePrice={Number(basePrice) || 0}
              specialPrices={customPricing}
              onPricesChange={handleCustomPricingChange}
              weekendSurcharge={weekendSurcharge}
              holidaySurcharge={holidaySurcharge}
              decemberSurcharge={decemberSurcharge}
              highSeasonSurcharge={highSeasonSurcharge}
              highSeasonMonths={highSeasonMonths}
              reservations={reservations}
              readOnly={false}
              showReservations={true}
            />
          </Paper>
        </Grid>

        {/* Tips */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<Info />}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Dicas de Precificação:
            </Typography>
            <Box component="ul" sx={{ pl: 2, my: 0 }}>
              <Typography component="li" variant="body2">
                Pesquise preços de imóveis similares na sua região
              </Typography>
              <Typography component="li" variant="body2">
                Ofereça descontos para PIX para incentivar pagamentos à vista
              </Typography>
              <Typography component="li" variant="body2">
                Considere cobrar menos nos primeiros meses para ganhar avaliações
              </Typography>
              <Typography component="li" variant="body2">
                Use o calendário acima para definir preços especiais para datas de alta demanda
              </Typography>
            </Box>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};