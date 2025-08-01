'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from '@/theme/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isHydrated: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// Helper function to get initial theme
const getInitialTheme = (): ThemeMode => {
  // Always return dark as default for SSR consistency
  return 'dark';
};

// Helper function to get theme from localStorage (client-side only)
const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  
  try {
    const stored = localStorage.getItem('theme-mode');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  } catch {
    return 'dark';
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect - runs only once on client
  useEffect(() => {
    const storedTheme = getStoredTheme();
    setMode(storedTheme);
    setIsHydrated(true);
  }, []);

  // Save theme preference to localStorage
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme-mode', mode);
      } catch (error) {
        // Silent fail if localStorage is not available
      }
    }
  }, [mode, isHydrated]);

  const toggleTheme = useCallback(() => {
    setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
  }, []);

  const currentTheme = mode === 'dark' ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    mode,
    toggleTheme,
    setTheme,
    isHydrated,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={currentTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;