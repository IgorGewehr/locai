'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Stack,
  Avatar,
  Tooltip,
  Badge,
  useTheme,
  alpha,
  Rating,
  Divider,
  LinearProgress,
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
  CheckCircle,
  Schedule,
  TrendingUp,
  PhotoCamera,
  Videocam,
  ThreeSixty,
  ArrowForward,
  WifiTethering,
  Pool,
  FitnessCenter,
  LocalParking,
  Pets,
  AcUnit,
  Kitchen,
  Balcony,
  BeachAccess,
  Landscape,
  HomeWork,
} from '@mui/icons-material';
import { PublicProperty, MiniSiteConfig } from '@/lib/types/mini-site';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import LazyImage from './LazyImage';

interface PropertyCardEnhancedProps {
  property: PublicProperty;
  config: MiniSiteConfig;
  onWhatsAppClick?: (property: PublicProperty) => void;
  variant?: 'default' | 'glassmorphism' | 'neumorphism' | 'gradient' | 'minimal';
  viewMode?: 'grid' | 'list';
  animationDelay?: number;
}

// Enhanced amenity icons mapping
const amenityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  'Wi-Fi': { icon: <WifiTethering />, color: '#2196F3' },
  'Piscina': { icon: <Pool />, color: '#00BCD4' },
  'Academia': { icon: <FitnessCenter />, color: '#FF5722' },
  'Estacionamento': { icon: <LocalParking />, color: '#795548' },
  'Pet Friendly': { icon: <Pets />, color: '#4CAF50' },
  'Ar Condicionado': { icon: <AcUnit />, color: '#03A9F4' },
  'Cozinha': { icon: <Kitchen />, color: '#FF9800' },
  'Varanda': { icon: <Balcony />, color: '#9C27B0' },
  'Vista Mar': { icon: <BeachAccess />, color: '#00ACC1' },
  'Vista Montanha': { icon: <Landscape />, color: '#4CAF50' },
};

export default function PropertyCardEnhanced({
  property,
  config,
  onWhatsAppClick,
  variant = 'default',
  viewMode = 'grid',
  animationDelay = 0,
}: PropertyCardEnhancedProps) {
  const theme = useTheme();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const images = property.media.photos.sort((a, b) => a.order - b.order);
  const mainImage = images.find(photo => photo.isMain) || images[0];
  const hasMultipleImages = images.length > 1;
  const hasVideo = property.media.videos && property.media.videos.length > 0;
  const hasVirtualTour = property.virtualTourUrl;

  // Calculate discount percentage if applicable
  const discountPercentage = property.pricing.originalPrice && property.pricing.originalPrice > property.pricing.basePrice
    ? Math.round(((property.pricing.originalPrice - property.pricing.basePrice) / property.pricing.originalPrice) * 100)
    : 0;

  // Get card styles based on variant
  const getCardStyles = () => {
    const baseStyles = {
      height: '100%',
      overflow: 'hidden',
      position: 'relative' as const,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      borderRadius: variant === 'minimal' ? 2 : 3,
    };

    switch (variant) {
      case 'glassmorphism':
        return {
          ...baseStyles,
          background: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(20px) saturate(200%)',
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
          '&:hover': {
            transform: 'translateY(-8px) rotateX(5deg)',
            boxShadow: `0 20px 60px ${alpha('#06b6d4', 0.2)}`,
            '& .property-image': {
              transform: 'scale(1.1)',
            },
            '& .overlay-content': {
              opacity: 1,
            },
          },
        };

      case 'neumorphism':
        return {
          ...baseStyles,
          background: theme.palette.background.paper,
          boxShadow: `20px 20px 60px ${alpha(theme.palette.common.black, 0.1)}, -20px -20px 60px ${alpha(theme.palette.common.white, 0.7)}`,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `25px 25px 75px ${alpha(theme.palette.common.black, 0.15)}, -25px -25px 75px ${alpha(theme.palette.common.white, 0.7)}`,
          },
        };

      case 'gradient':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${alpha('#06b6d4', 0.1)}, ${alpha('#22c55e', 0.05)})`,
          border: `1px solid ${alpha('#06b6d4', 0.2)}`,
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            background: `linear-gradient(135deg, ${alpha('#06b6d4', 0.15)}, ${alpha('#22c55e', 0.08)})`,
            boxShadow: `0 20px 40px ${alpha('#06b6d4', 0.2)}`,
          },
        };

      case 'minimal':
        return {
          ...baseStyles,
          boxShadow: 'none',
          border: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            borderColor: '#06b6d4',
            '& .property-image': {
              filter: 'brightness(1.1)',
            },
          },
        };

      default:
        return {
          ...baseStyles,
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.15)}`,
            '& .property-image': {
              transform: 'scale(1.05)',
            },
          },
        };
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleImageNavigation = (direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
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

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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
    }
  };

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: animationDelay,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: animationDelay + 0.2,
        duration: 0.3,
      },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card sx={getCardStyles()}>
        <Link
          href={`/site/${config.tenantId}/property/${property.id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {/* Image Section with 3D Transform */}
          <Box
            sx={{
              position: 'relative',
              paddingTop: viewMode === 'list' ? 0 : '66.67%',
              height: viewMode === 'list' ? 200 : 'auto',
              overflow: 'hidden',
              transformStyle: 'preserve-3d',
              perspective: '1000px',
            }}
          >
            {/* Main Image */}
            <Box
              className="property-image"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered ? 'rotateY(5deg)' : 'rotateY(0)',
              }}
            >
              <LazyImage
                src={images[currentImageIndex]?.url || mainImage?.url || '/placeholder.jpg'}
                alt={property.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              
              {/* Gradient Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  opacity: isHovered ? 0.9 : 0.6,
                  transition: 'opacity 0.3s',
                }}
              />
            </Box>

            {/* Image Navigation */}
            {hasMultipleImages && isHovered && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <IconButton
                    onClick={(e) => handleImageNavigation('prev', e)}
                    sx={{
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: alpha(theme.palette.common.black, 0.5),
                      color: 'white',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.common.black, 0.7),
                      },
                    }}
                  >
                    <ArrowForward sx={{ transform: 'rotate(180deg)' }} />
                  </IconButton>
                  <IconButton
                    onClick={(e) => handleImageNavigation('next', e)}
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: alpha(theme.palette.common.black, 0.5),
                      color: 'white',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.common.black, 0.7),
                      },
                    }}
                  >
                    <ArrowForward />
                  </IconButton>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Top Badges */}
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                right: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Stack direction="row" spacing={1}>
                {property.featured && (
                  <Chip
                    label="Destaque"
                    size="small"
                    icon={<Star sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: alpha(theme.palette.warning.main, 0.9),
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                )}
                {discountPercentage > 0 && (
                  <Chip
                    label={`-${discountPercentage}%`}
                    size="small"
                    sx={{
                      bgcolor: alpha(theme.palette.error.main, 0.9),
                      color: 'white',
                      fontWeight: 700,
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                )}
                {property.status === 'available' && (
                  <Chip
                    label="Disponível"
                    size="small"
                    icon={<CheckCircle sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.9),
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                )}
              </Stack>

              {/* Action Buttons */}
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  onClick={handleFavoriteToggle}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: 'blur(8px)',
                    '&:hover': {
                      bgcolor: theme.palette.background.paper,
                    },
                  }}
                >
                  {isFavorited ? (
                    <Favorite sx={{ color: theme.palette.error.main }} />
                  ) : (
                    <FavoriteBorder />
                  )}
                </IconButton>
                <IconButton
                  onClick={handleShare}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.9),
                    backdropFilter: 'blur(8px)',
                    '&:hover': {
                      bgcolor: theme.palette.background.paper,
                    },
                  }}
                >
                  <Share />
                </IconButton>
              </Stack>
            </Box>

            {/* Media Indicators */}
            {(hasMultipleImages || hasVideo || hasVirtualTour) && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  display: 'flex',
                  gap: 1,
                }}
              >
                {hasMultipleImages && (
                  <Chip
                    label={`${images.length} fotos`}
                    size="small"
                    icon={<PhotoCamera sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: alpha(theme.palette.common.black, 0.7),
                      color: 'white',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                )}
                {hasVideo && (
                  <Chip
                    label="Vídeo"
                    size="small"
                    icon={<Videocam sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: alpha(theme.palette.common.black, 0.7),
                      color: 'white',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                )}
                {hasVirtualTour && (
                  <Chip
                    label="Tour 360°"
                    size="small"
                    icon={<ThreeSixty sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: alpha(theme.palette.common.black, 0.7),
                      color: 'white',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                )}
              </Box>
            )}

            {/* Price Badge */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                bgcolor: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(12px)',
                borderRadius: 2,
                px: 2,
                py: 1,
                boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.2)}`,
              }}
            >
              <Stack spacing={0.5}>
                {property.pricing.originalPrice && property.pricing.originalPrice > property.pricing.basePrice && (
                  <Typography
                    variant="caption"
                    sx={{
                      textDecoration: 'line-through',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {formatPrice(property.pricing.originalPrice)}
                  </Typography>
                )}
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#06b6d4',
                  }}
                >
                  {formatPrice(property.pricing.basePrice)}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary, ml: 0.5 }}
                  >
                    /noite
                  </Typography>
                </Typography>
              </Stack>
            </Box>
          </Box>

          {/* Content Section */}
          <CardContent>
            <motion.div variants={contentVariants}>
              {/* Property Name and Rating */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {property.name}
                </Typography>
                {property.rating && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Rating
                      value={property.rating}
                      readOnly
                      size="small"
                      precision={0.1}
                      sx={{ fontSize: '1rem' }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      ({property.reviewCount || 0})
                    </Typography>
                  </Stack>
                )}
              </Stack>

              {/* Location */}
              <Stack direction="row" alignItems="center" spacing={0.5} mb={2}>
                <LocationOn sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                <Typography variant="body2" color="text.secondary">
                  {property.location.address}, {property.location.city}
                </Typography>
              </Stack>

              {/* Property Specs */}
              <Stack direction="row" spacing={2} mb={2}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <People sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  <Typography variant="body2">{property.maxGuests}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Bed sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  <Typography variant="body2">{property.bedrooms}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Bathtub sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  <Typography variant="body2">{property.bathrooms}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Square sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  <Typography variant="body2">{property.area}m²</Typography>
                </Stack>
              </Stack>

              {/* Enhanced Amenities Display */}
              <Box mb={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {property.amenities
                    .slice(0, showAllAmenities ? undefined : 3)
                    .map((amenity) => {
                      const amenityConfig = amenityIcons[amenity];
                      return (
                        <Chip
                          key={amenity}
                          label={amenity}
                          size="small"
                          icon={amenityConfig?.icon}
                          sx={{
                            bgcolor: alpha(amenityConfig?.color || '#06b6d4', 0.1),
                            color: amenityConfig?.color || '#06b6d4',
                            fontWeight: 500,
                            '& .MuiChip-icon': {
                              color: amenityConfig?.color || '#06b6d4',
                            },
                          }}
                        />
                      );
                    })}
                  {property.amenities.length > 3 && !showAllAmenities && (
                    <Chip
                      label={`+${property.amenities.length - 3}`}
                      size="small"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAllAmenities(true);
                      }}
                      sx={{
                        bgcolor: alpha(theme.palette.text.secondary, 0.1),
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.text.secondary, 0.2),
                        },
                      }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Description Preview */}
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
                  lineHeight: 1.5,
                }}
              >
                {property.description}
              </Typography>

              {/* Action Buttons */}
              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#06b6d4',
                    color: '#06b6d4',
                    '&:hover': {
                      borderColor: '#06b6d4',
                      bgcolor: alpha('#06b6d4', 0.04),
                    },
                  }}
                >
                  Ver Detalhes
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<WhatsApp />}
                  onClick={handleWhatsApp}
                  sx={{
                    bgcolor: '#25D366',
                    '&:hover': {
                      bgcolor: '#128C7E',
                    },
                  }}
                >
                  WhatsApp
                </Button>
              </Stack>

              {/* Availability Indicator */}
              {property.nextAvailable && (
                <Stack direction="row" alignItems="center" spacing={1} mt={2}>
                  <Schedule sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                  <Typography variant="caption" color="text.secondary">
                    Próxima disponibilidade: {new Date(property.nextAvailable).toLocaleDateString('pt-BR')}
                  </Typography>
                </Stack>
              )}
            </motion.div>
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}