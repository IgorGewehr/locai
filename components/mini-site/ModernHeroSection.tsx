'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  InputAdornment,
  alpha,
  useTheme,
  useMediaQuery,
  Fab,
} from '@mui/material';
import {
  Search,
  FilterList,
  TrendingUp,
  Star,
  Speed,
  Verified,
  KeyboardArrowDown,
  LocationOn,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { MiniSiteConfig } from '@/lib/types/mini-site';

interface ModernHeroSectionProps {
  config: MiniSiteConfig;
  stats: {
    totalProperties: number;
    averagePrice: number;
    mostPopularAmenity: string;
    satisfactionRate: number;
  };
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export default function ModernHeroSection({
  config,
  stats,
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
}: ModernHeroSectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: '60vh', md: '75vh' },
        background: `linear-gradient(135deg, 
          ${config.theme.primaryColor}10 0%,
          ${config.theme.accentColor}15 50%,
          ${config.theme.primaryColor}08 100%
        )`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 8, md: 12 },
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: { xs: 200, md: 400 },
          height: { xs: 200, md: 400 },
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(config.theme.primaryColor, 0.1)}, ${alpha(config.theme.accentColor, 0.05)})`,
          zIndex: 0,
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-20px) rotate(180deg)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '-10%',
          width: { xs: 150, md: 300 },
          height: { xs: 150, md: 300 },
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(config.theme.accentColor, 0.08)}, ${alpha(config.theme.primaryColor, 0.04)})`,
          zIndex: 0,
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={7}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <Stack spacing={3}>
                {/* Badge */}
                <Box>
                  <Chip
                    icon={<Verified />}
                    label="Propriedades Verificadas"
                    color="primary"
                    sx={{
                      background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                      color: 'white',
                      fontWeight: 600,
                      px: 2,
                      py: 1,
                      fontSize: '0.9rem',
                      boxShadow: `0 4px 20px ${alpha(config.theme.primaryColor, 0.3)}`,
                    }}
                  />
                </Box>

                {/* Main Title */}
                <Typography
                  variant={isMobile ? 'h3' : 'h2'}
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.1,
                    background: `linear-gradient(135deg, ${config.theme.primaryColor}, ${config.theme.accentColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    mb: 2,
                  }}
                >
                  Encontre o Imóvel Perfeito
                </Typography>

                {/* Subtitle */}
                <Typography
                  variant="h5"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    maxWidth: 500,
                  }}
                >
                  {config.contactInfo.businessDescription || 'Descubra propriedades únicas com a melhor localização e preços justos'}
                </Typography>

                {/* Search Bar */}
                <Box sx={{ mt: 4 }}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        fullWidth
                        placeholder="Buscar por localização, tipo de propriedade..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search sx={{ color: config.theme.primaryColor }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            border: `2px solid transparent`,
                            fontSize: '1.1rem',
                            py: 0.5,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: `2px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                            },
                            '&.Mui-focused': {
                              backgroundColor: 'white',
                              border: `2px solid ${config.theme.primaryColor}`,
                              boxShadow: `0 8px 32px ${alpha(config.theme.primaryColor, 0.2)}`,
                            },
                          },
                        }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<FilterList />}
                        onClick={onToggleFilters}
                        sx={{
                          borderColor: alpha(config.theme.primaryColor, 0.3),
                          color: config.theme.primaryColor,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 3,
                          px: 3,
                          py: 1.5,
                          minWidth: 140,
                          fontWeight: 600,
                          border: `2px solid ${alpha(config.theme.primaryColor, 0.2)}`,
                          '&:hover': {
                            backgroundColor: alpha(config.theme.primaryColor, 0.08),
                            borderColor: config.theme.primaryColor,
                          },
                        }}
                      >
                        {showFilters ? 'Fechar' : 'Filtros'}
                      </Button>
                    </Stack>
                  </motion.div>
                </Box>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={3} 
                    sx={{ mt: 4 }}
                  >
                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: config.theme.primaryColor }}>
                        {stats.totalProperties}+
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Propriedades
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: config.theme.accentColor }}>
                        {stats.satisfactionRate}★
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Avaliação
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: '#22c55e' }}>
                        24h
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Resposta
                      </Typography>
                    </Box>
                  </Stack>
                </motion.div>
              </Stack>
            </motion.div>
          </Grid>

          {/* Right Side - Feature Cards */}
          <Grid item xs={12} md={5}>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Stack spacing={3}>
                {[
                  {
                    icon: <TrendingUp sx={{ fontSize: 28, color: config.theme.primaryColor }} />,
                    title: 'Melhor Preço',
                    description: 'Preços competitivos e transparentes',
                  },
                  {
                    icon: <Speed sx={{ fontSize: 28, color: '#22c55e' }} />,
                    title: 'Reserva Rápida',
                    description: 'Processo simplificado em minutos',
                  },
                  {
                    icon: <Star sx={{ fontSize: 28, color: '#f59e0b' }} />,
                    title: 'Qualidade Garantida',
                    description: 'Propriedades verificadas e aprovadas',
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  >
                    <Card
                      sx={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha('#000', 0.05)}`,
                        borderRadius: 3,
                        p: 2,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.shadows[8],
                          background: 'rgba(255, 255, 255, 0.95)',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            background: `${alpha(config.theme.primaryColor, 0.1)}`,
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {feature.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  </motion.div>
                ))}
              </Stack>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Scroll Down Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Fab
          size="small"
          onClick={() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' })}
          sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            color: config.theme.primaryColor,
            '&:hover': {
              background: 'white',
              transform: 'scale(1.1)',
            },
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
              '40%, 43%': { transform: 'translate3d(0,-8px,0)' },
              '70%': { transform: 'translate3d(0,-4px,0)' },
              '90%': { transform: 'translate3d(0,-2px,0)' },
            },
          }}
        >
          <KeyboardArrowDown />
        </Fab>
      </motion.div>
    </Box>
  );
}