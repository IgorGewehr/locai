import { Components, Theme } from '@mui/material/styles';

export const createComponents = (theme: Theme): Components => ({
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        height: '100%',
        width: '100%',
      },
      body: {
        height: '100%',
        width: '100%',
        margin: 0,
        padding: 0,
        fontFamily: theme.typography.fontFamily,
        backgroundColor: theme.palette.background.default,
      },
      '#__next': {
        height: '100%',
        width: '100%',
      },
      '*::-webkit-scrollbar': {
        width: '8px',
      },
      '*::-webkit-scrollbar-track': {
        backgroundColor: theme.palette.mode === 'light' ? '#f1f1f1' : '#2d3748',
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: theme.palette.mode === 'light' ? '#c1c1c1' : '#4a5568',
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'light' ? '#a8a8a8' : '#718096',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      containedPrimary: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        '&:hover': {
          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
        },
      },
      outlinedPrimary: {
        borderColor: theme.palette.primary.main,
        color: theme.palette.primary.main,
        '&:hover': {
          backgroundColor: theme.palette.primary.main + '10',
          borderColor: theme.palette.primary.main,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: theme.palette.mode === 'light' 
          ? '0 4px 20px rgba(0, 0, 0, 0.08)'
          : '0 4px 20px rgba(0, 0, 0, 0.3)',
        border: theme.palette.mode === 'light' 
          ? '1px solid rgba(0, 0, 0, 0.08)'
          : '1px solid rgba(255, 255, 255, 0.12)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
      elevation1: {
        boxShadow: theme.palette.mode === 'light'
          ? '0 2px 8px rgba(0, 0, 0, 0.08)'
          : '0 2px 8px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: theme.palette.mode === 'light'
          ? '0 1px 4px rgba(0, 0, 0, 0.1)'
          : '0 1px 4px rgba(0, 0, 0, 0.3)',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: theme.palette.mode === 'light'
          ? '1px solid rgba(0, 0, 0, 0.12)'
          : '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: theme.palette.background.paper,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
          '& fieldset': {
            borderColor: theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.23)'
              : 'rgba(255, 255, 255, 0.23)',
          },
          '&:hover fieldset': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
          },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
      colorPrimary: {
        backgroundColor: theme.palette.primary.main + '20',
        color: theme.palette.primary.main,
      },
      colorSecondary: {
        backgroundColor: theme.palette.secondary.main + '20',
        color: theme.palette.secondary.main,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        minWidth: 0,
        padding: '12px 16px',
        '&.Mui-selected': {
          color: theme.palette.primary.main,
        },
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        '& .MuiTabs-indicator': {
          height: 3,
          borderRadius: '3px 3px 0 0',
          backgroundColor: theme.palette.primary.main,
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: theme.palette.mode === 'light'
          ? '1px solid rgba(0, 0, 0, 0.12)'
          : '1px solid rgba(255, 255, 255, 0.12)',
      },
      head: {
        backgroundColor: theme.palette.mode === 'light'
          ? theme.palette.grey[50]
          : theme.palette.grey[900],
        fontWeight: 600,
        fontSize: '0.875rem',
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        border: theme.palette.mode === 'light'
          ? '1px solid rgba(0, 0, 0, 0.12)'
          : '1px solid rgba(255, 255, 255, 0.12)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontSize: '1.25rem',
        fontWeight: 600,
        padding: '24px 24px 16px',
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: '0 24px',
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: '16px 24px 24px',
        gap: '8px',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
      },
      standardSuccess: {
        backgroundColor: theme.palette.success.light + '20',
        color: theme.palette.success.dark,
      },
      standardError: {
        backgroundColor: theme.palette.error.light + '20',
        color: theme.palette.error.dark,
      },
      standardWarning: {
        backgroundColor: theme.palette.warning.light + '20',
        color: theme.palette.warning.dark,
      },
      standardInfo: {
        backgroundColor: theme.palette.info.light + '20',
        color: theme.palette.info.dark,
      },
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '& .MuiAlert-root': {
          borderRadius: 8,
        },
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 8,
        boxShadow: theme.palette.mode === 'light'
          ? '0 4px 20px rgba(0, 0, 0, 0.1)'
          : '0 4px 20px rgba(0, 0, 0, 0.3)',
        border: theme.palette.mode === 'light'
          ? '1px solid rgba(0, 0, 0, 0.08)'
          : '1px solid rgba(255, 255, 255, 0.12)',
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        padding: '12px 16px',
        '&:hover': {
          backgroundColor: theme.palette.primary.main + '10',
        },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        margin: '2px 8px',
        '&:hover': {
          backgroundColor: theme.palette.primary.main + '10',
        },
        '&.Mui-selected': {
          backgroundColor: theme.palette.primary.main + '20',
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: theme.palette.primary.main + '30',
          },
        },
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        minWidth: 40,
        color: 'inherit',
      },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
      },
    },
  },
});