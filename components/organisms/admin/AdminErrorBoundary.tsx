// app/dashboard/lkjhg/components/shared/ErrorBoundary.tsx
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  alpha
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for admin panel
 * Catches errors in child components and displays fallback UI
 */
export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    logger.error('❌ [Admin Error Boundary] Erro capturado', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      componentStack: errorInfo.componentStack?.substring(0, 500),
      component: 'AdminErrorBoundary'
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 3
          }}
        >
          <Paper
            elevation={24}
            sx={{
              maxWidth: 600,
              p: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Stack spacing={3} alignItems="center">
              {/* Error Icon */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: '50%',
                  bgcolor: alpha('#ef4444', 0.15),
                  color: '#ef4444'
                }}
              >
                <ErrorIcon sx={{ fontSize: 60 }} />
              </Box>

              {/* Title */}
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  color: '#ffffff',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Ops! Algo deu errado
              </Typography>

              {/* Description */}
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Ocorreu um erro inesperado no painel de administração. Nossa equipe foi notificada e está trabalhando para resolver o problema.
              </Typography>

              {/* Error Details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                    width: '100%',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#ef4444',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem'
                    }}
                  >
                    {this.state.error.message}
                  </Typography>
                  {this.state.error.stack && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        display: 'block',
                        mt: 1,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {this.state.error.stack}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={this.handleReset}
                  startIcon={<RefreshIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    bgcolor: '#8b5cf6',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#7c3aed'
                    }
                  }}
                >
                  Tentar Novamente
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={this.handleGoHome}
                  startIcon={<HomeIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      bgcolor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  Ir para Home
                </Button>
              </Stack>

              {/* Reload Button */}
              <Button
                variant="text"
                onClick={this.handleReload}
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.8)',
                    bgcolor: 'transparent'
                  }
                }}
              >
                Recarregar página completa
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
