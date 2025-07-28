'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Paper,
  Fab,
  Skeleton,
} from '@mui/material';
import {
  Bed,
  Bathtub,
  People,
  LocationOn,
  WhatsApp,
  Phone,
  Email,
  Search,
  FilterList,
  Close,
  Home,
  Apartment,
  Cottage,
  Villa,
  AttachMoney,
  Wifi,
  Pool,
  AcUnit,
  LocalParking,
  Balcony,
  Kitchen,
  Tv,
  Security,
  Elevator,
  FitnessCenter,
  BeachAccess,
  Landscape,
  ArrowUpward,
} from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Property type icons
const propertyTypeIcons: Record<string, React.ReactNode> = {
  'Casa': <Home />,
  'Apartamento': <Apartment />,
  'Chalé': <Cottage />,
  'Villa': <Villa />,
};

// Amenity icons
const amenityIcons: Record<string, React.ReactNode> = {
  'Wi-Fi': <Wifi />,
  'Piscina': <Pool />,
  'Ar Condicionado': <AcUnit />,
  'Estacionamento': <LocalParking />,
  'Varanda': <Balcony />,
  'Cozinha': <Kitchen />,
  'TV': <Tv />,
  'Segurança': <Security />,
  'Elevador': <Elevator />,
  'Academia': <FitnessCenter />,
  'Acesso à Praia': <BeachAccess />,
  'Vista': <Landscape />,
};

export default function MiniSitePage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<MiniSiteConfig | null>(null);
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PublicProperty[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    bedrooms: 0,
    priceRange: [0, 5000],
    amenities: [] as string[],
  });

  useEffect(() => {
    loadMiniSiteData();
    recordPageView();

    // Scroll to top button visibility
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tenantId]);

  useEffect(() => {
    applyFilters();
  }, [properties, searchTerm, filters]);

  const loadMiniSiteData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load configuration
      const siteConfig = await miniSiteService.getConfig(tenantId);
      if (!siteConfig || !siteConfig.isActive) {
        setError('Este mini-site não está disponível no momento.');
        return;
      }
      setConfig(siteConfig);

      // Apply theme
      if (siteConfig.theme) {
        document.documentElement.style.setProperty('--primary-color', siteConfig.theme.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', siteConfig.theme.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', siteConfig.theme.accentColor);
      }

      // Update page title and meta
      document.title = siteConfig.seo?.title || siteConfig.contactInfo.businessName;
      updateMetaTags(siteConfig);

      // Load properties
      const publicProperties = await miniSiteService.getPublicProperties(tenantId);
      setProperties(publicProperties);
      setFilteredProperties(publicProperties);

    } catch (error) {
      console.error('Error loading mini-site:', error);
      setError('Erro ao carregar as propriedades. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const recordPageView = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams: Record<string, string> = {};
      
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
        const value = urlParams.get(param);
        if (value) utmParams[param] = value;
      });

      await miniSiteService.recordPageView(tenantId, undefined, utmParams);
    } catch (error) {
      console.error('Error recording page view:', error);
    }
  };

  const updateMetaTags = (config: MiniSiteConfig) => {
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', config.seo?.description || '');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = config.seo?.description || '';
      document.head.appendChild(meta);
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', config.seo?.keywords?.join(', ') || '');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = config.seo?.keywords?.join(', ') || '';
      document.head.appendChild(meta);
    }
  };

  const applyFilters = () => {
    let filtered = [...properties];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(prop => 
        prop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prop.location.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(prop => prop.type === filters.type);
    }

    // Bedrooms filter
    if (filters.bedrooms > 0) {
      filtered = filtered.filter(prop => prop.bedrooms >= filters.bedrooms);
    }

    // Price filter
    filtered = filtered.filter(prop => 
      prop.pricing.basePrice >= filters.priceRange[0] && 
      prop.pricing.basePrice <= filters.priceRange[1]
    );

    // Amenities filter
    if (filters.amenities.length > 0) {
      filtered = filtered.filter(prop => 
        filters.amenities.every(amenity => prop.amenities.includes(amenity))
      );
    }

    setFilteredProperties(filtered);
  };

  const handlePropertyClick = (propertyId: string) => {
    router.push(`/mini-site/${tenantId}/property/${propertyId}`);
  };

  const handleWhatsAppClick = (property: PublicProperty) => {
    if (!config?.contactInfo.whatsappNumber) return;
    
    const url = miniSiteService.generateWhatsAppBookingUrl(
      config.contactInfo.whatsappNumber,
      property.name
    );
    window.open(url, '_blank');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      bedrooms: 0,
      priceRange: [0, 5000],
      amenities: [],
    });
    setSearchTerm('');
  };

  // Get unique property types and amenities for filters
  const uniqueTypes = [...new Set(properties.map(p => p.type))];
  const uniqueAmenities = [...new Set(properties.flatMap(p => p.amenities))];
  const maxPrice = Math.max(...properties.map(p => p.pricing.basePrice), 5000);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton variant="text" width={300} height={60} sx={{ mb: 2 }} />
          <Skeleton variant="text" width={500} height={30} sx={{ mb: 4 }} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center' }}>
        <Container maxWidth="sm">
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (!config) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${config.theme.primaryColor} 0%, ${config.theme.secondaryColor} 100%)`,
          color: 'white',
          py: { xs: 6, md: 10 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h2" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                fontSize: { xs: '2rem', md: '3rem' },
              }}
            >
              {config.contactInfo.businessName}
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 4, 
                opacity: 0.9,
                fontSize: { xs: '1.2rem', md: '1.5rem' },
              }}
            >
              {config.contactInfo.businessDescription}
            </Typography>

            {/* Search Bar */}
            <Paper
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                maxWidth: 600,
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  placeholder="Buscar por nome, cidade ou descrição..."
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
                <Button
                  variant="contained"
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={<FilterList />}
                  sx={{
                    bgcolor: config.theme.accentColor,
                    minWidth: 120,
                    height: 56,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: config.theme.accentColor,
                      filter: 'brightness(0.9)',
                    },
                  }}
                >
                  Filtros
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </Container>

        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -150,
            left: -150,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Filters Section */}
      {showFilters && (
        <Container maxWidth="lg" sx={{ mt: -4, mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Filtros Avançados</Typography>
                <Button onClick={resetFilters} size="small">
                  Limpar Filtros
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Propriedade</InputLabel>
                    <Select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      label="Tipo de Propriedade"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {uniqueTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Quartos (mínimo)</InputLabel>
                    <Select
                      value={filters.bedrooms}
                      onChange={(e) => setFilters({ ...filters, bedrooms: Number(e.target.value) })}
                      label="Quartos (mínimo)"
                    >
                      <MenuItem value={0}>Qualquer</MenuItem>
                      <MenuItem value={1}>1+</MenuItem>
                      <MenuItem value={2}>2+</MenuItem>
                      <MenuItem value={3}>3+</MenuItem>
                      <MenuItem value={4}>4+</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>
                    Faixa de Preço: R$ {filters.priceRange[0]} - R$ {filters.priceRange[1]}
                  </Typography>
                  <Slider
                    value={filters.priceRange}
                    onChange={(e, value) => setFilters({ ...filters, priceRange: value as number[] })}
                    valueLabelDisplay="auto"
                    min={0}
                    max={maxPrice}
                    sx={{ color: config.theme.primaryColor }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography gutterBottom>Comodidades</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {uniqueAmenities.map(amenity => (
                      <Chip
                        key={amenity}
                        label={amenity}
                        icon={amenityIcons[amenity]}
                        onClick={() => {
                          const newAmenities = filters.amenities.includes(amenity)
                            ? filters.amenities.filter(a => a !== amenity)
                            : [...filters.amenities, amenity];
                          setFilters({ ...filters, amenities: newAmenities });
                        }}
                        color={filters.amenities.includes(amenity) ? 'primary' : 'default'}
                        variant={filters.amenities.includes(amenity) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        </Container>
      )}

      {/* Properties Grid */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {filteredProperties.length === 0 
              ? 'Nenhuma propriedade encontrada'
              : `${filteredProperties.length} propriedade${filteredProperties.length > 1 ? 's' : ''} encontrada${filteredProperties.length > 1 ? 's' : ''}`
            }
          </Typography>
        </Box>

        {filteredProperties.length === 0 && properties.length > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Tente ajustar os filtros para encontrar mais propriedades.
          </Alert>
        )}

        <Grid container spacing={3}>
          {filteredProperties.map((property, index) => (
            <Grid item xs={12} md={6} lg={4} key={property.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    },
                  }}
                  onClick={() => handlePropertyClick(property.id)}
                >
                  {/* Property Image */}
                  <CardMedia
                    sx={{ position: 'relative', paddingTop: '66.67%' }}
                  >
                    {property.media.photos.length > 0 ? (
                      <Box
                        component="img"
                        src={property.media.photos[0].url}
                        alt={property.media.photos[0].alt}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          bgcolor: 'grey.200',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Home sx={{ fontSize: 60, color: 'grey.400' }} />
                      </Box>
                    )}
                    
                    {/* Property Type Badge */}
                    <Chip
                      icon={propertyTypeIcons[property.type] || <Home />}
                      label={property.type}
                      sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    
                    {/* Featured Badge */}
                    {property.featured && (
                      <Chip
                        label="Destaque"
                        color="secondary"
                        sx={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                        }}
                      />
                    )}
                  </CardMedia>

                  {/* Property Details */}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {property.name}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, color: 'text.secondary' }}>
                      <LocationOn fontSize="small" />
                      <Typography variant="body2">
                        {property.location.city}, {property.location.state}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Bed fontSize="small" color="action" />
                        <Typography variant="body2">{property.bedrooms}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Bathtub fontSize="small" color="action" />
                        <Typography variant="body2">{property.bathrooms}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <People fontSize="small" color="action" />
                        <Typography variant="body2">{property.maxGuests}</Typography>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {property.description}
                    </Typography>
                    
                    {/* Amenities */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {property.amenities.slice(0, 3).map(amenity => (
                        <Chip
                          key={amenity}
                          label={amenity}
                          size="small"
                          icon={amenityIcons[amenity]}
                          variant="outlined"
                        />
                      ))}
                      {property.amenities.length > 3 && (
                        <Chip
                          label={`+${property.amenities.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>

                  {/* Price and Actions */}
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: config.theme.primaryColor }}>
                          {formatCurrency(property.pricing.basePrice)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          por noite
                        </Typography>
                      </Box>
                      
                      {config.contactInfo.whatsappNumber && (
                        <IconButton
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsAppClick(property);
                          }}
                          sx={{
                            bgcolor: '#25D366',
                            color: 'white',
                            '&:hover': {
                              bgcolor: '#128C7E',
                            },
                          }}
                        >
                          <WhatsApp />
                        </IconButton>
                      )}
                    </Box>
                  </CardActions>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {properties.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Home sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Nenhuma propriedade disponível no momento
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Em breve novas propriedades serão adicionadas.
            </Typography>
          </Box>
        )}
      </Container>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 4,
          mt: 8,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {config.contactInfo.businessName}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {config.contactInfo.businessDescription}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Entre em Contato
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {config.contactInfo.whatsappNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatsApp fontSize="small" />
                    <Typography variant="body2">
                      {config.contactInfo.whatsappNumber}
                    </Typography>
                  </Box>
                )}
                {config.contactInfo.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" />
                    <Typography variant="body2">
                      {config.contactInfo.email}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} {config.contactInfo.businessName}. Todos os direitos reservados.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: config.theme.primaryColor,
          }}
        >
          <ArrowUpward />
        </Fab>
      )}
    </Box>
  );
}