'use client';

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
  }

  interface ThemeOptions {
    status?: {
      danger?: string;
      success?: string;
      warning?: string;
      info?: string;
    };
  }

  interface Palette {
    tertiary: Palette['primary'];
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions['primary'];
  }
}

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
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 16,
    h1: {
      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: 'clamp(0.875rem, 1.25vw, 1.125rem)',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: 'clamp(0.8rem, 1.1vw, 1rem)',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
    },
    caption: {
      fontSize: 'clamp(0.75rem, 1vw, 0.875rem)',
    },
    subtitle1: {
      fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: 'clamp(0.875rem, 1.2vw, 1rem)',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '12px 28px',
          fontSize: '1rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          padding: '16px 32px',
          fontSize: '1.125rem',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            fontSize: '1rem',
          },
          '& .MuiInputLabel-root': {
            fontSize: '1rem',
          },
          '& .MuiFormHelperText-root': {
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
        },
        input: {
          fontSize: '1rem',
          padding: '14px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.9rem',
          height: '36px',
        },
        label: {
          fontSize: '0.9rem',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '1rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          padding: '16px',
        },
        head: {
          fontSize: '1.1rem',
          fontWeight: 600,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          minHeight: '48px',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '1rem',
        },
        secondary: {
          fontSize: '0.9rem',
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#8fa2f0',
      dark: '#4a5bc4',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#764ba2',
      light: '#9575cd',
      dark: '#512da8',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#ff6b6b',
      light: '#ff8a80',
      dark: '#e57373',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#fafbfc',
      paper: '#ffffff',
    },
    text: {
      primary: '#334155',
      secondary: '#64748b',
    },
  },
  status: {
    danger: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
  },
}, ptBR);

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#667eea',
      light: '#8fa2f0',
      dark: '#4a5bc4',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#764ba2',
      light: '#9575cd',
      dark: '#512da8',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#ff6b6b',
      light: '#ff8a80',
      dark: '#e57373',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    },
  },
  status: {
    danger: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
  },
}, ptBR);

export default lightTheme;