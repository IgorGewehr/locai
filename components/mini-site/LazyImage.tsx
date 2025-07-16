'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Skeleton, useTheme, alpha } from '@mui/material';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  className?: string;
  sx?: any;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: React.ReactNode;
  aspectRatio?: string;
}

export default function LazyImage({
  src,
  alt,
  width = '100%',
  height = '100%',
  borderRadius = 0,
  objectFit = 'cover',
  className,
  sx,
  onLoad,
  onError,
  placeholder,
  aspectRatio,
}: LazyImageProps) {
  const theme = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    if (onError) {
      onError();
    }
  };

  const containerStyle = {
    width,
    height,
    borderRadius,
    overflow: 'hidden',
    position: 'relative' as const,
    backgroundColor: alpha(theme.palette.grey[200], 0.5),
    ...(aspectRatio && {
      aspectRatio,
      height: 'auto',
    }),
    ...sx,
  };

  const defaultPlaceholder = (
    <Skeleton
      variant="rectangular"
      width="100%"
      height="100%"
      sx={{
        borderRadius,
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        '&::after': {
          animationDuration: '1.5s',
        },
      }}
    />
  );

  const errorPlaceholder = (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: alpha(theme.palette.grey[300], 0.5),
        color: alpha(theme.palette.text.secondary, 0.6),
        fontSize: '0.875rem',
        textAlign: 'center',
        p: 2,
      }}
    >
      Imagem não disponível
    </Box>
  );

  return (
    <Box ref={containerRef} sx={containerStyle} className={className}>
      {/* Show placeholder while not in view or not loaded */}
      {(!isInView || !isLoaded) && !hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        >
          {placeholder || defaultPlaceholder}
        </Box>
      )}

      {/* Show error placeholder if image failed to load */}
      {hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        >
          {errorPlaceholder}
        </Box>
      )}

      {/* Actual image - only load when in view */}
      {isInView && !hasError && (
        <Box
          component="img"
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          sx={{
            width: '100%',
            height: '100%',
            objectFit,
            borderRadius,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            display: 'block',
          }}
        />
      )}

      {/* Loading overlay with fade effect */}
      {isInView && !isLoaded && !hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(0,0,0,0.1) 25%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.1) 75%)',
            backgroundSize: '200px 100%',
            animation: 'shimmer 1.5s infinite',
            zIndex: 2,
          }}
        />
      )}

      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
      `}</style>
    </Box>
  );
}