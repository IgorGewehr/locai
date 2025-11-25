'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Divider,
  Fade,
  Zoom,
  Card,
  CardContent,
  Container,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  QrCode2,
  CheckCircle,
  Error,
  Refresh,
  PhoneAndroid,
  PowerSettingsNew,
  CameraAlt,
  PhonelinkRing,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWhatsAppStatus } from '@/lib/hooks/useWhatsAppStatus';
import { useFacebookSDK } from '@/lib/hooks/useFacebookSDK';

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  qrCode?: string | null;
}

interface FacebookStatus {
  connected: boolean;
  pageName?: string;
  pageId?: string;
}

export default function WhatsAppPage() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();
  const { clearCache, refreshStatus: refreshGlobalStatus } = useWhatsAppStatus();

  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false, status: 'disconnected' });
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus>({ connected: false });
  const [error, setError] = useState<string | null>(null);

  // Page Selection State
  const [showPageSelection, setShowPageSelection] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false); // Prevent multiple POST calls

  const { login, isSdkLoaded } = useFacebookSDK();

  useEffect(() => {
    loadStatus();
    loadFacebookStatus();

    // Start polling based on status
    startPolling();

    return () => {
      stopPolling();
    };
  }, [tenantId, status.status]);

  const startPolling = () => {
    // Clear existing interval
    stopPolling();

    // Determine polling interval based on status
    const getPollingInterval = () => {
      if (status.status === 'qr' || status.status === 'qr_ready' || status.status === 'initializing' || status.status === 'connecting') {
        return 2000; // 2 seconds - check frequently when waiting for QR or connection
      }
      if (status.connected) {
        return 30000; // 30 seconds - slow polling when connected
      }
      return 10000; // 10 seconds - moderate polling when disconnected
    };

    const interval = getPollingInterval();
    pollingIntervalRef.current = setInterval(loadStatus, interval);
    isPollingRef.current = true;
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      isPollingRef.current = false;
    }
  };

  const loadStatus = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newStatus = {
            connected: result.data.connected || false,
            status: result.data.status || 'disconnected',
            phoneNumber: result.data.phoneNumber,
            businessName: result.data.businessName,
            qrCode: result.data.qrCode,
          };

          setStatus(newStatus);

          // Log QR code status
          if (newStatus.qrCode) {
            // Auto-scroll to QR code when it appears
            setTimeout(() => {
              qrCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }

          // Clear error and update global status if connected
          if (newStatus.connected) {
            setError(null);
            setConnecting(false);
            // Clear cache and refresh global status
            clearCache();
            refreshGlobalStatus();
          }

          // Update global status when QR is ready
          if (newStatus.qrCode && !status.qrCode) {
            clearCache();
            refreshGlobalStatus();
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp Settings] Error loading status:', err);
    }
  };

  const loadFacebookStatus = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/facebook/status?tenantId=${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setFacebookStatus(result.data);
        }
      }
    } catch (err) {
      console.error('[Settings] Error loading Facebook status:', err);
    }
  };

  const handleFacebookConnect = async () => {
    if (!isSdkLoaded) {
      alert('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    try {
      const authResponse = await login('whatsapp_business_management,pages_messaging,instagram_manage_messages,pages_show_list,pages_read_engagement');

      if (authResponse && authResponse.accessToken) {
        // Exchange token and fetch pages
        const firebaseToken = await getFirebaseToken();
        const response = await fetch('/api/facebook/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            tenantId,
            userAccessToken: authResponse.accessToken,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.pages && result.pages.length > 0) {
            setAvailablePages(result.pages);
            setShowPageSelection(true);
          } else {
            alert('No Facebook Pages found for this account.');
          }
        } else {
          alert('Failed to connect Facebook');
        }
      }
    } catch (err) {
      console.error('Error connecting Facebook:', err);
      alert('Error connecting Facebook: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const confirmPageSelection = async () => {
    if (!selectedPage) return;

    const page = availablePages.find(p => p.id === selectedPage);
    if (!page) return;

    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          tenantId,
          pageId: page.id,
          pageAccessToken: page.access_token,
          pageName: page.name,
        }),
      });

      if (response.ok) {
        await loadFacebookStatus();
        setShowPageSelection(false);
        alert('Facebook connected successfully!');
      } else {
        alert('Failed to save Facebook settings');
      }
    } catch (err) {
      console.error('Error saving Facebook page:', err);
      alert('Error saving Facebook page');
    }
  };

  const handleFacebookDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Facebook?')) return;

    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch(`/api/facebook/auth?tenantId=${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      if (response.ok) {
        await loadFacebookStatus();
      } else {
        alert('Failed to disconnect Facebook');
      }
    } catch (err) {
      console.error('Error disconnecting Facebook:', err);
      alert('Error disconnecting Facebook');
    }
  };

  const checkExistingSession = async () => {
    try {
      const token = await getFirebaseToken();

      const response = await fetch(`/api/whatsapp/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('[WhatsApp Settings] Error checking session:', err);
      return null;
    }
  };

  const handleConnect = async () => {
    // Prevent multiple simultaneous calls
    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    setConnecting(true);
    setError(null);

    try {
      // First check if session already exists
      const existingSession = await checkExistingSession();

      if (existingSession) {
        // If already connected
        if (existingSession.connected) {
          setStatus({
            connected: true,
            status: 'connected',
            phoneNumber: existingSession.phoneNumber,
            businessName: existingSession.businessName,
            qrCode: null,
          });
          setConnecting(false);
          isConnectingRef.current = false;
          clearCache();
          refreshGlobalStatus();
          return;
        }

        // If QR already exists
        if (existingSession.qrCode) {
          setStatus({
            connected: false,
            status: 'qr',
            phoneNumber: null,
            businessName: null,
            qrCode: existingSession.qrCode,
          });
          setConnecting(false);
          isConnectingRef.current = false;
          startPolling();
          clearCache();
          refreshGlobalStatus();
          return;
        }

        // If already initializing
        if (existingSession.status === 'initializing' || existingSession.status === 'connecting') {
          setStatus({
            connected: false,
            status: 'initializing',
            phoneNumber: null,
            businessName: null,
            qrCode: null,
          });
          setConnecting(false);
          isConnectingRef.current = false;
          startPolling();
          return;
        }
      }

      // No existing session, create new one
      const token = await getFirebaseToken();

      const response = await fetch(`/api/whatsapp/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Handle rate limiting gracefully (don't show error)
      if (response.status === 429) {
        const result = await response.json();
        const retryAfter = result.data?.retryAfter || 10;

        // Don't show error to user, just start polling
        setError(null);
        setStatus({
          connected: false,
          status: 'initializing',
          phoneNumber: null,
          businessName: null,
          qrCode: null,
        });
        setConnecting(false);
        isConnectingRef.current = false;
        startPolling();
        return;
      }

      const result = await response.json();

      if (result.success) {
        // Always set initializing status and start aggressive polling
        setStatus({
          connected: false,
          status: 'initializing',
          phoneNumber: null,
          businessName: null,
          qrCode: result.data?.qrCode || null,
        });

        // Force restart polling with aggressive interval
        startPolling();
      } else {
        setError(result.error || result.data?.message || 'Erro ao conectar WhatsApp');
        setConnecting(false);
        isConnectingRef.current = false;
      }
    } catch (err) {
      console.error('[WhatsApp Settings] Error connecting:', err);
      setError('Erro ao conectar WhatsApp');
      setConnecting(false);
      isConnectingRef.current = false;
    } finally {
      // Always reset connecting ref after attempt
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 2000);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/session`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setStatus({ connected: false, status: 'disconnected' });
      } else {
        setError('Erro ao desconectar WhatsApp');
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.connected) return 'success';
    if (status.status === 'initializing' || status.status === 'qr_ready') return 'warning';
    return 'error';
  };

  const getStatusLabel = () => {
    if (status.connected) return 'Conectado';
    if (status.status === 'initializing') return 'Inicializando...';
    if (status.status === 'qr_ready') return 'Aguardando QR Code';
    return 'Desconectado';
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Conexão WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure e gerencie a conexão do WhatsApp com o sistema
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Connection Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PhoneAndroid sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Status da Conexão
            </Typography>
          </Box>

          <Chip
            icon={status.connected ? <CheckCircle /> : <Error />}
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        {status.connected && status.phoneNumber && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Número: <strong>{status.phoneNumber}</strong>
            </Typography>
            {status.businessName && (
              <Typography variant="body2" color="text.secondary">
                Nome: <strong>{status.businessName}</strong>
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          {!status.connected ? (
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={connecting || status.status === 'initializing'}
              startIcon={connecting ? <CircularProgress size={20} /> : <PowerSettingsNew />}
            >
              {connecting || status.status === 'initializing' ? 'Conectando...' : 'Conectar WhatsApp'}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={handleDisconnect}
                disabled={loading}
                color="error"
                startIcon={<PowerSettingsNew />}
              >
                Desconectar
              </Button>
              <Button
                variant="outlined"
                onClick={loadStatus}
                startIcon={<Refresh />}
              >
                Atualizar Status
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* QR Code Section - Optimized UI/UX */}
      {!status.connected && (
        <Zoom in timeout={500}>
          <Box ref={qrCodeRef}>
            {status.qrCode ? (
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.05), rgba(37, 211, 102, 0.01))',
                  border: '2px solid',
                  borderColor: 'success.main',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: `0 0 40px ${alpha('#25D366', 0.2)}`,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Zoom in timeout={300}>
                      <CameraAlt
                        sx={{
                          fontSize: 48,
                          color: 'success.main',
                          mb: 2,
                          animation: 'pulse 2s infinite',
                          '@keyframes pulse': {
                            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                            '50%': { opacity: 0.7, transform: 'scale(1.05)' }
                          }
                        }}
                      />
                    </Zoom>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      Escaneie o QR Code
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use a câmera do seu celular para conectar
                    </Typography>
                  </Box>

                  {/* QR Code Display - Centered and Prominent */}
                  <Fade in timeout={800}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        my: 4,
                      }}
                    >
                      <Box
                        sx={{
                          p: 3,
                          bgcolor: 'white',
                          borderRadius: 4,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                          border: '8px solid',
                          borderColor: alpha('#25D366', 0.2),
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.16)',
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src={status.qrCode}
                          alt="WhatsApp QR Code"
                          sx={{
                            width: { xs: 280, sm: 320, md: 360 },
                            height: { xs: 280, sm: 320, md: 360 },
                            display: 'block',
                          }}
                        />
                      </Box>
                    </Box>
                  </Fade>

                  {/* Instructions */}
                  <Box
                    sx={{
                      mt: 3,
                      p: 3,
                      bgcolor: alpha('#25D366', 0.05),
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: alpha('#25D366', 0.2),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PhonelinkRing sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Como conectar:
                      </Typography>
                    </Box>

                    <Box component="ol" sx={{ m: 0, pl: 3 }}>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Abra o <strong>WhatsApp</strong> no seu celular
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Toque em <strong>Menu (⋮)</strong> → <strong>Dispositivos conectados</strong>
                      </Typography>
                      <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                        Toque em <strong>Conectar um dispositivo</strong>
                      </Typography>
                      <Typography component="li" variant="body2">
                        Aponte a câmera para este QR Code
                      </Typography>
                    </Box>
                  </Box>

                  {/* Status Badge */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Chip
                      icon={<QrCode2 />}
                      label="Aguardando conexão..."
                      color="success"
                      variant="outlined"
                      sx={{
                        animation: 'pulse 2s infinite',
                        borderWidth: 2,
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Paper sx={{ p: 4 }}>
                {(connecting || status.status === 'initializing') && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                    <Box sx={{ position: 'relative', mb: 3 }}>
                      <CircularProgress
                        size={80}
                        thickness={4}
                        sx={{
                          color: 'primary.main',
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      />
                      <QrCode2
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: 40,
                          color: 'primary.main',
                          opacity: 0.5,
                        }}
                      />
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Gerando QR Code...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
                      Estamos preparando sua conexão com o WhatsApp. Isso pode levar alguns segundos.
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </Zoom>
      )}

      {/* Connection Info */}
      {status.connected && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Sobre a Conexão
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            Sua conta do WhatsApp está conectada e pronta para enviar e receber mensagens automaticamente.
          </Typography>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Importante:</strong> Mantenha o WhatsApp Web conectado para que o sistema funcione corretamente.
            Se você fizer logout ou desconectar este dispositivo pelo celular, será necessário escanear o QR Code novamente.
          </Alert>
        </Paper>
      )}

      {/* Facebook & Instagram Section */}
      <Box sx={{ mb: 4, mt: 6 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Facebook & Instagram
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Conecte suas páginas do Facebook e Instagram para receber mensagens
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" fontWeight={600}>
              Status da Conexão
            </Typography>
          </Box>

          <Chip
            icon={facebookStatus.connected ? <CheckCircle /> : <Error />}
            label={facebookStatus.connected ? 'Conectado' : 'Desconectado'}
            color={facebookStatus.connected ? 'success' : 'default'}
            size="small"
          />
        </Box>

        {facebookStatus.connected && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Página: <strong>{facebookStatus.pageName}</strong> ({facebookStatus.pageId})
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          {!facebookStatus.connected ? (
            <Button
              variant="contained"
              onClick={handleFacebookConnect}
              startIcon={<PowerSettingsNew />}
            >
              Conectar Facebook
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={handleFacebookDisconnect}
              color="error"
              startIcon={<PowerSettingsNew />}
            >
              Desconectar
            </Button>
          )}
        </Box>
      </Paper>

      {/* Page Selection Dialog */}
      <Dialog open={showPageSelection} onClose={() => setShowPageSelection(false)}>
        <DialogTitle>Select Facebook Page</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose the Facebook Page you want to connect to Locai.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Facebook Page</InputLabel>
              <Select
                value={selectedPage}
                label="Facebook Page"
                onChange={(e) => setSelectedPage(e.target.value)}
              >
                {availablePages.map((page) => (
                  <MenuItem key={page.id} value={page.id}>
                    {page.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPageSelection(false)}>Cancel</Button>
          <Button onClick={confirmPageSelection} variant="contained" disabled={!selectedPage}>
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
