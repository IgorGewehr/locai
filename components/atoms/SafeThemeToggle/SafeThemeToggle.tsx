'use client';

import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import ClientOnly from '@/components/utilities/ClientOnly';

export const SafeThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(true); // Always start with dark

  useEffect(() => {
    // Load preference from localStorage after hydration
    const saved = localStorage.getItem('theme-preference');
    if (saved === 'light') {
      setIsDark(false);
      // Apply light theme class to document
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      // Apply dark theme class to document
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    
    // Save to localStorage
    localStorage.setItem('theme-preference', newMode ? 'dark' : 'light');
    
    // Apply theme class to document
    if (newMode) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    
    // Force reload to apply new theme (temporary solution)
    window.location.reload();
  };

  return (
    <ClientOnly>
      <Tooltip title={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}>
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
          {isDark ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
      </Tooltip>
    </ClientOnly>
  );
};

export default SafeThemeToggle;