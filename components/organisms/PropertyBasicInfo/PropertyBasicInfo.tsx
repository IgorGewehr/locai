// components/organisms/PropertyBasicInfo/PropertyBasicInfo.tsx
'use client';

import React from 'react'
import {
  Box,
  Grid,
  Paper,
  useTheme,
  alpha
} from '@mui/material'
import { FormField, SelectField } from '@/components/molecules'
import { Typography } from '@/components/atoms'
import { 
  PropertyCategory, 
  PROPERTY_CATEGORIES_LABELS 
} from '@/lib/types/property'
import { Home, LocationOn, Description, Category } from '@mui/icons-material'

export const PropertyBasicInfo: React.FC = () => {
  const theme = useTheme()

  const categoryOptions = Object.entries(PROPERTY_CATEGORIES_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

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
          <Home />
          Informações Básicas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Informe os dados principais do seu imóvel para atrair hóspedes
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 2,
            }}
          >
            <FormField
              name="title"
              label="Título do Anúncio"
              placeholder="Ex: Apartamento aconchegante no centro da cidade"
              required
              startIcon={<Home />}
              helperText="Crie um título atrativo que destaque o principal diferencial do seu imóvel"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper 
            sx={{ 
              p: 3,
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              borderRadius: 2,
            }}
          >
            <FormField
              name="description"
              label="Descrição Detalhada"
              placeholder="Descreva seu imóvel de forma detalhada e atrativa..."
              required
              multiline
              rows={6}
              startIcon={<Description />}
              helperText="Destaque as comodidades, localização e experiências que o hóspede terá"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <FormField
            name="address"
            label="Endereço Completo"
            placeholder="Rua, número, bairro, cidade - Estado"
            required
            startIcon={<LocationOn />}
            helperText="Inclua informações que ajudem o hóspede a localizar o imóvel"
            sx={{
              '& .MuiOutlinedInput-root': {
                transition: 'all 0.3s ease-in-out',
                '&:focus-within': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              },
            }}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <SelectField
            name="category"
            label="Tipo de Imóvel"
            required
            options={categoryOptions}
            placeholder="Selecione o tipo"
            helperText="Escolha a categoria que melhor descreve seu imóvel"
          />
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
            <Typography variant="h6" gutterBottom sx={{ color: theme.palette.info.main }}>
              💡 Dicas para um anúncio de sucesso
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Use palavras-chave que os hóspedes buscam: "próximo ao metrô", "vista para o mar", "piscina"
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Seja específico sobre a localização e pontos de interesse próximos
              </Typography>
              <Typography component="li" variant="body2">
                Destaque experiências únicas que seu imóvel oferece
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}