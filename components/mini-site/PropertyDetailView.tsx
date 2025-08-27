'use client';

import React, { useState, useEffect } from 'react';
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
  Avatar,
  Rating,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ImageList,
  ImageListItem,
  Tooltip,
  Badge,
  useMediaQuery
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
  CalendarMonth,
  Star,
  Verified,
  Security,
  CleaningServices,
  LocalOffer,
  ExpandMore,
  PhotoCamera,
  Videocam,
  CheckCircle,
  Info,
  Schedule,
  CancelPresentation,
  AttachMoney,
  TrendingUp,
  Person,
  Group,
  Reviews,
  Map,
  DirectionsWalk
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertyDetailViewProps {
  property: PublicProperty;
  config: MiniSiteConfig;
}

const ImageGallery = ({ 
  images, 
  videos, 
  propertyName, 
  onImageClick 
}: { 
  images: any[], 
  videos: any[], 
  propertyName: string,
  onImageClick: (index: number) => void 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!images || images.length === 0) {
    return (
      <Box
        sx={{
          height: isMobile ? 300 : 500,
          backgroundColor: theme.palette.grey[100],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 3,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Nenhuma imagem disponível
        </Typography>
      </Box>
    );
  }

  const mainImage = images[0];
  const remainingImages = images.slice(1, 5); // Show up to 4 additional images

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Main Image */}
      <Box
        sx={{
          position: 'relative',
          height: isMobile ? 300 : 500,
          borderRadius: 3,
          overflow: 'hidden',
          cursor: 'pointer',
          '&:hover .overlay': {
            opacity: 1,
          },
        }}
        onClick={() => onImageClick(0)}
      >
        <Box
          component="img"
          src={mainImage.url}
          alt={propertyName}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        />
        
        {/* Overlay */}
        <Box
          className="overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
          >
            <PhotoLibrary />
            <Typography variant="body2" fontWeight={600}>
              Ver todas as {images.length} fotos
            </Typography>
          </Box>
        </Box>

        {/* Media Count Badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            gap: 1,
          }}
        >
          <Badge
            badgeContent={images.length}
            color="primary"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: 'text.primary',
                fontWeight: 600,
              },
            }}
          >
            <PhotoCamera sx={{ color: 'white', fontSize: 24 }} />
          </Badge>
          {videos.length > 0 && (
            <Badge
              badgeContent={videos.length}
              color="secondary"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: 'text.primary',
                  fontWeight: 600,
                },
              }}
            >
              <Videocam sx={{ color: 'white', fontSize: 24 }} />
            </Badge>
          )}
        </Box>
      </Box>

      {/* Thumbnail Grid - Desktop Only */}
      {!isMobile && remainingImages.length > 0 && (
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {remainingImages.map((image, index) => (
            <Grid item xs={3} key={index}>
              <Box
                sx={{
                  position: 'relative',
                  height: 120,
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '&:hover': {
                    '& img': {
                      transform: 'scale(1.1)',
                    },
                  },
                }}
                onClick={() => onImageClick(index + 1)}
              >
                <Box
                  component="img"
                  src={image.url}
                  alt={`${propertyName} - Imagem ${index + 2}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                  }}
                />
                {index === 3 && images.length > 5 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h6" color="white" fontWeight={700}>
                      +{images.length - 5}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

const ImageModal = ({ 
  open, 
  onClose, 
  images, 
  currentIndex, 
  onIndexChange,
  propertyName 
}: {
  open: boolean;
  onClose: () => void;
  images: any[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  propertyName: string;
}) => {
  const handlePrevious = () => {
    onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  const handleNext = () => {
    onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') handlePrevious();
    if (event.key === 'ArrowRight') handleNext();
    if (event.key === 'Escape') onClose();
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [open, currentIndex]);

  if (!images || images.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          margin: 0,
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Close Button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 2,
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.2)',
            },
          }}
        >
          <Close />
        </IconButton>

        {/* Image Counter */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 2,
          }}
        >
          <Typography variant="body2">
            {currentIndex + 1} de {images.length}
          </Typography>
        </Box>

        {/* Main Image */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={images[currentIndex]?.url}
            alt={`${propertyName} - Imagem ${currentIndex + 1}`}
            sx={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
            }}
          />

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <IconButton
                onClick={handlePrevious}
                sx={{
                  position: 'absolute',
                  left: 16,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  },
                }}
              >
                <NavigateBefore />
              </IconButton>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 16,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  },
                }}
              >
                <NavigateNext />
              </IconButton>
            </>
          )}
        </Box>

        {/* Thumbnail Strip */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 2,
            overflowX: 'auto',
            justifyContent: 'center',
          }}
        >
          {images.map((image, index) => (
            <Box
              key={index}
              onClick={() => onIndexChange(index)}
              sx={{
                width: 60,
                height: 40,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === currentIndex ? '2px solid white' : '2px solid transparent',
                opacity: index === currentIndex ? 1 : 0.6,
                transition: 'all 0.3s ease',
                '&:hover': {
                  opacity: 1,
                },
              }}
            >
              <Box
                component="img"
                src={image.url}
                alt={`Thumbnail ${index + 1}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default function PropertyDetailView({ property, config }: PropertyDetailViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
    'Garagem': <LocalParking />,
    'Piscina': <Pool />,
    'Academia': <FitnessCenter />,
    'Cozinha': <Kitchen />,
    'Cozinha Equipada': <Kitchen />,
    'TV': <Tv />,
    'Ar Condicionado': <AcUnit />,
    'Lavanderia': <LocalLaundryService />,
    'Varanda': <Balcony />,
    'Pet Friendly': <Pets />,
    'Aceita Pets': <Pets />,
    'Permitido Fumar': <SmokingRooms />,
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Olá! Estou interessado na propriedade "${property.name}" que vi no seu site. Gostaria de saber mais detalhes e verificar a disponibilidade.`
    );
    window.open(`https://wa.me/${config.contactInfo.whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.name,
          text: property.description,
          url: url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        // Could add a toast notification here
      } catch (err) {
        console.error('Failed to copy to clipboard');
      }
    }
  };

  // Mock data for enhanced property details
  const rating = 4.3 + Math.random() * 0.7;
  const reviewCount = Math.floor(Math.random() * 150) + 25;
  const responseTime = Math.floor(Math.random() * 60) + 5; // 5-65 minutes
  const bookingRate = 85 + Math.floor(Math.random() * 15); // 85-100%

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Back Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          component={Link}
          href={`/site/${property.tenantId}`}
          startIcon={<ArrowBack />}
          sx={{
            color: 'text.secondary',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: alpha('#06b6d4', 0.08),
              color: '#06b6d4',
            },
          }}
        >
          Voltar às propriedades
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column - Images */}
        <Grid item xs={12} md={8}>
          <ImageGallery
            images={images}
            videos={videos}
            propertyName={property.name}
            onImageClick={handleImageClick}
          />
        </Grid>

        {/* Right Column - Property Info */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              position: isMobile ? 'static' : 'sticky',
              top: 100,
              borderRadius: 3,
              boxShadow: `0 8px 40px ${alpha('#000', 0.08)}`,
              border: `1px solid ${alpha('#06b6d4', 0.08)}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Property Title & Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    color: '#e2e8f0',
                    flex: 1,
                    mr: 2,
                  }}
                >
                  {property.name}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton
                    onClick={() => setIsFavorited(!isFavorited)}
                    sx={{
                      color: isFavorited ? '#e91e63' : 'text.secondary',
                      '&:hover': { color: '#e91e63' },
                    }}
                  >
                    {isFavorited ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                  <IconButton
                    onClick={handleShare}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: '#06b6d4' },
                    }}
                  >
                    <Share />
                  </IconButton>
                </Stack>
              </Box>

              {/* Location & Rating */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOn sx={{ fontSize: 16, color: '#06b6d4' }} />
                  <Typography variant="body2" color="text.secondary">
                    {property.location.city}, {property.location.state}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Rating value={rating} precision={0.1} size="small" readOnly />
                  <Typography variant="body2" color="text.secondary">
                    ({reviewCount})
                  </Typography>
                </Box>
              </Box>

              {/* Property Stats */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: 2,
                  p: 2,
                  mb: 3,
                  backgroundColor: alpha('#06b6d4', 0.03),
                  borderRadius: 2,
                  border: `1px solid ${alpha('#06b6d4', 0.08)}`,
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <People sx={{ fontSize: 20, color: '#06b6d4', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {property.maxGuests} hóspedes
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Bed sx={{ fontSize: 20, color: '#06b6d4', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {property.bedrooms} quartos
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Bathtub sx={{ fontSize: 20, color: '#06b6d4', mb: 0.5 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {property.bathrooms} banheiros
                  </Typography>
                </Box>
                {property.area && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Square sx={{ fontSize: 20, color: '#06b6d4', mb: 0.5 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                      {property.area}m²
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Pricing */}
              {config.features.showPricing && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${'#06b6d4'}, ${'#22c55e'})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {formatPrice(property.pricing.basePrice)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      por noite
                    </Typography>
                  </Box>
                  {property.pricing.minimumStay > 1 && (
                    <Typography variant="caption" color="text.secondary">
                      Estadia mínima: {property.pricing.minimumStay} noites
                    </Typography>
                  )}
                </Box>
              )}

              {/* Host Performance */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: alpha('#4caf50', 0.05), borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#4caf50' }}>
                  🏆 Anfitrião Destacado
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Taxa de resposta:</Typography>
                    <Typography variant="caption" fontWeight={600}>{bookingRate}%</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Tempo de resposta:</Typography>
                    <Typography variant="caption" fontWeight={600}>~{responseTime} min</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Propriedade verificada:</Typography>
                    <Verified sx={{ fontSize: 16, color: '#4caf50' }} />
                  </Box>
                </Stack>
              </Box>

              {/* WhatsApp CTA */}
              <Button
                fullWidth
                size="large"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppClick}
                sx={{
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: 'white',
                  borderRadius: 2.5,
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxShadow: `0 8px 25px ${alpha('#25D366', 0.35)}`,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #128C7E, #075E54)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 12px 35px ${alpha('#25D366', 0.45)}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  mb: 2,
                }}
              >
                Reservar via WhatsApp
              </Button>

              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: 'text.secondary',
                  lineHeight: 1.4,
                }}
              >
                🔒 Comunicação segura direto com o proprietário
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Full Width Content */}
        <Grid item xs={12}>
          <Grid container spacing={4}>
            {/* Description */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info sx={{ color: '#06b6d4' }} />
                    Sobre esta propriedade
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      lineHeight: 1.7,
                      color: 'text.secondary',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {property.description}
                  </Typography>
                </CardContent>
              </Card>

              {/* Amenities */}
              <Card sx={{ borderRadius: 3, mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#06b6d4' }} />
                    Comodidades ({property.amenities.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {property.amenities.map((amenity, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                          {amenityIcons[amenity] || <Check sx={{ color: '#06b6d4' }} />}
                          <Typography variant="body2">{amenity}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>

              {/* House Rules & Policies */}
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Policy sx={{ color: '#06b6d4' }} />
                    Regras da casa e políticas
                  </Typography>
                  
                  <Accordion elevation={0} sx={{ '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Check-in e Check-out
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Schedule sx={{ fontSize: 20, color: '#06b6d4' }} />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>Check-in: 15:00 - 22:00</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Check-in tardio disponível mediante acordo
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Schedule sx={{ fontSize: 20, color: '#06b6d4' }} />
                          <Box>
                            <Typography variant="body2" fontWeight={600}>Check-out: até 11:00</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Check-out tardio disponível mediante acordo
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion elevation={0} sx={{ '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Política de cancelamento
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CheckCircle sx={{ fontSize: 20, color: '#4caf50' }} />
                          <Typography variant="body2">
                            Cancelamento gratuito até 48h antes do check-in
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CancelPresentation sx={{ fontSize: 20, color: '#ff9800' }} />
                          <Typography variant="body2">
                            Cancelamento com reembolso de 50% até 24h antes
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CancelPresentation sx={{ fontSize: 20, color: '#f44336' }} />
                          <Typography variant="body2">
                            Sem reembolso para cancelamentos no mesmo dia
                          </Typography>
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion elevation={0} sx={{ '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Regras da propriedade
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Group sx={{ fontSize: 20, color: '#06b6d4' }} />
                          <Typography variant="body2">
                            Máximo de {property.maxGuests} hóspedes
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <SmokingRooms sx={{ fontSize: 20, color: '#f44336' }} />
                          <Typography variant="body2">
                            Proibido fumar em áreas internas
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {property.amenities.includes('Pet Friendly') || property.amenities.includes('Aceita Pets') ? (
                            <Pets sx={{ fontSize: 20, color: '#4caf50' }} />
                          ) : (
                            <Pets sx={{ fontSize: 20, color: '#f44336' }} />
                          )}
                          <Typography variant="body2">
                            {property.amenities.includes('Pet Friendly') || property.amenities.includes('Aceita Pets') 
                              ? 'Aceita animais de estimação' 
                              : 'Não aceita animais de estimação'
                            }
                          </Typography>
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>

            {/* Additional Info Sidebar */}
            <Grid item xs={12} md={4}>
              {/* Location Map Placeholder */}
              <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Map sx={{ color: '#06b6d4' }} />
                    Localização
                  </Typography>
                  <Box
                    sx={{
                      height: 200,
                      backgroundColor: theme.palette.grey[100],
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      📍 Mapa interativo
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>{property.location.address}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {property.location.city}, {property.location.state}
                  </Typography>
                </CardContent>
              </Card>

              {/* Safety & Security */}
              <Card sx={{ borderRadius: 3, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security sx={{ color: '#06b6d4' }} />
                    Segurança
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Verified sx={{ color: '#4caf50', fontSize: 20 }} />
                      <Typography variant="body2">Identidade verificada</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CleaningServices sx={{ color: '#4caf50', fontSize: 20 }} />
                      <Typography variant="body2">Protocolo de limpeza reforçado</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Security sx={{ color: '#4caf50', fontSize: 20 }} />
                      <Typography variant="body2">Área segura e bem localizada</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Contact Host */}
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person sx={{ color: '#06b6d4' }} />
                    Anfitrião
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 50, height: 50, bgcolor: '#06b6d4' }}>
                      {config.contactInfo.businessName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {config.contactInfo.businessName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star sx={{ fontSize: 14, color: '#FFD700' }} />
                        <Typography variant="caption">
                          {rating.toFixed(1)} · {reviewCount} avaliações
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Especialista em hospedagem com foco na experiência do hóspede.
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<WhatsApp />}
                    onClick={handleWhatsAppClick}
                    sx={{
                      borderColor: '#06b6d4',
                      color: '#06b6d4',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: alpha('#06b6d4', 0.08),
                      },
                    }}
                  >
                    Contatar anfitrião
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Image Modal */}
      <ImageModal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        images={images}
        currentIndex={currentImageIndex}
        onIndexChange={setCurrentImageIndex}
        propertyName={property.name}
      />

      {/* Floating WhatsApp Button - Mobile */}
      {isMobile && (
        <Fab
          onClick={handleWhatsAppClick}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: 'white',
            zIndex: 1000,
            '&:hover': {
              background: 'linear-gradient(135deg, #128C7E, #075E54)',
            },
          }}
        >
          <WhatsApp />
        </Fab>
      )}
    </Container>
  );
}