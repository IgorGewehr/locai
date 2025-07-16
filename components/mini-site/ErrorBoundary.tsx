'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Alert,
  Stack,
  Paper,
  alpha
} from '@mui/material';
import { 
  ErrorOutline,
  Refresh,
  Home,
  WhatsApp
} from '@mui/icons-material';

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

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = window.location.origin;
  };

  handleContactSupport = () => {
    const message = encodeURIComponent(
      'Olá! Encontrei um erro no site e preciso de ajuda. ' +
      `Erro: ${this.state.error?.message || 'Erro desconhecido'}`
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            display: 'flex',
            alignItems: 'center',
            py: 4,
          }}
        >
          <Container maxWidth="md">
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Stack spacing={4} alignItems="center">
                {/* Error Icon */}
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: alpha('#ef4444', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s infinite',
                  }}
                >
                  <ErrorOutline 
                    sx={{ 
                      fontSize: 40, 
                      color: '#ef4444' 
                    }} 
                  />
                </Box>

                {/* Error Message */}
                <Box>
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 700,
                      color: 'text.primary',
                      mb: 2,
                    }}
                  >
                    Ops! Algo deu errado
                  </Typography>
                  
                  <Typography 
                    variant="h6" 
                    color="text.secondary"
                    sx={{ 
                      mb: 3,
                      lineHeight: 1.6,
                    }}
                  >
                    Encontramos um problema inesperado. Nossa equipe foi notificada 
                    e estamos trabalhando para resolver isso.
                  </Typography>

                  {/* Technical Details (Development Mode) */}
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mt: 3, 
                        textAlign: 'left',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2" component="pre" sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 150,
                        overflow: 'auto',
                      }}>
                        {this.state.error.message}
                        {this.state.errorInfo?.componentStack && (
                          '\n\nComponent Stack:' + this.state.errorInfo.componentStack
                        )}
                      </Typography>
                    </Alert>
                  )}
                </Box>

                {/* Action Buttons */}
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  sx={{ mt: 4 }}
                >
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={this.handleRetry}
                    size="large"
                    sx={{
                      minWidth: 160,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(37, 99, 235, 0.3)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    Tentar Novamente
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Home />}
                    onClick={this.handleGoHome}
                    size="large"
                    sx={{
                      minWidth: 160,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#d1d5db',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: '#9ca3af',
                        background: alpha('#f3f4f6', 0.5),
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    Voltar ao Início
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<WhatsApp />}
                    onClick={this.handleContactSupport}
                    size="large"
                    sx={{
                      minWidth: 160,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#25D366',
                      color: '#25D366',
                      '&:hover': {
                        borderColor: '#128C7E',
                        background: alpha('#25D366', 0.1),
                        color: '#128C7E',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    Falar no WhatsApp
                  </Button>
                </Stack>

                {/* Help Text */}
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    mt: 3,
                    px: 2,
                    lineHeight: 1.6,
                  }}
                >
                  Se o problema persistir, entre em contato conosco pelo WhatsApp. 
                  Teremos prazer em ajudá-lo!
                </Typography>
              </Stack>
            </Paper>
          </Container>

          {/* Animation Styles */}
          <style jsx>{`
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.7;
              }
            }
          `}</style>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;