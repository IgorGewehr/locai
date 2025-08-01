'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface SimpleThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const SimpleThemeContext = createContext<SimpleThemeContextType | undefined>(undefined);

export const useSimpleTheme = () => {
  const context = useContext(SimpleThemeContext);
  if (!context) {
    throw new Error('useSimpleTheme must be used within a SimpleThemeProvider');
  }
  return context;
};

interface SimpleThemeProviderProps {
  children: ReactNode;
}

export const SimpleThemeProvider: React.FC<SimpleThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Load saved theme preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('theme-mode') as ThemeMode;
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setMode(savedTheme);
        }
      } catch (error) {
        // Silent fail - keep default
      }
    }
  }, []);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    // Save to localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme-mode', newMode);
      } catch (error) {
        // Silent fail
      }
    }
  };

  const value: SimpleThemeContextType = {
    mode,
    toggleTheme,
  };

  return (
    <SimpleThemeContext.Provider value={value}>
      {children}
    </SimpleThemeContext.Provider>
  );
};

export default SimpleThemeProvider;