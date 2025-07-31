'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  IconButton,
  Chip,
  Fade,
  Grid,
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  LocationOn,
  Home,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { MiniSiteConfig } from '@/lib/types/mini-site';

interface HeroSectionProps {
  config: MiniSiteConfig;
  onSearch: (term: string) => void;
  propertyCount: number;
  featuredLocations?: string[];
}

export default function HeroSection({ 
  config, 
  onSearch, 
  propertyCount,
  featuredLocations = []
}: HeroSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);


  // Auto-scroll to content
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 100,
      behavior: 'smooth'
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };


  // Stats animation
  const statsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: "easeOut"
      }
    })
  };

  const stats = propertyCount > 0 ? [
    { label: 'Propriedades Disponíveis', value: propertyCount, icon: <Home /> },
  ] : [];

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        height: { xs: '60vh', md: '50vh' },
        minHeight: { xs: 400, md: 450 },
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      }}
    >
      {/* Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            opacity: 0.1,
          }}
        />

        {/* Overlay Gradient */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(180deg, 
              rgba(0, 0, 0, 0.3) 0%, 
              rgba(0, 0, 0, 0.5) 50%,
              rgba(0, 0, 0, 0.7) 100%
            )`,
          }}
        />
      </Box>

      {/* Content */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={4} alignItems="center" textAlign="center">
            {/* Animated Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 800,
                  color: '#ffffff',
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  mb: 2,
                  lineHeight: 1.2,
                }}
              >
                {config.heroTitle || 'Encontre seu Imóvel Ideal'}
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: '1.1rem', md: '1.5rem' },
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.9)',
                  maxWidth: 800,
                  mx: 'auto',
                  mb: 4,
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                {config.heroSubtitle || config.seo.description}
              </Typography>
            </motion.div>

            {/* Enhanced Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ width: '100%', maxWidth: 700 }}
            >
              <Box
                component="form"
                onSubmit={handleSearch}
                sx={{
                  position: 'relative',
                  backdropFilter: 'blur(20px)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 16px 50px rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <TextField
                  fullWidth
                  placeholder={isMobile ? "Buscar propriedades..." : "Buscar por localização, tipo de imóvel ou características..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#8b5cf6', fontSize: { xs: 24, md: 28 } }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          type="submit"
                          variant="contained"
                          size={isMobile ? 'medium' : 'large'}
                          sx={{
                            borderRadius: '16px',
                            px: { xs: 2, md: 4 },
                            py: { xs: 1, md: 1.5 },
                            fontSize: { xs: '0.875rem', md: '1rem' },
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              boxShadow: '0 12px 32px rgba(139, 92, 246, 0.5)',
                              transform: 'translateY(-1px)',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {isMobile ? 'Buscar' : 'Buscar'}
                        </Button>
                      </InputAdornment>
                    ),
                    sx: {
                      px: { xs: 2, md: 3 },
                      py: { xs: 1.5, md: 2 },
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      color: '#ffffff',
                      '& fieldset': { border: 'none' },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        opacity: 1,
                        fontSize: { xs: '0.9rem', md: '1.1rem' },
                      },
                    }
                  }}
                />
              </Box>

              {/* Popular Searches */}
              {featuredLocations.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    mt: 2,
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }}
                  >
                    Populares:
                  </Typography>
                  {featuredLocations.slice(0, 4).map((location) => (
                    <Chip
                      key={location}
                      label={location}
                      icon={<LocationOn sx={{ fontSize: 16 }} />}
                      onClick={() => {
                        setSearchTerm(location);
                        onSearch(location);
                      }}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.15)',
                          transform: 'scale(1.05)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </Stack>
              )}
            </motion.div>

            {/* Stats - Only show if there are properties */}
            {stats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Box sx={{ mt: 4 }}>
                  <Chip
                    icon={<Home />}
                    label={`${propertyCount} Propriedades Disponíveis`}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 600,
                      py: 3,
                      px: 4,
                      borderRadius: '16px',
                      '& .MuiChip-icon': {
                        color: '#8b5cf6',
                        fontSize: 24,
                      },
                    }}
                  />
                </Box>
              </motion.div>
            )}
          </Stack>
        </Container>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
        }}
      >
        <IconButton
          onClick={scrollToContent}
          sx={{
            color: '#ffffff',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            width: 56,
            height: 56,
            animation: 'bounce 2s infinite',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            '@keyframes bounce': {
              '0%, 20%, 50%, 80%, 100%': {
                transform: 'translateY(0)',
              },
              '40%': {
                transform: 'translateY(-10px)',
              },
              '60%': {
                transform: 'translateY(-5px)',
              },
            },
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.12)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </motion.div>
    </Box>
  );
}