'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  IconButton,
  useTheme,
  alpha,
  Button,
  Stack,
  Avatar,
  Divider,
  Tooltip,
  CardMedia,
  CardActions,
  Badge
} from '@mui/material';
import { 
  Favorite, 
  FavoriteBorder, 
  LocationOn, 
  People, 
  Bed, 
  Bathtub,
  Square,
  Star,
  WhatsApp,
  Share,
  Visibility,
  LocalOffer,
  Wifi,
  LocalParking,
  Pool,
  FitnessCenter,
  Restaurant,
  Spa,
  BusinessCenter,
  DirectionsCar,
  Kitchen,
  Balcony,
  Pets,
  SmokingRooms,
  AcUnit,
  Tv,
  LocalLaundryService,
  Security,
  Elevator,
  AccessibleForward,
  MoreHoriz
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { motion } from 'framer-motion';
import { useThemeMode } from '@/contexts/ThemeContext';

interface PropertyCardModernProps {
  property: PublicProperty;
  config: MiniSiteConfig;
  onWhatsAppClick?: (property: PublicProperty) => void;
  viewMode?: 'grid' | 'list';
}

// Mapping of amenities to icons
const amenityIcons: Record<string, React.ReactNode> = {
  'Wi-Fi': <Wifi />,
  'Estacionamento': <LocalParking />,
  'Piscina': <Pool />,
  'Academia': <FitnessCenter />,
  'Restaurante': <Restaurant />,
  'Spa': <Spa />,
  'Centro de Negócios': <BusinessCenter />,
  'Garagem': <DirectionsCar />,
  'Cozinha': <Kitchen />,
  'Varanda': <Balcony />,
  'Pet Friendly': <Pets />,
  'Área para Fumantes': <SmokingRooms />,
  'Ar Condicionado': <AcUnit />,
  'TV': <Tv />,
  'Lavanderia': <LocalLaundryService />,
  'Segurança': <Security />,
  'Elevador': <Elevator />,
  'Acessibilidade': <AccessibleForward />,
};

export default function PropertyCardModern({ 
  property, 
  config, 
  onWhatsAppClick, 
  viewMode = 'grid' 
}: PropertyCardModernProps) {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Safely handle photos array
  const photos = property.media.photos || [];
  const validPhotos = photos.filter(photo => photo && photo.url && photo.url.trim() !== '');
  
  const mainImage = validPhotos.find(photo => photo.isMain) || validPhotos[0];
  const images = validPhotos.sort((a, b) => (a.order || 0) - (b.order || 0));

  const cardStyle = {
    borderRadius: mode === 'light' ? '24px' : '20px',
    overflow: 'hidden',
    background: mode === 'light' 
      ? theme.palette.background.paper 
      : 'rgba(255, 255, 255, 0.08)',
    backdropFilter: mode === 'light' ? 'blur(12px)' : 'blur(20px)',
    border: mode === 'light' 
      ? `2px solid ${theme.palette.divider}` 
      : '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: mode === 'light' 
      ? theme.custom.elevation.low 
      : '0 8px 32px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: viewMode === 'list' ? (mode === 'light' ? 300 : 280) : (mode === 'light' ? 520 : 480),
    maxHeight: viewMode === 'list' ? (mode === 'light' ? 340 : 320) : (mode === 'light' ? 560 : 520),
    '&:hover': {
      transform: mode === 'light' ? 'translateY(-12px)' : 'translateY(-8px)',
      boxShadow: mode === 'light' 
        ? theme.custom.elevation.high 
        : '0 16px 48px rgba(0, 0, 0, 0.4)',
      background: mode === 'light' 
        ? theme.palette.action.hover
        : 'rgba(255, 255, 255, 0.12)',
      border: mode === 'light'
        ? '2px solid rgba(139, 92, 246, 0.4)'
        : '1px solid rgba(139, 92, 246, 0.3)',
    },
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWhatsAppClick) {
      onWhatsAppClick(property);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: property.name,
        text: property.description,
        url: window.location.href,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleImageHover = (index: number) => {
    if (index >= 0 && index < images.length) {
      setCurrentImageIndex(index);
    }
  };

  // Reset image index if current index is out of bounds
  useEffect(() => {
    if (currentImageIndex >= images.length && images.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  const getAmenityIcon = (amenity: string) => {
    return amenityIcons[amenity] || <MoreHoriz />;
  };

  const imageSection = (
    <Box sx={{ 
      position: 'relative', 
      overflow: 'hidden',
      width: '100%',
      height: viewMode === 'list' ? 200 : 320,
      borderRadius: '16px 16px 0 0',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    }}>
      <LazyImage
        src={images[currentImageIndex]?.url || mainImage?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'}
        alt={images[currentImageIndex]?.alt || property.name}
        width="100%"
        height={viewMode === 'list' ? '200px' : '320px'}
        objectFit="cover"
        className="property-image"
        onError={() => {
          console.warn('Failed to load image for property:', property.name);
        }}
        sx={{
          borderRadius: '16px 16px 0 0',
          transition: 'transform 0.3s ease',
          '&:hover': {
            transform: 'scale(1.02)',
          },
        }}
      />
      
      {/* Image Navigation Dots */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 0.5,
            zIndex: 3,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '6px 10px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {images.slice(0, 5).map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: currentImageIndex === index 
                  ? '#8b5cf6' 
                  : alpha('#ffffff', 0.4),
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#8b5cf6',
                  transform: 'scale(1.3)',
                },
              }}
              onMouseEnter={() => handleImageHover(index)}
              onClick={() => setCurrentImageIndex(index)}
            />
          ))}
        </Box>
      )}

      {/* Action Buttons */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          zIndex: 2,
        }}
      >
        <IconButton
          size="small"
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            color: isFavorited ? '#ff4757' : '#ffffff',
            width: 32,
            height: 32,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
          }}
          onClick={handleFavoriteToggle}
        >
          {isFavorited ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
        </IconButton>

        <IconButton
          size="small"
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
            width: 32,
            height: 32,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease',
          }}
          onClick={handleShare}
        >
          <Share fontSize="small" />
        </IconButton>
      </Box>

      {/* Featured Badge */}
      {property.featured && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 2,
          }}
        >
          <Chip
            label="Destaque"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '& .MuiChip-label': {
                px: 1.5,
              },
            }}
          />
        </Box>
      )}

      {/* Demo Badge */}
      {property.id.startsWith('demo-') && (
        <Box
          sx={{
            position: 'absolute',
            top: property.featured ? 52 : 12,
            left: 12,
          }}
        >
          <Chip
            label="Demo"
            size="small"
            sx={{
              background: alpha(theme.palette.warning.main, 0.9),
              color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
              fontWeight: 600,
              boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.3)}`,
              '& .MuiChip-label': {
                px: 2,
              },
            }}
          />
        </Box>
      )}

      {/* Pricing Badge */}
      {config.features.showPricing && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 2,
          }}
        >
          <Chip
            label={`${formatPrice(property.pricing.basePrice)}/noite`}
            sx={{
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(15px)',
              color: '#8b5cf6',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              fontWeight: 700,
              fontSize: '0.8rem',
              height: 28,
              '& .MuiChip-label': {
                px: 1.5,
              },
            }}
          />
        </Box>
      )}

    </Box>
  );

  const contentSection = (
    <CardContent sx={{ 
      p: mode === 'light' 
        ? { xs: 3, sm: 3.5, md: 4 } 
        : { xs: 2, sm: 2.5, md: 3 }, 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      gap: mode === 'light' 
        ? { xs: 2, sm: 2.5 } 
        : { xs: 1.5, sm: 2 },
      height: 'auto',
      minHeight: viewMode === 'list' 
        ? 'auto' 
        : mode === 'light' ? 300 : 280,
    }}>
      {/* Property Name */}
      <Typography 
        variant="h6" 
        component="h3"
        sx={{ 
          fontWeight: 700,
          color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
          lineHeight: 1.3,
          fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        {property.name}
      </Typography>

      {/* Location */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOn sx={{ fontSize: 18, color: '#8b5cf6' }} />
        <Typography variant="body2" sx={{ color: mode === 'light' ? theme.palette.text.secondary : 'rgba(255, 255, 255, 0.7)' }}>
          {property.location.city}, {property.location.state}
        </Typography>
      </Box>

      {/* Property Details */}
      <Stack direction="row" spacing={mode === 'light' ? { xs: 3, sm: 4 } : { xs: 2, sm: 3 }} sx={{ flexWrap: 'wrap', gap: mode === 'light' ? { xs: 1.5, sm: 0 } : { xs: 1, sm: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <People sx={{ fontSize: 16, color: '#8b5cf6' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: mode === 'light' ? theme.palette.text.primary : 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {property.maxGuests} hóspedes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Bed sx={{ fontSize: 16, color: '#8b5cf6' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: mode === 'light' ? theme.palette.text.primary : 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {property.bedrooms} quartos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Bathtub sx={{ fontSize: 16, color: '#8b5cf6' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: mode === 'light' ? theme.palette.text.primary : 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {property.bathrooms} banheiros
          </Typography>
        </Box>
        {property.area && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Square sx={{ fontSize: 16, color: '#8b5cf6' }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: mode === 'light' ? theme.palette.text.primary : 'rgba(255, 255, 255, 0.9)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              {property.area}m²
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Description */}
      <Typography 
        variant="body2" 
        sx={{ 
          color: mode === 'light' ? theme.palette.text.secondary : 'rgba(255, 255, 255, 0.8)',
          display: '-webkit-box',
          WebkitLineClamp: viewMode === 'list' ? 2 : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.4,
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          mb: 1,
        }}
      >
        {property.description}
      </Typography>

      {/* Amenities Preview */}
      <Box sx={{ mt: 'auto' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: mode === 'light' ? theme.palette.text.primary : '#ffffff', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Comodidades
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {property.amenities.slice(0, viewMode === 'list' ? 4 : 3).map((amenity) => (
            <Chip
              key={amenity}
              label={amenity}
              size="small"
              sx={{
                background: 'rgba(139, 92, 246, 0.15)',
                backdropFilter: 'blur(10px)',
                color: mode === 'light' ? theme.palette.text.primary : 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                height: { xs: 20, sm: 24 },
                borderRadius: '8px',
                '& .MuiChip-label': {
                  px: { xs: 0.5, sm: 1 },
                },
                '&:hover': {
                  background: 'rgba(139, 92, 246, 0.25)',
                },
                transition: 'all 0.2s ease',
              }}
            />
          ))}
          {property.amenities.length > (viewMode === 'list' ? 4 : 3) && (
            <Chip
              label={`+${property.amenities.length - (viewMode === 'list' ? 4 : 3)}`}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: mode === 'light' ? theme.palette.text.primary : '#ffffff',
                border: 'none',
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                height: { xs: 20, sm: 24 },
                borderRadius: '8px',
                fontWeight: 600,
                '& .MuiChip-label': {
                  px: { xs: 0.5, sm: 1 },
                },
                '&:hover': {
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Pricing and Action */}
      <Box sx={{ mt: 1.5 }}>
        <Divider sx={{ mb: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={mode === 'light' ? { xs: 2, sm: 3 } : { xs: 1.5, sm: 2 }}
        >
          <Box sx={{ minWidth: 0 }}>
            {config.features.showPricing && (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#8b5cf6',
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    textShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                    lineHeight: 1,
                  }}
                >
                  {formatPrice(property.pricing.basePrice)}
                </Typography>
                <Typography variant="body2" sx={{ color: mode === 'light' ? theme.palette.text.secondary : 'rgba(255, 255, 255, 0.7)', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  /noite
                </Typography>
              </Box>
            )}
            {property.pricing.minimumStay > 1 && (
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                Mín: {property.pricing.minimumStay} noites
              </Typography>
            )}
          </Box>

          <Button
            startIcon={<WhatsApp />}
            onClick={handleWhatsApp}
            fullWidth={viewMode === 'list'}
            sx={{
              background: 'linear-gradient(135deg, #25D366, #128C7E)',
              color: '#ffffff',
              borderRadius: mode === 'light' ? '20px' : '16px',
              px: mode === 'light' ? { xs: 3, sm: 4 } : { xs: 2, sm: 3 },
              py: mode === 'light' ? { xs: 1.5, sm: 2 } : { xs: 1, sm: 1.5 },
              textTransform: 'none',
              fontSize: mode === 'light' ? { xs: '0.875rem', sm: '1rem' } : { xs: '0.8rem', sm: '0.875rem' },
              fontWeight: mode === 'light' ? 500 : 600,
              minWidth: mode === 'light' ? { xs: 120, sm: 140 } : { xs: 100, sm: 120 },
              boxShadow: mode === 'light' 
                ? '0 4px 16px rgba(37, 211, 102, 0.3)' 
                : '0 8px 24px rgba(37, 211, 102, 0.4)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1da851, #0d5940)',
                transform: mode === 'light' 
                  ? 'translateY(-4px) scale(1.03)' 
                  : 'translateY(-2px) scale(1.02)',
                boxShadow: mode === 'light'
                  ? '0 8px 24px rgba(37, 211, 102, 0.4)'
                  : '0 12px 32px rgba(37, 211, 102, 0.5)',
              },
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Reservar
          </Button>
        </Stack>
      </Box>
    </CardContent>
  );

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card sx={cardStyle}>
        <Link 
          href={`/site/${property.tenantId}/property/${property.id}`}
          style={{ 
            textDecoration: 'none', 
            color: 'inherit', 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {imageSection}
          {contentSection}
        </Link>
      </Card>
    </motion.div>
  );
}