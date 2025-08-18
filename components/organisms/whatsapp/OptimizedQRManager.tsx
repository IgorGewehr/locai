'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timer as TimerIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { logger } from '@/lib/utils/logger';

interface QRStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  businessName?: string;
  qrCode?: string;
  message?: string;
  lastActivity?: string;
  persistent?: boolean;
  cacheOptimized?: boolean;
}

interface OptimizedQRManagerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string, businessName: string) => void;
  apiClient: any;
}

/**
 * OPTIMIZED: WhatsApp QR Manager with intelligent polling and persistent QR
 */
export function OptimizedQRManager({
  open,
  onClose,
  onSuccess,
  apiClient
}: OptimizedQRManagerProps) {
  const [qrStatus, setQrStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pollCount, setPollCount] = useState(0);
  const [averageResponseTime, setAverageResponseTime] = useState(0);
  const [connectionStats, setConnectionStats] = useState({
    cacheHits: 0,
    totalRequests: 0,
    qrGenerations: 0
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const responseTimesRef = useRef<number[]>([]);
  const isInitializingRef = useRef(false);

  // OPTIMIZED: Intelligent polling with exponential backoff
  const INITIAL_POLL_INTERVAL = 5000; // 5s instead of 3s
  const MAX_POLL_INTERVAL = 15000; // 15s max
  const MAX_RETRIES = 8; // Reduced from excessive polling
  const QR_TIMEOUT = 300000; // 5 minutes total timeout

  const calculateNextPollInterval = useCallback((attemptCount: number): number => {
    // Exponential backoff: 5s, 7s, 10s, 12s, 15s, then constant 15s
    const baseInterval = INITIAL_POLL_INTERVAL;
    const increment = Math.min(attemptCount * 2000, MAX_POLL_INTERVAL - baseInterval);
    return Math.min(baseInterval + increment, MAX_POLL_INTERVAL);
  }, []);

  const updateResponseTimeStats = useCallback((responseTime: number) => {
    responseTimesRef.current.push(responseTime);
    const avgTime = responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length;
    setAverageResponseTime(Math.round(avgTime));
  }, []);

  const checkStatus = useCallback(async (isRetry = false): Promise<void> => {
    if (!open) return;

    try {
      const requestStart = Date.now();
      const response = await apiClient.get('/api/whatsapp/session');
      const responseTime = Date.now() - requestStart;
      
      updateResponseTimeStats(responseTime);
      setPollCount(prev => prev + 1);
      
      setConnectionStats(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        cacheHits: response.data?.cached ? prev.cacheHits + 1 : prev.cacheHits
      }));

      if (response.data?.success) {
        const status: QRStatus = response.data.data;
        setQrStatus(status);
        setError(null);

        // Track QR generations
        if (status.qrCode && (!qrStatus?.qrCode || status.qrCode !== qrStatus.qrCode)) {
          setConnectionStats(prev => ({
            ...prev,
            qrGenerations: prev.qrGenerations + 1
          }));
          
          logger.info('🔄 [QR Manager] New QR received', {
            qrLength: status.qrCode.length,
            persistent: status.persistent,
            cacheOptimized: status.cacheOptimized,
            responseTime: `${responseTime}ms`
          });
        }

        // Check for successful connection
        if (status.connected && status.phoneNumber) {
          logger.info('✅ [QR Manager] Connection successful', {
            phone: status.phoneNumber.substring(0, 6) + '***',
            businessName: status.businessName
          });
          
          stopPolling();
          onSuccess(status.phoneNumber, status.businessName || 'WhatsApp Business');
          return;
        }

        // Reset retry count on successful response
        if (isRetry) {
          setRetryCount(0);
        }
      } else {
        throw new Error(response.data?.error || 'Failed to get session status');
      }

    } catch (error: any) {
      logger.error('❌ [QR Manager] Status check failed', {
        error: error.message,
        retryCount,
        pollCount,
        isRetry
      });

      setError(error.message);
      
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
    }
  }, [open, apiClient, qrStatus, retryCount, pollCount, onSuccess, updateResponseTimeStats]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let attemptCount = 0;
    startTimeRef.current = Date.now();

    const poll = () => {
      // Check timeout
      if (startTimeRef.current && Date.now() - startTimeRef.current > QR_TIMEOUT) {
        logger.warn('⏰ [QR Manager] QR session timeout reached');
        setError('QR session timeout. Please try again.');
        stopPolling();
        return;
      }

      // Check max retries
      if (attemptCount >= MAX_RETRIES) {
        logger.warn('⚠️ [QR Manager] Max polling attempts reached');
        setError('Maximum polling attempts reached. Please refresh and try again.');
        stopPolling();
        return;
      }

      checkStatus(attemptCount > 0);
      attemptCount++;

      // Schedule next poll with intelligent interval
      const nextInterval = calculateNextPollInterval(attemptCount);
      pollingIntervalRef.current = setTimeout(poll, nextInterval);
      
      // Only log in debug mode to reduce console noise
      if (process.env.NEXT_PUBLIC_DEBUG_QR === 'true') {
        logger.info('⏱️ [QR Manager] Next poll scheduled', {
          attempt: attemptCount,
          nextInterval: `${nextInterval/1000}s`,
          elapsed: startTimeRef.current ? `${Math.round((Date.now() - startTimeRef.current)/1000)}s` : 'unknown'
        });
      }
    };

    // Start immediately
    poll();
  }, [checkStatus, calculateNextPollInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const initializeSession = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      logger.warn('⚠️ [QR Manager] Session initialization already in progress');
      return;
    }
    
    isInitializingRef.current = true;
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setPollCount(0);
    setQrStatus(null);
    responseTimesRef.current = [];
    
    setConnectionStats({
      cacheHits: 0,
      totalRequests: 0,
      qrGenerations: 0
    });

    try {
      logger.info('🚀 [QR Manager] Initializing optimized WhatsApp session');
      
      const response = await apiClient.post('/api/whatsapp/session');
      
      if (response.data?.success) {
        logger.info('✅ [QR Manager] Session initialization successful');
        startPolling();
      } else {
        throw new Error(response.data?.error || 'Failed to initialize session');
      }
    } catch (error: any) {
      logger.error('❌ [QR Manager] Session initialization failed', {
        error: error.message
      });
      setError(error.message);
    } finally {
      setLoading(false);
      isInitializingRef.current = false;
    }
  }, [apiClient, startPolling]);

  const handleRefresh = useCallback(() => {
    stopPolling();
    initializeSession();
  }, [stopPolling, initializeSession]);

  // Effect to start session when dialog opens
  useEffect(() => {
    if (open) {
      // Add a small delay to prevent immediate initialization on rapid open/close
      const initTimer = setTimeout(() => {
        if (open) {
          initializeSession();
        }
      }, 100);
      
      return () => {
        clearTimeout(initTimer);
        stopPolling();
      };
    } else {
      stopPolling();
      isInitializingRef.current = false;
    }
  }, [open, initializeSession, stopPolling]);

  const getStatusColor = () => {
    if (qrStatus?.connected) return 'success';
    if (error) return 'error';
    if (qrStatus?.qrCode) return 'info';
    return 'default';
  };

  const getStatusText = () => {
    if (qrStatus?.connected) return 'Conectado';
    if (error) return 'Erro';
    if (loading) return 'Inicializando...';
    if (qrStatus?.qrCode) return 'QR Code Disponível';
    return 'Desconectado';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <QrCodeIcon />
            <Typography variant="h6">WhatsApp QR Code - Otimizado</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
              icon={qrStatus?.connected ? <CheckCircleIcon /> : error ? <ErrorIcon /> : <TimerIcon />}
            />
            <Tooltip title="Atualizar">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          {/* QR Code Display */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                {loading && (
                  <Box mb={2}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Inicializando sessão WhatsApp...
                    </Typography>
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {qrStatus?.qrCode && (
                  <Box textAlign="center">
                    <img 
                      src={qrStatus.qrCode} 
                      alt="WhatsApp QR Code"
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '8px'
                      }}
                    />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Escaneie o QR Code com seu WhatsApp
                    </Typography>
                    {qrStatus.persistent && (
                      <Chip 
                        label="QR Persistente" 
                        size="small" 
                        color="success" 
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                )}

                {qrStatus?.connected && (
                  <Alert severity="success">
                    <Box>
                      <Typography variant="subtitle2">
                        ✅ Conectado com sucesso!
                      </Typography>
                      <Typography variant="body2">
                        Telefone: {qrStatus.phoneNumber}
                      </Typography>
                      <Typography variant="body2">
                        Nome: {qrStatus.businessName}
                      </Typography>
                    </Box>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Statistics Panel */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SpeedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Estatísticas
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Tempo Médio de Resposta
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {averageResponseTime}ms
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Polling Inteligente
                  </Typography>
                  <Typography variant="body1">
                    {pollCount} requests
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Cache Hits
                  </Typography>
                  <Typography variant="body1">
                    {connectionStats.cacheHits}/{connectionStats.totalRequests}
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    QR Gerações
                  </Typography>
                  <Typography variant="body1">
                    {connectionStats.qrGenerations}
                  </Typography>
                </Box>

                {qrStatus?.cacheOptimized && (
                  <Chip 
                    label="Cache Otimizado" 
                    size="small" 
                    color="info" 
                    sx={{ mb: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={loading}
        >
          Fechar
        </Button>
        <Button 
          onClick={handleRefresh}
          disabled={loading}
          variant="outlined"
        >
          Tentar Novamente
        </Button>
      </DialogActions>
    </Dialog>
  );
}