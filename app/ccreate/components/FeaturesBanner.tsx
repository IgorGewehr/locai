'use client';

import { Box, Typography, Stack, Chip } from '@mui/material';
import {
  SmartToy,
  Schedule,
  Payment,
  Notifications,
  TrendingUp,
  Security,
  CardGiftcard,
} from '@mui/icons-material';
import Image from 'next/image';

interface FeaturesBannerProps {
  freeDays?: number;
}

const features = [
  {
    icon: SmartToy,
    title: 'Atendimento IA 24/7',
    description: 'Sofia, sua agente de IA especializada em imóveis, atende clientes automaticamente',
  },
  {
    icon: Payment,
    title: 'Cobranças Automáticas',
    description: 'Gestão completa de pagamentos, lembretes e controle financeiro',
  },
  {
    icon: Schedule,
    title: 'Agendamentos Inteligentes',
    description: 'Visitas e reuniões agendadas automaticamente via WhatsApp',
  },
  {
    icon: Notifications,
    title: 'Notificações em Tempo Real',
    description: 'Acompanhe leads, reservas e mensagens instantaneamente',
  },
  {
    icon: TrendingUp,
    title: 'Analytics Avançado',
    description: 'Relatórios detalhados sobre performance e conversões',
  },
  {
    icon: Security,
    title: 'Seguro e Confiável',
    description: 'Dados protegidos com criptografia e backup automático',
  },
];

export default function FeaturesBanner({ freeDays }: FeaturesBannerProps) {
  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { xs: 3, md: 4 },
        py: { xs: 4, md: 6 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, #10b981 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, #8b5cf6 0%, transparent 50%)
          `,
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Logo and Brand */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
            }}
          >
            <Box
              sx={{
                width: { xs: 80, md: 100 },
                height: { xs: 80, md: 100 },
                borderRadius: 3,
                overflow: 'hidden',
                position: 'relative',
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
              }}
            >
              <Image
                src="/logo.jpg"
                alt="Locai"
                fill
                style={{
                  objectFit: 'cover',
                }}
                priority
              />
            </Box>
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#ffffff',
              mb: 2,
              fontSize: { xs: '2rem', md: '2.5rem' },
              background: 'linear-gradient(45deg, #3b82f6, #10b981)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Locai
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#cbd5e1',
              mb: 1,
              fontWeight: 500,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Plataforma Completa para Imobiliárias
          </Typography>

          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: { xs: '0.9rem', md: '1rem' },
              maxWidth: 400,
              mx: 'auto',
            }}
          >
            Automatize atendimento, vendas e gestão com inteligência artificial
          </Typography>
        </Box>

        {/* Free Days Offer */}
        {freeDays && freeDays > 0 && (
          <Box
            sx={{
              textAlign: 'center',
              mb: 5,
              p: 3,
              background: 'linear-gradient(45deg, #10b981, #059669)',
              borderRadius: 3,
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <Chip
                icon={<CardGiftcard sx={{ fontSize: '1rem' }} />}
                label="OFERTA ESPECIAL"
                size="small"
                sx={{
                  backgroundColor: '#fbbf24',
                  color: '#92400e',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </Box>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: '#ffffff',
                mb: 1,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
              }}
            >
              {freeDays} DIAS GRÁTIS
            </Typography>

            <Typography
              sx={{
                color: '#ffffff',
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                opacity: 0.9,
                fontWeight: 500,
              }}
            >
              Teste todas as funcionalidades sem compromisso
            </Typography>
          </Box>
        )}

        {/* Features List */}
        <Stack spacing={3} sx={{ maxWidth: 500, mx: 'auto' }}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IconComponent sx={{ color: '#ffffff', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: { xs: '0.95rem', md: '1.1rem' },
                      mb: 0.5,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: '#cbd5e1',
                      fontSize: { xs: '0.85rem', md: '0.9rem' },
                      lineHeight: 1.5,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>

        {/* Bottom CTA */}
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: { xs: '0.8rem', md: '0.9rem' },
              fontStyle: 'italic',
              mb: 3,
            }}
          >
            Junte-se a centenas de imobiliárias que já transformaram seus negócios
          </Typography>

          {/* Login Button */}
          <Box>
            <Typography
              component="a"
              href="/login"
              sx={{
                color: '#cbd5e1',
                fontSize: { xs: '0.85rem', md: '0.9rem' },
                textDecoration: 'none',
                opacity: 0.7,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 1,
                  color: '#3b82f6',
                },
              }}
            >
              Já tem uma conta? Faça login
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}