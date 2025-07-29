'use client';

import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  useTheme,
  alpha
} from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  backdrop?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Carregando...',
  backdrop = true
}) => {
  const theme = useTheme();

  if (!open) return null;

  const content = (
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
          backgroundColor: alpha(theme.palette.common.black, 0.7)
        }}
      >
        {content}
      </Backdrop>
    );
  }

  return content;
};

export default LoadingOverlay;