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

interface PropertyGridModernProps {
  properties: PublicProperty[];
  config: MiniSiteConfig;
}

export default function PropertyGridModern({ properties: initialProperties, config }: PropertyGridModernProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [properties, setProperties] = useState<PublicProperty[]>(initialProperties);
  const [filteredProperties, setFilteredProperties] = useState<PublicProperty[]>(initialProperties);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const refreshProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simular refresh - em um app real, você faria uma nova requisição
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProperties(initialProperties);
    } catch (err) {
      setError('Erro ao atualizar propriedades');
    } finally {
      setLoading(false);
    }
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

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* No Properties Notice */}
        {properties.length === 0 && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              borderRadius: 2,
              backgroundColor: alpha(config.theme.primaryColor, 0.1),
              border: `1px solid ${alpha(config.theme.primaryColor, 0.2)}`,
              '& .MuiAlert-icon': {
                color: config.theme.primaryColor,
              },
            }}
          >
            <Typography variant="body2">
              <strong>Nenhuma propriedade encontrada:</strong> Não foram encontradas propriedades para exibir. 
              Cadastre suas propriedades no dashboard para que apareçam aqui.
            </Typography>
          </Alert>
        )}

        {/* Demo Properties Notice */}
        {properties.length > 0 && properties.some(p => p.id.startsWith('demo-')) && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              borderRadius: 2,
              backgroundColor: alpha(config.theme.primaryColor, 0.1),
              border: `1px solid ${alpha(config.theme.primaryColor, 0.2)}`,
              '& .MuiAlert-icon': {
                color: config.theme.primaryColor,
              },
            }}
          >
            <Typography variant="body2">
              <strong>Propriedades de Demonstração:</strong> Estas são propriedades de exemplo para você ver como o mini-site funciona. 
              Cadastre suas propriedades reais no dashboard para substituí-las.
            </Typography>
          </Alert>
        )}

        {/* Control Bar - Only show if there are properties */}
        {properties.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              sx={{ 
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Button
                startIcon={<TuneRounded />}
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? 'contained' : 'outlined'}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 140,
                  ...(showFilters ? {
                    background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                    boxShadow: `0 4px 15px ${alpha(config.theme.primaryColor, 0.3)}`,
                  } : {
                    borderColor: config.theme.primaryColor,
                    color: config.theme.primaryColor,
                    '&:hover': {
                      backgroundColor: alpha(config.theme.primaryColor, 0.04),
                    },
                  }),
                }}
              >
                Filtros
              </Button>

            <Button
              startIcon={<Refresh />}
              onClick={refreshProperties}
              disabled={loading}
              variant="outlined"
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                minWidth: 140,
                borderColor: config.theme.accentColor,
                color: config.theme.accentColor,
                '&:hover': {
                  backgroundColor: alpha(config.theme.accentColor, 0.04),
                },
              }}
            >
              Atualizar
            </Button>

            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<ViewModule />}
                onClick={() => setViewMode('grid')}
                variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                size="small"
                sx={{ 
                  minWidth: 'auto',
                  px: 2,
                  borderRadius: 2,
                  ...(viewMode === 'grid' ? {
                    backgroundColor: config.theme.primaryColor,
                  } : {
                    borderColor: config.theme.primaryColor,
                    color: config.theme.primaryColor,
                  })
                }}
              >
                Grade
              </Button>
              <Button
                startIcon={<ViewList />}
                onClick={() => setViewMode('list')}
                variant={viewMode === 'list' ? 'contained' : 'outlined'}
                size="small"
                sx={{ 
                  minWidth: 'auto',
                  px: 2,
                  borderRadius: 2,
                  ...(viewMode === 'list' ? {
                    backgroundColor: config.theme.primaryColor,
                  } : {
                    borderColor: config.theme.primaryColor,
                    color: config.theme.primaryColor,
                  })
                }}
              >
                Lista
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
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
              boxShadow: `0 8px 32px ${alpha(config.theme.primaryColor, 0.08)}`,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: config.theme.textColor }}>
                Filtros Avançados
              </Typography>
              
              <Grid container spacing={3}>
                {/* Guests */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
                    <People sx={{ fontSize: 16, mr: 1 }} />
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
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Máx."
                      type="number"
                      value={filters.maxGuests}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxGuests: e.target.value }))}
                      inputProps={{ min: 1, max: maxGuests }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Grid>

                {/* Bedrooms */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
                    <Bed sx={{ fontSize: 16, mr: 1 }} />
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
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Máx."
                      type="number"
                      value={filters.maxBedrooms}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxBedrooms: e.target.value }))}
                      inputProps={{ min: 0, max: maxBedrooms }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Grid>

                {/* Price Range */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
                    <AttachMoney sx={{ fontSize: 16, mr: 1 }} />
                    Preço (R$)
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      label="Mín."
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      inputProps={{ min: priceRange.min, max: priceRange.max }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Máx."
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      inputProps={{ min: priceRange.min, max: priceRange.max }}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Grid>

                {/* Location */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
                    <LocationOn sx={{ fontSize: 16, mr: 1 }} />
                    Localização
                  </Typography>
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Todas as cidades</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </TextField>
                </Grid>

                {/* Property Type */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
                    <Home sx={{ fontSize: 16, mr: 1 }} />
                    Tipo
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
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: config.theme.primaryColor }}>
                    Comodidades
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {uniqueAmenities.slice(0, 15).map(amenity => (
                      <Chip
                        key={amenity}
                        label={amenity}
                        onClick={() => handleAmenityToggle(amenity)}
                        variant={filters.amenities.includes(amenity) ? 'filled' : 'outlined'}
                        sx={{
                          borderRadius: 2,
                          ...(filters.amenities.includes(amenity) ? {
                            backgroundColor: config.theme.primaryColor,
                            color: 'white',
                          } : {
                            borderColor: alpha(config.theme.primaryColor, 0.3),
                            color: config.theme.primaryColor,
                            '&:hover': {
                              backgroundColor: alpha(config.theme.primaryColor, 0.04),
                            },
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
                        fontWeight: 600,
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.warning.main, 0.04),
                        },
                      }}
                    >
                      Limpar Todos os Filtros
                    </Button>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </motion.div>
      </Collapse>
      )}

      {/* Results Header - Only show if there are properties */}
      {properties.length > 0 && (
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            color: config.theme.textColor,
            fontSize: { xs: '1.5rem', md: '2rem' }
          }}
        >
          {filteredProperties.length} {filteredProperties.length === 1 ? 'Propriedade' : 'Propriedades'}
          {hasActiveFilters && (
            <Chip 
              label="Filtrada" 
              size="small" 
              sx={{ 
                ml: 2,
                backgroundColor: alpha(config.theme.accentColor, 0.1),
                color: config.theme.accentColor,
                fontWeight: 600
              }} 
            />
          )}
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  border: `2px solid ${alpha(config.theme.primaryColor, 0.3)}`,
                  borderTop: `2px solid ${config.theme.primaryColor}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: config.theme.primaryColor }}>
              Carregando...
            </Typography>
          </Box>
        )}
      </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
        >
          {error}
        </Alert>
      )}

      {/* Properties Display */}
      {filteredProperties.length > 0 ? (
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredProperties.map((property, index) => (
              <Grid 
                item 
                xs={12} 
                sm={viewMode === 'grid' ? 6 : 12} 
                md={viewMode === 'grid' ? 4 : 12}
                lg={viewMode === 'grid' ? 3 : 12}
                key={property.id}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
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
              background: alpha(config.theme.primaryColor, 0.03),
              borderRadius: 3,
              border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, opacity: 0.7, fontWeight: 600 }}>
              Nenhuma propriedade encontrada
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.6 }}>
              Tente ajustar os filtros ou fazer uma nova busca
            </Typography>
            {hasActiveFilters && (
              <Button
                onClick={clearAllFilters}
                variant="contained"
                startIcon={<Clear />}
                sx={{
                  background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: `0 4px 15px ${alpha(config.theme.primaryColor, 0.3)}`,
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
            color="primary"
            size="medium"
            onClick={scrollToTop}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
              '&:hover': {
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </Zoom>
      </Container>
    </>
  );
}