// components/organisms/PropertyAmenities/PropertyAmenities.tsx
import React, { useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  useTheme,
  alpha,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Fade,
  Collapse
} from '@mui/material'
import { CheckboxField } from '@/components/molecules'
import { Typography, Chip } from '@/components/atoms'
import { 
  Wifi,
  AcUnit,
  Pool,
  DirectionsCar,
  Restaurant,
  FitnessCenter,
  Pets,
  Star,
  Search,
  Add,
  Check
} from '@mui/icons-material'
import { COMMON_AMENITIES } from '@/lib/types/property'
import { Controller, useFormContext } from 'react-hook-form'

const AMENITY_CATEGORIES = {
  essentials: {
    label: 'Essenciais',
    icon: <Wifi />,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'TV a Cabo', 'Netflix', 'Cozinha Equipada']
  },
  comfort: {
    label: 'Conforto',
    icon: <Star />,
    amenities: ['Piscina', 'Banheira', 'Lareira', 'Varanda', 'Jardim', 'Área Gourmet']
  },
  convenience: {
    label: 'Conveniência',
    icon: <DirectionsCar />,
    amenities: ['Estacionamento', 'Elevador', 'Portaria 24h', 'Área de Serviço', 'Máquina de Lavar']
  },
  entertainment: {
    label: 'Entretenimento',
    icon: <Restaurant />,
    amenities: ['Academia', 'Churrasqueira', 'Jogos', 'Livros']
  },
  safety: {
    label: 'Segurança',
    icon: <Check />,
    amenities: ['Cofre', 'Extintor', 'Detector de Fumaça', 'Kit Primeiro Socorros']
  }
}

export const PropertyAmenities: React.FC = () => {
  const theme = useTheme()
  const { control, watch } = useFormContext()
  const [selectedCategory, setSelectedCategory] = useState<string>('essentials')
  const [searchTerm, setSearchTerm] = useState('')
  const [customAmenity, setCustomAmenity] = useState('')
  
  const selectedAmenities = watch('amenities') || []

  const filteredAmenities = COMMON_AMENITIES.filter(amenity =>
    amenity.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categoryAmenities = AMENITY_CATEGORIES[selectedCategory as keyof typeof AMENITY_CATEGORIES]?.amenities || []

  const handleAddCustomAmenity = () => {
    if (customAmenity.trim() && !COMMON_AMENITIES.includes(customAmenity.trim())) {
      // This would need to be handled by the parent form
      setCustomAmenity('')
    }
  }

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
          <Star />
          Comodidades e Características
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Destaque o que torna seu imóvel especial para os hóspedes
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Category Selection */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <ToggleButtonGroup
              value={selectedCategory}
              exclusive
              onChange={(_, value) => value && setSelectedCategory(value)}
              sx={{ 
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  },
                },
              }}
            >
              {Object.entries(AMENITY_CATEGORIES).map(([key, category]) => (
                <ToggleButton key={key} value={key}>
                  {category.icon}
                  <Box sx={{ ml: 1 }}>{category.label}</Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Paper>
        </Grid>

        {/* Search and Custom Amenity */}
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="Buscar comodidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Adicionar comodidade personalizada"
            value={customAmenity}
            onChange={(e) => setCustomAmenity(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCustomAmenity()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <ToggleButton
                    value="add"
                    size="small"
                    onClick={handleAddCustomAmenity}
                    disabled={!customAmenity.trim()}
                    sx={{ border: 'none' }}
                  >
                    <Add />
                  </ToggleButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Grid>

        {/* Selected Amenities Summary */}
        <Grid item xs={12}>
          <Collapse in={selectedAmenities.length > 0}>
            <Paper 
              sx={{ 
                p: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" gutterBottom>
                Comodidades selecionadas ({selectedAmenities.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedAmenities.map((amenity: string) => (
                  <Chip
                    key={amenity}
                    label={amenity}
                    size="small"
                    color="success"
                    interactive
                  />
                ))}
              </Box>
            </Paper>
          </Collapse>
        </Grid>

        {/* Amenities by Category */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {AMENITY_CATEGORIES[selectedCategory as keyof typeof AMENITY_CATEGORIES]?.icon}
              {AMENITY_CATEGORIES[selectedCategory as keyof typeof AMENITY_CATEGORIES]?.label}
            </Typography>
            
            <Grid container spacing={2}>
              {(searchTerm ? filteredAmenities : categoryAmenities).map((amenity) => (
                <Grid item xs={12} sm={6} md={4} key={amenity}>
                  <Fade in timeout={300}>
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: selectedAmenities.includes(amenity)
                          ? `2px solid ${theme.palette.primary.main}`
                          : `1px solid ${theme.palette.divider}`,
                        backgroundColor: selectedAmenities.includes(amenity)
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[4],
                        },
                      }}
                    >
                      <Controller
                        name="amenities"
                        control={control}
                        render={({ field }) => (
                          <CheckboxField
                            name={`amenity-${amenity}`}
                            label={amenity}
                            checked={field.value?.includes(amenity) || false}
                            onChange={(e) => {
                              const isChecked = e.target.checked
                              const currentAmenities = field.value || []
                              
                              if (isChecked) {
                                field.onChange([...currentAmenities, amenity])
                              } else {
                                field.onChange(currentAmenities.filter((a: string) => a !== amenity))
                              }
                            }}
                          />
                        )}
                      />
                    </Paper>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Special Features */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Star />
              Características Especiais
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <CheckboxField
                  name="isFeatured"
                  label="Imóvel em Destaque"
                  helperText="Destacar este imóvel nas buscas (pode ter custo adicional)"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <CheckboxField
                  name="allowsPets"
                  label="Aceita Animais de Estimação"
                  helperText="Permitir hóspedes com pets (considere regras e taxas)"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Tips */}
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
              💡 Dicas para Comodidades
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Wi-Fi rápido é essencial para a maioria dos hóspedes
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Ar condicionado é muito valorizado no Brasil
                  </Typography>
                  <Typography component="li" variant="body2">
                    Cozinha equipada atrai estadias mais longas
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Estacionamento é um grande diferencial
                  </Typography>
                  <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                    Piscina aumenta significativamente as reservas
                  </Typography>
                  <Typography component="li" variant="body2">
                    Segurança (cofre, portaria) tranquiliza hóspedes
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}