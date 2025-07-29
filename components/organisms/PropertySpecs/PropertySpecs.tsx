// components/organisms/PropertySpecs/PropertySpecs.tsx
'use client';

import React from 'react'
import {
  Box,
  Grid,
  Paper,
  useTheme,
  alpha,
  Slider,
  Typography as MuiTypography
} from '@mui/material'
import { FormField } from '@/components/molecules'
import { Typography } from '@/components/atoms'
import { 
  Bed, 
  Bathtub, 
  Group, 
  Hotel,
  Info
} from '@mui/icons-material'
import { Controller, useFormContext } from 'react-hook-form'

export const PropertySpecs: React.FC = () => {
  const theme = useTheme()
  const { control } = useFormContext()

  const bedroomMarks = [
    { value: 0, label: 'Estúdio' },
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5+' },
  ]

  const bathroomMarks = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4+' },
  ]

  const guestMarks = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 4, label: '4' },
    { value: 6, label: '6' },
    { value: 8, label: '8' },
    { value: 10, label: '10+' },
  ]

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h5" 
          component="h2" 
          gutterBottom
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: theme.palette.primary.main 
          }}
        >
          <Hotel />
          Especificações do Imóvel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Defina as características físicas do seu imóvel
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3,
              height: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Bed sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="h6">Quartos</Typography>
            </Box>
            
            <Controller
              name="bedrooms"
              control={control}
              render={({ field }) => (
                <Box sx={{ px: 2 }}>
                  <Slider
                    {...field}
                    value={field.value || 0}
                    min={0}
                    max={5}
                    step={1}
                    marks={bedroomMarks}
                    valueLabelDisplay="off"
                    sx={{
                      '& .MuiSlider-thumb': {
                        width: 24,
                        height: 24,
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
                        },
                      },
                      '& .MuiSlider-track': {
                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                      },
                      '& .MuiSlider-mark': {
                        backgroundColor: theme.palette.primary.main,
                        height: 8,
                        width: 2,
                      },
                      '& .MuiSlider-markLabel': {
                        color: theme.palette.text.primary,
                        fontSize: '0.75rem',
                      },
                    }}
                  />
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="h4" color="primary">
                      {field.value === 0 ? 'Estúdio' : field.value || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {field.value === 0 ? 'Sem quartos separados' : `${field.value || 0} quarto${(field.value || 0) > 1 ? 's' : ''}`}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3,
              height: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Bathtub sx={{ mr: 1, color: theme.palette.secondary.main }} />
              <Typography variant="h6">Banheiros</Typography>
            </Box>
            
            <Controller
              name="bathrooms"
              control={control}
              render={({ field }) => (
                <Box sx={{ px: 2 }}>
                  <Slider
                    {...field}
                    value={field.value || 1}
                    min={1}
                    max={4}
                    step={1}
                    marks={bathroomMarks}
                    valueLabelDisplay="off"
                    sx={{
                      '& .MuiSlider-thumb': {
                        width: 24,
                        height: 24,
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0 0 0 8px ${alpha(theme.palette.secondary.main, 0.16)}`,
                        },
                      },
                      '& .MuiSlider-track': {
                        background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.light})`,
                      },
                      '& .MuiSlider-mark': {
                        backgroundColor: theme.palette.secondary.main,
                        height: 8,
                        width: 2,
                      },
                      '& .MuiSlider-markLabel': {
                        color: theme.palette.text.primary,
                        fontSize: '0.75rem',
                      },
                    }}
                  />
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="h4" color="secondary">
                      {field.value || 1}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {field.value || 1} banheiro{(field.value || 1) > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper 
            sx={{ 
              p: 3,
              height: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.1)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Group sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="h6">Hóspedes</Typography>
            </Box>
            
            <Controller
              name="maxGuests"
              control={control}
              render={({ field }) => (
                <Box sx={{ px: 2 }}>
                  <Slider
                    {...field}
                    value={field.value || 2}
                    min={1}
                    max={10}
                    step={1}
                    marks={guestMarks}
                    valueLabelDisplay="off"
                    sx={{
                      '& .MuiSlider-thumb': {
                        width: 24,
                        height: 24,
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: `0 0 0 8px ${alpha(theme.palette.info.main, 0.16)}`,
                        },
                      },
                      '& .MuiSlider-track': {
                        background: `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
                      },
                      '& .MuiSlider-mark': {
                        backgroundColor: theme.palette.info.main,
                        height: 8,
                        width: 2,
                      },
                      '& .MuiSlider-markLabel': {
                        color: theme.palette.text.primary,
                        fontSize: '0.75rem',
                      },
                    }}
                  />
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="h4" color="info">
                      {field.value || 2}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {field.value || 2} hóspede{(field.value || 2) > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              backgroundColor: alpha(theme.palette.warning.main, 0.05),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Info sx={{ mr: 1, color: theme.palette.warning.main }} />
              <Typography variant="h6" sx={{ color: theme.palette.warning.main }}>
                Informações Importantes
              </Typography>
            </Box>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Quartos:</strong> Conte apenas quartos com camas. Não inclua salas ou outros cômodos.
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                <strong>Banheiros:</strong> Inclua banheiros completos e lavabos.
              </Typography>
              <Typography component="li" variant="body2">
                <strong>Hóspedes:</strong> Considere o número máximo confortável, incluindo sofás-cama e colchões extras.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}