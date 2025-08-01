'use client';

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useSimpleTheme } from '@/contexts/SimpleThemeContext';

export const SimpleThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useSimpleTheme();

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

export default SimpleThemeToggle;