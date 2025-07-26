'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  WhatsApp,
  QrCode,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Close,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';

interface WhatsAppSession {
  connected: boolean;
  phone?: string;
  name?: string;
  qrCode?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export default function SettingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { tenantId, isReady } = useTenant();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession>({
    connected: false,
    status: 'disconnected'
  });

  useEffect(() => {
    checkWhatsAppStatus();
    
    // Check WhatsApp status every 10 seconds
    const interval = setInterval(checkWhatsAppStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/session');
      if (response.ok) {
        const data = await response.json();
        setWhatsappSession({
          connected: data.data?.connected || false,
          phone: data.data?.phoneNumber,
          name: data.data?.businessName,
          status: data.data?.status || 'disconnected',
          qrCode: data.data?.qrCode
        });
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    }
  };

  const initializeWhatsApp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.data.qrCode) {
          setWhatsappSession(prev => ({ 
            ...prev, 
            qrCode: data.data.qrCode, 
            status: 'connecting' 
          }));
          setQrDialogOpen(true);
        } else if (data.data.connected) {
          setWhatsappSession(prev => ({ 
            ...prev, 
            connected: true, 
            status: 'connected' 
          }));
          setSuccess('WhatsApp conectado com sucesso!');
          setTimeout(() => setSuccess(null), 3000);
        }
      } else {
        setError(data.error || 'Falha ao inicializar WhatsApp');
      }
    } catch (error) {
      setError('Erro ao conectar com WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'DELETE'
      });

      if (response.ok) {
        setWhatsappSession({
          connected: false,
          phone: undefined,
          name: undefined,
          qrCode: undefined,
          status: 'disconnected'
        });
        setQrDialogOpen(false);
        setSuccess('WhatsApp desconectado com sucesso');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error) {
      setError('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (whatsappSession.status) {
      case 'connected':
        return <CheckCircle sx={{ color: '#22c55e', fontSize: 24 }} />;
      case 'connecting':
        return <CircularProgress size={24} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444', fontSize: 24 }} />;
      default:
        return <QrCode sx={{ color: '#6b7280', fontSize: 24 }} />;
    }
  };

  const getStatusText = () => {
    switch (whatsappSession.status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'error':
        return 'Erro na conexão';
      default:
        return 'Desconectado';
    }
  };

  const getStatusColor = () => {
    switch (whatsappSession.status) {
      case 'connected':
        return '#22c55e';
      case 'connecting':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <DashboardBreadcrumb 
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/dashboard/settings' }
        ]} 
      />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} sx={{ mb: 1 }}>
          Configurações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure sua conexão WhatsApp e outras preferências
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* WhatsApp Configuration */}
      <Card 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <WhatsApp sx={{ color: '#25d366', mr: 2, fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
                WhatsApp Web
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Conecte sua conta WhatsApp para automação de mensagens
              </Typography>
            </Box>
          </Box>

          {/* Status Card */}
          <Card 
            sx={{ 
              mb: 4,
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${getStatusColor()}40`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {getStatusIcon()}
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      {getStatusText()}
                    </Typography>
                    {whatsappSession.name && whatsappSession.phone && (
                      <Typography variant="body2" color="text.secondary">
                        {whatsappSession.name} • {whatsappSession.phone}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={whatsappSession.connected ? 'Ativo' : 'Inativo'}
                    size="small"
                    sx={{
                      backgroundColor: `${getStatusColor()}20`,
                      color: getStatusColor(),
                      border: `1px solid ${getStatusColor()}40`,
                      fontWeight: 600,
                    }}
                  />
                  
                  <Switch
                    checked={whatsappSession.connected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        initializeWhatsApp();
                      } else {
                        disconnectWhatsApp();
                      }
                    }}
                    disabled={loading}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Actions */}
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
            {!whatsappSession.connected && (
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QrCode />}
                onClick={initializeWhatsApp}
                disabled={loading}
                sx={{
                  backgroundColor: '#25d366',
                  '&:hover': { backgroundColor: '#128c7e' },
                }}
              >
                {loading ? 'Conectando...' : 'Conectar WhatsApp'}
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={checkWhatsAppStatus}
              disabled={loading}
            >
              Atualizar Status
            </Button>
          </Stack>

          {/* Instructions */}
          <Alert 
            severity="info" 
            sx={{ 
              mt: 3,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Como conectar:
            </Typography>
            <Typography variant="body2" component="div">
              1. Clique em "Conectar WhatsApp"<br/>
              2. Escaneie o QR Code com seu telefone<br/>
              3. WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo<br/>
              4. Aguarde a confirmação de conexão
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WhatsApp sx={{ color: '#25d366', mr: 1 }} />
            Conectar WhatsApp
          </Box>
          <IconButton onClick={() => setQrDialogOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {whatsappSession.qrCode ? (
            <Box>
              <img 
                src={whatsappSession.qrCode} 
                alt="QR Code" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  padding: '16px'
                }} 
              />
              
              <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'white' }}>
                Escaneie o QR Code
              </Typography>
              
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                1. Abra o WhatsApp no seu telefone<br/>
                2. Menu → Dispositivos conectados<br/>
                3. "Conectar dispositivo"<br/>
                4. Escaneie este código
              </Typography>
            </Box>
          ) : (
            <Box>
              <CircularProgress size={60} sx={{ mb: 2, color: '#25d366' }} />
              <Typography sx={{ color: 'white' }}>Gerando QR Code...</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setQrDialogOpen(false)} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Fechar
          </Button>
          <Button 
            onClick={initializeWhatsApp} 
            variant="contained"
            sx={{
              backgroundColor: '#25d366',
              '&:hover': { backgroundColor: '#128c7e' },
            }}
          >
            Gerar Novo QR Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}