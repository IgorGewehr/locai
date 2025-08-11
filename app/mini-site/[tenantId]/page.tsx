'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Paper,
  Skeleton,
  Fade,
  Zoom,
  Stack,
  useMediaQuery,
  useTheme,
  alpha,
  Card,
  CardContent,
  CardMedia,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  Close,
  AttachMoney,
  TrendingUp,
  Verified,
  Speed,
  Star,
  LocationOn,
  WhatsApp,
  ArrowForward,
  ArrowDownward,
  AutoAwesome,
  Celebration,
  LocalOffer,
  Bed,
  Bathtub,
  Groups,
} from '@mui/icons-material';
import { useParams } from 'next/navigation';
import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';
import { formatCurrency } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Modern components
import MiniSiteLayoutNew from '@/components/mini-site/MiniSiteLayoutNew';
import PropertyCardModern from '@/components/mini-site/PropertyCardModern';

export default function MiniSitePage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  // Stats for modern display
  const [stats, setStats] = useState({
    totalProperties: 0,
    averagePrice: 0,
    mostPopularAmenity: '',
    satisfactionRate: 4.8,
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
    calculateStats();
  }, [properties, searchTerm, filters]);

  const calculateStats = () => {
    if (properties.length === 0) return;
    
    const avgPrice = properties.reduce((sum, p) => sum + p.pricing.basePrice, 0) / properties.length;
    const amenityCounts: Record<string, number> = {};
    
    properties.forEach(p => {
      p.amenities.forEach(amenity => {
        amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
      });
    });
    
    const mostPopular = Object.keys(amenityCounts).reduce(
      (max, amenity) => amenityCounts[amenity] > amenityCounts[max] ? amenity : max,
      Object.keys(amenityCounts)[0] || ''
    );

    setStats({
      totalProperties: properties.length,
      averagePrice: avgPrice,
      mostPopularAmenity: mostPopular,
      satisfactionRate: 4.8 + Math.random() * 0.2,
    });
  };

  const loadMiniSiteData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load configuration via API
      const configResponse = await fetch(`/api/mini-site/${tenantId}/config`);
      const configData = await configResponse.json();
      
      if (!configData.success || !configData.data || !configData.data.isActive) {
        setError('Este mini-site não está disponível no momento.');
        return;
      }
      
      const siteConfig = configData.data;
      
      // Transform config to match expected structure
      const transformedConfig = {
        ...siteConfig,
        theme: {
          primaryColor: siteConfig.primaryColor || '#1976d2',
          secondaryColor: siteConfig.secondaryColor || '#dc004e',
          accentColor: siteConfig.accentColor || '#00bcd4',
          backgroundColor: '#ffffff',
          textColor: '#1a1a1a',
        },
        contactInfo: {
          businessName: siteConfig.title || 'Minha Imobiliária',
          businessDescription: siteConfig.description || 'Encontre o imóvel perfeito para você',
          whatsappNumber: siteConfig.whatsappNumber || '',
          email: siteConfig.companyEmail || '',
          address: siteConfig.address || '',
          businessHours: siteConfig.businessHours || 'Seg-Sex: 9h-18h',
          businessLogo: siteConfig.logo || '',
        },
        seo: {
          title: siteConfig.title || 'Minha Imobiliária',
          description: siteConfig.description || 'Encontre o imóvel perfeito para você',
          keywords: siteConfig.seoKeywords ? siteConfig.seoKeywords.split(',').map(k => k.trim()) : [],
        },
        tenantId: tenantId,
      };
      
      setConfig(transformedConfig);

      // Apply theme
      if (transformedConfig.theme) {
        document.documentElement.style.setProperty('--primary-color', transformedConfig.theme.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', transformedConfig.theme.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', transformedConfig.theme.accentColor);
      }

      // Update page title and meta
      document.title = transformedConfig.seo?.title || transformedConfig.contactInfo.businessName;
      updateMetaTags(transformedConfig);

      // Load properties via API
      const propertiesResponse = await fetch(`/api/mini-site/${tenantId}/properties`);
      const propertiesData = await propertiesResponse.json();
      
      if (propertiesData.success && propertiesData.data) {
        setProperties(propertiesData.data);
        setFilteredProperties(propertiesData.data);
      }

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

      // Record page view via API
      try {
        await fetch(`/api/mini-site/${tenantId}/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'page_view',
            utmParams 
          })
        });
      } catch (err) {
        console.warn('Failed to record page view:', err);
      }
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
      <MiniSiteLayoutNew config={config || {} as MiniSiteConfig}>
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Skeleton variant="text" width={300} height={60} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={500} height={30} sx={{ mb: 4 }} />
              <Grid container spacing={3}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Grid item xs={12} md={6} lg={4} key={i}>
                    <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </Container>
        </Box>
      </MiniSiteLayoutNew>
    );
  }

  if (error) {
    return (
      <MiniSiteLayoutNew config={config || {} as MiniSiteConfig}>
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center' }}>
          <Container maxWidth="sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Alert 
                severity="error" 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: theme.shadows[4],
                }}
              >
                {error}
              </Alert>
            </motion.div>
          </Container>
        </Box>
      </MiniSiteLayoutNew>
    );
  }

  if (!config) return null;

  return (
    <MiniSiteLayoutNew config={config}>
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
      }}>
        {/* Modern Hero Section */}
        <Box
          sx={{
            position: 'relative',
            minHeight: { xs: '60vh', md: '75vh' },
            background: `linear-gradient(135deg, 
              ${config.theme.primaryColor}10 0%,
              ${config.theme.accentColor}15 50%,
              ${config.theme.primaryColor}08 100%
            )`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            py: { xs: 8, md: 12 },
          }}
        >
          {/* Animated Background Elements */}
          <Box
            sx={{
              position: 'absolute',
              top: '10%',
              right: '5%',
              width: { xs: 200, md: 400 },
              height: { xs: 200, md: 400 },
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.1)}, ${alpha(config.theme.accentColor, 0.05)})`,
              zIndex: 0,
              animation: 'float 6s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                '50%': { transform: 'translateY(-20px) rotate(180deg)' },
              },
            }}
          />

          <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={8}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <Stack spacing={3}>
                    {/* Badge */}
                    <Box>
                      <Chip
                        icon={<Verified />}
                        label="Propriedades Verificadas"
                        color="primary"
                        sx={{
                          background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                          color: 'white',
                          fontWeight: 600,
                          px: 2,
                          py: 1,
                          fontSize: '0.9rem',
                          boxShadow: `0 4px 20px ${alpha(config.theme.primaryColor, 0.3)}`,
                        }}
                      />
                    </Box>

                    {/* Main Title */}
                    <Typography
                      variant={isMobile ? 'h3' : 'h2'}
                      sx={{
                        fontWeight: 900,
                        lineHeight: 1.1,
                        background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        mb: 2,
                      }}
                    >
                      Encontre o Imóvel Perfeito
                    </Typography>

                    {/* Subtitle */}
                    <Typography
                      variant="h5"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 400,
                        lineHeight: 1.4,
                        maxWidth: 500,
                      }}
                    >
                      {config.contactInfo.businessDescription || 'Descubra propriedades únicas com a melhor localização e preços justos'}
                    </Typography>

                    {/* Search Bar */}
                    <Box sx={{ mt: 4 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                          fullWidth
                          placeholder="Buscar por localização, tipo de propriedade..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Search sx={{ color: config.theme.primaryColor }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              backdropFilter: 'blur(10px)',
                              borderRadius: 3,
                              border: `2px solid transparent`,
                              fontSize: '1.1rem',
                              py: 0.5,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: `2px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                              },
                              '&.Mui-focused': {
                                backgroundColor: 'white',
                                border: `2px solid ${config.theme.primaryColor}`,
                                boxShadow: `0 8px 32px ${alpha(config.theme.primaryColor, 0.2)}`,
                              },
                            },
                          }}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<FilterList />}
                          onClick={() => setShowFilters(!showFilters)}
                          sx={{
                            borderColor: alpha(config.theme.primaryColor, 0.3),
                            color: config.theme.primaryColor,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            minWidth: 140,
                            fontWeight: 600,
                            border: `2px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                            '&:hover': {
                              backgroundColor: alpha(config.theme.primaryColor, 0.08),
                              borderColor: config.theme.primaryColor,
                            },
                          }}
                        >
                          {showFilters ? 'Fechar' : 'Filtros'}
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </motion.div>
              </Grid>

              {/* Right Side - Stats */}
              <Grid item xs={12} md={4}>
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <Stack spacing={2}>
                    <Box sx={{ textAlign: 'center', p: 3, background: 'rgba(255,255,255,0.9)', borderRadius: 3 }}>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: config.theme.primaryColor }}>
                        {stats.totalProperties}+
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        Propriedades Disponíveis
                      </Typography>
                    </Box>
                  </Stack>
                </motion.div>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Advanced Stats Section */}
        <Container maxWidth="lg" sx={{ mt: -6, mb: 6, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={3}>
            {[
              {
                icon: <TrendingUp sx={{ fontSize: 32, color: config.theme.primaryColor }} />,
                title: 'Propriedades Disponíveis',
                value: stats.totalProperties.toString(),
                subtitle: 'Imóveis verificados',
                gradient: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.1)}, ${alpha(config.theme.primaryColor, 0.05)})`,
              },
              {
                icon: <AttachMoney sx={{ fontSize: 32, color: '#22c55e' }} />,
                title: 'Preço Médio',
                value: formatCurrency(stats.averagePrice),
                subtitle: 'Por noite',
                gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))',
              },
              {
                icon: <Star sx={{ fontSize: 32, color: '#f59e0b' }} />,
                title: 'Satisfação',
                value: `${stats.satisfactionRate.toFixed(1)}/5`,
                subtitle: 'Avaliação média',
                gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
              },
              {
                icon: <Speed sx={{ fontSize: 32, color: '#8b5cf6' }} />,
                title: 'Reserva Rápida',
                value: '2 min',
                subtitle: 'Processo simplificado',
                gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))',
              },
            ].map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card
                    sx={{
                      background: stat.gradient,
                      borderRadius: 3,
                      border: `1px solid ${alpha('#000', 0.05)}`,
                      p: 3,
                      textAlign: 'center',
                      height: '100%',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.shadows[8],
                      },
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {stat.subtitle}
                    </Typography>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Special Offers Section */}
        <Container maxWidth="lg" sx={{ mb: 6 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Paper
              sx={{
                background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                color: 'white',
                borderRadius: 4,
                p: 4,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Decorative elements */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  zIndex: 1,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -100,
                  left: -100,
                  width: 300,
                  height: 300,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  zIndex: 1,
                }}
              />
              
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <LocalOffer />
                      <Chip label="Oferta Especial" color="secondary" sx={{ fontWeight: 600 }} />
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                      Reserve Hoje e Ganhe 15% de Desconto
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                      Válido para reservas feitas até o final do mês. Não perca essa oportunidade única!
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<WhatsApp />}
                        onClick={() => {
                          const message = encodeURIComponent(
                            `Olá! Vi a promoção de 15% de desconto no site ${config.contactInfo.businessName}. Gostaria de fazer uma reserva!`
                          );
                          window.open(`https://wa.me/${config.contactInfo.whatsappNumber?.replace(/\D/g, '')}?text=${message}`, '_blank');
                        }}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          fontWeight: 600,
                          px: 3,
                          py: 1.5,
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.3)',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        Aproveitar Oferta
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        endIcon={<ArrowDownward />}
                        onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}
                        sx={{
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                          color: 'white',
                          fontWeight: 600,
                          px: 3,
                          py: 1.5,
                          '&:hover': {
                            borderColor: 'white',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                          },
                        }}
                      >
                        Ver Propriedades
                      </Button>
                    </Stack>
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Celebration sx={{ fontSize: 120, opacity: 0.7 }} />
                  </Box>
                </Stack>
              </Box>
            </Paper>
          </motion.div>
        </Container>

        {/* Filters Section */}
        <AnimatePresence>
          {showFilters && (
            <Container maxWidth="lg" sx={{ mb: 4 }}>
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              >
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 4, 
                    borderRadius: 3,
                    border: `1px solid ${alpha('#000', 0.08)}`,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Filtros Avançados
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        onClick={resetFilters} 
                        size="small" 
                        color="inherit"
                        startIcon={<Close />}
                      >
                        Limpar
                      </Button>
                      <Button 
                        onClick={() => setShowFilters(false)} 
                        size="small"
                        variant="outlined"
                      >
                        Fechar
                      </Button>
                    </Stack>
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
                      <Typography gutterBottom sx={{ fontWeight: 600 }}>
                        Faixa de Preço: R$ {filters.priceRange[0]} - R$ {filters.priceRange[1]}
                      </Typography>
                      <Slider
                        value={filters.priceRange}
                        onChange={(e, value) => setFilters({ ...filters, priceRange: value as number[] })}
                        valueLabelDisplay="auto"
                        min={0}
                        max={maxPrice}
                        sx={{ 
                          color: config.theme.primaryColor,
                          '& .MuiSlider-thumb': {
                            width: 20,
                            height: 20,
                          },
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography gutterBottom sx={{ fontWeight: 600 }}>Comodidades</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {uniqueAmenities.map(amenity => (
                          <Chip
                            key={amenity}
                            label={amenity}
                            onClick={() => {
                              const newAmenities = filters.amenities.includes(amenity)
                                ? filters.amenities.filter(a => a !== amenity)
                                : [...filters.amenities, amenity];
                              setFilters({ ...filters, amenities: newAmenities });
                            }}
                            color={filters.amenities.includes(amenity) ? 'primary' : 'default'}
                            variant={filters.amenities.includes(amenity) ? 'filled' : 'outlined'}
                            sx={{
                              borderRadius: 2,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.05)',
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </motion.div>
            </Container>
          )}
        </AnimatePresence>

        {/* Properties Grid */}
        <Container maxWidth="lg" sx={{ py: 4 }} id="properties">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                {filteredProperties.length === 0 
                  ? 'Nenhuma propriedade encontrada'
                  : `${filteredProperties.length} propriedade${filteredProperties.length > 1 ? 's' : ''} ${filteredProperties.length > 1 ? 'encontradas' : 'encontrada'}`
                }
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Propriedades verificadas e prontas para reserva
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<Verified />}
                label="Todas Verificadas"
                color="success"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Box>

          {filteredProperties.length === 0 && properties.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Alert 
                severity="info" 
                sx={{ 
                  mb: 4, 
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.05)}, ${alpha(config.theme.accentColor, 0.05)})`,
                  border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
                }}
              >
                Tente ajustar os filtros para encontrar mais propriedades que atendam seus critérios.
              </Alert>
            </motion.div>
          )}

          <Grid container spacing={4}>
            <AnimatePresence>
              {filteredProperties.map((property, index) => (
                <Grid item xs={12} sm={6} lg={4} key={property.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.1,
                      ease: 'easeOut',
                    }}
                    whileHover={{ y: -8 }}
                    style={{ height: '100%' }}
                  >
                    <Card
                      onClick={() => handlePropertyClick(property.id)}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 4,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: `1px solid ${alpha('#000', 0.08)}`,
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          boxShadow: `0 20px 40px ${alpha('#000', 0.15)}`,
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <CardMedia
                        component="img"
                        height="240"
                        image={property.media.photos?.[0]?.url || '/placeholder-property.jpg'}
                        alt={property.name}
                        sx={{
                          objectFit: 'cover',
                        }}
                      />
                      <CardContent sx={{ flex: 1, p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                          {property.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                          {property.location.city}, {property.location.state}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Bed sx={{ fontSize: 16 }} />
                            <Typography variant="body2">{property.bedrooms}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Bathtub sx={{ fontSize: 16 }} />
                            <Typography variant="body2">{property.bathrooms}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Groups sx={{ fontSize: 16 }} />
                            <Typography variant="body2">{property.maxGuests}</Typography>
                          </Stack>
                        </Stack>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: config.theme.primaryColor }}>
                          {formatCurrency(property.pricing.basePrice)}
                          <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.5 }}>
                            /noite
                          </Typography>
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>

          {properties.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Box sx={{ textAlign: 'center', py: 12 }}>
                <AutoAwesome sx={{ fontSize: 100, color: 'text.disabled', mb: 3 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                  Em breve novas propriedades!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Estamos preparando incríveis opções para você.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<WhatsApp />}
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Olá! Gostaria de ser avisado quando novas propriedades estiverem disponíveis em ${config.contactInfo.businessName}.`
                    );
                    window.open(`https://wa.me/${config.contactInfo.whatsappNumber?.replace(/\D/g, '')}?text=${message}`, '_blank');
                  }}
                  sx={{
                    background: `linear-gradient(135deg, #25D366, #128C7E)`,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                  }}
                >
                  Ser Avisado
                </Button>
              </Box>
            </motion.div>
          )}
        </Container>
      </Box>
    </MiniSiteLayoutNew>
  );
}