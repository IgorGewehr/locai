'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  FormControlLabel,
  Checkbox,
  IconButton,
  useTheme,
  alpha,
  Fade,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search,
  Add,
  Clear,
  Wifi,
  AcUnit,
  Pool,
  LocalParking,
  FitnessCenter,
  Pets,
  Star,
  CheckCircle,
  RestaurantMenu,
  Security,
  Weekend,
} from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import { COMMON_AMENITIES } from '@/lib/types/property';
import { logger } from '@/lib/utils/logger';

const AMENITY_CATEGORIES = {
  essentials: {
    label: 'Essenciais',
    icon: <Wifi />,
    color: 'primary' as const,
    amenities: ['Wi-Fi', 'Ar Condicionado', 'TV a Cabo', 'Netflix', 'Cozinha Equipada', 'Geladeira', 'Fogão'],
  },
  comfort: {
    label: 'Conforto',
    icon: <Weekend />,
    color: 'secondary' as const,
    amenities: ['Piscina', 'Banheira', 'Lareira', 'Varanda', 'Jardim', 'Sacada', 'Ventilador', 'Aquecedor'],
  },
  convenience: {
    label: 'Conveniência',
    icon: <LocalParking />,
    color: 'info' as const,
    amenities: ['Estacionamento', 'Elevador', 'Portaria 24h', 'Área de Serviço', 'Máquina de Lavar', 'Secadora', 'Ferro de Passar'],
  },
  entertainment: {
    label: 'Lazer',
    icon: <RestaurantMenu />,
    color: 'warning' as const,
    amenities: ['Academia', 'Churrasqueira', 'Área Gourmet', 'Jogos', 'Livros'],
  },
  safety: {
    label: 'Segurança',
    icon: <Security />,
    color: 'success' as const,
    amenities: ['Cofre', 'Extintor', 'Detector de Fumaça', 'Kit Primeiro Socorros'],
  },
  family: {
    label: 'Família',
    icon: <Star />,
    color: 'error' as const,
    amenities: ['Berço', 'Cadeira de Bebê', 'Micro-ondas'],
  },
};

export const PropertyAmenities: React.FC = () => {
  const theme = useTheme();
  const { control, watch, setValue } = useFormContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('essentials');
  const [customAmenity, setCustomAmenity] = useState('');

  const selectedAmenities = watch('amenities') || [];
  const isFeatured = watch('isFeatured');
  const allowsPets = watch('allowsPets');

  // Filter amenities based on search
  const filteredAmenities = useMemo(() => {
    if (searchTerm) {
      return COMMON_AMENITIES.filter(amenity =>
        amenity.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return AMENITY_CATEGORIES[selectedCategory as keyof typeof AMENITY_CATEGORIES]?.amenities || [];
  }, [searchTerm, selectedCategory]);

  // Count amenities by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(AMENITY_CATEGORIES).forEach(([key, category]) => {
      counts[key] = category.amenities.filter(amenity => 
        selectedAmenities.includes(amenity)
      ).length;
    });
    return counts;
  }, [selectedAmenities]);

  const handleAmenityToggle = (amenity: string) => {
    const current = selectedAmenities || [];
    const updated = current.includes(amenity)
      ? current.filter((a: string) => a !== amenity)
      : [...current, amenity];
    
    setValue('amenities', updated);
    logger.debug('Amenity toggled', { amenity, selected: !current.includes(amenity) });
  };

  const handleAddCustom = () => {
    if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
      setValue('amenities', [...selectedAmenities, customAmenity.trim()]);
      setCustomAmenity('');
      logger.info('Custom amenity added', { amenity: customAmenity.trim() });
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setValue('amenities', selectedAmenities.filter((a: string) => a !== amenity));
    logger.debug('Amenity removed', { amenity });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Search and Categories */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: 'background.paper',
              borderRadius: 2,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar comodidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Adicionar comodidade personalizada..."
                  value={customAmenity}
                  onChange={(e) => setCustomAmenity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={handleAddCustom}
                          disabled={!customAmenity.trim()}
                        >
                          <Add />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Category Selector */}
        {!searchTerm && (
          <Grid item xs={12}>
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
                },
              }}
            >
              {Object.entries(AMENITY_CATEGORIES).map(([key, category]) => (
                <ToggleButton key={key} value={key}>
                  <Badge 
                    badgeContent={categoryCounts[key]} 
                    color={category.color}
                    sx={{ mr: 1 }}
                  >
                    {category.icon}
                  </Badge>
                  <Typography variant="body2">
                    {category.label}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
        )}

        {/* Selected Amenities Summary */}
        {selectedAmenities.length > 0 && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" />
                {selectedAmenities.length} Comodidades Selecionadas
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {selectedAmenities.map((amenity: string) => (
                  <Chip
                    key={amenity}
                    label={amenity}
                    size="small"
                    onDelete={() => handleRemoveAmenity(amenity)}
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Amenities Grid */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: 'background.paper',
              borderRadius: 2,
            }}
          >
            {searchTerm && (
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {filteredAmenities.length} resultado{filteredAmenities.length !== 1 && 's'} encontrado{filteredAmenities.length !== 1 && 's'}
              </Typography>
            )}
            
            <Grid container spacing={2}>
              {filteredAmenities.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                const categoryKey = Object.keys(AMENITY_CATEGORIES).find(key =>
                  AMENITY_CATEGORIES[key as keyof typeof AMENITY_CATEGORIES].amenities.includes(amenity)
                );
                const category = categoryKey ? AMENITY_CATEGORIES[categoryKey as keyof typeof AMENITY_CATEGORIES] : null;

                return (
                  <Grid item xs={6} sm={4} md={3} key={amenity}>
                    <Fade in timeout={200}>
                      <Paper
                        onClick={() => handleAmenityToggle(amenity)}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          borderRadius: 2,
                          border: `2px solid ${
                            isSelected 
                              ? theme.palette[category?.color || 'primary'].main 
                              : 'transparent'
                          }`,
                          backgroundColor: isSelected
                            ? alpha(theme.palette[category?.color || 'primary'].main, 0.1)
                            : 'background.paper',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: theme.shadows[4],
                            borderColor: theme.palette[category?.color || 'primary'].main,
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                            {amenity}
                          </Typography>
                          {isSelected && (
                            <CheckCircle 
                              fontSize="small" 
                              sx={{ color: theme.palette[category?.color || 'primary'].main }}
                            />
                          )}
                        </Box>
                      </Paper>
                    </Fade>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Special Features */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.warning.main, 0.05),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Star />
              Características Especiais
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="isFeatured"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value || false}
                          color="warning"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            Imóvel em Destaque
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Aparecer em destaque nas buscas (pode ter custo adicional)
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="allowsPets"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          {...field}
                          checked={field.value || false}
                          color="warning"
                          icon={<Pets />}
                          checkedIcon={<Pets />}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            Aceita Animais de Estimação
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Permitir hóspedes com pets (considere regras e taxas)
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {Object.entries(AMENITY_CATEGORIES).map(([key, category]) => {
              const count = categoryCounts[key];
              const total = category.amenities.length;
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              
              return (
                <Grid item xs={6} sm={4} md={2} key={key}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      backgroundColor: alpha(theme.palette[category.color].main, 0.05),
                      border: `1px solid ${alpha(theme.palette[category.color].main, 0.2)}`,
                      borderRadius: 2,
                    }}
                  >
                    {category.icon}
                    <Typography variant="h6" fontWeight={700}>
                      {count}/{total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {category.label}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Box
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette[category.color].main, 0.1),
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${percentage}%`,
                            backgroundColor: theme.palette[category.color].main,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};