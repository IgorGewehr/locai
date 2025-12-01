'use client';

import { Box, Typography, Stack, Chip } from '@mui/material';
import {
  SmartToy,
  Schedule,
  Payment,
  TrendingUp,
  CardGiftcard,
} from '@mui/icons-material';
import Image from 'next/image';

interface FeaturesBannerProps {
  freeDays?: number;
}

const features = [
  {
    icon: SmartToy,
    title: 'IA 24/7',
    description: 'Atendimento automatizado inteligente',
  },
  {
    icon: Payment,
    title: 'Automação',
    description: 'Cobranças e pagamentos automáticos',
  },
  {
    icon: Schedule,
    title: 'Agendamentos',
    description: 'Visitas organizadas automaticamente',
  },
  {
    icon: TrendingUp,
    title: 'Analytics',
    description: 'Relatórios em tempo real',
  },
];

export default function FeaturesBanner({ freeDays }: FeaturesBannerProps) {
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        maxHeight: '80vh',
        height: '100%',
        width: '100%',
        minHeight: { xs: 'auto', lg: '80vh' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { xs: 4, md: 6 },
        py: { xs: 6, md: 8 },
        borderRight: '1px solid rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: { xs: 380, lg: '100%' }, mx: 'auto' }}>
        {/* Logo and Brand */}
        <Box sx={{ mb: 6 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                mr: 3,
              }}
            >
              <Image
                src="/logo.jpg"
                alt="AlugaZap"
                fill
                style={{
                  objectFit: 'cover',
                }}
                priority
              />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  lineHeight: 1.2,
                }}
              >
                AlugaZap
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Imobiliária Digital
              </Typography>
            </Box>
          </Box>

          {/* Free Days Offer */}
          {freeDays && freeDays > 0 && (
            <Box
              sx={{
                p: 3,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 2,
                mb: 4,
                textAlign: 'center',
              }}
            >
              <Chip
                icon={<CardGiftcard sx={{ fontSize: '0.875rem' }} />}
                label={`${freeDays} dias grátis`}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  mb: 1,
                }}
              />
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Teste todas as funcionalidades
              </Typography>
            </Box>
          )}
        </Box>

        {/* Features List - Minimal */}
        <Stack spacing={3} sx={{ mb: 6 }}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconComponent sx={{ color: '#6366f1', fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      mb: 0.5,
                      lineHeight: 1.3,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>

        {/* Bottom CTA - Minimal */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.8125rem',
              mb: 3,
              lineHeight: 1.5,
            }}
          >
            Junte-se a centenas de imobiliárias<br/>
            que automatizaram seus negócios
          </Typography>

          {/* Login Link */}
          <Typography
            component="a"
            href="/login"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.8125rem',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: '#ffffff',
              },
            }}
          >
            Já tem uma conta? Fazer login →
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}