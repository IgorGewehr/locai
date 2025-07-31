'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  alpha,
  Dialog,
  DialogContent,
  Fab,
  Zoom,
  Avatar
} from '@mui/material';
import {
  WhatsApp,
  LocationOn,
  People,
  Bed,
  Bathtub,
  Square,
  Wifi,
  LocalParking,
  Pool,
  FitnessCenter,
  Kitchen,
  Tv,
  AcUnit,
  LocalLaundryService,
  Balcony,
  Pets,
  SmokingRooms,
  AccessTime,
  Policy,
  CancelPresentation,
  Home,
  ArrowBack,
  Favorite,
  FavoriteBorder,
  Share,
  PhotoLibrary,
  PlayArrow,
  Close,
  NavigateBefore,
  NavigateNext,
  Check,
  CalendarMonth
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
// Removed mini-site-service import to avoid Firebase Admin SDK in client components
import Link from 'next/link';

interface PropertyDetailViewProps {
  property: PublicProperty;
  config: MiniSiteConfig;
}

export default function PropertyDetailView({ property, config }: PropertyDetailViewProps) {
  const theme = useTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const images = property.media.photos.sort((a, b) => a.order - b.order);
  const videos = property.media.videos || [];

  const amenityIcons: { [key: string]: React.ReactNode } = {
    'Wi-Fi': <Wifi />,
    'WiFi': <Wifi />,
    'Internet': <Wifi />,
    'Estacionamento': <LocalParking />,
    'Piscina': <Pool />,
    'Academia': <FitnessCenter />,
    'Cozinha': <Kitchen />,
    'TV': <Tv />,
    'Ar condicionado': <AcUnit />,
    'Lavanderia': <LocalLaundryService />,
    'Varanda': <Balcony />,
    'Pet friendly': <Pets />,
    'Permitido fumar': <SmokingRooms />,
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleWhatsAppBooking = () => {
    const message = `Olá! Tenho interesse no imóvel: *${property.name}*%0A%0ALocalização: ${property.location.address}, ${property.location.city}%0AQuartos: ${property.bedrooms} | Banheiros: ${property.bathrooms} | Hóspedes: ${property.maxGuests}%0A%0AGostaria de mais informações sobre disponibilidade e preços.`;
    const whatsappNumber = config.contactInfo.whatsappNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(url, '_blank');
  };

  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    } else {
      setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.name,
          text: property.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const heroStyle = {
    position: 'relative' as const,
    height: { xs: 300, md: 500 },
    borderRadius: config.theme.borderRadius === 'extra-rounded' ? 4 : config.theme.borderRadius === 'rounded' ? 2 : 0,
    overflow: 'hidden',
    mb: 4,
    cursor: 'pointer',
  };

  const gradientOverlay = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)',
    zIndex: 1,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Back Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href={`/site/${property.tenantId}`}
          startIcon={<ArrowBack />}
          sx={{
            color: config.theme.primaryColor,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Voltar às Propriedades
        </Button>
      </Box>

      {/* Hero Image Section */}
      <Box sx={heroStyle} onClick={() => setShowImageModal(true)}>
        <Box
          component="img"
          src={images[currentImageIndex]?.url}
          alt={property.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
        />
        <Box sx={gradientOverlay} />
        
        {/* Image Navigation */}
        {images.length > 1 && (
          <>
            <IconButton
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: alpha('#ffffff', 0.9),
                color: config.theme.primaryColor,
                zIndex: 2,
                '&:hover': {
                  backgroundColor: '#ffffff',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleImageNavigation('prev');
              }}
            >
              <NavigateBefore />
            </IconButton>
            <IconButton
              sx={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: alpha('#ffffff', 0.9),
                color: config.theme.primaryColor,
                zIndex: 2,
                '&:hover': {
                  backgroundColor: '#ffffff',
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleImageNavigation('next');
              }}
            >
              <NavigateNext />
            </IconButton>
          </>
        )}

        {/* Action Buttons */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
          <Stack direction="row" spacing={1}>
            <IconButton
              sx={{
                backgroundColor: alpha('#ffffff', 0.9),
                '&:hover': { backgroundColor: '#ffffff' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorited(!isFavorited);
              }}
            >
              {isFavorited ? (
                <Favorite sx={{ color: '#ff4757' }} />
              ) : (
                <FavoriteBorder sx={{ color: config.theme.primaryColor }} />
              )}
            </IconButton>
            <IconButton
              sx={{
                backgroundColor: alpha('#ffffff', 0.9),
                '&:hover': { backgroundColor: '#ffffff' },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
            >
              <Share sx={{ color: config.theme.primaryColor }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Image Counter */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            backgroundColor: alpha('#000000', 0.7),
            color: '#ffffff',
            px: 2,
            py: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 2,
          }}
        >
          <PhotoLibrary fontSize="small" />
          <Typography variant="body2">
            {currentImageIndex + 1} / {images.length}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} lg={8}>
          {/* Property Title and Basic Info */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                color: config.theme.textColor,
              }}
            >
              {property.name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <LocationOn sx={{ color: config.theme.primaryColor, mr: 1 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                {property.location.address}, {property.location.city}, {property.location.state}
              </Typography>
            </Box>

            <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People sx={{ color: config.theme.primaryColor }} />
                <Typography variant="body1">
                  {property.maxGuests} hóspede{property.maxGuests > 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Bed sx={{ color: config.theme.primaryColor }} />
                <Typography variant="body1">
                  {property.bedrooms} quarto{property.bedrooms > 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Bathtub sx={{ color: config.theme.primaryColor }} />
                <Typography variant="body1">
                  {property.bathrooms} banheiro{property.bathrooms > 1 ? 's' : ''}
                </Typography>
              </Box>
              {property.area && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Square sx={{ color: config.theme.primaryColor }} />
                  <Typography variant="body1">{property.area}m²</Typography>
                </Box>
              )}
            </Stack>

            {property.featured && (
              <Chip
                label="Propriedade em Destaque"
                sx={{
                  background: `linear-gradient(135deg, ${config.theme.accentColor}, ${config.theme.primaryColor})`,
                  color: '#ffffff',
                  fontWeight: 600,
                  mb: 2,
                }}
              />
            )}
          </Box>

          {/* Description */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Sobre esta propriedade
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                {property.description}
              </Typography>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Comodidades
              </Typography>
              <Grid container spacing={2}>
                {property.amenities.map((amenity, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                      <Avatar
                        sx={{
                          backgroundColor: alpha(config.theme.primaryColor, 0.1),
                          color: config.theme.primaryColor,
                          width: 36,
                          height: 36,
                        }}
                      >
                        {amenityIcons[amenity] || <Check />}
                      </Avatar>
                      <Typography variant="body1">{amenity}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* Policies */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Políticas da Propriedade
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <AccessTime sx={{ color: config.theme.primaryColor }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Check-in / Check-out"
                    secondary={`Check-in: ${property.policies.checkIn} | Check-out: ${property.policies.checkOut}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CancelPresentation sx={{ color: config.theme.primaryColor }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Política de Cancelamento"
                    secondary={property.policies.cancellationPolicy}
                  />
                </ListItem>
                {property.pricing.minimumStay > 1 && (
                  <ListItem>
                    <ListItemIcon>
                      <CalendarMonth sx={{ color: config.theme.primaryColor }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Estadia Mínima"
                      secondary={`${property.pricing.minimumStay} noite${property.pricing.minimumStay > 1 ? 's' : ''}`}
                    />
                  </ListItem>
                )}
                {property.policies.houseRules.length > 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <Policy sx={{ color: config.theme.primaryColor }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Regras da Casa"
                      secondary={property.policies.houseRules.join(' • ')}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Booking Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card 
            sx={{ 
              position: 'sticky',
              top: 100,
              border: `2px solid ${config.theme.primaryColor}`,
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {config.features.showPricing && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      color: config.theme.primaryColor,
                      mb: 1,
                    }}
                  >
                    {formatPrice(property.pricing.basePrice)}
                    <Typography component="span" variant="body1" sx={{ color: 'text.secondary', ml: 1 }}>
                      por noite
                    </Typography>
                  </Typography>
                  
                  {/* Additional Fees */}
                  {(property.pricing.cleaningFee || property.pricing.extraGuestFee) && (
                    <Box sx={{ mt: 2 }}>
                      {property.pricing.cleaningFee && (
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Taxa de limpeza: {formatPrice(property.pricing.cleaningFee)}
                        </Typography>
                      )}
                      {property.pricing.extraGuestFee && (
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Taxa por hóspede extra: {formatPrice(property.pricing.extraGuestFee)}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              <Button
                fullWidth
                size="large"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppBooking}
                sx={{
                  background: `linear-gradient(135deg, #25D366, #128C7E)`,
                  color: '#ffffff',
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  boxShadow: `0 8px 30px ${alpha('#25D366', 0.3)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, #128C7E, #075E54)`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 40px ${alpha('#25D366', 0.4)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                Reservar via WhatsApp
              </Button>

              <Typography 
                variant="body2" 
                sx={{ 
                  textAlign: 'center', 
                  mt: 2, 
                  opacity: 0.7,
                  lineHeight: 1.5,
                }}
              >
                Clique para abrir uma conversa no WhatsApp com nosso atendimento especializado
              </Typography>

              <Box sx={{ mt: 3, p: 2, backgroundColor: alpha(config.theme.primaryColor, 0.05), borderRadius: 2 }}>
                <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                  💡 Resposta imediata com nosso assistente de IA 24/7
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Image Modal */}
      <Dialog
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#000000',
            boxShadow: 'none',
          },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              backgroundColor: alpha('#ffffff', 0.9),
              zIndex: 3,
              '&:hover': {
                backgroundColor: '#ffffff',
              },
            }}
            onClick={() => setShowImageModal(false)}
          >
            <Close />
          </IconButton>
          
          <Box
            component="img"
            src={images[currentImageIndex]?.url}
            alt={property.name}
            sx={{
              width: '100%',
              height: 'auto',
              maxHeight: '90vh',
              objectFit: 'contain',
            }}
          />
          
          {images.length > 1 && (
            <>
              <IconButton
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: alpha('#ffffff', 0.9),
                  '&:hover': {
                    backgroundColor: '#ffffff',
                  },
                }}
                onClick={() => handleImageNavigation('prev')}
              >
                <NavigateBefore />
              </IconButton>
              <IconButton
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: alpha('#ffffff', 0.9),
                  '&:hover': {
                    backgroundColor: '#ffffff',
                  },
                }}
                onClick={() => handleImageNavigation('next')}
              >
                <NavigateNext />
              </IconButton>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating WhatsApp Button */}
      <Zoom in>
        <Fab
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: `linear-gradient(135deg, #25D366, #128C7E)`,
            color: '#ffffff',
            '&:hover': {
              background: `linear-gradient(135deg, #128C7E, #075E54)`,
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1000,
          }}
          onClick={handleWhatsAppBooking}
        >
          <WhatsApp />
        </Fab>
      </Zoom>
    </Container>
  );
}