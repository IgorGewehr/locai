'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip,
  IconButton,
  Badge,
  useTheme,
  alpha,
  Button,
  Stack
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
  WhatsApp
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
import Link from 'next/link';
import LazyImage from './LazyImage';

interface PropertyCardProps {
  property: PublicProperty;
  config: MiniSiteConfig;
  onWhatsAppClick?: (property: PublicProperty) => void;
}

export default function PropertyCard({ property, config, onWhatsAppClick }: PropertyCardProps) {
  const theme = useTheme();
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const mainImage = property.media.photos.find(photo => photo.isMain) || property.media.photos[0];
  const images = property.media.photos.sort((a, b) => a.order - b.order);

  const cardStyle = {
    borderRadius: config.theme.borderRadius === 'extra-rounded' ? 4 : config.theme.borderRadius === 'rounded' ? 2 : 0,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(config.theme.primaryColor, 0.1)}`,
    boxShadow: `0 8px 40px ${alpha(config.theme.primaryColor, 0.08)}`,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': {
      transform: { xs: 'none', sm: 'translateY(-8px)' },
      boxShadow: `0 20px 60px ${alpha(config.theme.primaryColor, 0.15)}`,
      '& .property-image': {
        transform: { xs: 'none', sm: 'scale(1.05)' },
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

  const handleImageHover = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <Card sx={cardStyle}>
      <Link 
        href={`/site/${property.tenantId}/property/${property.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <LazyImage
            src={images[currentImageIndex]?.url || mainImage?.url || '/placeholder-property.jpg'}
            alt={property.name}
            height="280px"
            aspectRatio="16/9"
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
                      ? '#ffffff' 
                      : alpha('#ffffff', 0.5),
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: '#ffffff',
                    },
                  }}
                  onMouseEnter={() => handleImageHover(index)}
                />
              ))}
            </Box>
          )}

          {/* Favorite Button */}
          <IconButton
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              backgroundColor: alpha('#ffffff', 0.9),
              backdropFilter: 'blur(10px)',
              color: isFavorited ? '#ff4757' : '#666',
              '&:hover': {
                backgroundColor: '#ffffff',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
            }}
            onClick={handleFavoriteToggle}
          >
            {isFavorited ? <Favorite /> : <FavoriteBorder />}
          </IconButton>

          {/* Featured Badge */}
          {property.featured && (
            <Chip
              label="Destaque"
              size="small"
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: `linear-gradient(135deg, ${config.theme.accentColor}, ${config.theme.primaryColor})`,
                color: '#ffffff',
                fontWeight: 600,
                boxShadow: `0 4px 12px ${alpha(config.theme.accentColor, 0.3)}`,
              }}
            />
          )}

          {/* Overlay for hover effects */}
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
                color: '#ffffff',
                fontWeight: 600,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              Ver Detalhes
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 2, sm: 3 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Property Name */}
          <Typography 
            variant="h6" 
            component="h3"
            sx={{ 
              fontWeight: 700,
              mb: 1,
              color: config.theme.textColor,
              lineHeight: 1.3,
            }}
          >
            {property.name}
          </Typography>

          {/* Location */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, opacity: 0.8 }}>
            <LocationOn sx={{ fontSize: 16, mr: 0.5, color: config.theme.primaryColor }} />
            <Typography variant="body2">
              {property.location.city}, {property.location.state}
            </Typography>
          </Box>

          {/* Property Details */}
          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <People sx={{ fontSize: 16, color: config.theme.primaryColor }} />
              <Typography variant="body2">{property.maxGuests || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Bed sx={{ fontSize: 16, color: config.theme.primaryColor }} />
              <Typography variant="body2">{property.bedrooms || 0}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Bathtub sx={{ fontSize: 16, color: config.theme.primaryColor }} />
              <Typography variant="body2">{property.bathrooms || 0}</Typography>
            </Box>
            {property.area && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Square sx={{ fontSize: 16, color: config.theme.primaryColor }} />
                <Typography variant="body2">{property.area}m²</Typography>
              </Box>
            )}
          </Stack>

          {/* Amenities Preview */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {property.amenities.slice(0, 3).map((amenity) => (
                <Chip
                  key={amenity}
                  label={amenity}
                  size="small"
                  sx={{
                    backgroundColor: alpha(config.theme.primaryColor, 0.1),
                    color: config.theme.primaryColor,
                    border: `1px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                    fontSize: '0.75rem',
                  }}
                />
              ))}
              {property.amenities.length > 3 && (
                <Chip
                  label={`+${property.amenities.length - 3}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(config.theme.accentColor, 0.1),
                    color: config.theme.accentColor,
                    border: `1px solid ${alpha(config.theme.accentColor, 0.2)}`,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </Stack>
          </Box>

          {/* Price and Action */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 0 },
            mt: 'auto'
          }}>
            <Box>
              {config.features.showPricing && (
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: config.theme.primaryColor,
                    mb: 0.5,
                  }}
                >
                  {formatPrice(property.pricing.basePrice)}
                  <Typography component="span" variant="body2" sx={{ color: 'text.secondary', ml: 0.5 }}>
                    /noite
                  </Typography>
                </Typography>
              )}
              {property.pricing.minimumStay > 1 && (
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Mín. {property.pricing.minimumStay} noites
                </Typography>
              )}
            </Box>

            <Button
              startIcon={<WhatsApp />}
              onClick={handleWhatsApp}
              fullWidth={true}
              sx={{
                background: `linear-gradient(135deg, #25D366, #128C7E)`,
                color: '#ffffff',
                borderRadius: 2,
                px: { xs: 3, sm: 2 },
                py: { xs: 1.5, sm: 1 },
                textTransform: 'none',
                fontSize: { xs: '0.9rem', sm: '0.875rem' },
                fontWeight: 600,
                boxShadow: `0 4px 12px ${alpha('#25D366', 0.3)}`,
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  background: `linear-gradient(135deg, #128C7E, #075E54)`,
                  transform: { xs: 'none', sm: 'translateY(-1px)' },
                  boxShadow: `0 6px 20px ${alpha('#25D366', 0.4)}`,
                },
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Reservar
            </Button>
          </Box>
        </CardContent>
      </Link>
    </Card>
  );
}