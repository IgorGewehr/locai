'use client';

import { Box, Typography, LinearProgress, useTheme, alpha, keyframes } from '@mui/material';
import { Home, SmartToy, Analytics, CalendarMonth } from '@mui/icons-material';
import { useState, useEffect } from 'react';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  variant?: 'default' | 'minimal' | 'creative';
}

const loadingMessages = [
  'Preparando seu dashboard...',
  'Conectando com Sofia IA...',
  'Carregando suas propriedades...',
  'Sincronizando agenda...',
  'Atualizando métricas...',
  'Quase lá...'
];

const features = [
  { icon: Home, label: 'Propriedades', color: '#667eea' },
  { icon: SmartToy, label: 'Sofia IA', color: '#764ba2' },
  { icon: Analytics, label: 'Analytics', color: '#f093fb' },
  { icon: CalendarMonth, label: 'Agenda', color: '#4facfe' }
];

export default function LoadingScreen({ 
  message, 
  showProgress = true, 
  variant = 'default' 
}: LoadingScreenProps) {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Simulate progress
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 95) {
          return prevProgress;
        }
        const increment = Math.random() * 15;
        return Math.min(prevProgress + increment, 95);
      });
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    // Rotate messages
    const messageTimer = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => {
      clearInterval(messageTimer);
    };
  }, []);

  useEffect(() => {
    // Animate dots
    const dotsTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => {
      clearInterval(dotsTimer);
    };
  }, []);

  if (variant === 'minimal') {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.background.default,
          zIndex: 9999,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              margin: '0 auto 24px',
              borderRadius: '50%',
              border: `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderTopColor: theme.palette.primary.main,
              animation: `${rotate} 1s linear infinite`,
            }}
          />
          <Typography variant="body1" color="text.secondary">
            Carregando{dots}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (variant === 'creative') {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.background.default,
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Background animation */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle at center, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
            animation: `${pulse} 3s ease-in-out infinite`,
          }}
        />

        <Box
          sx={{
            position: 'relative',
            textAlign: 'center',
            animation: `${fadeIn} 0.6s ease-out`,
          }}
        >
          {/* Logo or Brand */}
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4,
            }}
          >
            LocAI
          </Typography>

          {/* Feature icons */}
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              justifyContent: 'center',
              mb: 4,
            }}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Box
                  key={feature.label}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    animation: `${fadeIn} 0.6s ease-out`,
                    animationDelay: `${index * 0.1}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(feature.color, 0.1),
                      border: `1px solid ${alpha(feature.color, 0.2)}`,
                      animation: `${pulse} 2s ease-in-out infinite`,
                      animationDelay: `${index * 0.2}s`,
                    }}
                  >
                    <Icon sx={{ color: feature.color, fontSize: 24 }} />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                    }}
                  >
                    {feature.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Loading message */}
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 3,
              minHeight: 24,
            }}
          >
            {loadingMessages[currentMessageIndex]}
          </Typography>

          {/* Progress */}
          {showProgress && (
            <Box sx={{ width: 300, mx: 'auto' }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  mt: 1,
                  display: 'block',
                }}
              >
                {Math.round(progress)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Default variant
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme.palette.background.default,
        zIndex: 9999,
        background: `
          radial-gradient(ellipse at top left, ${alpha('#667eea', 0.15)} 0%, transparent 50%),
          radial-gradient(ellipse at bottom right, ${alpha('#764ba2', 0.15)} 0%, transparent 50%),
          ${theme.palette.background.default}
        `,
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          maxWidth: 400,
          px: 3,
          animation: `${fadeIn} 0.6s ease-out`,
        }}
      >
        {/* Logo with animation */}
        <Box
          sx={{
            position: 'relative',
            width: 120,
            height: 120,
            margin: '0 auto 32px',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.1,
              animation: `${pulse} 2s ease-in-out infinite`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 10,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.2,
              animation: `${pulse} 2s ease-in-out infinite`,
              animationDelay: '0.1s',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SmartToy sx={{ fontSize: 48, color: 'white' }} />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          LocAI
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            mb: 4,
          }}
        >
          Sistema Inteligente de Gestão Imobiliária
        </Typography>

        {/* Loading message with shimmer effect */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mb: 3,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.primary',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {message || loadingMessages[currentMessageIndex]}
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(90deg, transparent 0%, ${alpha(
                theme.palette.primary.main,
                0.1
              )} 50%, transparent 100%)`,
              backgroundSize: '200% 100%',
              animation: `${shimmer} 2s linear infinite`,
            }}
          />
        </Box>

        {/* Progress bar */}
        {showProgress && (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Carregando recursos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: `0 2px 8px ${alpha('#667eea', 0.4)}`,
                },
              }}
            />
          </Box>
        )}

        {/* Tips */}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            mt: 4,
            display: 'block',
            fontStyle: 'italic',
          }}
        >
          💡 Dica: Use Sofia IA para agendar visitas automaticamente via WhatsApp
        </Typography>
      </Box>
    </Box>
  );
}