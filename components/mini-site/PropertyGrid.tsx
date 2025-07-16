'use client';

import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Container, 
  Typography, 
  Box, 
  TextField, 
  InputAdornment,
  Chip,
  Stack,
  Fab,
  useTheme,
  alpha,
  CircularProgress,
  Button,
  Collapse
} from '@mui/material';
import { 
  Search, 
  FilterList, 
  TuneRounded, 
  People, 
  Bed, 
  AttachMoney,
  Clear
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
import PropertyCard from './PropertyCard';
import { miniSiteClientService } from '@/lib/services/mini-site-client-service';

interface PropertyGridProps {
  properties: PublicProperty[];
  config: MiniSiteConfig;
}

export default function PropertyGrid({ properties: initialProperties, config }: PropertyGridProps) {
  const theme = useTheme();
  const [properties, setProperties] = useState<PublicProperty[]>(initialProperties);
  const [filteredProperties, setFilteredProperties] = useState<PublicProperty[]>(initialProperties);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    minGuests: '',
    maxGuests: '',
    minBedrooms: '',
    maxBedrooms: '',
    minPrice: '',
    maxPrice: '',
    amenities: [] as string[],
    propertyType: ''
  });

  // Get unique values for filter options
  const uniqueAmenities = Array.from(new Set(properties.flatMap(p => p.amenities))).sort();
  const propertyTypes = Array.from(new Set(properties.map(p => p.type))).sort();
  const maxGuests = Math.max(...properties.map(p => p.maxGuests));
  const maxBedrooms = Math.max(...properties.map(p => p.bedrooms));
  const priceRange = {
    min: Math.min(...properties.map(p => p.pricing.basePrice)),
    max: Math.max(...properties.map(p => p.pricing.basePrice))
  };

  // Apply filters
  useEffect(() => {
    let filtered = properties;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.amenities.some(amenity => 
          amenity.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Numeric filters
    if (filters.minGuests) {
      filtered = filtered.filter(p => p.maxGuests >= parseInt(filters.minGuests));
    }
    if (filters.maxGuests) {
      filtered = filtered.filter(p => p.maxGuests <= parseInt(filters.maxGuests));
    }
    if (filters.minBedrooms) {
      filtered = filtered.filter(p => p.bedrooms >= parseInt(filters.minBedrooms));
    }
    if (filters.maxBedrooms) {
      filtered = filtered.filter(p => p.bedrooms <= parseInt(filters.maxBedrooms));
    }
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.pricing.basePrice >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.pricing.basePrice <= parseFloat(filters.maxPrice));
    }

    // Amenities filter
    if (filters.amenities.length > 0) {
      filtered = filtered.filter(p => 
        filters.amenities.every(amenity => p.amenities.includes(amenity))
      );
    }

    // Property type filter
    if (filters.propertyType) {
      filtered = filtered.filter(p => p.type === filters.propertyType);
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, filters]);

  const handleWhatsAppClick = (property: PublicProperty) => {
    const url = miniSiteClientService.generateWhatsAppUrl(
      config.contactInfo.whatsappNumber,
      property.name
    );
    window.open(url, '_blank');
  };

  const handleAmenityToggle = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      minGuests: '',
      maxGuests: '',
      minBedrooms: '',
      maxBedrooms: '',
      minPrice: '',
      maxPrice: '',
      amenities: [],
      propertyType: ''
    });
    setSearchTerm('');
  };

  const hasActiveFilters = searchTerm || Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  const heroStyle = {
    background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.1)}, ${alpha(config.theme.secondaryColor, 0.05)})`,
    backdropFilter: 'blur(20px)',
    borderRadius: config.theme.borderRadius === 'extra-rounded' ? 4 : config.theme.borderRadius === 'rounded' ? 2 : 0,
    border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
    mb: 4,
    p: 4,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box sx={heroStyle}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            mb: 2,
            background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
          }}
        >
          {config.seo.title}
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            textAlign: 'center', 
            opacity: 0.8, 
            mb: 4,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          {config.seo.description}
        </Typography>

        {/* Search Bar */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Buscar por nome, localização, ou comodidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: config.theme.primaryColor }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    <Clear fontSize="small" />
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: config.theme.borderRadius === 'extra-rounded' ? 3 : config.theme.borderRadius === 'rounded' ? 2 : 0,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                '&:hover fieldset': {
                  borderColor: config.theme.primaryColor,
                },
                '&.Mui-focused fieldset': {
                  borderColor: config.theme.primaryColor,
                },
              },
            }}
          />
        </Box>

        {/* Filter Toggle */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            startIcon={<TuneRounded />}
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'contained' : 'outlined'}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1,
              textTransform: 'none',
              ...(showFilters ? {
                background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
              } : {
                borderColor: config.theme.primaryColor,
                color: config.theme.primaryColor,
              }),
            }}
          >
            Filtros Avançados
          </Button>
        </Box>
      </Box>

      {/* Advanced Filters */}
      <Collapse in={showFilters}>
        <Box 
          sx={{ 
            mb: 4, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: config.theme.borderRadius === 'extra-rounded' ? 3 : config.theme.borderRadius === 'rounded' ? 2 : 0,
            border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
          }}
        >
          <Grid container spacing={3}>
            {/* Guests */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Hóspedes
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="Mín."
                  type="number"
                  value={filters.minGuests}
                  onChange={(e) => setFilters(prev => ({ ...prev, minGuests: e.target.value }))}
                  inputProps={{ min: 1, max: maxGuests }}
                />
                <TextField
                  size="small"
                  label="Máx."
                  type="number"
                  value={filters.maxGuests}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxGuests: e.target.value }))}
                  inputProps={{ min: 1, max: maxGuests }}
                />
              </Stack>
            </Grid>

            {/* Bedrooms */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Quartos
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="Mín."
                  type="number"
                  value={filters.minBedrooms}
                  onChange={(e) => setFilters(prev => ({ ...prev, minBedrooms: e.target.value }))}
                  inputProps={{ min: 0, max: maxBedrooms }}
                />
                <TextField
                  size="small"
                  label="Máx."
                  type="number"
                  value={filters.maxBedrooms}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxBedrooms: e.target.value }))}
                  inputProps={{ min: 0, max: maxBedrooms }}
                />
              </Stack>
            </Grid>

            {/* Price Range */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Preço por Noite (R$)
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="Mín."
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  inputProps={{ min: priceRange.min, max: priceRange.max }}
                />
                <TextField
                  size="small"
                  label="Máx."
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  inputProps={{ min: priceRange.min, max: priceRange.max }}
                />
              </Stack>
            </Grid>

            {/* Property Type */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Tipo de Propriedade
              </Typography>
              <TextField
                size="small"
                select
                fullWidth
                value={filters.propertyType}
                onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))}
                SelectProps={{ native: true }}
              >
                <option value="">Todos os tipos</option>
                {propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </TextField>
            </Grid>

            {/* Amenities */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Comodidades
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {uniqueAmenities.slice(0, 12).map(amenity => (
                  <Chip
                    key={amenity}
                    label={amenity}
                    onClick={() => handleAmenityToggle(amenity)}
                    variant={filters.amenities.includes(amenity) ? 'filled' : 'outlined'}
                    sx={{
                      ...(filters.amenities.includes(amenity) ? {
                        backgroundColor: config.theme.primaryColor,
                        color: 'white',
                      } : {
                        borderColor: alpha(config.theme.primaryColor, 0.3),
                        color: config.theme.primaryColor,
                      }),
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Grid item xs={12}>
                <Button
                  onClick={clearAllFilters}
                  startIcon={<Clear />}
                  sx={{
                    color: theme.palette.warning.main,
                    textTransform: 'none',
                  }}
                >
                  Limpar Todos os Filtros
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </Collapse>

      {/* Results Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {filteredProperties.length} {filteredProperties.length === 1 ? 'Propriedade' : 'Propriedades'}
          {hasActiveFilters && ' (filtrada)'}
        </Typography>
        
        {loading && <CircularProgress size={24} />}
      </Box>

      {/* Property Grid */}
      {filteredProperties.length > 0 ? (
        <Grid container spacing={3}>
          {filteredProperties.map((property) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={property.id}>
              <PropertyCard
                property={property}
                config={config}
                onWhatsAppClick={handleWhatsAppClick}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8,
            background: alpha(config.theme.primaryColor, 0.03),
            borderRadius: 3,
            border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, opacity: 0.7 }}>
            Nenhuma propriedade encontrada
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.6 }}>
            Tente ajustar os filtros ou fazer uma nova busca
          </Typography>
          {hasActiveFilters && (
            <Button
              onClick={clearAllFilters}
              variant="outlined"
              sx={{
                borderColor: config.theme.primaryColor,
                color: config.theme.primaryColor,
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </Box>
      )}
    </Container>
  );
}