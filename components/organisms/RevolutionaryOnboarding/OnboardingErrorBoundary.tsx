/**
 * Onboarding Error Boundary
 * Catches errors in onboarding and allows graceful recovery
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  alpha,
} from '@mui/material';
import { Error as ErrorIcon, Refresh, Close } from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  onDismiss?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('❌ [Onboarding Error Boundary] Erro capturado', error, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onDismiss) {
      this.props.onDismiss();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '20px',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              {/* Error Icon */}
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <ErrorIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{ color: 'white', fontWeight: 700, mb: 1 }}
                >
                  Ops! Algo deu errado
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                  Não se preocupe, seu progresso foi salvo
                </Typography>
              </Box>

              {/* Error Details */}
              <Alert
                severity="error"
                sx={{
                  backgroundColor: alpha('#ef4444', 0.1),
                  border: `1px solid ${alpha('#ef4444', 0.2)}`,
                  color: '#fca5a5',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Detalhes do Erro:
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {this.state.error?.message || 'Erro desconhecido'}
                </Typography>
              </Alert>

              {/* Action Buttons */}
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<Refresh />}
                  onClick={this.handleReset}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    fontWeight: 600,
                  }}
                >
                  Tentar Novamente
                </Button>

                {this.props.onDismiss && (
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<Close />}
                    onClick={this.handleDismiss}
                    sx={{
                      borderColor: alpha('#ffffff', 0.2),
                      color: alpha('#ffffff', 0.7),
                    }}
                  >
                    Fechar
                  </Button>
                )}
              </Stack>

              {/* Help Text */}
              <Typography
                variant="caption"
                sx={{ color: alpha('#ffffff', 0.5), textAlign: 'center' }}
              >
                Se o problema persistir, entre em contato com o suporte
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
