'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  WhatsApp,
  QrCode,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Close,
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

  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession>({
    connected: false,
    status: 'disconnected'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    checkWhatsAppStatus();
    
    // Check status every 10 seconds
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
          phone: data.data?.phone,
          name: data.data?.name,
          status: data.data?.status || 'disconnected'
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
        body: JSON.stringify({ action: 'initialize' })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.data.qrCode) {
          setWhatsappSession(prev => ({ ...prev, qrCode: data.data.qrCode, status: 'connecting' }));
          setQrDialogOpen(true);
        } else if (data.data.connected) {
          setWhatsappSession(prev => ({ ...prev, connected: true, status: 'connected' }));
        }
      } else {
        setError(data.error || 'Falha ao inicializar WhatsApp');
      }
    } catch (error) {
      setError('Erro ao conectar com WhatsApp');
      console.error('WhatsApp initialization error:', error);
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
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (whatsappSession.status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (whatsappSession.status) {
      case 'connected': return `Conectado${whatsappSession.name ? ` como ${whatsappSession.name}` : ''}`;
      case 'connecting': return 'Conectando...';
      case 'error': return 'Erro de conexão';
      default: return 'Desconectado';
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

      <Typography variant="h4" gutterBottom fontWeight={600}>
        Configurações
      </Typography>

      <Grid container spacing={3}>
        {/* WhatsApp Configuration */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <WhatsApp sx={{ color: '#25d366', mr: 2, fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    WhatsApp Web
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Conecte seu WhatsApp para receber e enviar mensagens
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {whatsappSession.status === 'connected' ? (
                    <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                  ) : whatsappSession.status === 'error' ? (
                    <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />
                  ) : (
                    <QrCode sx={{ color: 'text.secondary', mr: 1 }} />
                  )}
                  <Typography variant="body1" color={`${getStatusColor()}.main`}>
                    {getStatusText()}
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
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
                      color="success"
                    />
                  }
                  label=""
                />
              </Box>

              {whatsappSession.phone && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Telefone: {whatsappSession.phone}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {!whatsappSession.connected && (
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <QrCode />}
                    onClick={initializeWhatsApp}
                    disabled={loading}
                    sx={{
                      backgroundColor: '#25d366',
                      '&:hover': { backgroundColor: '#128c7e' }
                    }}
                  >
                    {loading ? 'Conectando...' : 'Conectar WhatsApp'}
                  </Button>
                )}

                {whatsappSession.connected && (
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={checkWhatsAppStatus}
                    disabled={loading}
                  >
                    Atualizar Status
                  </Button>
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                💡 <strong>Como conectar:</strong> Clique em "Conectar WhatsApp", escaneie o QR Code 
                com seu telefone (WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Informações do Sistema
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Tenant ID:</strong> {tenantId}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Usuário:</strong> {user?.email}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                <strong>Tipo de Conexão:</strong> WhatsApp Web (QR Code)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Conectar WhatsApp
          <IconButton onClick={() => setQrDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          {whatsappSession.qrCode && (
            <Box>
              <img 
                src={whatsappSession.qrCode} 
                alt="QR Code" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }} 
              />
              
              <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                Escaneie o QR Code com seu WhatsApp
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                1. Abra o WhatsApp no seu telefone<br/>
                2. Toque em Menu → Dispositivos conectados<br/>
                3. Toque em "Conectar dispositivo"<br/>
                4. Escaneie este código
              </Typography>
            </Box>
          )}
          
          {whatsappSession.status === 'connecting' && !whatsappSession.qrCode && (
            <Box>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography>Aguardando QR Code...</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>
            Fechar
          </Button>
          <Button onClick={initializeWhatsApp} variant="contained">
            Gerar Novo QR Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}