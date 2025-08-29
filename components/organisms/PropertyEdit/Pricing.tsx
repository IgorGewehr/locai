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
  IconButton,
  Card,
  CardContent,
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
  Add,
  Remove,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '@/lib/types/common';
import { logger } from '@/lib/utils/logger';
import PricingCalendar from '@/components/organisms/PricingCalendar/PricingCalendar';

export const PropertyPricing: React.FC = () => {
  const theme = useTheme();
  const formContext = useFormContext();
  const { control, watch, setValue, formState: { errors } = {} } = formContext || {};
  
  const basePrice = watch('basePrice');
  const cleaningFee = watch('cleaningFee');
  const pricePerExtraGuest = watch('pricePerExtraGuest');
  const minimumNights = watch('minimumNights');
  const paymentMethodSurcharges = watch('paymentMethodSurcharges') || {};
  const customPricing = watch('customPricing') || {};
  const weekendSurcharge = watch('weekendSurcharge') || 30;
  const holidaySurcharge = watch('holidaySurcharge') || 50;
  const decemberSurcharge = watch('decemberSurcharge') || 10;
  
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
    if (setValue && typeof setValue === 'function') {
      setValue(`paymentMethodSurcharges.${method}`, value);
    }
    logger.debug('Payment surcharge updated', { method, value });
  };

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

            <Grid container spacing={3}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => {
                const currentValue = paymentMethodSurcharges[method as PaymentMethod] || 0;
                const isPositive = currentValue > 0;
                const isNegative = currentValue < 0;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={method}>
                    <Card 
                      elevation={0}
                      sx={{
                        border: '1px solid',
                        borderColor: 
                          isPositive ? theme.palette.warning.light :
                          isNegative ? theme.palette.success.light :
                          theme.palette.divider,
                        backgroundColor: 
                          isPositive ? alpha(theme.palette.warning.main, 0.05) :
                          isNegative ? alpha(theme.palette.success.main, 0.05) :
                          'transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          {label}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleSurchargeChange(method as PaymentMethod, Math.max(-20, currentValue - 1))}
                            disabled={currentValue <= -20}
                            sx={{
                              backgroundColor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.2) }
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          
                          <TextField
                            size="small"
                            value={currentValue}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              if (value >= -20 && value <= 20) {
                                handleSurchargeChange(method as PaymentMethod, value);
                              }
                            }}
                            inputProps={{
                              style: { textAlign: 'center', fontWeight: 600 },
                              min: -20,
                              max: 20
                            }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            sx={{
                              minWidth: 80,
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'background.paper',
                                '& fieldset': {
                                  borderColor: 
                                    isPositive ? theme.palette.warning.main :
                                    isNegative ? theme.palette.success.main :
                                    theme.palette.divider,
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: 
                                  isPositive ? theme.palette.warning.dark :
                                  isNegative ? theme.palette.success.dark :
                                  'text.primary',
                              }
                            }}
                          />
                          
                          <IconButton
                            size="small"
                            onClick={() => handleSurchargeChange(method as PaymentMethod, Math.min(20, currentValue + 1))}
                            disabled={currentValue >= 20}
                            sx={{
                              backgroundColor: alpha(theme.palette.success.main, 0.1),
                              '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.2) }
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                        
                        {currentValue !== 0 && (
                          <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Chip
                              size="small"
                              label={
                                isPositive ? `+${currentValue}% Acréscimo` :
                                isNegative ? `${currentValue}% Desconto` :
                                'Sem alteração'
                              }
                              color={isPositive ? 'warning' : isNegative ? 'success' : 'default'}
                              icon={isPositive ? <TrendingUp /> : isNegative ? <TrendingDown /> : undefined}
                            />
                          </Box>
                        )}
                        
                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {currentValue === 0 && 'Clique +/- ou digite um valor'}
                            {isPositive && `Cliente pagará ${currentValue}% a mais`}
                            {isNegative && `Cliente ganha ${Math.abs(currentValue)}% de desconto`}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
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