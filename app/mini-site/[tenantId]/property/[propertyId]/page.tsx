'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link,
  Fab,
  Skeleton,
  ImageList,
  ImageListItem,
} from '@mui/material';
import {
  ArrowBack,
  Bed,
  Bathtub,
  People,
  LocationOn,
  WhatsApp,
  Phone,
  Email,
  Share,
  Favorite,
  FavoriteBorder,
  ChevronLeft,
  ChevronRight,
  Close,
  Home,
  AttachMoney,
  CalendarToday,
  Check,
  Clear,
  NavigateNext,
  Fullscreen,
  Square,
} from '@mui/icons-material';
import { useParams, useRouter } from 'next/navigation';
// Remove import para evitar problema com Firebase Admin no cliente
import { MiniSiteConfig, PublicProperty } from '@/lib/types/mini-site';
import { formatCurrency } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Amenity icons mapping
const amenityIcons: Record<string, React.ReactNode> = {
  'Wi-Fi': '📶',
  'Piscina': '🏊',
  'Ar Condicionado': '❄️',
  'Estacionamento': '🚗',
  'Varanda': '🌅',
  'Cozinha': '👨‍🍳',
  'TV': '📺',
  'Segurança': '🔒',
  'Elevador': '🛗',
  'Academia': '💪',
  'Acesso à Praia': '🏖️',
  'Vista': '🌄',
  'Lareira': '🔥',
  'Jardim': '🌳',
};

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const propertyId = params.propertyId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<MiniSiteConfig | null>(null);
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
  });

  useEffect(() => {
    if (tenantId && propertyId) {
      loadPropertyData();
      recordPageView();
    }
  }, [tenantId, propertyId, loadPropertyData, recordPageView]);

  const loadPropertyData = useCallback(async () => {
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
        },
        contactInfo: {
          businessName: siteConfig.title || 'Minha Imobiliária',
          businessDescription: siteConfig.description || 'Encontre o imóvel perfeito para você',
          whatsappNumber: siteConfig.whatsappNumber || '',
          email: siteConfig.companyEmail || '',
        },
        seo: {
          title: siteConfig.title || 'Minha Imobiliária',
          description: siteConfig.description || 'Encontre o imóvel perfeito para você',
          keywords: siteConfig.seoKeywords ? siteConfig.seoKeywords.split(',').map(k => k.trim()) : [],
        }
      };
      
      setConfig(transformedConfig);

      // Apply theme
      if (transformedConfig.theme) {
        document.documentElement.style.setProperty('--primary-color', transformedConfig.theme.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', transformedConfig.theme.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', transformedConfig.theme.accentColor);
      }

      // Load property via API
      const propertyResponse = await fetch(`/api/mini-site/${tenantId}/property/${propertyId}`);
      const propertyData = await propertyResponse.json();
      
      if (!propertyData.success || !propertyData.data) {
        setError('Propriedade não encontrada.');
        return;
      }
      
      const publicProperty = propertyData.data;
      setProperty(publicProperty);

      // Update page title
      document.title = `${publicProperty.name} - ${transformedConfig.contactInfo.businessName}`;

    } catch (error) {
      console.error('Error loading property:', error);
      setError('Erro ao carregar a propriedade. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, propertyId]);

  const recordPageView = useCallback(async () => {
    try {
      // Record page view via API (opcional - pode ser removido para simplicidade)
      try {
        await fetch(`/api/mini-site/${tenantId}/analytics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'page_view',
            propertyId 
          })
        });
      } catch (err) {
        // Analytics failure shouldn't break the page
        console.warn('Failed to record page view:', err);
      }
    } catch (error) {
      console.error('Error recording page view:', error);
    }
  }, [tenantId, propertyId]);

  const handlePrevImage = () => {
    if (!property) return;
    setCurrentImageIndex(prev => 
      prev === 0 ? property.media.photos.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!property) return;
    setCurrentImageIndex(prev => 
      prev === property.media.photos.length - 1 ? 0 : prev + 1
    );
  };

  const handleWhatsAppClick = () => {
    if (!config?.contactInfo.whatsappNumber || !property) return;
    
    // Generate WhatsApp URL directly
    const whatsappNumber = config.contactInfo.whatsappNumber;
    const propertyName = property.name;
    let message = `Olá! Tenho interesse na propriedade *${propertyName}*`;
    
    if (contactForm.checkIn && contactForm.checkOut) {
      message += ` para o período de ${contactForm.checkIn} até ${contactForm.checkOut}`;
    }
    
    if (contactForm.guests) {
      message += ` para ${contactForm.guests} hóspede${contactForm.guests > 1 ? 's' : ''}`;
    }
    
    message += '. Gostaria de mais informações e verificar a disponibilidade. Obrigado!';
    
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    if (!property) return;
    
    const shareData = {
      title: property.name,
      text: property.description,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactSubmit = async () => {
    try {
      const inquiryData = {
        tenantId,
        propertyId: property!.id,
        propertyName: property!.name,
        clientName: contactForm.name,
        clientEmail: contactForm.email,
        clientPhone: contactForm.phone,
        message: contactForm.message,
        checkIn: contactForm.checkIn ? new Date(contactForm.checkIn) : undefined,
        checkOut: contactForm.checkOut ? new Date(contactForm.checkOut) : undefined,
        numberOfGuests: contactForm.guests,
      };

      const response = await fetch(`/api/mini-site/${tenantId}/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryData)
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
        setShowContactForm(false);
        setContactForm({
          name: '',
          email: '',
          phone: '',
          message: '',
          checkIn: '',
          checkOut: '',
          guests: 1,
        });
      } else {
        throw new Error(result.error || 'Failed to send inquiry');
      }
    } catch (error) {
      console.error('Error sending inquiry:', error);
      alert('Erro ao enviar mensagem. Por favor, tente novamente.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={400} sx={{ mb: 4, borderRadius: 3 }} />
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="100%" height={100} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center' }}>
        <Container maxWidth="sm">
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => router.push(`/mini-site/${tenantId}`)}
          >
            Voltar para Propriedades
          </Button>
        </Container>
      </Box>
    );
  }

  if (!property || !config) return null;

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f8fafc', // dashboard background
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => router.push(`/mini-site/${tenantId}`)}>
                <ArrowBack />
              </IconButton>
              <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => router.push(`/mini-site/${tenantId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  Propriedades
                </Link>
                <Typography variant="body2" color="text.primary">
                  {property.name}
                </Typography>
              </Breadcrumbs>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => setIsFavorite(!isFavorite)}>
                {isFavorite ? <Favorite color="error" /> : <FavoriteBorder />}
              </IconButton>
              <IconButton onClick={handleShare}>
                <Share />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Image Gallery */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Main Image */}
          <Grid item xs={12} md={8}>
            <Card sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
              {property.media.photos.length > 0 ? (
                <>
                  <Box
                    component="img"
                    src={property.media.photos[currentImageIndex].url}
                    alt={property.media.photos[currentImageIndex].alt}
                    sx={{
                      width: '100%',
                      height: { xs: 300, md: 500 },
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowGallery(true)}
                  />
                  
                  {/* Navigation Buttons */}
                  {property.media.photos.length > 1 && (
                    <>
                      <IconButton
                        onClick={handlePrevImage}
                        sx={{
                          position: 'absolute',
                          left: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                          },
                        }}
                      >
                        <ChevronLeft />
                      </IconButton>
                      <IconButton
                        onClick={handleNextImage}
                        sx={{
                          position: 'absolute',
                          right: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                          },
                        }}
                      >
                        <ChevronRight />
                      </IconButton>
                    </>
                  )}
                  
                  {/* Image Counter */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                    }}
                  >
                    {currentImageIndex + 1} / {property.media.photos.length}
                  </Box>
                  
                  {/* Fullscreen Button */}
                  <IconButton
                    onClick={() => setShowGallery(true)}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                      },
                    }}
                  >
                    <Fullscreen />
                  </IconButton>
                </>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: 300, md: 500 },
                    bgcolor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Home sx={{ fontSize: 80, color: 'grey.400' }} />
                </Box>
              )}
            </Card>

            {/* Thumbnail Gallery */}
            {property.media.photos.length > 1 && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, overflowX: 'auto' }}>
                {property.media.photos.map((photo, index) => (
                  <Box
                    key={index}
                    component="img"
                    src={photo.url}
                    alt={photo.alt}
                    onClick={() => setCurrentImageIndex(index)}
                    sx={{
                      width: 100,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                      opacity: currentImageIndex === index ? 1 : 0.6,
                      border: currentImageIndex === index ? `2px solid ${config.theme.primaryColor}` : 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        opacity: 1,
                      },
                    }}
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* Booking Card */}
          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 100, borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: config.theme.primaryColor }}>
                    {formatCurrency(property.pricing.basePrice)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    / noite
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Check-in"
                      type="date"
                      value={contactForm.checkIn}
                      onChange={(e) => setContactForm({ ...contactForm, checkIn: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Check-out"
                      type="date"
                      value={contactForm.checkOut}
                      onChange={(e) => setContactForm({ ...contactForm, checkOut: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Número de Hóspedes"
                      type="number"
                      value={contactForm.guests}
                      onChange={(e) => setContactForm({ ...contactForm, guests: Number(e.target.value) })}
                      InputProps={{
                        inputProps: { min: 1, max: property.maxGuests }
                      }}
                    />
                  </Grid>
                </Grid>

                {config.contactInfo.whatsappNumber && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<WhatsApp />}
                    onClick={handleWhatsAppClick}
                    sx={{
                      mb: 2,
                      bgcolor: '#25D366',
                      '&:hover': {
                        bgcolor: '#128C7E',
                      },
                    }}
                  >
                    Reservar via WhatsApp
                  </Button>
                )}

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setShowContactForm(true)}
                >
                  Enviar Mensagem
                </Button>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    • Mínimo de {property.pricing.minimumStay} noites
                  </Typography>
                  {property.pricing.cleaningFee && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      • Taxa de limpeza: {formatCurrency(property.pricing.cleaningFee)}
                    </Typography>
                  )}
                  {property.pricing.extraGuestFee && (
                    <Typography variant="body2" color="text.secondary">
                      • Hóspede extra: {formatCurrency(property.pricing.extraGuestFee)}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Property Details */}
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={8}>
            {/* Title and Location */}
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              {property.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3 }}>
              <LocationOn color="action" />
              <Typography variant="h6" color="text.secondary">
                {property.location.address}, {property.location.city} - {property.location.state}
              </Typography>
            </Box>

            {/* Quick Info */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Bed sx={{ fontSize: 40, color: config.theme.primaryColor, mb: 1 }} />
                    <Typography variant="h6">{property.bedrooms}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quarto{property.bedrooms > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Bathtub sx={{ fontSize: 40, color: config.theme.primaryColor, mb: 1 }} />
                    <Typography variant="h6">{property.bathrooms}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Banheiro{property.bathrooms > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <People sx={{ fontSize: 40, color: config.theme.primaryColor, mb: 1 }} />
                    <Typography variant="h6">{property.maxGuests}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hóspede{property.maxGuests > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Square sx={{ fontSize: 40, color: config.theme.primaryColor, mb: 1 }} />
                    <Typography variant="h6">{property.area}m²</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Área
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Description */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Sobre esta propriedade
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                {property.description}
              </Typography>
            </Box>

            {/* Amenities */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Comodidades
              </Typography>
              <Grid container spacing={2}>
                {property.amenities.map(amenity => (
                  <Grid item xs={6} sm={4} key={amenity}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">
                        {amenityIcons[amenity] || '✓'}
                      </Typography>
                      <Typography variant="body1">
                        {amenity}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* House Rules */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Regras da Casa
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Check-in após
                      </Typography>
                      <Typography variant="body1">
                        {property.policies.checkIn}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday color="action" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Check-out até
                      </Typography>
                      <Typography variant="body1">
                        {property.policies.checkOut}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              
              {property.policies.houseRules.length > 0 && (
                <List sx={{ mt: 2 }}>
                  {property.policies.houseRules.map((rule, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Check color="success" />
                      </ListItemIcon>
                      <ListItemText primary={rule} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Cancellation Policy */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Política de Cancelamento
              </Typography>
              <Typography variant="body1">
                {property.policies.cancellationPolicy}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Full Screen Gallery Dialog */}
      <Dialog
        fullScreen
        open={showGallery}
        onClose={() => setShowGallery(false)}
        sx={{ bgcolor: 'black' }}
      >
        <Box sx={{ position: 'relative', height: '100vh', bgcolor: 'black' }}>
          <IconButton
            onClick={() => setShowGallery(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            <Close />
          </IconButton>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
            }}
          >
            <Box
              component="img"
              src={property.media.photos[currentImageIndex]?.url}
              alt={property.media.photos[currentImageIndex]?.alt}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />

            {property.media.photos.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevImage}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronLeft fontSize="large" />
                </IconButton>
                <IconButton
                  onClick={handleNextImage}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronRight fontSize="large" />
                </IconButton>
              </>
            )}
          </Box>
        </Box>
      </Dialog>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onClose={() => setShowContactForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar Mensagem</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mensagem"
                  multiline
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowContactForm(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleContactSubmit}
            disabled={!contactForm.name || !contactForm.email || !contactForm.phone || !contactForm.message}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}