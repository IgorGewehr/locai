import { createTheme, ThemeOptions } from '@mui/material/styles';
import { ptBR } from '@mui/material/locale';

declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
      success: string;
      warning: string;
      info: string;
    };
    custom: {
      glassEffect: string;
      cardBackground: string;
      sidebarBackground: string;
      headerBackground: string;
      borderColor: string;
      elevation: {
        low: string;
        medium: string;
        high: string;
      };
    };
  }

  interface ThemeOptions {
    status?: {
      danger?: string;
      success?: string;
      warning?: string;
      info?: string;
    };
    custom?: {
      glassEffect?: string;
      cardBackground?: string;
      sidebarBackground?: string;
      headerBackground?: string;
      borderColor?: string;
      elevation?: {
        low?: string;
        medium?: string;
        high?: string;
      };
    };
  }

  interface Palette {
    tertiary: Palette['primary'];
    accent: Palette['primary'];
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
    accent?: PaletteOptions['primary'];
  }
}

// Enterprise-level design system with theme-specific characteristics
const lightSpacing = 10; // More airy spacing for light theme
const darkSpacing = 8;   // Compact spacing for dark theme

// Light Theme Typography - More elegant and airy
const lightTypography = {
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 15, // Slightly larger for better readability
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: {
    fontSize: '2.75rem',
    fontWeight: 300, // Lighter weight for elegance
    lineHeight: 1.15,
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: '2.25rem',
    fontWeight: 400,
    lineHeight: 1.25,
    letterSpacing: '-0.015em',
  },
  h3: {
    fontSize: '1.875rem',
    fontWeight: 500,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: 1.4,
    letterSpacing: '-0.005em',
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: '0em',
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 500,
    lineHeight: 1.55,
    letterSpacing: '0.005em',
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.7, // More line height for readability
    letterSpacing: '0.01em',
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: '0.01em',
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 500,
    fontSize: '0.875rem',
    letterSpacing: '0.015em',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0.025em',
  },
  subtitle1: {
    fontSize: '1rem',
    lineHeight: 1.6,
    fontWeight: 500,
    letterSpacing: '0.005em',
  },
  subtitle2: {
    fontSize: '0.875rem',
    lineHeight: 1.55,
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
};

// Dark Theme Typography - More robust and impactful
const darkTypography = {
  fontFamily: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 600, // Stronger medium weight
  fontWeightBold: 700,   // Bolder for impact
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600, // Stronger for dark backgrounds
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: '-0.01em',
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '-0.005em',
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: '0.00938em',
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.57,
    letterSpacing: '0.00714em',
  },
  button: {
    textTransform: 'none' as const,
    fontWeight: 600, // Stronger for better visibility
    fontSize: '0.875rem',
    letterSpacing: '0.01em',
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.03em',
  },
  subtitle1: {
    fontSize: '1rem',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  subtitle2: {
    fontSize: '0.875rem',
    lineHeight: 1.45,
    fontWeight: 500,
  },
};

const baseTheme: ThemeOptions = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  shape: {
    borderRadius: 12, // Slightly more rounded for modern look
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            '&:hover': {
              opacity: 0.8,
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px', // More generous padding
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          padding: '14px 28px',
          fontSize: '1rem',
          borderRadius: 12,
        },
        sizeSmall: {
          padding: '8px 16px',
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // More rounded for modern look
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
        elevation0: {
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        },
        elevation2: {
          boxShadow: '0 4px 8px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
        },
        elevation3: {
          boxShadow: '0 8px 12px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease-in-out',
            '& input': {
              padding: '14px 16px', // More generous padding
            },
            '& textarea': {
              padding: '14px 16px',
            },
            '&.Mui-focused': {
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 32, // Slightly taller
          fontSize: '0.8125rem',
          fontWeight: 500,
          padding: '0 4px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            opacity: 0.8,
          },
        },
        sizeSmall: {
          height: 26,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginBottom: 4, // More space between items
          padding: '10px 16px', // More generous padding
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          fontWeight: 400,
          borderRadius: 6,
          padding: '6px 10px',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  spacing: lightSpacing,
  typography: lightTypography,
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    accent: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: '#e2e8f0',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(37, 99, 235, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
  },
  status: {
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  custom: {
    glassEffect: 'rgba(255, 255, 255, 0.9)',
    cardBackground: '#ffffff',
    sidebarBackground: 'rgba(255, 255, 255, 0.95)',
    headerBackground: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#e2e8f0',
    elevation: {
      low: '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
      medium: '0 8px 16px -4px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.03)',
      high: '0 16px 32px -8px rgba(0, 0, 0, 0.08), 0 8px 16px -8px rgba(0, 0, 0, 0.04)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#cbd5e1',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        ...baseTheme.components?.MuiButton?.styleOverrides,
        containedPrimary: {
          backgroundColor: '#2563eb',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          '&:hover': {
            backgroundColor: '#1d4ed8',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)',
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          color: '#475569',
          borderWidth: '1.5px',
          '&:hover': {
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.04)',
            borderWidth: '1.5px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)',
          },
        },
        text: {
          color: '#475569',
          '&:hover': {
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          '&:hover': {
            borderColor: '#cbd5e1',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
            '& fieldset': {
              borderColor: '#e2e8f0',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#cbd5e1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2563eb',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#64748b',
            fontSize: '0.875rem',
            fontWeight: 500,
            '&.Mui-focused': {
              color: '#2563eb',
              fontWeight: 600,
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(37, 99, 235, 0.06)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            borderLeft: '3px solid #2563eb',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'rgba(37, 99, 235, 0.16)',
            },
          },
        },
      },
    },
  },
}, ptBR);

export const darkTheme = createTheme({
  ...baseTheme,
  spacing: darkSpacing,
  typography: darkTypography,
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    accent: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#000000',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    },
    divider: '#334155',
    action: {
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(59, 130, 246, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
    },
  },
  status: {
    danger: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  custom: {
    glassEffect: 'rgba(30, 41, 59, 0.85)',
    cardBackground: '#1e293b',
    sidebarBackground: '#1e293b',
    headerBackground: '#0f172a',
    borderColor: '#334155',
    elevation: {
      low: '0 4px 12px 0 rgba(0, 0, 0, 0.4)',
      medium: '0 8px 24px -4px rgba(0, 0, 0, 0.5), 0 4px 12px -4px rgba(0, 0, 0, 0.3)',
      high: '0 16px 48px -8px rgba(0, 0, 0, 0.6), 0 8px 24px -8px rgba(0, 0, 0, 0.4)',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f172a',
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#475569',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        ...baseTheme.components?.MuiButton?.styleOverrides,
        containedPrimary: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
          '&:hover': {
            backgroundColor: '#2563eb',
            boxShadow: '0 12px 32px rgba(59, 130, 246, 0.6)',
          },
        },
        outlined: {
          borderColor: '#334155',
          color: '#cbd5e1',
          borderWidth: '2px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderWidth: '2px',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
          },
        },
        text: {
          color: '#cbd5e1',
          '&:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #334155',
          backgroundColor: '#1e293b',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            borderColor: '#475569',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1e293b',
            color: '#f1f5f9',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            '& fieldset': {
              borderColor: '#334155',
              borderWidth: '2px',
            },
            '&:hover fieldset': {
              borderColor: '#475569',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: '2px',
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8',
            fontSize: '0.875rem',
            fontWeight: 500,
            '&.Mui-focused': {
              color: '#3b82f6',
              fontWeight: 600,
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderLeft: '4px solid #3b82f6',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            '&:hover': {
              backgroundColor: 'rgba(59, 130, 246, 0.28)',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#334155',
        },
      },
    },
  },
}, ptBR);

export default lightTheme;