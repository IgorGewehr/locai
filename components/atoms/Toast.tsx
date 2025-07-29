'use client';

import React from 'react';
import {
  Snackbar,
  Alert,
  AlertProps,
  Slide,
  SlideProps,
  IconButton,
  Box,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Close
} from '@mui/icons-material';

interface ToastProps {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  autoHideDuration?: number;
  action?: React.ReactNode;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const Toast: React.FC<ToastProps> = ({
  open,
  message,
  type,
  onClose,
  autoHideDuration = 6000,
  action
}) => {
  const theme = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle />;
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      case 'info':
        return <Info />;
      default:
        return <Info />;
    }
  };

  const getSeverity = (): AlertProps['severity'] => {
    return type;
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return alpha(theme.palette.success.main, 0.1);
      case 'error':
        return alpha(theme.palette.error.main, 0.1);
      case 'warning':
        return alpha(theme.palette.warning.main, 0.1);
      case 'info':
        return alpha(theme.palette.info.main, 0.1);
      default:
        return alpha(theme.palette.info.main, 0.1);
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      default:
        return theme.palette.info.main;
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right'
      }}
      sx={{
        '& .MuiSnackbarContent-root': {
          padding: 0,
          backgroundColor: 'transparent',
          boxShadow: 'none'
        }
      }}
    >
      <Alert
        icon={getIcon()}
        severity={getSeverity()}
        onClose={onClose}
        action={action}
        sx={{
          width: '100%',
          minWidth: 300,
          maxWidth: 500,
          backgroundColor: getBackgroundColor(),
          borderLeft: `4px solid ${getBorderColor()}`,
          borderRadius: 2,
          boxShadow: theme.shadows[8],
          '& .MuiAlert-icon': {
            fontSize: '1.5rem',
            marginRight: 1
          },
          '& .MuiAlert-message': {
            padding: '8px 0',
            fontSize: '0.95rem',
            fontWeight: 500
          },
          '& .MuiAlert-action': {
            padding: '4px 8px'
          }
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {message}
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default Toast;