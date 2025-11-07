'use client';

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Slider,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  Bed,
  Bathtub,
  Groups,
  CheckCircle,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { logger } from '@/lib/utils/logger';

interface SpecCardProps {
  title: string;
  icon: React.ReactNode;
  fieldName: string;
  min: number;
  max: number;
  marks: { value: number; label: string }[];
  color: 'primary' | 'secondary' | 'info';
  formatValue?: (value: number) => string;
  helperText?: string;
}

const SpecCard: React.FC<SpecCardProps> = ({
  title,
  icon,
  fieldName,
  min,
  max,
  marks,
  color,
  formatValue,
  helperText,
}) => {
  const theme = useTheme();
  const { control, formState: { errors } } = useFormContext();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette[color].main, 0.05)} 0%, 
          ${alpha(theme.palette[color].light, 0.1)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            backgroundColor: alpha(theme.palette[color].main, 0.1),
            display: 'flex',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {!errors[fieldName] && (
          <CheckCircle color="success" fontSize="small" sx={{ ml: 'auto' }} />
        )}
      </Box>

      <Controller
        name={fieldName}
        control={control}
        render={({ field }) => (
          <Box>
            <Box sx={{ px: 2, pb: 2 }}>
              <Slider
                {...field}
                value={field.value || min}
                min={min}
                max={max}
                marks={marks}
                step={1}
                valueLabelDisplay="auto"
                onChange={(_, value) => {
                  field.onChange(value);
                  logger.debug('Property spec changed', { field: fieldName, value });
                }}
                sx={{
                  '& .MuiSlider-thumb': {
                    width: 28,
                    height: 28,
                    backgroundColor: theme.palette[color].main,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: `0 0 0 8px ${alpha(theme.palette[color].main, 0.16)}`,
                    },
                  },
                  '& .MuiSlider-track': {
                    height: 6,
                    background: `linear-gradient(90deg, 
                      ${theme.palette[color].main}, 
                      ${theme.palette[color].light})`,
                  },
                  '& .MuiSlider-rail': {
                    height: 6,
                    backgroundColor: alpha(theme.palette[color].main, 0.1),
                  },
                  '& .MuiSlider-mark': {
                    width: 3,
                    height: 10,
                    backgroundColor: theme.palette[color].main,
                  },
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem',
                    color: theme.palette.text.secondary,
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: theme.palette[color].main,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                textAlign: 'center',
                p: 2,
                backgroundColor: alpha(theme.palette[color].main, 0.05),
                borderRadius: 1,
                mt: 2,
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: theme.palette[color].main,
                  fontWeight: 700,
                }}
              >
                {formatValue ? formatValue(field.value) : field.value || min}
              </Typography>
              {helperText && (
                <Typography variant="caption" color="text.secondary">
                  {helperText}
                </Typography>
              )}
            </Box>

            {errors[fieldName] && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: 'block' }}
              >
                {errors[fieldName]?.message}
              </Typography>
            )}
          </Box>
        )}
      />
    </Paper>
  );
};

export const PropertySpecs: React.FC = () => {
  const theme = useTheme();
  const { watch } = useFormContext();
  
  const bedrooms = watch('bedrooms');
  const bathrooms = watch('bathrooms');
  const maxGuests = watch('maxGuests');

  const bedroomMarks = [
    { value: 0, label: 'Estúdio' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5+' },
  ];

  const bathroomMarks = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4+' },
  ];

  const guestMarks = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 4, label: '4' },
    { value: 6, label: '6' },
    { value: 8, label: '8' },
    { value: 10, label: '10+' },
  ];

  // Calculate occupancy ratio
  const getOccupancyStatus = () => {
    if (!bedrooms || !maxGuests) return null;
    
    const ratio = maxGuests / (bedrooms || 1);
    
    if (ratio <= 2) {
      return { label: 'Confortável', color: 'success' as const };
    } else if (ratio <= 3) {
      return { label: 'Adequado', color: 'info' as const };
    } else {
      return { label: 'Apertado', color: 'warning' as const };
    }
  };

  const occupancyStatus = getOccupancyStatus();

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Main Specs */}
        <Grid item xs={12} md={4}>
          <SpecCard
            title="Quartos"
            icon={<Bed sx={{ color: theme.palette.primary.main }} />}
            fieldName="bedrooms"
            min={0}
            max={5}
            marks={bedroomMarks}
            color="primary"
            formatValue={(value) => value === 0 ? 'Estúdio' : String(value)}
            helperText={
              bedrooms === 0 
                ? 'Sem quartos separados' 
                : `${bedrooms} quarto${bedrooms > 1 ? 's' : ''}`
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <SpecCard
            title="Banheiros"
            icon={<Bathtub sx={{ color: theme.palette.secondary.main }} />}
            fieldName="bathrooms"
            min={1}
            max={4}
            marks={bathroomMarks}
            color="secondary"
            helperText={`${bathrooms || 1} banheiro${(bathrooms || 1) > 1 ? 's' : ''}`}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <SpecCard
            title="Hóspedes"
            icon={<Groups sx={{ color: theme.palette.info.main }} />}
            fieldName="maxGuests"
            min={1}
            max={10}
            marks={guestMarks}
            color="info"
            helperText={`Máximo de ${maxGuests || 1} pessoa${(maxGuests || 1) > 1 ? 's' : ''}`}
          />
        </Grid>

        {/* Summary Card */}
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
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="success" />
              Resumo das Especificações
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Configuração
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {bedrooms === 0 ? 'Estúdio' : `${bedrooms}Q`} / {bathrooms}B
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Capacidade Total
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {maxGuests} {maxGuests === 1 ? 'pessoa' : 'pessoas'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Nível de Conforto
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {occupancyStatus && (
                      <Chip
                        label={occupancyStatus.label}
                        color={occupancyStatus.color}
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Recommendations */}
            <Box sx={{ mt: 3, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                📋 Recomendações
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    • {bedrooms === 0 ? 'Estúdios' : 'Quartos'}: Conte apenas cômodos com camas
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    • Banheiros: Inclua completos e lavabos
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    • Hóspedes: Considere sofás-cama e colchões extras
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    • Ideal: 2 pessoas por quarto para conforto
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};