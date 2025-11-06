"use client";

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { logger } from '@/lib/utils/logger';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean; // Show error details in development
  componentName?: string; // For better error identification
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * 🛡️ Error Boundary Component
 *
 * Catches React errors and prevents entire app from crashing
 *
 * Features:
 * - Graceful error recovery with retry
 * - Automatic error logging
 * - User-friendly error messages
 * - Development mode details
 * - Error count tracking (prevents infinite loops)
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary componentName="CRM Dashboard">
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxErrorCount = 3; // Prevent infinite error loops

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, componentName } = this.props;
    const { errorCount } = this.state;

    // Incrementar contador de erros
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log do erro
    logger.error('❌ [ErrorBoundary] Component error caught', {
      component: componentName || 'Unknown',
      error: error.message,
      stack: error.stack?.substring(0, 500),
      errorCount: errorCount + 1,
      componentStack: errorInfo.componentStack?.substring(0, 500),
    });

    // Callback customizado
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (callbackError) {
        logger.error('❌ [ErrorBoundary] Error in onError callback', {
          error: callbackError instanceof Error ? callbackError.message : 'Unknown'
        });
      }
    }

    // 🛡️ PROTEÇÃO: Se muitos erros, recarregar página
    if (errorCount + 1 >= this.maxErrorCount) {
      logger.error('❌ [ErrorBoundary] Too many errors, forcing page reload', {
        component: componentName || 'Unknown',
        errorCount: errorCount + 1,
      });

      // Aguardar 2 segundos e recarregar
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });

    logger.info('🔄 [ErrorBoundary] Error boundary reset', {
      component: this.props.componentName || 'Unknown',
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/dashboard';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, showDetails, componentName } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Too many errors - show critical error
      if (errorCount >= this.maxErrorCount) {
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              p: 3,
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                maxWidth: 600,
                width: '100%',
                textAlign: 'center',
              }}
            >
              <ErrorOutlineIcon
                sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom color="error">
                Erro Crítico
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Detectamos múltiplos erros consecutivos. A página será recarregada automaticamente.
              </Typography>
              <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="caption">
                  Se o problema persistir, entre em contato com o suporte.
                </Typography>
              </Alert>
            </Paper>
          </Box>
        );
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon
              sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
            />
            <Typography variant="h5" gutterBottom>
              Algo deu errado
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {componentName
                ? `Ocorreu um erro em "${componentName}".`
                : 'Ocorreu um erro inesperado.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tente recarregar a página ou volte para o início.
            </Typography>

            {/* Error Details (Development Only) */}
            {(showDetails || process.env.NODE_ENV === 'development') && error && (
              <Alert severity="error" sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Detalhes do Erro:
                </Typography>
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                  }}
                >
                  {error.message}
                </Typography>
                {errorInfo && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Component Stack:
                    </Typography>
                    <Typography
                      variant="caption"
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        maxHeight: '200px',
                        overflow: 'auto',
                      }}
                    >
                      {errorInfo.componentStack}
                    </Typography>
                  </>
                )}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleReset}
              >
                Tentar Novamente
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<HomeIcon />}
                onClick={this.handleGoHome}
              >
                Voltar ao Início
              </Button>
            </Box>

            {/* Error Counter Warning */}
            {errorCount > 1 && (
              <Alert severity="warning" sx={{ mt: 3 }}>
                <Typography variant="caption">
                  Erro {errorCount} de {this.maxErrorCount}. Se o problema persistir, a página será recarregada automaticamente.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Box>
      );
    }

    return children;
  }
}

/**
 * 🎣 Hook para usar Error Boundary em componentes funcionais
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { hasError, resetError } = useErrorHandler();
 *
 *   if (hasError) {
 *     return <ErrorMessage onReset={resetError} />;
 *   }
 *
 *   return <YourContent />;
 * }
 * ```
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    logger.error('❌ [useErrorHandler] Error caught', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
    });
    setError(error);
  }, []);

  return {
    error,
    hasError: error !== null,
    resetError,
    handleError,
  };
}

export default ErrorBoundary;
