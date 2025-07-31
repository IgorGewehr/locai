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
  useTheme,
  alpha,
  Button,
  Collapse,
  Card,
  CardContent,
  Fade,
  Skeleton,
  Alert,
  useMediaQuery,
  Fab,
  Zoom
} from '@mui/material';
import { 
  Search, 
  TuneRounded, 
  Clear,
  KeyboardArrowUp,
  Home,
  LocationOn,
  AttachMoney,
  People,
  Bed,
  FilterAlt,
  ViewModule,
  ViewList,
  Refresh
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
import PropertyCardModern from './PropertyCardModern';
import { miniSiteClientService } from '@/lib/services/mini-site-client-service';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from './HeroSection';
import { useThemeMode } from '@/contexts/ThemeContext';

interface PropertyGridModernProps {
  properties: PublicProperty[];
  config: MiniSiteConfig;
}

export default function PropertyGridModern({ properties: initialProperties, config }: PropertyGridModernProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [properties] = useState<PublicProperty[]>(initialProperties);
  const [filteredProperties, setFilteredProperties] = useState<PublicProperty[]>(initialProperties);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    minGuests: '',
    maxGuests: '',
    minBedrooms: '',
    maxBedrooms: '',
    minPrice: '',
    maxPrice: '',
    amenities: [] as string[],
    propertyType: '',
    location: ''
  });

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get unique values for filter options (safe for empty arrays)
  const uniqueAmenities = properties.length > 0 ? Array.from(new Set(properties.flatMap(p => p.amenities))).sort() : [];
  const propertyTypes = properties.length > 0 ? Array.from(new Set(properties.map(p => p.type))).sort() : [];
  const locations = properties.length > 0 ? Array.from(new Set(properties.map(p => p.location.city))).sort() : [];
  const maxGuests = properties.length > 0 ? Math.max(...properties.map(p => p.maxGuests)) : 10;
  const maxBedrooms = properties.length > 0 ? Math.max(...properties.map(p => p.bedrooms)) : 5;
  const priceRange = properties.length > 0 ? {
    min: Math.min(...properties.map(p => p.pricing.basePrice)),
    max: Math.max(...properties.map(p => p.pricing.basePrice))
  } : { min: 0, max: 1000 };

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

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(p => p.location.city === filters.location);
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
      propertyType: '',
      location: ''
    });
    setSearchTerm('');
  };


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = searchTerm || Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  // Get unique locations for featured
  const featuredLocations = Array.from(new Set(properties.map(p => p.location.city))).slice(0, 6);

  return (
    <>
      {/* Enhanced Hero Section */}
      <HeroSection
        config={config}
        onSearch={setSearchTerm}
        propertyCount={properties.length}
        featuredLocations={featuredLocations}
      />

      <Container maxWidth="xl" sx={{ py: mode === 'light' ? 6 : 4 }}>
        {/* No Properties Notice */}
        {properties.length === 0 && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              borderRadius: '20px',
              background: mode === 'light' 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: mode === 'light' 
                ? '1px solid rgba(59, 130, 246, 0.2)' 
                : '1px solid rgba(255, 255, 255, 0.15)',
              color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
              '& .MuiAlert-icon': {
                color: '#8b5cf6',
              },
            }}
          >
            <Typography variant="body2">
              <strong>Nenhuma propriedade encontrada:</strong> Não foram encontradas propriedades para exibir. 
              Cadastre suas propriedades no dashboard para que apareçam aqui.
            </Typography>
          </Alert>
        )}


        {/* Quick Filters Bar - Only show if there are properties */}
        {properties.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={mode === 'light' ? 3 : 2} 
              sx={{ 
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: mode === 'light' ? 3 : 2
              }}
            >
              {/* Left Side - Quick Filters */}
              <Stack direction="row" spacing={mode === 'light' ? 2 : 1} sx={{ flex: 1 }}>
                <Button
                  startIcon={<TuneRounded />}
                  onClick={() => setShowFilters(!showFilters)}
                  variant={showFilters ? 'contained' : 'outlined'}
                  size="small"
                  sx={{
                    borderRadius: mode === 'light' ? '16px' : '12px',
                    px: mode === 'light' ? 3 : 2,
                    py: mode === 'light' ? 1.5 : 1,
                    textTransform: 'none',
                    fontWeight: mode === 'light' ? 500 : 600,
                    ...(showFilters ? {
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    } : {
                      background: mode === 'light' 
                        ? theme.palette.background.paper 
                        : 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: mode === 'light' 
                        ? `1px solid ${theme.palette.divider}` 
                        : '1px solid rgba(255, 255, 255, 0.15)',
                      color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
                      '&:hover': {
                        background: mode === 'light' 
                          ? theme.palette.action.hover 
                          : 'rgba(255, 255, 255, 0.12)',
                      },
                    }),
                    transition: 'all 0.3s ease',
                  }}
                >
                  Filtros
                </Button>
                
                {hasActiveFilters && (
                  <Button
                    startIcon={<Clear />}
                    onClick={clearAllFilters}
                    size="small"
                    sx={{
                      borderRadius: '12px',
                      px: 2,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: 'rgba(239, 68, 68, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      '&:hover': {
                        background: 'rgba(239, 68, 68, 0.15)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </Stack>

              {/* Right Side - View Mode */}
              <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                <Button
                  startIcon={<ViewModule />}
                  onClick={() => setViewMode('grid')}
                  variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    px: { xs: 1.5, sm: 2 },
                    borderRadius: '12px',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    ...(viewMode === 'grid' ? {
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                    } : {
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.7)',
                    })
                  }}
                >
                  {isMobile ? '' : 'Grade'}
                </Button>
                <Button
                  startIcon={<ViewList />}
                  onClick={() => setViewMode('list')}
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    px: { xs: 1.5, sm: 2 },
                    borderRadius: '12px',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    ...(viewMode === 'list' ? {
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                    } : {
                      background: 'rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.7)',
                    })
                  }}
                >
                  {isMobile ? '' : 'Lista'}
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}

      {/* Enhanced Filters - Only show if there are properties */}
      {properties.length > 0 && (
        <Collapse in={showFilters}>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
          <Card 
            sx={{ 
              mb: 4,
              background: mode === 'light' 
                ? theme.palette.background.paper 
                : 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: mode === 'light' 
                ? `1px solid ${theme.palette.divider}` 
                : '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: mode === 'light' 
                ? theme.custom.elevation.medium 
                : '0 16px 50px rgba(0, 0, 0, 0.4)',
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: mode === 'light' ? theme.palette.text.primary : '#ffffff', textAlign: 'center' }}>
                Filtrar Propriedades
              </Typography>
              
              <Grid container spacing={2}>
                {/* Essentials Row */}
                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 1, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Hóspedes
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Mín"
                    type="number"
                    value={filters.minGuests}
                    onChange={(e) => setFilters(prev => ({ ...prev, minGuests: e.target.value }))}
                    inputProps={{ min: 1, max: maxGuests }}
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        '& fieldset': { border: 'none' },
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-focused': {
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid #8b5cf6',
                        },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        opacity: 1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 1, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Quartos
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Mín"
                    type="number"
                    value={filters.minBedrooms}
                    onChange={(e) => setFilters(prev => ({ ...prev, minBedrooms: e.target.value }))}
                    inputProps={{ min: 0, max: maxBedrooms }}
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        '& fieldset': { border: 'none' },
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-focused': {
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid #8b5cf6',
                        },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        opacity: 1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 1, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Cidade
                  </Typography>
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    SelectProps={{ native: true }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        '& fieldset': { border: 'none' },
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-focused': {
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid #8b5cf6',
                        },
                        '& select option': {
                          background: '#1a1a1a',
                          color: '#ffffff',
                        },
                      },
                    }}
                  >
                    <option value="">Qualquer</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={6} sm={4} md={3}>
                  <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 1, display: 'block', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                    Preço Máx (R$)
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Sem limite"
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                    inputProps={{ min: priceRange.min, max: priceRange.max }}
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        '& fieldset': { border: 'none' },
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)',
                        },
                        '&.Mui-focused': {
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid #8b5cf6',
                        },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        opacity: 1,
                      },
                    }}
                  />
                </Grid>

                {/* Amenities */}
                {uniqueAmenities.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600, mb: 1, display: 'block' }}>
                      Comodidades Principais
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {uniqueAmenities.slice(0, 8).map(amenity => (
                        <Chip
                          key={amenity}
                          label={amenity}
                          onClick={() => handleAmenityToggle(amenity)}
                          size="small"
                          sx={{
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            ...(filters.amenities.includes(amenity) ? {
                              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                              color: '#ffffff',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                            } : {
                              background: 'rgba(255, 255, 255, 0.05)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: 'rgba(255, 255, 255, 0.9)',
                              '&:hover': {
                                background: 'rgba(255, 255, 255, 0.08)',
                                transform: 'scale(1.05)',
                              },
                            }),
                            transition: 'all 0.2s ease',
                          }}
                        />
                      ))}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </motion.div>
      </Collapse>
      )}

      {/* Results Header - Only show if there are properties and filters */}
      {properties.length > 0 && (filteredProperties.length !== properties.length || hasActiveFilters) && (
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              color: '#ffffff',
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {filteredProperties.length} de {properties.length} propriedades
            {hasActiveFilters && (
              <Chip 
                label="com filtros" 
                size="small" 
                sx={{ 
                  ml: 2,
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 600,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }} 
              />
            )}
          </Typography>
        </Box>
      )}


      {/* Properties Display */}
      {filteredProperties.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ alignItems: 'stretch' }}>
          <AnimatePresence>
            {filteredProperties.map((property, index) => (
              <Grid 
                item 
                xs={12} 
                sm={viewMode === 'grid' ? 6 : 12} 
                md={viewMode === 'grid' ? 6 : 12}
                lg={viewMode === 'grid' ? 4 : 12}
                xl={viewMode === 'grid' ? 3 : 12}
                key={property.id}
                sx={{ display: 'flex' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                  style={{ width: '100%', display: 'flex' }}
                >
                  <PropertyCardModern
                    property={property}
                    config={config}
                    onWhatsAppClick={handleWhatsAppClick}
                    viewMode={viewMode}
                  />
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card 
            sx={{ 
              textAlign: 'center', 
              py: 8,
              px: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, color: '#ffffff', fontWeight: 600, textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}>
              Nenhuma propriedade encontrada
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: 'rgba(255, 255, 255, 0.7)' }}>
              Tente ajustar os filtros ou fazer uma nova busca
            </Typography>
            {hasActiveFilters && (
              <Button
                onClick={clearAllFilters}
                variant="contained"
                startIcon={<Clear />}
                sx={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  borderRadius: '16px',
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    boxShadow: '0 12px 32px rgba(139, 92, 246, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </Card>
        </motion.div>
      )}

        {/* Scroll to Top Button */}
        <Zoom in={showScrollTop}>
          <Fab
            size="medium"
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
              '&:hover': {
                transform: 'scale(1.1) translateY(-2px)',
                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.6)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>
      </Container>
    </>
  );
}