import React from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  InputAdornment,
  Slider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Stack,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Weekend,
  Celebration,
  AcUnit,
  WbSunny,
  TrendingUp,
  Info,
} from '@mui/icons-material';
import { FormField } from '@/components/molecules';
import { useFormContext } from 'react-hook-form';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export const PricingSurcharges: React.FC = () => {
  const theme = useTheme();
  const { watch, setValue } = useFormContext();
  
  const weekendSurcharge = watch('weekendSurcharge') || 0;
  const holidaySurcharge = watch('holidaySurcharge') || 0;
  const decemberSurcharge = watch('decemberSurcharge') || 0;
  const highSeasonSurcharge = watch('highSeasonSurcharge') || 0;
  const highSeasonMonths = watch('highSeasonMonths') || [];
  const basePrice = watch('basePrice') || 0;

  const handleMonthsChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setValue('highSeasonMonths', typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  const calculatePriceWithSurcharge = (surcharge: number) => {
    return basePrice * (1 + surcharge / 100);
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Configure acréscimos automáticos que serão aplicados em datas específicas. 
          Estes valores são aplicados sobre o preço base quando não há preço customizado definido.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Fins de Semana */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Weekend sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6">Fins de Semana</Typography>
              <Chip 
                label="Sáb e Dom" 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="weekendSurcharge"
              label="Acréscimo para fins de semana"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText={basePrice > 0 ? `Preço final: R$ ${calculatePriceWithSurcharge(weekendSurcharge).toFixed(2)}` : 'Configure o preço base primeiro'}
            />
            
            <Box sx={{ mt: 2 }}>
              <Slider
                value={weekendSurcharge}
                onChange={(e, value) => setValue('weekendSurcharge', value as number)}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 30, label: '30%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Feriados */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Celebration sx={{ mr: 1, color: theme.palette.secondary.main }} />
              <Typography variant="h6">Feriados</Typography>
              <Chip 
                label="Nacionais" 
                size="small" 
                color="secondary" 
                variant="outlined"
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="holidaySurcharge"
              label="Acréscimo para feriados"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText={basePrice > 0 ? `Preço final: R$ ${calculatePriceWithSurcharge(holidaySurcharge).toFixed(2)}` : 'Configure o preço base primeiro'}
            />
            
            <Box sx={{ mt: 2 }}>
              <Slider
                value={holidaySurcharge}
                onChange={(e, value) => setValue('holidaySurcharge', value as number)}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Dezembro */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AcUnit sx={{ mr: 1, color: theme.palette.success.main }} />
              <Typography variant="h6">Mês de Dezembro</Typography>
              <Chip 
                label="Festas" 
                size="small" 
                color="success" 
                variant="outlined"
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="decemberSurcharge"
              label="Acréscimo para dezembro"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText={basePrice > 0 ? `Preço final: R$ ${calculatePriceWithSurcharge(decemberSurcharge).toFixed(2)}` : 'Configure o preço base primeiro'}
            />
            
            <Box sx={{ mt: 2 }}>
              <Slider
                value={decemberSurcharge}
                onChange={(e, value) => setValue('decemberSurcharge', value as number)}
                min={0}
                max={50}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 10, label: '10%' },
                  { value: 20, label: '20%' },
                  { value: 50, label: '50%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Alta Temporada */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WbSunny sx={{ mr: 1, color: theme.palette.warning.main }} />
              <Typography variant="h6">Alta Temporada</Typography>
              <Chip 
                label="Customizável" 
                size="small" 
                color="warning" 
                variant="outlined"
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <FormField
              name="highSeasonSurcharge"
              label="Acréscimo para alta temporada"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText={basePrice > 0 ? `Preço final: R$ ${calculatePriceWithSurcharge(highSeasonSurcharge).toFixed(2)}` : 'Configure o preço base primeiro'}
            />
            
            <Box sx={{ mt: 2 }}>
              <Slider
                value={highSeasonSurcharge}
                onChange={(e, value) => setValue('highSeasonSurcharge', value as number)}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 25, label: '25%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Meses de alta temporada</InputLabel>
              <Select
                multiple
                value={highSeasonMonths}
                onChange={handleMonthsChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((value) => (
                      <Chip 
                        key={value} 
                        label={MONTHS.find(m => m.value === value)?.label} 
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {MONTHS.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Info sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="h6" sx={{ color: theme.palette.info.main }}>
                Como funcionam os acréscimos
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>Prioridade:</strong> Preços customizados no calendário têm prioridade sobre acréscimos automáticos.
              </Typography>
              <Typography variant="body2">
                <strong>Cumulativo:</strong> Acréscimos não são cumulativos. Se uma data é feriado E fim de semana, apenas o maior acréscimo é aplicado.
              </Typography>
              <Typography variant="body2">
                <strong>Exemplo:</strong> Com preço base de R$ 100, um feriado que cai no sábado com acréscimo de 50% para feriados e 30% para fins de semana, o preço será R$ 150 (aplicado apenas o maior).
              </Typography>
              <Typography variant="body2">
                <strong>Dica:</strong> Use o calendário de preços para definir valores específicos em datas importantes como Réveillon, Carnaval, etc.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};