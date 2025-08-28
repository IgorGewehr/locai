'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Slider,
  useTheme,
  alpha,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Divider,
} from '@mui/material';
import {
  AttachMoney,
  Percent,
  NightlightRound as Nights,
  CleaningServices,
  TrendingUp,
  TrendingDown,
  Celebration,
  Weekend,
  CalendarMonth,
  Info,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '@/lib/types/common';
import { logger } from '@/lib/utils/logger';

export const PropertyPricing: React.FC = () => {
  const theme = useTheme();
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  
  const basePrice = watch('basePrice');
  const cleaningFee = watch('cleaningFee');
  const pricePerExtraGuest = watch('pricePerExtraGuest');
  const minimumNights = watch('minimumNights');
  const paymentMethodSurcharges = watch('paymentMethodSurcharges') || {};
  
  const [totalExample, setTotalExample] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);

  // Calculate example total
  useEffect(() => {
    const nights = 3;
    const guests = 2;
    const extraGuests = Math.max(0, guests - 2);
    
    const basePriceNum = Number(basePrice) || 0;
    const pricePerExtraGuestNum = Number(pricePerExtraGuest) || 0;
    const cleaningFeeNum = Number(cleaningFee) || 0;
    const surchargeNum = Number(paymentMethodSurcharges[selectedPaymentMethod]) || 0;
    
    const subtotal = basePriceNum * nights;
    const extraGuestFee = pricePerExtraGuestNum * extraGuests * nights;
    const cleaning = cleaningFeeNum;
    const surchargeAmount = (subtotal + extraGuestFee) * (surchargeNum / 100);
    
    const total = subtotal + extraGuestFee + cleaning + surchargeAmount;
    setTotalExample(Number(total) || 0);
    
    logger.debug('Price calculation updated', { 
      basePrice, 
      total, 
      paymentMethod: selectedPaymentMethod 
    });
  }, [basePrice, cleaningFee, pricePerExtraGuest, paymentMethodSurcharges, selectedPaymentMethod]);

  const handleSurchargeChange = (method: PaymentMethod, value: number) => {
    setValue(`paymentMethodSurcharges.${method}`, value);
    logger.debug('Payment surcharge updated', { method, value });
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

        {/* Payment Methods Surcharges */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.secondary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Percent />
              Acréscimos/Descontos por Forma de Pagamento
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure percentuais de acréscimo (positivo) ou desconto (negativo) para cada método
            </Typography>

            <Grid container spacing={2}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => (
                <Grid item xs={12} sm={6} md={4} key={method}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Slider
                        value={paymentMethodSurcharges[method as PaymentMethod] || 0}
                        onChange={(_, value) => handleSurchargeChange(method as PaymentMethod, value as number)}
                        min={-20}
                        max={20}
                        step={1}
                        marks={[
                          { value: -20, label: '-20%' },
                          { value: 0, label: '0%' },
                          { value: 20, label: '+20%' },
                        ]}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${value > 0 ? '+' : ''}${value}%`}
                        sx={{
                          flex: 1,
                          '& .MuiSlider-track': {
                            backgroundColor: 
                              (paymentMethodSurcharges[method as PaymentMethod] || 0) > 0 
                                ? theme.palette.warning.main 
                                : (paymentMethodSurcharges[method as PaymentMethod] || 0) < 0
                                  ? theme.palette.success.main
                                  : theme.palette.grey[400],
                          },
                          '& .MuiSlider-thumb': {
                            backgroundColor: 
                              (paymentMethodSurcharges[method as PaymentMethod] || 0) > 0 
                                ? theme.palette.warning.main 
                                : (paymentMethodSurcharges[method as PaymentMethod] || 0) < 0
                                  ? theme.palette.success.main
                                  : theme.palette.grey[600],
                          },
                        }}
                      />
                      {(paymentMethodSurcharges[method as PaymentMethod] || 0) !== 0 && (
                        <Chip
                          label={`${paymentMethodSurcharges[method as PaymentMethod] > 0 ? '+' : ''}${paymentMethodSurcharges[method as PaymentMethod]}%`}
                          size="small"
                          color={(paymentMethodSurcharges[method as PaymentMethod] || 0) > 0 ? 'warning' : 'success'}
                          icon={(paymentMethodSurcharges[method as PaymentMethod] || 0) > 0 ? <TrendingUp /> : <TrendingDown />}
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

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

        {/* Price Simulator */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom>
              💰 Simulador de Preços
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Exemplo de cálculo para 3 diárias, 2 hóspedes:
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Forma de Pagamento
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedPaymentMethod}
                    exclusive
                    onChange={(_, value) => value && setSelectedPaymentMethod(value)}
                    size="small"
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => (
                      <ToggleButton key={method} value={method}>
                        {label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Total Estimado
                  </Typography>
                  <Typography variant="h3" color="success.main" fontWeight={700}>
                    R$ {(Number(totalExample) || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Base: R$ {(Number(basePrice || 0) * 3).toFixed(2)} + Limpeza: R$ {Number(cleaningFee || 0).toFixed(2)}
                    {paymentMethodSurcharges[selectedPaymentMethod] !== 0 && 
                      ` ${paymentMethodSurcharges[selectedPaymentMethod] > 0 ? '+' : ''}${paymentMethodSurcharges[selectedPaymentMethod]}%`
                    }
                  </Typography>
                </Box>
              </Grid>
            </Grid>
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
                Ajuste preços sazonais baseado na demanda local
              </Typography>
            </Box>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};