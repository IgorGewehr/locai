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
      py: 4,
    }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6,
          color: 'white',
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mb: 3,
          }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(6, 182, 212, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Language sx={{ fontSize: 48, color: 'white' }} />
            </Box>
          </Box>
          
          <Typography 
            variant="h2" 
            component="h1" 
            fontWeight={700} 
            sx={{ 
              mb: 2,
              background: 'linear-gradient(135deg, #ffffff, #e2e8f0)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
            }}
          >
            Mini-Site
          </Typography>
          
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              maxWidth: 600, 
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
            }}
          >
            Crie sua presença online profissional e atraia mais clientes com um site personalizado para suas propriedades
          </Typography>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {featureCards.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                sx={{
                  p: 3,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  textAlign: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 60px rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  },
                }}
              >
                <Box sx={{ 
                  color: '#06b6d4', 
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  {feature.icon}
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  sx={{ 
                    color: 'white', 
                    mb: 1,
                    fontSize: '1.1rem',
                  }}
                >
                  {feature.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.6,
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
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -20,
            left: -20,
            right: -20,
            bottom: -20,
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1))',
            borderRadius: '24px',
            zIndex: -1,
          }
        }}>
          <MiniSiteConfigPanel />
        </Box>
      </Container>
    </Box>
  );
}