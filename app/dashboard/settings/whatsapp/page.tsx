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
  alpha,
  TextField,
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
  NotificationsActive,
  Save,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWhatsAppStatus } from '@/lib/hooks/useWhatsAppStatus';

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  qrCode?: string | null;
  mode?: 'web';
}

export default function WhatsAppPage() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();
  const { clearCache, refreshStatus: refreshGlobalStatus } = useWhatsAppStatus();

  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false, status: 'disconnected' });
  const [error, setError] = useState<string | null>(null);

  // WhatsApp do dono (recebe os avisos da Sofia / handoff)
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerSaved, setOwnerSaved] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  useEffect(() => {
    if (!tenantId) return;
    loadStatus();
    loadOwnerPhone();
    return () => stopPolling();
  }, [tenantId]);

  // Restart polling when status changes
  useEffect(() => {
    startPolling();
    if (status.connected) {
      setConnecting(false);
      clearCache();
      refreshGlobalStatus();
    }
  }, [status.status, status.connected]);

  const startPolling = () => {
    stopPolling();
    const interval =
      status.status === 'qr' || status.status === 'qr_ready' || status.status === 'initializing' || status.status === 'connecting'
        ? 2000
        : status.connected
        ? 30000
        : 10000;
    pollingIntervalRef.current = setInterval(loadStatus, interval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const loadStatus = async () => {
    if (!tenantId) return;
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/whatsapp/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success && result.data) {
        setStatus({
          connected: result.data.connected ?? false,
          status: result.data.status ?? 'disconnected',
          phoneNumber: result.data.phoneNumber ?? null,
          businessName: result.data.businessName ?? null,
          qrCode: result.data.qrCode ?? null,
          mode: 'web',
        });
        if (result.data.connected) setError(null);
      }
    } catch {
      // silent
    }
  };

  const loadOwnerPhone = async () => {
    if (!tenantId) return;
    setOwnerLoading(true);
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/tenant/settings/owner-channel', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success && result.data?.ownerWhatsappPhone) {
        setOwnerPhone(result.data.ownerWhatsappPhone);
      }
    } catch {
      // silent
    } finally {
      setOwnerLoading(false);
    }
  };

  const handleSaveOwnerPhone = async () => {
    setOwnerSaving(true);
    setOwnerError(null);
    setOwnerSaved(false);
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/tenant/settings/owner-channel', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ownerWhatsappPhone: ownerPhone.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        if (result.data?.ownerWhatsappPhone) setOwnerPhone(result.data.ownerWhatsappPhone);
        setOwnerSaved(true);
        setTimeout(() => setOwnerSaved(false), 3000);
      } else {
        setOwnerError(result.error || 'Erro ao salvar o WhatsApp do dono');
      }
    } catch {
      setOwnerError('Erro ao salvar o WhatsApp do dono');
    } finally {
      setOwnerSaving(false);
    }
  };

  const handleConnect = async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setConnecting(true);
    setError(null);

    try {
      const token = await getFirebaseToken();

      // Check existing session first
      const sessionRes = await fetch('/api/whatsapp/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sessionRes.ok) {
        const session = (await sessionRes.json()).data;
        if (session?.connected) {
          setStatus({ connected: true, status: 'connected', phoneNumber: session.phoneNumber, businessName: session.businessName, qrCode: null, mode: 'web' });
          clearCache(); refreshGlobalStatus();
          return;
        }
        if (session?.qrCode) {
          setStatus({ connected: false, status: 'qr', qrCode: session.qrCode, mode: 'web' });
          return;
        }
        if (session?.status === 'initializing' || session?.status === 'connecting') {
          setStatus({ connected: false, status: 'initializing', qrCode: null, mode: 'web' });
          return;
        }
      }

      // Create new session
      const res = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 429) {
        setStatus({ connected: false, status: 'initializing', qrCode: null, mode: 'web' });
        return;
      }

      const result = await res.json();
      if (result.success) {
        setStatus({ connected: false, status: 'initializing', qrCode: result.data?.qrCode ?? null, mode: 'web' });
      } else {
        setError(result.error || 'Erro ao iniciar sessão WhatsApp');
        setConnecting(false);
      }
    } catch {
      setError('Erro ao conectar WhatsApp');
      setConnecting(false);
    } finally {
      setTimeout(() => { isConnectingRef.current = false; }, 2000);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getFirebaseToken();
      const res = await fetch('/api/whatsapp/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setStatus({ connected: false, status: 'disconnected', mode: 'web' });
        setConnecting(false);
        stopPolling();
      } else {
        setError('Erro ao desconectar WhatsApp');
      }
    } catch {
      setError('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const isWaiting =
    connecting ||
    status.status === 'initializing' ||
    status.status === 'connecting' ||
    status.status === 'qr' ||
    status.status === 'qr_ready';

  const statusColor = status.connected ? 'success' : isWaiting ? 'warning' : 'error';
  const statusLabel = status.connected
    ? 'Conectado'
    : status.status === 'initializing' || connecting
    ? 'Inicializando...'
    : status.status === 'qr' || status.status === 'qr_ready'
    ? 'Aguardando QR Code'
    : 'Desconectado';

  return (
    <Box>
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

      {/* Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PhoneAndroid sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>Status da Conexão</Typography>
          </Box>
          <Chip
            icon={status.connected ? <CheckCircle /> : <Error />}
            label={statusLabel}
            color={statusColor}
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

        {!status.connected ? (
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={isWaiting}
            startIcon={isWaiting ? <CircularProgress size={20} color="inherit" /> : <QrCode2 />}
          >
            {isWaiting ? 'Aguardando...' : 'Conectar via QR Code'}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnect}
              disabled={loading}
              startIcon={<PowerSettingsNew />}
            >
              Desconectar
            </Button>
            <Button variant="outlined" onClick={loadStatus} startIcon={<Refresh />}>
              Atualizar
            </Button>
          </Box>
        )}
      </Paper>

      {/* WhatsApp do dono (avisos da Sofia / handoff) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <NotificationsActive sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            WhatsApp que recebe os avisos da Sofia
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quando a Sofia qualifica um lead e agenda uma visita, ela avisa um humano
          para fechar o negócio. Informe o número de WhatsApp (com DDD) que deve
          receber esses avisos de atendimento. Esse é o número que você vai conferir
          para assumir a conversa e fechar.
        </Typography>

        {ownerError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOwnerError(null)}>
            {ownerError}
          </Alert>
        )}
        {ownerSaved && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setOwnerSaved(false)}>
            WhatsApp do dono salvo com sucesso.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="WhatsApp do dono"
            placeholder="(11) 99999-9999"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            disabled={ownerLoading || ownerSaving}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            helperText="Inclua o DDD. O DDI (55) é adicionado automaticamente."
          />
          <Button
            variant="contained"
            onClick={handleSaveOwnerPhone}
            disabled={ownerSaving || ownerLoading || !ownerPhone.trim()}
            startIcon={ownerSaving ? <CircularProgress size={18} color="inherit" /> : <Save />}
            sx={{ mt: 0.25 }}
          >
            {ownerSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Box>
      </Paper>

      {/* QR / Loading section */}
      <Zoom in={isWaiting} timeout={400} unmountOnExit>
        <Box>
          {status.qrCode ? (
            <Card
              sx={{
                background: 'linear-gradient(135deg, rgba(37,211,102,0.05), rgba(37,211,102,0.01))',
                border: '2px solid',
                borderColor: 'success.main',
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: `0 0 40px ${alpha('#25D366', 0.2)}`,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Zoom in timeout={300}>
                    <CameraAlt
                      sx={{
                        fontSize: 48, color: 'success.main', mb: 2,
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                          '50%': { opacity: 0.7, transform: 'scale(1.05)' },
                        },
                      }}
                    />
                  </Zoom>
                  <Typography variant="h5" fontWeight={700} gutterBottom>Escaneie o QR Code</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use a câmera do seu celular para conectar
                  </Typography>
                </Box>

                <Fade in timeout={800}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <Box
                      sx={{
                        p: 3, bgcolor: 'white', borderRadius: 4,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: `8px solid ${alpha('#25D366', 0.2)}`,
                        '&:hover': { transform: 'scale(1.02)' },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Box
                        component="img"
                        src={status.qrCode}
                        alt="WhatsApp QR Code"
                        sx={{ width: { xs: 280, sm: 320, md: 360 }, height: { xs: 280, sm: 320, md: 360 }, display: 'block' }}
                      />
                    </Box>
                  </Box>
                </Fade>

                <Box
                  sx={{
                    mt: 3, p: 3,
                    bgcolor: alpha('#25D366', 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha('#25D366', 0.2)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PhonelinkRing sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="subtitle2" fontWeight={600}>Como conectar:</Typography>
                  </Box>
                  <Box component="ol" sx={{ m: 0, pl: 3 }}>
                    {[
                      'Abra o WhatsApp no seu celular',
                      'Toque em Menu (⋮) → Dispositivos conectados',
                      'Toque em Conectar um dispositivo',
                      'Aponte a câmera para este QR Code',
                    ].map((step) => (
                      <Typography key={step} component="li" variant="body2" sx={{ mb: 1 }}>
                        {step}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Chip
                    icon={<QrCode2 />}
                    label="Aguardando conexão..."
                    color="success"
                    variant="outlined"
                    sx={{ animation: 'pulse 2s infinite', borderWidth: 2 }}
                  />
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Paper sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <Box sx={{ position: 'relative', mb: 3 }}>
                  <CircularProgress size={80} thickness={4} sx={{ color: 'primary.main' }} />
                  <QrCode2
                    sx={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 40, color: 'primary.main', opacity: 0.5,
                    }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>Gerando QR Code...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
                  Estamos preparando sua conexão com o WhatsApp. Isso pode levar alguns segundos.
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>
      </Zoom>

      {status.connected && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Sobre a Conexão</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Sua conta do WhatsApp está conectada e pronta para enviar e receber mensagens automaticamente.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Importante:</strong> Mantenha o WhatsApp Web conectado. Se você desconectar este
            dispositivo pelo celular, será necessário escanear o QR Code novamente.
          </Alert>
        </Paper>
      )}
    </Box>
  );
}
