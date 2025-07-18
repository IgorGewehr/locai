'use client';

import React, { useState } from 'react';
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const mainImage = property.media.photos.find(photo => photo.isMain) || property.media.photos[0];
  const images = property.media.photos.sort((a, b) => a.order - b.order);

  const cardStyle = {
    borderRadius: 3,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(config.theme.primaryColor, 0.08)}`,
    boxShadow: `0 8px 40px ${alpha(config.theme.primaryColor, 0.06)}`,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    height: '100%',
    display: 'flex',
    flexDirection: viewMode === 'list' ? 'row' : 'column',
    '&:hover': {
      transform: viewMode === 'grid' ? 'translateY(-8px)' : 'translateX(4px)',
      boxShadow: `0 20px 60px ${alpha(config.theme.primaryColor, 0.12)}`,
      '& .property-image': {
        transform: 'scale(1.05)',
      },
      '& .property-overlay': {
        opacity: 1,
      },
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
    setCurrentImageIndex(index);
  };

  const getAmenityIcon = (amenity: string) => {
    return amenityIcons[amenity] || <MoreHoriz />;
  };

  const imageSection = (
    <Box sx={{ 
      position: 'relative', 
      overflow: 'hidden',
      width: viewMode === 'list' ? 300 : '100%',
      minWidth: viewMode === 'list' ? 300 : 'auto',
      height: viewMode === 'list' ? 200 : 280,
    }}>
      <LazyImage
        src={images[currentImageIndex]?.url || mainImage?.url || '/placeholder-property.jpg'}
        alt={property.name}
        height={viewMode === 'list' ? '200px' : '280px'}
        aspectRatio={viewMode === 'list' ? '3/2' : '16/9'}
        className="property-image"
        sx={{
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      
      {/* Image Navigation Dots */}
      {images.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 2,
          }}
        >
          {images.slice(0, 5).map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: currentImageIndex === index 
                  ? 'white' 
                  : alpha('white', 0.5),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'white',
                  transform: 'scale(1.2)',
                },
              }}
              onMouseEnter={() => handleImageHover(index)}
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
          gap: 1,
        }}
      >
        <IconButton
          sx={{
            backgroundColor: alpha('white', 0.9),
            backdropFilter: 'blur(10px)',
            color: isFavorited ? '#ff4757' : '#666',
            '&:hover': {
              backgroundColor: 'white',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
          }}
          onClick={handleFavoriteToggle}
        >
          {isFavorited ? <Favorite /> : <FavoriteBorder />}
        </IconButton>

        <IconButton
          sx={{
            backgroundColor: alpha('white', 0.9),
            backdropFilter: 'blur(10px)',
            color: '#666',
            '&:hover': {
              backgroundColor: 'white',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
          }}
          onClick={handleShare}
        >
          <Share />
        </IconButton>
      </Box>

      {/* Featured Badge */}
      {property.featured && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
          }}
        >
          <Chip
            label="Destaque"
            size="small"
            sx={{
              background: `linear-gradient(135deg, ${config.theme.accentColor}, ${config.theme.primaryColor})`,
              color: 'white',
              fontWeight: 600,
              boxShadow: `0 4px 12px ${alpha(config.theme.accentColor, 0.3)}`,
              '& .MuiChip-label': {
                px: 2,
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
              color: 'white',
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
          }}
        >
          <Chip
            label={`${formatPrice(property.pricing.basePrice)}/noite`}
            sx={{
              backgroundColor: alpha('white', 0.95),
              backdropFilter: 'blur(10px)',
              color: config.theme.primaryColor,
              fontWeight: 700,
              fontSize: '0.875rem',
              '& .MuiChip-label': {
                px: 2,
              },
            }}
          />
        </Box>
      )}

      {/* Hover Overlay */}
      <Box
        className="property-overlay"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${alpha(config.theme.primaryColor, 0.1)}, ${alpha(config.theme.accentColor, 0.1)})`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'white',
            fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          Ver Detalhes
        </Typography>
      </Box>
    </Box>
  );

  const contentSection = (
    <CardContent sx={{ 
      p: 3, 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      gap: 2,
    }}>
      {/* Property Name */}
      <Typography 
        variant="h6" 
        component="h3"
        sx={{ 
          fontWeight: 700,
          color: config.theme.textColor,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {property.name}
      </Typography>

      {/* Location */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOn sx={{ fontSize: 18, color: config.theme.primaryColor }} />
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {property.location.city}, {property.location.state}
        </Typography>
      </Box>

      {/* Property Details */}
      <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <People sx={{ fontSize: 16, color: config.theme.primaryColor }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {property.maxGuests} hóspedes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Bed sx={{ fontSize: 16, color: config.theme.primaryColor }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {property.bedrooms} quartos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Bathtub sx={{ fontSize: 16, color: config.theme.primaryColor }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {property.bathrooms} banheiros
          </Typography>
        </Box>
        {property.area && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Square sx={{ fontSize: 16, color: config.theme.primaryColor }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {property.area}m²
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Description */}
      <Typography 
        variant="body2" 
        sx={{ 
          opacity: 0.8,
          display: '-webkit-box',
          WebkitLineClamp: viewMode === 'list' ? 2 : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.5,
        }}
      >
        {property.description}
      </Typography>

      {/* Amenities Preview */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: config.theme.textColor }}>
          Comodidades
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {property.amenities.slice(0, viewMode === 'list' ? 6 : 4).map((amenity, index) => (
            <Tooltip key={amenity} title={amenity} placement="top">
              <Chip
                icon={getAmenityIcon(amenity)}
                label={amenity}
                size="small"
                sx={{
                  backgroundColor: alpha(config.theme.primaryColor, 0.1),
                  color: config.theme.primaryColor,
                  border: `1px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                  fontSize: '0.75rem',
                  '& .MuiChip-icon': {
                    fontSize: 14,
                  },
                  '&:hover': {
                    backgroundColor: alpha(config.theme.primaryColor, 0.15),
                  },
                }}
              />
            </Tooltip>
          ))}
          {property.amenities.length > (viewMode === 'list' ? 6 : 4) && (
            <Chip
              label={`+${property.amenities.length - (viewMode === 'list' ? 6 : 4)}`}
              size="small"
              sx={{
                backgroundColor: alpha(config.theme.accentColor, 0.1),
                color: config.theme.accentColor,
                border: `1px solid ${alpha(config.theme.accentColor, 0.2)}`,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Pricing and Action */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ mb: 2 }} />
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
        >
          <Box>
            {config.features.showPricing && (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: config.theme.primaryColor,
                  }}
                >
                  {formatPrice(property.pricing.basePrice)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  por noite
                </Typography>
              </Box>
            )}
            {property.pricing.minimumStay > 1 && (
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Estadia mínima: {property.pricing.minimumStay} noites
              </Typography>
            )}
          </Box>

          <Button
            startIcon={<WhatsApp />}
            onClick={handleWhatsApp}
            fullWidth={viewMode === 'list'}
            sx={{
              background: `linear-gradient(135deg, #25D366, #128C7E)`,
              color: 'white',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              minWidth: 120,
              boxShadow: `0 4px 12px ${alpha('#25D366', 0.3)}`,
              '&:hover': {
                background: `linear-gradient(135deg, #128C7E, #075E54)`,
                transform: 'translateY(-1px)',
                boxShadow: `0 6px 20px ${alpha('#25D366', 0.4)}`,
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', height: '100%' }}
        >
          {viewMode === 'list' ? (
            <>
              {imageSection}
              {contentSection}
            </>
          ) : (
            <>
              {imageSection}
              {contentSection}
            </>
          )}
        </Link>
      </Card>
    </motion.div>
  );
}