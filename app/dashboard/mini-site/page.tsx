'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  useTheme,
} from '@mui/material';
import {
  Language,
  Palette,
  Settings,
  TrendingUp,
} from '@mui/icons-material';
import MiniSiteConfigPanel from '@/components/organisms/marketing/MiniSiteConfigPanel';

const featureCards = [
  {
    icon: <Language sx={{ fontSize: 40 }} />,
    title: 'Site Público',
    description: 'Sua própria página web para mostrar propriedades aos clientes',
  },
  {
    icon: <Palette sx={{ fontSize: 40 }} />,
    title: 'Personalização',
    description: 'Customize cores, textos e informações da sua marca',
  },
  {
    icon: <Settings sx={{ fontSize: 40 }} />,
    title: 'Fácil Gestão',
    description: 'Configure tudo em poucos cliques e mantenha sempre atualizado',
  },
  {
    icon: <TrendingUp sx={{ fontSize: 40 }} />,
    title: 'Mais Leads',
    description: 'Atraia mais clientes com uma presença online profissional',
  },
];

export default function MiniSitePage() {
  const theme = useTheme();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      py: { xs: 3, sm: 4 },
    }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Header Section */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: { xs: 4, sm: 5, md: 6 },
          color: 'white',
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: { xs: 2, sm: 3 },
          }}>
            <Box
              sx={{
                width: { xs: 64, sm: 72, md: 80 },
                height: { xs: 64, sm: 72, md: 80 },
                borderRadius: { xs: '16px', sm: '18px', md: '20px' },
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(6, 182, 212, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Language sx={{ 
                fontSize: { xs: 36, sm: 42, md: 48 }, 
                color: 'white' 
              }} />
            </Box>
          </Box>
          
          <Typography 
            variant="h2" 
            component="h1" 
            fontWeight={700} 
            sx={{ 
              mb: { xs: 1.5, sm: 2 },
              background: 'linear-gradient(135deg, #ffffff, #e2e8f0)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontSize: { xs: '2rem', sm: '2.75rem', md: '3.5rem' },
            }}
          >
            Mini-Site
          </Typography>
          
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              maxWidth: { xs: '100%', sm: 500, md: 600 }, 
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
              px: { xs: 1, sm: 0 },
            }}
          >
            Crie sua presença online profissional e atraia mais clientes com um site personalizado para suas propriedades
          </Typography>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 4, sm: 5, md: 6 } }}>
          {featureCards.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: { xs: '12px', sm: '16px' },
                  textAlign: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: { xs: 'none', sm: 'translateY(-8px)' },
                    boxShadow: '0 20px 60px rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  },
                }}
              >
                <Box sx={{ 
                  color: '#06b6d4', 
                  mb: { xs: 1.5, sm: 2 },
                  display: 'flex',
                  justifyContent: 'center',
                  '& svg': {
                    fontSize: { xs: 32, sm: 36, md: 40 },
                  },
                }}>
                  {feature.icon}
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  sx={{ 
                    color: 'white', 
                    mb: { xs: 0.75, sm: 1 },
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.6,
                    fontSize: { xs: '0.875rem', sm: '0.875rem', md: '1rem' },
                  }}
                >
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Configuration Panel */}
        <Box sx={{ 
          position: 'relative',
          px: { xs: 0, sm: 0 },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: { xs: -10, sm: -15, md: -20 },
            left: { xs: -10, sm: -15, md: -20 },
            right: { xs: -10, sm: -15, md: -20 },
            bottom: { xs: -10, sm: -15, md: -20 },
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1))',
            borderRadius: { xs: '16px', sm: '20px', md: '24px' },
            zIndex: -1,
          }
        }}>
          <MiniSiteConfigPanel />
        </Box>
      </Container>
    </Box>
  );
}