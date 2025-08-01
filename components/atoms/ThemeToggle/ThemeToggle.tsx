'use client';

import React from 'react';
import { IconButton, Tooltip, Skeleton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useAppTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme, isHydrated } = useAppTheme();

  // Show skeleton during hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <Skeleton 
        variant="circular" 
        width={40} 
        height={40}
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.1)',
        }}
      />
    );
  }

  return (
    <Tooltip title={`Mudar para tema ${mode === 'dark' ? 'claro' : 'escuro'}`}>
      <IconButton
        onClick={toggleTheme}
        color="inherit"
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        }}
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;