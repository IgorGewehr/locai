'use client';

import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

interface SafeImageProps {
  src?: string;
  alt: string;
  fallbackText?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
  borderRadius?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export default function SafeImage({
  src,
  alt,
  fallbackText = 'Sem Imagem',
  width = '100%',
  height = 'auto',
  style = {},
  className,
  borderRadius = 8,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError,
}: SafeImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);

  // Create local SVG placeholder
  const createLocalPlaceholder = (text: string, w: number = 400, h: number = 300) => {
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
              fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Validate and get safe image URL
  const getSafeImageUrl = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:'))) {
      return url;
    }
    // Create local SVG placeholder
    const w = typeof width === 'number' ? width : 400;
    const h = typeof height === 'number' ? height : 300;
    return createLocalPlaceholder(fallbackText, w, h);
  };

  const handleImageLoad = () => {
    setImageState('loaded');
    onLoad?.();
  };

  const handleImageError = () => {
    if (currentSrc !== getSafeImageUrl()) {
      // Try fallback
      setCurrentSrc(getSafeImageUrl());
      setImageState('loading');
    } else {
      setImageState('error');
    }
    onError?.();
  };

  const safeImageUrl = getSafeImageUrl(currentSrc);

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        backgroundColor: '#f5f5f5',
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      className={className}
    >
      {imageState === 'loading' && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      
      <img
        src={safeImageUrl}
        alt={alt}
        loading={loading}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          opacity: imageState === 'loaded' ? 1 : 0.5,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </Box>
  );
}