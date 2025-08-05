'use client';

import { Box, useTheme, keyframes } from '@mui/material';
import { useState, useEffect } from 'react';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const breathe = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
`;

const ripple = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: scale(3.5);
    opacity: 0;
  }
`;

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const floatUp = keyframes`
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(0);
    opacity: 0;
  }
`;

const morphShape = keyframes`
  0%, 100% {
    border-radius: 50% 50% 50% 50%;
  }
  25% {
    border-radius: 60% 40% 30% 70%;
  }
  50% {
    border-radius: 30% 60% 70% 40%;
  }
  75% {
    border-radius: 40% 30% 60% 50%;
  }
`;

const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

interface LoadingScreenProps {
  variant?: 'default' | 'minimal' | 'creative';
}

export default function LoadingScreen({ variant = 'default' }: LoadingScreenProps) {
  const theme = useTheme();
  const [particles, setParticles] = useState<Array<{ id: number; delay: number }>>([]);

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      delay: i * 0.8,
    }));
    setParticles(newParticles);
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
          background: `linear-gradient(135deg, 
            ${theme.palette.mode === 'dark' ? '#0a0a0a' : '#fafafa'} 0%, 
            ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#f0f0f0'} 100%)`,
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Central loading element */}
        <Box
          sx={{
            position: 'relative',
            width: 80,
            height: 80,
            animation: `${fadeIn} 1s ease-out`,
          }}
        >
          {/* Main pulsing circle */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `linear-gradient(135deg, 
                ${theme.palette.primary.main}40, 
                ${theme.palette.secondary.main}40)`,
              animation: `${breathe} 2s ease-in-out infinite, ${morphShape} 8s ease-in-out infinite`,
            }}
          />
          
          {/* Ripple effects */}
          {[...Array(3)].map((_, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                border: `1px solid ${theme.palette.primary.main}20`,
                animation: `${ripple} 3s ease-out infinite`,
                animationDelay: `${i * 1}s`,
              }}
            />
          ))}
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
          background: `linear-gradient(135deg, 
            ${theme.palette.mode === 'dark' ? '#0a0a0a' : '#fafafa'} 0%, 
            ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#f0f0f0'} 100%)`,
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {/* Floating particles */}
        {particles.map((particle) => (
          <Box
            key={particle.id}
            sx={{
              position: 'absolute',
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              borderRadius: '50%',
              background: theme.palette.primary.main,
              left: `${Math.random() * 100}%`,
              top: '100%',
              animation: `${floatUp} ${4 + Math.random() * 2}s ease-out infinite`,
              animationDelay: `${particle.delay}s`,
              opacity: 0.6,
            }}
          />
        ))}

        {/* Central morphing shape */}
        <Box
          sx={{
            position: 'relative',
            width: 120,
            height: 120,
            animation: `${fadeIn} 1.2s ease-out`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(45deg, 
                ${theme.palette.primary.main}, 
                ${theme.palette.secondary.main}, 
                ${theme.palette.primary.main})`,
              backgroundSize: '300% 300%',
              animation: `${morphShape} 6s ease-in-out infinite, ${gradientShift} 3s ease-in-out infinite`,
              opacity: 0.8,
              filter: 'blur(1px)',
            }}
          />
          
          {/* Inner glow */}
          <Box
            sx={{
              position: 'absolute',
              inset: 20,
              borderRadius: '50%',
              background: `radial-gradient(circle, 
                ${theme.palette.background.paper}80 30%, 
                transparent 70%)`,
              animation: `${breathe} 3s ease-in-out infinite`,
            }}
          />
        </Box>
      </Box>
    );
  }

  // Default modern variant
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
        background: `linear-gradient(135deg, 
          ${theme.palette.mode === 'dark' ? '#0a0a0a' : '#fafafa'} 0%, 
          ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#f0f0f0'} 100%)`,
        zIndex: 9999,
        overflow: 'hidden',
        willChange: 'opacity',
        // Melhorar performance das animações
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      {/* Background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          background: `
            radial-gradient(circle at 25% 25%, ${theme.palette.primary.main} 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, ${theme.palette.secondary.main} 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, ${theme.palette.primary.main} 0%, transparent 30%)
          `,
          animation: `${gradientShift} 8s ease-in-out infinite`,
        }}
      />

      {/* Main loading container */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: `${fadeIn} 1.2s cubic-bezier(0.4, 0, 0.2, 1)`,
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      >
        {/* Outer rotating ring */}
        <Box
          sx={{
            position: 'absolute',
            width: 100,
            height: 100,
            border: `2px solid ${theme.palette.primary.main}20`,
            borderTopColor: `${theme.palette.primary.main}70`,
            borderRightColor: `${theme.palette.secondary.main}50`,
            borderRadius: '50%',
            animation: `${spin} 2s linear infinite, ${breathe} 4s ease-in-out infinite`,
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Inner morphing shape */}
        <Box
          sx={{
            width: 60,
            height: 60,
            background: `linear-gradient(135deg, 
              ${theme.palette.primary.main}90, 
              ${theme.palette.secondary.main}90)`,
            animation: `${morphShape} 8s ease-in-out infinite, ${breathe} 3s ease-in-out infinite`,
            filter: 'blur(0.3px)',
            boxShadow: `0 0 30px ${theme.palette.primary.main}30`,
            willChange: 'transform, border-radius',
            transform: 'translateZ(0)',
          }}
        />

        {/* Central dot */}
        <Box
          sx={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: theme.palette.background.paper,
            animation: `${breathe} 2s ease-in-out infinite`,
            boxShadow: `
              0 0 20px ${theme.palette.primary.main}60,
              0 0 40px ${theme.palette.primary.main}30,
              inset 0 0 10px ${theme.palette.primary.main}20
            `,
            border: `1px solid ${theme.palette.primary.main}30`,
          }}
        />

        {/* Ambient particles */}
        {[...Array(6)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: Math.random() * 2 + 2,
              height: Math.random() * 2 + 2,
              borderRadius: '50%',
              background: i % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main,
              opacity: 0.6,
              left: `${50 + Math.cos((i * 2 * Math.PI) / 6) * 45}px`,
              top: `${50 + Math.sin((i * 2 * Math.PI) / 6) * 45}px`,
              animation: `
                ${breathe} ${2 + Math.random()}s ease-in-out infinite,
                ${spin} ${8 + Math.random() * 4}s linear infinite
              `,
              animationDelay: `${i * 0.4}s`,
              boxShadow: `0 0 10px currentColor`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}