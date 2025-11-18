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
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

interface WhatsAppStatus {
  isConnected: boolean;
  phone?: string;
  qrCode?: string;
  error?: string;
}

export default function WhatsAppTab() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus>({ isConnected: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWhatsAppStatus();
    // Poll status every 5 seconds
    const interval = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const checkWhatsAppStatus = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          isConnected: data.connected || false,
          phone: data.phone,
          qrCode: data.qrCode,
        });
      }
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        await checkWhatsAppStatus();
      } else {
        setError(data.error || 'Erro ao conectar WhatsApp');
      }
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
      setError('Erro ao conectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setStatus({ isConnected: false });
      } else {
        setError(data.error || 'Erro ao desconectar WhatsApp');
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
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
            icon={status.isConnected ? <CheckCircle /> : <Error />}
            label={status.isConnected ? 'Conectado' : 'Desconectado'}
            color={status.isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>

        {status.isConnected && status.phone && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Número conectado: <strong>{status.phone}</strong>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          {!status.isConnected ? (
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <QrCode2 />}
            >
              {loading ? 'Conectando...' : 'Conectar WhatsApp'}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={handleDisconnect}
                disabled={loading}
                color="error"
              >
                Desconectar
              </Button>
              <Button
                variant="outlined"
                onClick={checkWhatsAppStatus}
                startIcon={<Refresh />}
              >
                Atualizar Status
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* QR Code */}
      {!status.isConnected && status.qrCode && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QrCode2 sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Escaneie o QR Code
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Abra o WhatsApp no seu celular e escaneie este código para conectar:
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 3,
              bgcolor: 'background.default',
              borderRadius: 2,
            }}
          >
            {status.qrCode ? (
              <Image
                src={status.qrCode}
                alt="WhatsApp QR Code"
                width={300}
                height={300}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            ) : (
              <CircularProgress />
            )}
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
      {status.isConnected && (
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
