'use client';

import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  useTheme,
  alpha,
  keyframes
} from '@mui/material';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
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

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  backdrop?: boolean;
  variant?: 'default' | 'modern';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Carregando...',
  backdrop = true,
  variant = 'modern'
}) => {
  const theme = useTheme();

  if (!open) return null;

  const content = variant === 'modern' ? (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: 4,
        position: 'relative',
      }}
    >
      {/* Loading animation */}
      <Box
        sx={{
          position: 'relative',
          width: 80,
          height: 80,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.2,
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.3,
            animation: `${pulse} 2s ease-in-out infinite`,
            animationDelay: '0.2s',
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
          <CircularProgress
            size={40}
            thickness={4}
            sx={{
              color: 'white',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round'
              }
            }}
          />
        </Box>
      </Box>

      {/* Message with shimmer effect */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: 2,
          px: 4,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            textAlign: 'center',
            color: 'white',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {message}
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
              0.2
            )} 50%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: `${shimmer} 2s linear infinite`,
          }}
        />
      </Box>
    </Box>
  ) : (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        bgcolor: backdrop ? 'transparent' : alpha(theme.palette.background.paper, 0.95),
        borderRadius: backdrop ? 0 : 2,
        minWidth: backdrop ? 'auto' : 200
      }}
    >
      <CircularProgress
        size={40}
        thickness={4}
        sx={{
          color: theme.palette.primary.main,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round'
          }
        }}
      />
      <Typography
        variant="body2"
        color="textSecondary"
        sx={{
          fontWeight: 500,
          textAlign: 'center',
          color: backdrop ? theme.palette.common.white : theme.palette.text.secondary
        }}
      >
        {message}
      </Typography>
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop
        open={open}
        sx={{
          color: '#fff',
          zIndex: theme.zIndex.modal + 1,
          backgroundColor: alpha(theme.palette.common.black, 0.85),
          backdropFilter: 'blur(10px)',
        }}
      >
        {content}
      </Backdrop>
    );
  }

  return content;
};

export default LoadingOverlay;