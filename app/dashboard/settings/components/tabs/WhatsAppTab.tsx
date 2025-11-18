'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import {
  QrCode2,
  CheckCircle,
  Error,
  Refresh,
  PhoneAndroid,
  PowerSettingsNew,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  qrCode?: string | null;
}

export default function WhatsAppTab() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false, status: 'disconnected' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    // Poll status every 5 seconds
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

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
          setStatus({
            connected: result.data.connected || false,
            status: result.data.status || 'disconnected',
            phoneNumber: result.data.phoneNumber,
            businessName: result.data.businessName,
            qrCode: result.data.qrCode,
          });
        }
      }
    } catch (err) {
      console.error('Error loading WhatsApp status:', err);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        if (result.data) {
          setStatus({
            connected: result.data.connected || false,
            status: result.data.status || 'initializing',
            phoneNumber: result.data.phoneNumber,
            businessName: result.data.businessName,
            qrCode: result.data.qrCode,
          });
        }
      } else {
        setError(result.error || result.data?.message || 'Erro ao conectar WhatsApp');
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
      setError('Erro ao conectar WhatsApp');
    } finally {
      setConnecting(false);
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

      {/* QR Code */}
      {!status.connected && status.qrCode && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QrCode2 sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Escaneie o QR Code
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Abra o WhatsApp no seu celular e escaneie este código:
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 3,
              bgcolor: 'white',
              borderRadius: 2,
            }}
          >
            <Box
              component="img"
              src={status.qrCode}
              alt="WhatsApp QR Code"
              sx={{
                maxWidth: 300,
                width: '100%',
                height: 'auto',
              }}
            />
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <strong>Como escanear:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li>Abra o WhatsApp no seu celular</li>
              <li>Toque em Mais opções (⋮) → Dispositivos conectados</li>
              <li>Toque em Conectar um dispositivo</li>
              <li>Aponte seu celular para esta tela para escanear o código</li>
            </ol>
          </Alert>
        </Paper>
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
    </Box>
  );
}
