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
  TextField,
  InputAdornment,
  Grid,
  Divider,
} from '@mui/material';
import {
  WhatsApp,
  QrCode,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Close,
  Settings as SettingsIcon,
  Person,
  Lock,
  Edit,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

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

  // Profile states
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !auth.currentUser) return;

    setProfileLoading(true);
    setError(null);

    try {
      await updateProfile(auth.currentUser, {
        displayName: profileData.displayName
      });

      setSuccess('Perfil atualizado com sucesso!');
      setEditingProfile(false);
    } catch (error: any) {
      setError('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user || !auth.currentUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('A confirmação da senha não confere');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setProfileLoading(true);
    setError(null);

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);

      setSuccess('Senha alterada com sucesso!');
      setEditingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        setError('Senha atual incorreta');
      } else {
        setError('Erro ao alterar senha: ' + error.message);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/session');
      if (response.ok) {
        const data = await response.json();
        
        // WhatsApp status check completed
        
        const newSession = {
          connected: data.data?.connected || false,
          phone: data.data?.phoneNumber,
          name: data.data?.businessName,
          status: data.data?.status || 'disconnected',
          qrCode: data.data?.qrCode
        };
        
        setWhatsappSession(newSession);
        
        // If we have a QR code and dialog is not open, open it
        if (data.data?.qrCode && !qrDialogOpen && data.data?.status === 'qr') {
          // QR Code found in status check
          setQrDialogOpen(true);
        }
      }
    } catch (error) {
      // Error checking WhatsApp status
    }
  };

  const initializeWhatsApp = async () => {
    setLoading(true);
    setError(null);
    
    // Starting WhatsApp initialization
    
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      // API response received with connection data
      
      if (data.success) {
        // Update session state with all received data
        setWhatsappSession(prev => ({ 
          ...prev, 
          ...data.data,
          qrCode: data.data.qrCode,
          status: data.data.status || 'connecting'
        }));
        
        if (data.data.qrCode) {
          // QR Code received, opening dialog
          setQrDialogOpen(true);
        } else if (data.data.connected) {
          // Already connected to WhatsApp
          setSuccess('WhatsApp conectado com sucesso!');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          // Waiting for QR code generation
          setError('QR Code não foi gerado. Tente novamente.');
        }
      } else {
        // API error occurred
        setError(data.error || 'Falha ao inicializar WhatsApp');
      }
    } catch (error) {
      // Network error occurred
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
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <DashboardBreadcrumb 
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configurações', href: '/dashboard/settings' }
        ]} 
      />

      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography 
          variant="h4" 
          fontWeight={600} 
          sx={{ 
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
          }}
        >
          Configurações
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Configure seu perfil, conexão WhatsApp e outras preferências
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: { xs: 2, sm: 3 } }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: { xs: 2, sm: 3 } }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Profile Configuration */}
      <Card 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: { xs: 2, sm: 3 },
          mb: { xs: 3, sm: 4 },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            mb: { xs: 3, sm: 4 },
            gap: { xs: 1, sm: 0 },
          }}>
            <Person sx={{ 
              color: 'primary.main', 
              mr: { xs: 0, sm: 2 }, 
              fontSize: { xs: 28, sm: 32 },
              mb: { xs: 1, sm: 0 },
            }} />
            <Box>
              <Typography 
                variant="h5" 
                fontWeight={600} 
                sx={{ 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}
              >
                Perfil do Usuário
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Gerencie suas informações pessoais e senha
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
            {/* Profile Information */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Person sx={{ mr: 1, fontSize: 20 }} />
                  Informações Pessoais
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Nome de Exibição"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!editingProfile || profileLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Email"
                    value={profileData.email}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="primary" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="O email não pode ser alterado"
                  />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {!editingProfile ? (
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => setEditingProfile(true)}
                        disabled={profileLoading}
                      >
                        Editar Perfil
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="contained"
                          startIcon={profileLoading ? <CircularProgress size={20} /> : <Save />}
                          onClick={handleUpdateProfile}
                          disabled={profileLoading}
                        >
                          {profileLoading ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setEditingProfile(false);
                            setProfileData({
                              displayName: user?.displayName || '',
                              email: user?.email || ''
                            });
                          }}
                          disabled={profileLoading}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </Box>
                </Stack>
              </Box>
            </Grid>

            {/* Password Change */}
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Lock sx={{ mr: 1, fontSize: 20 }} />
                  Alterar Senha
                </Typography>

                {!editingPassword ? (
                  <Button
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setEditingPassword(true)}
                    disabled={profileLoading}
                  >
                    Alterar Senha
                  </Button>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Senha Atual"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      disabled={profileLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              edge="end"
                            >
                              {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Nova Senha"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      disabled={profileLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                            >
                              {showNewPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      helperText="Mínimo de 6 caracteres"
                    />

                    <TextField
                      fullWidth
                      label="Confirmar Nova Senha"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      disabled={profileLoading}
                      error={passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      helperText={
                        passwordData.confirmPassword !== '' && passwordData.newPassword !== passwordData.confirmPassword
                          ? 'As senhas não conferem'
                          : undefined
                      }
                    />

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={profileLoading ? <CircularProgress size={20} /> : <Save />}
                        onClick={handleUpdatePassword}
                        disabled={
                          profileLoading ||
                          !passwordData.currentPassword ||
                          !passwordData.newPassword ||
                          !passwordData.confirmPassword ||
                          passwordData.newPassword !== passwordData.confirmPassword
                        }
                      >
                        {profileLoading ? 'Alterando...' : 'Alterar Senha'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditingPassword(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                        }}
                        disabled={profileLoading}
                      >
                        Cancelar
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: { xs: 2, sm: 3 },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            mb: { xs: 3, sm: 4 },
            gap: { xs: 1, sm: 0 },
          }}>
            <WhatsApp sx={{ 
              color: '#25d366', 
              mr: { xs: 0, sm: 2 }, 
              fontSize: { xs: 28, sm: 32 },
              mb: { xs: 1, sm: 0 },
            }} />
            <Box>
              <Typography 
                variant="h5" 
                fontWeight={600} 
                sx={{ 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                }}
              >
                WhatsApp Web
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Conecte sua conta WhatsApp para automação de mensagens
              </Typography>
            </Box>
          </Box>

          {/* Status Card */}
          <Card 
            sx={{ 
              mb: { xs: 3, sm: 4 },
              background: 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${getStatusColor()}40`,
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 },
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 0 },
                }}>
                  {getStatusIcon()}
                  <Box sx={{ ml: { xs: 0, sm: 2 } }}>
                    <Typography 
                      variant="h6" 
                      fontWeight={600}
                      sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                    >
                      {getStatusText()}
                    </Typography>
                    {whatsappSession.name && whatsappSession.phone && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                      >
                        {whatsappSession.name} • {whatsappSession.phone}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: { xs: 1, sm: 2 },
                  alignSelf: { xs: 'flex-end', sm: 'center' },
                }}>
                  <Chip
                    label={whatsappSession.connected ? 'Ativo' : 'Inativo'}
                    size="small"
                    sx={{
                      backgroundColor: `${getStatusColor()}20`,
                      color: getStatusColor(),
                      border: `1px solid ${getStatusColor()}40`,
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
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
                    size={isMobile ? 'small' : 'medium'}
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
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: { xs: 0, sm: 2 },
            m: { xs: 0, sm: 2 },
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          color: 'white',
          p: { xs: 2, sm: 3 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WhatsApp sx={{ 
              color: '#25d366', 
              mr: 1,
              fontSize: { xs: 20, sm: 24 },
            }} />
            <Typography 
              variant="h6" 
              sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
            >
              Conectar WhatsApp
            </Typography>
          </Box>
          <IconButton 
            onClick={() => setQrDialogOpen(false)} 
            sx={{ 
              color: 'white',
              p: { xs: 1, sm: 1.5 },
            }}
          >
            <Close sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ 
          textAlign: 'center', 
          py: { xs: 3, sm: 4 },
          px: { xs: 2, sm: 3 },
        }}>
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
                onError={(e) => {
                  // Error loading QR code image
                }}
                onLoad={() => {
                  // QR Code image loaded successfully
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
              
              {/* Debug info in development */}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  display: 'block', 
                  mt: 2,
                  fontFamily: 'monospace'
                }}
              >
                Debug: QR Type: {whatsappSession.qrCode?.startsWith('data:') ? 'Data URL' : 'Raw String'} | 
                Length: {whatsappSession.qrCode?.length}
              </Typography>
            </Box>
          ) : (
            <Box>
              <CircularProgress size={60} sx={{ mb: 2, color: '#25d366' }} />
              <Typography sx={{ color: 'white' }}>Gerando QR Code...</Typography>
              <Typography 
                variant="caption" 
                sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 1 }}
              >
                Status: {whatsappSession.status}
              </Typography>
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