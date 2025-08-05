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
  Divider,
  Tooltip,
  Rating,
  Skeleton
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
  Kitchen,
  AcUnit,
  Pets,
  MoreHoriz,
  ArrowForward,
  PhotoCamera,
  Verified
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
  loading?: boolean;
}

// Mapping of amenities to icons with better categorization
const amenityIcons: Record<string, React.ReactNode> = {
  'Wi-Fi': <Wifi />,
  'WiFi': <Wifi />,
  'Internet': <Wifi />,
  'Estacionamento': <LocalParking />,
  'Garagem': <LocalParking />,
  'Piscina': <Pool />,
  'Academia': <FitnessCenter />,
  'Cozinha': <Kitchen />,
  'Cozinha Equipada': <Kitchen />,
  'Ar Condicionado': <AcUnit />,
  'Pet Friendly': <Pets />,
  'Aceita Pets': <Pets />,
};

const PropertyCardSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
  <Card 
    sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: viewMode === 'list' ? 'row' : 'column',
      borderRadius: 3,
      overflow: 'hidden'
    }}
  >
    <Skeleton
      variant="rectangular"
      width={viewMode === 'list' ? 300 : '100%'}
      height={viewMode === 'list' ? 200 : 280}
    />
    <CardContent sx={{ flex: 1, p: 3 }}>
      <Skeleton variant="text" width="80%" height={32} />
      <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Skeleton variant="text" width={80} height={20} />
        <Skeleton variant="text" width={80} height={20} />
        <Skeleton variant="text" width={80} height={20} />
      </Stack>
      <Skeleton variant="text" width="100%" height={60} sx={{ mt: 2 }} />
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
      </Stack>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={120} height={32} />
        <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 2 }} />
      </Box>
    </CardContent>
  </Card>
);

export default function PropertyCardModern({ 
  property, 
  config, 
  onWhatsAppClick, 
  viewMode = 'grid',
  loading = false
}: PropertyCardModernProps) {
  const theme = useTheme();
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (loading) {
    return <PropertyCardSkeleton viewMode={viewMode} />;
  }

  const mainImage = property.media.photos.find(photo => photo.isMain) || property.media.photos[0];
  const images = property.media.photos.sort((a, b) => a.order - b.order);
  const imageUrl = images[currentImageIndex]?.url || mainImage?.url || '/placeholder-property.jpg';

  // Enhanced card styling with modern glassmorphism effect
  const cardStyle = {
    borderRadius: 4,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(config.theme.primaryColor, 0.12)}`,
    boxShadow: `
      0 4px 20px -2px ${alpha(config.theme.primaryColor, 0.08)},
      0 8px 40px -12px ${alpha(config.theme.primaryColor, 0.15)}
    `,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    height: '100%',
    display: 'flex',
    flexDirection: viewMode === 'list' ? 'row' : 'column',
    '&:hover': {
      transform: viewMode === 'grid' ? 'translateY(-12px)' : 'translateX(8px)',
      boxShadow: `
        0 8px 40px -4px ${alpha(config.theme.primaryColor, 0.16)},
        0 16px 60px -12px ${alpha(config.theme.primaryColor, 0.25)}
      `,
      '& .property-image': {
        transform: 'scale(1.08)',
      },
      '& .property-overlay': {
        opacity: 1,
      },
      '& .action-buttons': {
        transform: 'translateY(0)',
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

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/site/${property.tenantId}/property/${property.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: property.name,
          text: property.description,
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred
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

  const getAmenityIcon = (amenity: string) => {
    return amenityIcons[amenity] || <MoreHoriz sx={{ fontSize: 16 }} />;
  };

  // Calculate property rating (demo data - replace with real ratings)
  const rating = 4.2 + Math.random() * 0.8;
  const reviewCount = Math.floor(Math.random() * 200) + 50;

  const imageSection = (
    <Box sx={{ 
      position: 'relative', 
      overflow: 'hidden',
      width: viewMode === 'list' ? 320 : '100%',
      minWidth: viewMode === 'list' ? 320 : 'auto',
      height: viewMode === 'list' ? 220 : 300,
      backgroundColor: theme.palette.grey[50],
    }}>
      <LazyImage
        src={imageUrl}
        alt={property.name}
        height={viewMode === 'list' ? '220px' : '300px'}
        aspectRatio={viewMode === 'list' ? '16/11' : '16/10'}
        className="property-image"
        sx={{
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: imageError ? 'blur(8px)' : 'none',
        }}
        onError={() => setImageError(true)}
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
            gap: 0.8,
            zIndex: 2,
            backgroundColor: alpha('#000', 0.3),
            borderRadius: 3,
            padding: '6px 12px',
            backdropFilter: 'blur(10px)',
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
                  ? '#ffffff' 
                  : alpha('#ffffff', 0.4),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#ffffff',
                  transform: 'scale(1.3)',
                },
              }}
              onMouseEnter={() => setCurrentImageIndex(index)}
            />
          ))}
          {images.length > 5 && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <PhotoCamera sx={{ fontSize: 12, color: 'white', opacity: 0.7 }} />
              <Typography variant="caption" sx={{ color: 'white', ml: 0.5, fontSize: '0.7rem' }}>
                +{images.length - 5}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Action Buttons */}
      <Box
        className="action-buttons"
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          transform: 'translateY(-8px)',
          opacity: 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <IconButton
          size="small"
          sx={{
            backgroundColor: alpha('#ffffff', 0.95),
            backdropFilter: 'blur(10px)',
            color: isFavorited ? '#e91e63' : theme.palette.grey[600],
            width: 36,
            height: 36,
            boxShadow: `0 4px 12px ${alpha('#000', 0.15)}`,
            '&:hover': {
              backgroundColor: '#ffffff',
              transform: 'scale(1.15)',
              color: '#e91e63',
            },
            transition: 'all 0.3s ease',
          }}
          onClick={handleFavoriteToggle}
        >
          {isFavorited ? <Favorite sx={{ fontSize: 18 }} /> : <FavoriteBorder sx={{ fontSize: 18 }} />}
        </IconButton>

        <IconButton
          size="small"
          sx={{
            backgroundColor: alpha('#ffffff', 0.95),
            backdropFilter: 'blur(10px)',
            color: theme.palette.grey[600],
            width: 36,
            height: 36,
            boxShadow: `0 4px 12px ${alpha('#000', 0.15)}`,
            '&:hover': {
              backgroundColor: '#ffffff',
              transform: 'scale(1.15)',
              color: config.theme.primaryColor,
            },
            transition: 'all 0.3s ease',
          }}
          onClick={handleShare}
        >
          <Share sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Status Badges */}
      <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
        {property.featured && (
          <Chip
            icon={<Star sx={{ fontSize: 14 }} />}
            label="Destaque"
            size="small"
            sx={{
              background: `linear-gradient(135deg, #FFD700, #FFA500)`,
              color: '#000',
              fontWeight: 700,
              fontSize: '0.75rem',
              mb: 1,
              boxShadow: `0 4px 12px ${alpha('#FFD700', 0.4)}`,
              '& .MuiChip-label': { px: 1.5 },
              '& .MuiChip-icon': { color: '#000' },
            }}
          />
        )}
        
        {property.id.startsWith('demo-') && (
          <Chip
            label="Demo"
            size="small"
            sx={{
              background: alpha(theme.palette.info.main, 0.9),
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem',
              boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.3)}`,
              '& .MuiChip-label': { px: 1.5 },
            }}
          />
        )}
      </Box>

      {/* Rating Badge */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
      >
        <Chip
          icon={<Star sx={{ fontSize: 12, color: '#FFD700' }} />}
          label={`${rating.toFixed(1)} (${reviewCount})`}
          size="small"
          sx={{
            backgroundColor: alpha('#ffffff', 0.95),
            backdropFilter: 'blur(10px)',
            color: theme.palette.text.primary,
            fontWeight: 600,
            fontSize: '0.75rem',
            boxShadow: `0 4px 12px ${alpha('#000', 0.1)}`,
            '& .MuiChip-label': { px: 1.5 },
          }}
        />
      </Box>

      {/* Hover Overlay */}
      <Box
        className="property-overlay"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, ${alpha(config.theme.primaryColor, 0.15)}, ${alpha(config.theme.accentColor, 0.15)})`,
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
            backgroundColor: alpha('#ffffff', 0.95),
            borderRadius: 2,
            padding: '8px 16px',
            backdropFilter: 'blur(10px)',
            boxShadow: `0 4px 20px ${alpha('#000', 0.15)}`,
          }}
        >
          <Visibility sx={{ fontSize: 18, color: config.theme.primaryColor }} />
          <Typography
            variant="body2"
            sx={{
              color: config.theme.primaryColor,
              fontWeight: 600,
            }}
          >
            Ver Detalhes
          </Typography>
        </Box>
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
      {/* Property Name & Verification */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
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
            flex: 1,
          }}
        >
          {property.name}
        </Typography>
        <Tooltip title="Propriedade Verificada">
          <Verified sx={{ fontSize: 20, color: '#4caf50', mt: 0.5 }} />
        </Tooltip>
      </Box>

      {/* Location & Rating */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <LocationOn sx={{ fontSize: 16, color: config.theme.primaryColor }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
            {property.location.city}, {property.location.state}
          </Typography>
        </Box>
        <Rating 
          value={rating} 
          precision={0.1}
          size="small" 
          readOnly 
          sx={{
            '& .MuiRating-iconFilled': {
              color: '#FFD700',
            },
          }}
        />
      </Box>

      {/* Property Details Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 2,
          p: 2,
          backgroundColor: alpha(config.theme.primaryColor, 0.03),
          borderRadius: 2,
          border: `1px solid ${alpha(config.theme.primaryColor, 0.08)}`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <People sx={{ fontSize: 18, color: config.theme.primaryColor }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: config.theme.textColor }}>
            {property.maxGuests} hóspedes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Bed sx={{ fontSize: 18, color: config.theme.primaryColor }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: config.theme.textColor }}>
            {property.bedrooms} quartos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <Bathtub sx={{ fontSize: 18, color: config.theme.primaryColor }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: config.theme.textColor }}>
            {property.bathrooms} banheiros
          </Typography>
        </Box>
        {property.area && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Square sx={{ fontSize: 18, color: config.theme.primaryColor }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: config.theme.textColor }}>
              {property.area}m²
            </Typography>
          </Box>
        )}
      </Box>

      {/* Description */}
      <Typography 
        variant="body2" 
        sx={{ 
          color: theme.palette.text.secondary,
          display: '-webkit-box',
          WebkitLineClamp: viewMode === 'list' ? 2 : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.6,
        }}
      >
        {property.description}
      </Typography>

      {/* Top Amenities */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: config.theme.textColor }}>
          Principais Comodidades
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {property.amenities.slice(0, viewMode === 'list' ? 5 : 4).map((amenity) => (
            <Chip
              key={amenity}
              icon={getAmenityIcon(amenity)}
              label={amenity}
              size="small"
              variant="outlined"
              sx={{
                backgroundColor: alpha(config.theme.primaryColor, 0.08),
                color: config.theme.primaryColor,
                borderColor: alpha(config.theme.primaryColor, 0.2),
                fontSize: '0.75rem',
                fontWeight: 500,
                '& .MuiChip-icon': {
                  fontSize: 14,
                  color: config.theme.primaryColor,
                },
                '&:hover': {
                  backgroundColor: alpha(config.theme.primaryColor, 0.12),
                  borderColor: config.theme.primaryColor,
                },
                transition: 'all 0.2s ease',
              }}
            />
          ))}
          {property.amenities.length > (viewMode === 'list' ? 5 : 4) && (
            <Chip
              label={`+${property.amenities.length - (viewMode === 'list' ? 5 : 4)}`}
              size="small"
              sx={{
                backgroundColor: alpha(config.theme.accentColor, 0.1),
                color: config.theme.accentColor,
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Pricing and CTA */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ mb: 2.5, borderColor: alpha(config.theme.primaryColor, 0.1) }} />
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
        >
          <Box>
            {config.features.showPricing && (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 800,
                    color: config.theme.primaryColor,
                    background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                  }}
                >
                  {formatPrice(property.pricing.basePrice)}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                  por noite
                </Typography>
              </Box>
            )}
            {property.pricing.minimumStay > 1 && (
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Estadia mínima: {property.pricing.minimumStay} noites
              </Typography>
            )}
          </Box>

          <Button
            startIcon={<WhatsApp sx={{ fontSize: 18 }} />}
            endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
            onClick={handleWhatsApp}
            fullWidth={viewMode === 'list'}
            size="large"
            sx={{
              background: `linear-gradient(135deg, #25D366, #128C7E)`,
              color: 'white',
              borderRadius: 2.5,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontSize: '0.9rem',
              fontWeight: 700,
              minWidth: 140,
              boxShadow: `0 6px 20px ${alpha('#25D366', 0.35)}`,
              '&:hover': {
                background: `linear-gradient(135deg, #128C7E, #075E54)`,
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 25px ${alpha('#25D366', 0.45)}`,
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Reservar Agora
          </Button>
        </Stack>
      </Box>
    </CardContent>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
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