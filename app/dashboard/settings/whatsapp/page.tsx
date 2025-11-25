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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  Business,
  Facebook,
  WhatsApp,
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
  mode?: 'business_api' | 'web';
}

interface FacebookStatus {
  connected: boolean;
  pageName?: string;
  pageId?: string;
}

interface WABA {
  id: string;
  name: string;
  phone_numbers: {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
  }[];
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

  // Connection Mode State
  const [connectionMode, setConnectionMode] = useState<'web' | 'business_api'>('web');

  // Official API Selection State
  const [showWabaSelection, setShowWabaSelection] = useState(false);
  const [availableWabas, setAvailableWabas] = useState<WABA[]>([]);
  const [selectedWabaId, setSelectedWabaId] = useState<string>('');
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('');
  const [userToken, setUserToken] = useState<string>('');

  // Page Selection State (Facebook/Instagram)
  const [showPageSelection, setShowPageSelection] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false); // Prevent multiple POST calls

  const { login, isSdkLoaded, error: sdkError } = useFacebookSDK();

  useEffect(() => {
    if (sdkError) {
      console.error('[Settings] Facebook SDK Error:', sdkError);
      setError(sdkError);
    }
  }, [sdkError]);

  useEffect(() => {
    loadStatus();
    loadFacebookStatus();

    // Start polling based on status
    startPolling();

    return () => {
      stopPolling();
    };
  }, [tenantId, status.status]);

  // Update connection mode based on status
  useEffect(() => {
    if (status.mode) {
      setConnectionMode(status.mode);
    }
  }, [status.mode]);

  const startPolling = () => {
    // Clear existing interval
    stopPolling();

    // Only poll if in web mode or disconnected
    if (status.mode === 'business_api' && status.connected) {
      return;
    }

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
            mode: result.data.mode || 'web',
          };

          setStatus(newStatus);

          // Log QR code status
          if (newStatus.qrCode && newStatus.mode === 'web') {
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

  // --- Official API Handlers ---

  const handleOfficialConnect = async () => {
    if (!isSdkLoaded) {
      alert('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    try {
      // Request permissions for WhatsApp Business Management
      const authResponse = await login('whatsapp_business_management,whatsapp_business_messaging');

      if (authResponse && authResponse.accessToken) {
        setConnecting(true);
        const firebaseToken = await getFirebaseToken();

        // Exchange token and fetch WABAs
        const response = await fetch('/api/whatsapp/official/auth', {
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

        const result = await response.json();

        if (response.ok && result.success) {
          if (result.wabas && result.wabas.length > 0) {
            setAvailableWabas(result.wabas);
            setUserToken(result.userToken); // Store long-lived token temporarily
            setShowWabaSelection(true);
          } else {
            alert('Nenhuma conta do WhatsApp Business encontrada. Certifique-se de ter criado uma conta no Gerenciador de Negócios do Facebook.');
          }
        } else {
          alert('Falha ao conectar com Facebook: ' + (result.error || 'Erro desconhecido'));
        }
      }
    } catch (err) {
      console.error('Error connecting Official WhatsApp:', err);
      alert('Erro ao conectar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConnecting(false);
    }
  };

  const confirmWabaSelection = async () => {
    if (!selectedWabaId || !selectedPhoneNumberId) return;

    const waba = availableWabas.find(w => w.id === selectedWabaId);
    const phone = waba?.phone_numbers.find(p => p.id === selectedPhoneNumberId);

    if (!waba || !phone) return;

    setConnecting(true);
    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/whatsapp/official/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          tenantId,
          wabaId: selectedWabaId,
          phoneNumberId: selectedPhoneNumberId,
          accessToken: userToken, // Use the long-lived token we got earlier
          businessName: phone.verified_name || waba.name,
        }),
      });

      if (response.ok) {
        await loadStatus();
        setShowWabaSelection(false);
        alert('WhatsApp Oficial conectado com sucesso!');
      } else {
        alert('Falha ao salvar configurações do WhatsApp');
      }
    } catch (err) {
      console.error('Error saving WhatsApp settings:', err);
      alert('Erro ao salvar configurações');
    } finally {
      setConnecting(false);
    }
  };

  // --- Facebook Page Handlers ---

  const handleFacebookConnect = async () => {
    if (!isSdkLoaded) {
      alert('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    try {
      const authResponse = await login('pages_messaging,instagram_manage_messages,pages_show_list,pages_read_engagement');

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

  // --- WhatsApp Web (Baileys) Handlers ---

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
            mode: existingSession.mode || 'web',
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
            mode: 'web',
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
            mode: 'web',
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
          mode: 'web',
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
          mode: 'web',
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
        setStatus({ connected: false, status: 'disconnected', mode: 'web' });
        setConnectionMode('web'); // Reset to default
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
    if (status.connected) return status.mode === 'business_api' ? 'Conectado (API Oficial)' : 'Conectado (Web)';
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

      {/* Debug Info - Temporary */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold">Debug Info:</Typography>
        <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto' }}>
          {JSON.stringify({
            appIdConfigured: !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
            sdkLoaded: isSdkLoaded,
            sdkError: sdkError,
            windowFB: typeof window !== 'undefined' ? !!window.FB : 'N/A',
            timestamp: new Date().toISOString()
          }, null, 2)}
        </Box>
      </Alert>

      {
        error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )
      }

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
            <Typography variant="body2" color="text.secondary">
              Tipo: <strong>{status.mode === 'business_api' ? 'API Oficial (Meta)' : 'WhatsApp Web (QR Code)'}</strong>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {!status.connected ? (
          <Box>
            <Tabs
              value={connectionMode}
              onChange={(_, val) => setConnectionMode(val)}
              sx={{ mb: 3 }}
            >
              <Tab label="WhatsApp Web (QR Code)" value="web" />
              <Tab label="API Oficial (Meta)" value="business_api" />
            </Tabs>

            {connectionMode === 'web' ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={connecting || status.status === 'initializing'}
                  startIcon={connecting ? <CircularProgress size={20} /> : <QrCode2 />}
                >
                  {connecting || status.status === 'initializing' ? 'Gerar QR Code' : 'Conectar via QR Code'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  A API Oficial oferece maior estabilidade e não requer um celular conectado o tempo todo.
                  Requer uma conta do Facebook Business.
                </Alert>
                <Button
                  variant="contained"
                  onClick={handleOfficialConnect}
                  disabled={connecting}
                  startIcon={connecting ? <CircularProgress size={20} /> : <Facebook />}
                  sx={{ bgcolor: '#1877F2', '&:hover': { bgcolor: '#166fe5' }, alignSelf: 'flex-start' }}
                >
                  {connecting ? 'Conectando...' : 'Conectar com Facebook'}
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleDisconnect}
              disabled={loading}
              color="error"
              startIcon={<PowerSettingsNew />}
            >
              Desconectar
            </Button>
            {status.mode === 'web' && (
              <Button
                variant="outlined"
                onClick={loadStatus}
                startIcon={<Refresh />}
              >
                Atualizar Status
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* QR Code Section - Only show if mode is web and disconnected */}
      {
        !status.connected && connectionMode === 'web' && (
          <Zoom in={status.status === 'qr' || status.status === 'qr_ready' || connecting} timeout={500}>
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
        )
      }

      {/* Connection Info */}
      {
        status.connected && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Sobre a Conexão
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Sua conta do WhatsApp está conectada e pronta para enviar e receber mensagens automaticamente.
            </Typography>

            {status.mode === 'web' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Importante:</strong> Mantenha o WhatsApp Web conectado para que o sistema funcione corretamente.
                Se você fizer logout ou desconectar este dispositivo pelo celular, será necessário escanear o QR Code novamente.
              </Alert>
            )}
          </Paper>
        )
      }

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

      {/* Dialogs */}

      {/* WABA Selection Dialog */}
      <Dialog open={showWabaSelection} onClose={() => setShowWabaSelection(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Selecione a Conta do WhatsApp</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Escolha a conta empresarial e o número de telefone que deseja conectar.
          </DialogContentText>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Conta Empresarial (WABA)</InputLabel>
            <Select
              value={selectedWabaId}
              label="Conta Empresarial (WABA)"
              onChange={(e) => {
                setSelectedWabaId(e.target.value);
                setSelectedPhoneNumberId(''); // Reset phone when WABA changes
              }}
            >
              {availableWabas.map((waba) => (
                <MenuItem key={waba.id} value={waba.id}>
                  {waba.name} ({waba.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedWabaId && (
            <FormControl fullWidth>
              <InputLabel>Número de Telefone</InputLabel>
              <Select
                value={selectedPhoneNumberId}
                label="Número de Telefone"
                onChange={(e) => setSelectedPhoneNumberId(e.target.value)}
              >
                {availableWabas
                  .find(w => w.id === selectedWabaId)
                  ?.phone_numbers.map((phone) => (
                    <MenuItem key={phone.id} value={phone.id}>
                      {phone.display_phone_number} - {phone.verified_name} ({phone.quality_rating})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWabaSelection(false)}>Cancelar</Button>
          <Button
            onClick={confirmWabaSelection}
            variant="contained"
            disabled={!selectedWabaId || !selectedPhoneNumberId}
          >
            Conectar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Facebook Page Selection Dialog */}
      <Dialog open={showPageSelection} onClose={() => setShowPageSelection(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Selecione a Página do Facebook</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Escolha a página que deseja conectar para receber mensagens do Facebook e Instagram.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>Página do Facebook</InputLabel>
            <Select
              value={selectedPage}
              label="Página do Facebook"
              onChange={(e) => setSelectedPage(e.target.value)}
            >
              {availablePages.map((page) => (
                <MenuItem key={page.id} value={page.id}>
                  {page.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPageSelection(false)}>Cancelar</Button>
          <Button onClick={confirmPageSelection} variant="contained" disabled={!selectedPage}>
            Conectar
          </Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
}
