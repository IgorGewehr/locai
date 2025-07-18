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
  PlayArrow,
  Pause,
  VolumeOff,
  VolumeUp,
  LocationOn,
  TrendingUp,
  Star,
  Home,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax effect
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 1.1]);

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

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
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

  const stats = [
    { label: 'Propriedades', value: propertyCount, icon: <Home /> },
    { label: 'Avaliação', value: '4.9', icon: <Star /> },
    { label: 'Clientes Satisfeitos', value: '500+', icon: <TrendingUp /> },
  ];

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        height: { xs: '100vh', md: '90vh' },
        minHeight: { xs: 600, md: 700 },
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Video/Image Background */}
      <motion.div
        style={{ y, scale }}
        className="hero-background"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '120%',
          zIndex: 0,
        }}
      >
        {config.heroMedia?.type === 'video' && config.heroMedia.url ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            >
              <source src={config.heroMedia.url} type="video/mp4" />
            </video>
            
            {/* Video Controls */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                zIndex: 2,
              }}
            >
              <IconButton
                onClick={toggleVideo}
                sx={{
                  bgcolor: alpha(theme.palette.common.black, 0.5),
                  color: 'white',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.black, 0.7),
                  },
                }}
              >
                {isVideoPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton
                onClick={toggleMute}
                sx={{
                  bgcolor: alpha(theme.palette.common.black, 0.5),
                  color: 'white',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.black, 0.7),
                  },
                }}
              >
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            </Stack>
          </>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: config.heroMedia?.url 
                ? `url(${config.heroMedia.url})`
                : `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.8)',
            }}
          />
        )}

        {/* Overlay Gradient */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `linear-gradient(180deg, 
              ${alpha(theme.palette.common.black, 0.3)} 0%, 
              ${alpha(theme.palette.common.black, 0.5)} 50%,
              ${alpha(theme.palette.common.black, 0.7)} 100%
            )`,
          }}
        />
      </motion.div>

      {/* Content */}
      <motion.div style={{ opacity }}>
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
                  fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
                  fontWeight: 800,
                  color: 'white',
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  mb: 2,
                  lineHeight: 1.1,
                }}
              >
                {config.heroTitle || 'Encontre seu Imóvel dos Sonhos'}
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
                  background: alpha(theme.palette.common.white, 0.95),
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Buscar por localização, tipo de imóvel ou características..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: config.theme.primaryColor, fontSize: 28 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                            boxShadow: 'none',
                            '&:hover': {
                              boxShadow: `0 8px 20px ${alpha(config.theme.primaryColor, 0.3)}`,
                            },
                          }}
                        >
                          Buscar
                        </Button>
                      </InputAdornment>
                    ),
                    sx: {
                      px: 3,
                      py: 2,
                      fontSize: '1.1rem',
                      '& fieldset': { border: 'none' },
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
                        bgcolor: alpha(theme.palette.common.white, 0.1),
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.common.white, 0.2),
                        },
                      }}
                    />
                  ))}
                </Stack>
              )}
            </motion.div>

            {/* Stats */}
            <Grid container spacing={4} sx={{ mt: 2, maxWidth: 600 }}>
              {stats.map((stat, index) => (
                <Grid item xs={4} key={stat.label}>
                  <motion.div
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={statsVariants}
                  >
                    <Stack alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          color: config.theme.accentColor,
                          bgcolor: alpha(theme.palette.common.white, 0.1),
                          borderRadius: 2,
                          p: 1.5,
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        {stat.icon}
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          color: 'white',
                          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: 500,
                        }}
                      >
                        {stat.label}
                      </Typography>
                    </Stack>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      </motion.div>

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
            color: 'white',
            bgcolor: alpha(theme.palette.common.white, 0.1),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
            animation: 'bounce 2s infinite',
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
              bgcolor: alpha(theme.palette.common.white, 0.2),
            },
          }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </motion.div>
    </Box>
  );
}