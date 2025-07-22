'use client';

import { ReactNode, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { darkTheme } from '@/theme/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // Ensure theme is always defined
  const theme = useMemo(() => {
    try {
      return darkTheme;
    } catch (error) {
      console.error('Error loading theme, using fallback:', error);
      // Fallback theme in case of any issues
      return createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#3b82f6',
          },
          secondary: {
            main: '#64748b',
          },
        },
      });
    }
  }, []);

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}