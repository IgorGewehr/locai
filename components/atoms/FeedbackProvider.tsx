'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertColor,
  Slide,
  SlideProps,
  Backdrop,
  CircularProgress,
  Box,
  Typography,
  LinearProgress,
  useTheme,
} from '@mui/material';

interface FeedbackMessage {
  id: string;
  type: AlertColor;
  message: string;
  action?: React.ReactNode;
  autoHideDuration?: number;
  persistent?: boolean;
}

interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  showProgress?: boolean;
}

interface FeedbackContextType {
  // Messages
  showMessage: (message: string, type?: AlertColor, options?: Partial<FeedbackMessage>) => void;
  showSuccess: (message: string, options?: Partial<FeedbackMessage>) => void;
  showError: (message: string, options?: Partial<FeedbackMessage>) => void;
  showWarning: (message: string, options?: Partial<FeedbackMessage>) => void;
  showInfo: (message: string, options?: Partial<FeedbackMessage>) => void;
  hideMessage: (id: string) => void;
  hideAllMessages: () => void;
  
  // Loading states
  showLoading: (message: string, options?: { progress?: number; showProgress?: boolean }) => string;
  updateLoading: (id: string, message: string, progress?: number) => void;
  hideLoading: (id: string) => void;
  hideAllLoading: () => void;
  
  // Confirmation dialogs
  showConfirmation: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

interface FeedbackProviderProps {
  children: ReactNode;
}

export function FeedbackProvider({ children }: FeedbackProviderProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Message functions
  const showMessage = useCallback((
    message: string,
    type: AlertColor = 'info',
    options: Partial<FeedbackMessage> = {}
  ) => {
    const id = Date.now().toString();
    const newMessage: FeedbackMessage = {
      id,
      type,
      message,
      autoHideDuration: type === 'error' ? 8000 : 6000,
      persistent: false,
      ...options,
    };

    setMessages(prev => [...prev, newMessage]);

    // Auto-hide if not persistent
    if (!newMessage.persistent) {
      setTimeout(() => {
        hideMessage(id);
      }, newMessage.autoHideDuration);
    }
  }, []);

  const showSuccess = useCallback((message: string, options?: Partial<FeedbackMessage>) => {
    showMessage(message, 'success', options);
  }, [showMessage]);

  const showError = useCallback((message: string, options?: Partial<FeedbackMessage>) => {
    showMessage(message, 'error', { autoHideDuration: 8000, ...options });
  }, [showMessage]);

  const showWarning = useCallback((message: string, options?: Partial<FeedbackMessage>) => {
    showMessage(message, 'warning', options);
  }, [showMessage]);

  const showInfo = useCallback((message: string, options?: Partial<FeedbackMessage>) => {
    showMessage(message, 'info', options);
  }, [showMessage]);

  const hideMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const hideAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Loading functions
  const showLoading = useCallback((
    message: string,
    options: { progress?: number; showProgress?: boolean } = {}
  ) => {
    const id = Date.now().toString();
    const newLoading: LoadingState = {
      id,
      message,
      progress: options.progress,
      showProgress: options.showProgress || false,
    };

    setLoadingStates(prev => [...prev, newLoading]);
    return id;
  }, []);

  const updateLoading = useCallback((id: string, message: string, progress?: number) => {
    setLoadingStates(prev =>
      prev.map(loading =>
        loading.id === id
          ? { ...loading, message, progress }
          : loading
      )
    );
  }, []);

  const hideLoading = useCallback((id: string) => {
    setLoadingStates(prev => prev.filter(loading => loading.id !== id));
  }, []);

  const hideAllLoading = useCallback(() => {
    setLoadingStates([]);
  }, []);

  // Confirmation dialog
  const showConfirmation = useCallback((
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    setConfirmationDialog({
      message,
      onConfirm,
      onCancel,
    });
  }, []);

  const contextValue: FeedbackContextType = {
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideMessage,
    hideAllMessages,
    showLoading,
    updateLoading,
    hideLoading,
    hideAllLoading,
    showConfirmation,
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      
      {/* Messages */}
      {messages.map((message, index) => (
        <Snackbar
          key={message.id}
          open={true}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{
            mt: index * 7, // Stack messages vertically
          }}
          TransitionComponent={SlideTransition}
        >
          <Alert
            severity={message.type}
            onClose={() => hideMessage(message.id)}
            action={message.action}
            sx={{
              minWidth: 300,
              boxShadow: theme.shadows[8],
            }}
          >
            {message.message}
          </Alert>
        </Snackbar>
      ))}

      {/* Loading states */}
      {loadingStates.map((loading) => (
        <Backdrop
          key={loading.id}
          open={true}
          sx={{
            zIndex: theme.zIndex.modal + 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              p: 4,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              minWidth: 300,
              maxWidth: 400,
            }}
          >
            <CircularProgress
              size={48}
              thickness={4}
              {...(loading.showProgress && loading.progress !== undefined && {
                variant: 'determinate',
                value: loading.progress,
              })}
            />
            <Typography variant="h6" textAlign="center">
              {loading.message}
            </Typography>
            {loading.showProgress && loading.progress !== undefined && (
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={loading.progress}
                  sx={{ borderRadius: 1 }}
                />
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
                  {Math.round(loading.progress)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Backdrop>
      ))}

      {/* Confirmation dialog */}
      {confirmationDialog && (
        <Backdrop
          open={true}
          sx={{
            zIndex: theme.zIndex.modal + 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <Box
            sx={{
              p: 4,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              minWidth: 300,
              maxWidth: 500,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Confirmação
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {confirmationDialog.message}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  confirmationDialog.onCancel?.();
                  setConfirmationDialog(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmationDialog.onConfirm();
                  setConfirmationDialog(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Confirmar
              </button>
            </Box>
          </Box>
        </Backdrop>
      )}
    </FeedbackContext.Provider>
  );
}

// HOC for easy integration
export function withFeedback<P extends object>(
  Component: React.ComponentType<P & { feedback: FeedbackContextType }>
) {
  return function FeedbackWrappedComponent(props: P) {
    const feedback = useFeedback();
    return <Component {...props} feedback={feedback} />;
  };
}

// Common feedback patterns
export const FeedbackPatterns = {
  // Loading patterns
  async operation<T>(
    feedback: FeedbackContextType,
    operation: () => Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> {
    const loadingId = feedback.showLoading(messages.loading);
    
    try {
      const result = await operation();
      feedback.hideLoading(loadingId);
      feedback.showSuccess(messages.success);
      return result;
    } catch (error) {
      feedback.hideLoading(loadingId);
      feedback.showError(messages.error);
      throw error;
    }
  },

  // Confirmation patterns
  async confirmOperation(
    feedback: FeedbackContextType,
    message: string,
    operation: () => Promise<void>,
    successMessage: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      feedback.showConfirmation(
        message,
        async () => {
          try {
            await operation();
            feedback.showSuccess(successMessage);
            resolve();
          } catch (error) {
            feedback.showError('Erro ao executar operação');
            reject(error);
          }
        },
        () => {
          reject(new Error('Operação cancelada'));
        }
      );
    });
  },
};