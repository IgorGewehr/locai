'use client';

import { useState, useEffect, useCallback } from 'react';
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
  LinearProgress,
  Fade,
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
import { useWhatsAppStatus } from '@/contexts/WhatsAppStatusContext';
import DashboardBreadcrumb from '@/components/atoms/DashboardBreadcrumb';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ApiClient } from '@/lib/utils/api-client';

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
  const { status: whatsappSession, refreshStatus, isRefreshing } = useWhatsAppStatus();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [userClosedDialog, setUserClosedDialog] = useState(false); // Track if user manually closed
  const [connecting, setConnecting] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [qrExpireTimer, setQrExpireTimer] = useState<NodeJS.Timeout | null>(null);
  const [connectionCheckInterval, setConnectionCheckInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Use the same status from context as TopAppBar
  const currentSession = whatsappSession;

  // Monitor connection status changes for automatic dialog closing
  useEffect(() => {
    if (currentSession.connected && qrDialogOpen) {
      // Connection successful! Show success feedback and close dialog
      console.log('🎉 [Settings] Connection successful, closing QR dialog');
      
      // Clear any existing timers
      if (qrExpireTimer) {
        clearTimeout(qrExpireTimer);
        setQrExpireTimer(null);
      }
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        setConnectionCheckInterval(null);
      }
      
      // Show success message
      setSuccess('🎉 WhatsApp conectado com sucesso!');
      setConnectionProgress(100);
      
      // Connection successful - context will handle cleanup
      
      // Close dialog after a brief success display
      setTimeout(() => {
        setQrDialogOpen(false);
        setUserClosedDialog(false);
        setConnecting(false);
        setConnectionProgress(0);
      }, 2000);
      
      // Clear success message after a bit longer
      setTimeout(() => {
        setSuccess(null);
      }, 4000);
    }
  }, [currentSession.connected, qrDialogOpen, qrExpireTimer, connectionCheckInterval]);

  // Auto-open QR dialog when QR code is available (only if user didn't close it manually)
  useEffect(() => {
    // Open dialog if QR code is available, regardless of status
    if (currentSession.qrCode && !currentSession.connected && !qrDialogOpen && !userClosedDialog) {
      setTimeout(() => setQrDialogOpen(true), 300);
    }
    
    // Reset the flag when QR code is no longer available or connected
    if (!currentSession.qrCode || currentSession.connected) {
      setUserClosedDialog(false);
    }
  }, [currentSession.qrCode, currentSession.connected, qrDialogOpen, userClosedDialog]);

  // Initial status refresh when component mounts
  useEffect(() => {
    if (user && tenantId && isReady) {
      refreshStatus();
    }
  }, [user, tenantId, isReady]); // Removed refreshStatus to prevent infinite loop

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData(prev => {
        const newData = {
          displayName: user.displayName || '',
          email: user.email || ''
        };
        // Only update if the data actually changed
        if (prev.displayName !== newData.displayName || prev.email !== newData.email) {
          return newData;
        }
        return prev;
      });
    }
  }, [user?.displayName, user?.email]); // More specific dependencies

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

  const initializeWhatsApp = async () => {
    console.log('🚀 [Settings] Starting WhatsApp initialization');
    console.log('👤 [Settings] User:', !!user, 'TenantId:', !!tenantId);
    
    setLoading(true);
    setConnecting(true);
    setError(null);
    setSuccess(null);
    setConnectionProgress(0);
    setUserClosedDialog(false); // Reset the flag when starting new connection
    
    try {
      // Faster initial feedback
      setConnectionProgress(15);
      setSuccess('Conectando com WhatsApp...');
      
      console.log('📡 [Settings] Making POST request to /api/whatsapp/session');
      
      // Start the connection process
      const response = await ApiClient.post('/api/whatsapp/session');
      console.log('📡 [Settings] POST Response status:', response.status);
      setConnectionProgress(40);
      
      const data = await response.json();
      console.log('📋 [Settings] POST Response data:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        setConnectionProgress(70);
        setSuccess('Processando QR Code...');
        
        console.log('📋 [Settings] QR Code present:', !!data.data?.qrCode);
        console.log('📋 [Settings] Status:', data.data?.status);
        
        // Force refresh status to update context immediately
        await refreshStatus();
        
        if (data.data.qrCode) {
          console.log('✅ QR Code received, opening dialog');
          setConnectionProgress(100);
          setSuccess('QR Code pronto!');
          
          // Start QR code expiration timer (2 minutes)
          if (qrExpireTimer) clearTimeout(qrExpireTimer);
          const timer = setTimeout(() => {
            setSuccess('QR Code expirado. Gerando novo...');
            initializeWhatsApp();
          }, 120000); // 2 minutes
          setQrExpireTimer(timer);
          
          // Open dialog immediately for better UX
          setTimeout(() => setQrDialogOpen(true), 200);
          
          // Start polling for connection status every 3 seconds for faster sync
          const checkConnection = setInterval(() => {
            console.log('🔄 [Settings] Checking connection status while QR is displayed');
            refreshStatus();
          }, 3000);
          
          setConnectionCheckInterval(checkConnection);
        } else if (data.data.connected) {
          setConnectionProgress(100);
          setSuccess('Já conectado!');
          setTimeout(() => setSuccess(null), 2000);
        } else {
          // More helpful message
          setConnectionProgress(85);
          setSuccess('Aguarde, gerando QR Code...');
          // Refresh status after initializing immediately
          await refreshStatus();
        }
      } else {
        setConnectionProgress(0);
        setError(data.error || 'Falha ao conectar. Tente novamente.');
      }
    } catch (error: any) {
      setConnectionProgress(0);
      setError('Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
      // Optimized cleanup timing
      setTimeout(() => {
        setConnecting(false);
        if (!currentSession.qrCode && !currentSession.connected) {
          setConnectionProgress(0);
        }
      }, 2000);
    }
  };

  const disconnectWhatsApp = async () => {
    setLoading(true);
    
    // Clear all timers
    if (qrExpireTimer) {
      clearTimeout(qrExpireTimer);
      setQrExpireTimer(null);
    }
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      setConnectionCheckInterval(null);
    }
    
    try {
      const response = await ApiClient.delete('/api/whatsapp/session');

      if (response.ok) {
        setQrDialogOpen(false);
        setUserClosedDialog(false); // Reset flag on disconnect
        setSuccess('WhatsApp desconectado');
        setTimeout(() => setSuccess(null), 2000);
        // Refresh status to update all components
        refreshStatus();
      }
    } catch (error) {
      setError('Erro ao desconectar');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (currentSession.status) {
      case 'connected':
        return <CheckCircle sx={{ color: '#22c55e', fontSize: 24 }} />;
      case 'connecting':
      case 'qr':
        return <CircularProgress size={24} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ef4444', fontSize: 24 }} />;
      default:
        return <QrCode sx={{ color: '#6b7280', fontSize: 24 }} />;
    }
  };

  const getStatusText = () => {
    switch (currentSession.status) {
      case 'connected':
        return 'WhatsApp Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'qr':
        return 'Aguardando QR Code';
      case 'error':
        return 'Erro na conexão';
      default:
        return 'WhatsApp Desconectado';
    }
  };

  const getStatusColor = () => {
    switch (currentSession.status) {
      case 'connected':
        return '#22c55e';
      case 'connecting':
      case 'qr':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#ef4444';
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
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setProfileData(prev => {
                        if (prev.displayName !== newValue) {
                          return { ...prev, displayName: newValue };
                        }
                        return prev;
                      });
                    }}
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
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPasswordData(prev => {
                          if (prev.currentPassword !== newValue) {
                            return { ...prev, currentPassword: newValue };
                          }
                          return prev;
                        });
                      }}
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
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPasswordData(prev => {
                          if (prev.newPassword !== newValue) {
                            return { ...prev, newPassword: newValue };
                          }
                          return prev;
                        });
                      }}
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
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPasswordData(prev => {
                          if (prev.confirmPassword !== newValue) {
                            return { ...prev, confirmPassword: newValue };
                          }
                          return prev;
                        });
                      }}
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
                    {currentSession.name && currentSession.phone && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                      >
                        {currentSession.name} • {currentSession.phone}
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
                    label={currentSession.connected ? 'Ativo' : 'Inativo'}
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
                    checked={currentSession.connected}
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

          {/* QR Available Alert - Show when user closed dialog but QR is still available */}
          {!currentSession.connected && currentSession.qrCode && userClosedDialog && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#f59e0b',
                },
              }}
            >
              QR Code disponível! Clique em "Mostrar QR Code" para continuar a conexão.
            </Alert>
          )}

          {/* Connection Progress - Notion Style */}
          {connecting && (
            <Card sx={{ 
              mb: 3,
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: 2,
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      border: '2px solid rgba(16, 185, 129, 0.3)',
                      borderTop: '2px solid #10b981',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      mr: 1.5,
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }} 
                  />
                  <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 500, fontSize: '0.875rem' }}>
                    Gerando QR Code...
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  height: 3,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  mb: 1
                }}>
                  <Box sx={{
                    height: '100%',
                    width: `${connectionProgress}%`,
                    backgroundColor: '#10b981',
                    borderRadius: 1.5,
                    transition: 'width 0.3s ease',
                  }} />
                </Box>
                
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    display: 'block'
                  }}
                >
                  {connectionProgress < 100 ? 'Conectando com WhatsApp...' : 'QR Code pronto!'}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
            {/* Show QR button if user closed dialog but QR is still available */}
            {!currentSession.connected && currentSession.qrCode && userClosedDialog && (
              <Button
                variant="contained"
                size="large"
                startIcon={<QrCode sx={{ fontSize: 18 }} />}
                onClick={() => {
                  setQrDialogOpen(true);
                  setUserClosedDialog(false);
                }}
                sx={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  py: 1.5,
                  px: 4,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': { 
                    backgroundColor: '#f97316',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Mostrar QR Code
              </Button>
            )}
            
            {!currentSession.connected && !currentSession.qrCode && (
              <Button
                variant="contained"
                size="large"
                startIcon={
                  loading ? (
                    <Box 
                      sx={{ 
                        width: 16, 
                        height: 16, 
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        }
                      }} 
                    />
                  ) : connecting ? (
                    <CheckCircle sx={{ fontSize: 18 }} />
                  ) : (
                    <QrCode sx={{ fontSize: 18 }} />
                  )
                }
                onClick={initializeWhatsApp}
                disabled={loading || connecting}
                sx={{
                  backgroundColor: connecting ? '#10b981' : (loading ? '#6b7280' : '#25d366'),
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  py: 1.5,
                  px: 4,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  transition: 'all 0.15s ease',
                  '&:hover': { 
                    backgroundColor: connecting ? '#10b981' : (loading ? '#6b7280' : '#22c55e'),
                    transform: loading || connecting ? 'none' : 'translateY(-1px)',
                  },
                  '&:disabled': {
                    backgroundColor: connecting ? '#10b981' : '#6b7280',
                    color: '#ffffff',
                    opacity: 1,
                  },
                }}
              >
                {connecting ? 'Gerando QR...' : loading ? 'Preparando...' : 'Conectar WhatsApp'}
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
              onClick={refreshStatus}
              disabled={isRefreshing || loading}
              sx={{
                borderColor: 'rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: 2,
                py: 1.5,
                px: 3,
                fontWeight: 500,
                fontSize: '0.875rem',
                textTransform: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.25)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  transform: loading ? 'none' : 'translateY(-1px)',
                },
                '&:disabled': {
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                },
              }}
            >
              Atualizar
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
        onClose={() => {
          setQrDialogOpen(false);
          setUserClosedDialog(true); // Mark that user manually closed
          
          // Clear timers when dialog is closed manually
          if (qrExpireTimer) {
            clearTimeout(qrExpireTimer);
            setQrExpireTimer(null);
          }
          if (connectionCheckInterval) {
            clearInterval(connectionCheckInterval);
            setConnectionCheckInterval(null);
          }
        }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            background: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            color: '#ffffff',
            p: 3,
            pb: 2,
            fontSize: '1.125rem',
            fontWeight: 600,
          }}
        >
          Escanear QR Code
          <IconButton 
            onClick={() => {
              setQrDialogOpen(false);
              setUserClosedDialog(true); // Mark that user manually closed
              
              // Clear timers when dialog is closed manually
              if (qrExpireTimer) {
                clearTimeout(qrExpireTimer);
                setQrExpireTimer(null);
              }
              if (connectionCheckInterval) {
                clearInterval(connectionCheckInterval);
                setConnectionCheckInterval(null);
              }
            }} 
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              p: 1,
              borderRadius: 2,
              ml: 2,
              '&:hover': {
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ 
          textAlign: 'center', 
          py: 3,
          px: 3,
        }}>
          {currentSession.connected ? (
            // Success state
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 120,
                height: 120,
                backgroundColor: '#22c55e',
                borderRadius: '50%',
                mb: 3,
                animation: 'success-pulse 1s ease-in-out',
                '@keyframes success-pulse': {
                  '0%': { transform: 'scale(0.8)', opacity: 0.7 },
                  '50%': { transform: 'scale(1.1)', opacity: 1 },
                  '100%': { transform: 'scale(1)', opacity: 1 },
                }
              }}>
                <CheckCircle sx={{ fontSize: 60, color: 'white' }} />
              </Box>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#22c55e',
                  fontWeight: 600,
                  mb: 1
                }}
              >
                Conectado com Sucesso!
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  mb: 2
                }}
              >
                Seu WhatsApp foi conectado à plataforma
              </Typography>
            </Box>
          ) : currentSession.qrCode ? (
            <Box>
              <Box sx={{
                display: 'inline-block',
                p: 2,
                backgroundColor: 'white',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.3)',
                }
              }}>
                <img 
                  src={currentSession.qrCode} 
                  alt="QR Code WhatsApp" 
                  style={{ 
                    width: '260px', // Slightly larger for better scanning
                    height: '260px',
                    display: 'block',
                  }} 
                  loading="eager" // Priority loading
                  onError={(e) => {
                    console.log('QR Code image failed to load');
                  }}
                  onLoad={() => {
                    console.log('QR Code ready for scanning');
                  }}
                />
              </Box>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  color: '#ffffff',
                  fontWeight: 500,
                  fontSize: '1rem'
                }}
              >
                Escaneie com seu WhatsApp
              </Typography>
              
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.85rem',
                  mb: 3
                }}
              >
                O QR Code expira em 2 minutos
              </Typography>
              
              <Box sx={{ 
                display: 'inline-flex',
                flexDirection: 'column',
                gap: 1,
                p: 2,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', textAlign: 'left' }}>
                  1. Abra o WhatsApp
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', textAlign: 'left' }}>
                  2. Menu → Dispositivos conectados
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', textAlign: 'left' }}>
                  3. Toque em "Conectar dispositivo"
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem', textAlign: 'left' }}>
                  4. Aponte a câmera para este QR Code
                </Typography>
              </Box>
              
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    display: 'block', 
                    mt: 2,
                    fontFamily: 'monospace'
                  }}
                >
                  Debug: QR Type: {currentSession.qrCode?.startsWith('data:') ? 'Data URL' : 'Raw String'} | 
                  Length: {currentSession.qrCode?.length}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ py: 4 }}>
              <Box 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  border: '3px solid rgba(16, 185, 129, 0.3)',
                  borderTop: '3px solid #10b981',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 3,
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }} 
              />
              <Typography sx={{ color: '#ffffff', fontWeight: 500, mb: 1 }}>Gerando QR Code...</Typography>
              <Typography 
                variant="body2" 
                sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}
              >
                Aguarde alguns segundos
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => {
              setQrDialogOpen(false);
              setUserClosedDialog(true); // Mark that user manually closed
            }} 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              py: 1,
              borderRadius: 2,
              '&:hover': {
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Fechar
          </Button>
          <Button 
            onClick={initializeWhatsApp} 
            variant="contained"
            sx={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              py: 1,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': { 
                backgroundColor: '#059669',
                transform: 'translateY(-1px)',
              },
            }}
          >
            Gerar novo QR
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}