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
  Tabs,
  Tab,
  TextField,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Business,
  Palette,
  Notifications,
  Security,
  Language,
  Api,
  Analytics,
  SmartToy,
  Public,
  Payment,
  ExpandMore,
  Upload,
  Save,
  VolumeUp,
  Speed,
  RecordVoiceOver,
  AccessTime,
  Campaign,
  Webhook,
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

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: 'pt-BR' | 'en-US';
    notifications: {
      email: boolean;
      whatsapp: boolean;
      system: boolean;
    };
  };
}

interface CompanySettings {
  name: string;
  logo?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface AISettings {
  personality: 'formal' | 'friendly' | 'casual';
  autoReply: boolean;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  rateLimit: {
    messagesPerMinute: number;
    messagesPerHour: number;
  };
  voice: {
    enabled: boolean;
    model: 'tts-1' | 'tts-1-hd';
    voice: 'nova' | 'shimmer' | 'echo' | 'fable' | 'onyx';
    speed: number;
  };
}

interface MiniSiteSettings {
  enabled: boolean;
  title: string;
  description: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: 'modern' | 'classic' | 'elegant';
  };
  features: {
    showPrices: boolean;
    showAvailability: boolean;
    showReviews: boolean;
  };
  customDomain?: string;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { tenantId, isReady } = useTenant();

  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // States for different settings sections
  const [whatsappSession, setWhatsappSession] = useState<WhatsAppSession>({
    connected: false,
    status: 'disconnected'
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    preferences: {
      theme: 'light',
      language: 'pt-BR',
      notifications: {
        email: true,
        whatsapp: true,
        system: true,
      }
    }
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  const [aiSettings, setAISettings] = useState<AISettings>({
    personality: 'friendly',
    autoReply: true,
    businessHours: {
      enabled: true,
      start: '09:00',
      end: '18:00',
    },
    rateLimit: {
      messagesPerMinute: 20,
      messagesPerHour: 500,
    },
    voice: {
      enabled: false,
      model: 'tts-1',
      voice: 'nova',
      speed: 1.0,
    }
  });

  const [miniSiteSettings, setMiniSiteSettings] = useState<MiniSiteSettings>({
    enabled: false,
    title: '',
    description: '',
    theme: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      fontFamily: 'modern',
    },
    features: {
      showPrices: true,
      showAvailability: true,
      showReviews: false,
    }
  });

  const tabs = [
    { label: 'WhatsApp Web API', icon: <WhatsApp />, value: 0 },
  ];

  useEffect(() => {
    loadSettings();
    checkWhatsAppStatus();
    
    // Check WhatsApp status every 15 seconds
    const interval = setInterval(checkWhatsAppStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load all settings in parallel
      const [profileResponse, companyResponse, aiResponse, miniSiteResponse] = await Promise.all([
        fetch('/api/auth/profile'),
        fetch('/api/settings/company'),
        fetch('/api/settings/ai'),
        fetch('/api/mini-site/settings'),
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUserProfile(prev => ({ ...prev, ...profileData.data }));
      }

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        setCompanySettings(prev => ({ ...prev, ...companyData.data }));
      }

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        setAISettings(prev => ({ ...prev, ...aiData.data }));
      }

      if (miniSiteResponse.ok) {
        const miniSiteData = await miniSiteResponse.json();
        setMiniSiteSettings(prev => ({ ...prev, ...miniSiteData.data }));
      }
    } catch (error) {
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (section: string, data: any) => {
    try {
      setSaveLoading(true);
      setError(null);
      
      const endpoints = {
        profile: '/api/auth/profile',
        company: '/api/settings/company',
        ai: '/api/settings/ai',
        minisite: '/api/mini-site/settings',
      };

      const endpoint = endpoints[section as keyof typeof endpoints];
      if (!endpoint) throw new Error('Seção inválida');

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSuccess('Configurações salvas com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      setError('Erro ao salvar configurações');
    } finally {
      setSaveLoading(false);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/session');
      if (response.ok) {
        const data = await response.json();
        setWhatsappSession({
          connected: data.data?.connected || false,
          phone: data.data?.phoneNumber,
          name: data.data?.businessName,
          status: data.data?.status || 'disconnected'
        });
      }
    } catch (error) {
      // Handled silently
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
      setError('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
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

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <SettingsIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Configurações
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie todas as configurações do seu sistema
          </Typography>
        </Box>
      </Box>

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

      <Paper 
        sx={{ 
          borderRadius: 3, 
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            p: 3,
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WhatsApp sx={{ color: '#25d366', mr: 2, fontSize: 40 }} />
            <Box>
              <Typography variant="h5" fontWeight={700} color="white">
                Configuração do WhatsApp Web API
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Configure a conexão com o WhatsApp para automatizar suas conversas
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* WhatsApp Settings */}
        <Box sx={{ p: 4, background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} lg={8}>
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 4,
                  border: '2px solid #e3f2fd',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 4,
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)',
                    border: '1px solid #c8e6c9'
                  }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '50%', 
                      bgcolor: '#25d366',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 3
                    }}>
                      <WhatsApp sx={{ color: 'white', fontSize: 32 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700} sx={{ color: '#2e7d32', mb: 1 }}>
                        WhatsApp Web Connection
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#4caf50' }}>
                        Conecte sua conta WhatsApp para automação completa de mensagens
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    mb: 4,
                    p: 3,
                    borderRadius: 3,
                    background: whatsappSession.connected 
                      ? 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)' 
                      : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                    border: whatsappSession.connected 
                      ? '2px solid #4caf50' 
                      : '2px solid #f44336'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {whatsappSession.status === 'connected' ? (
                        <CheckCircle sx={{ 
                          color: '#2e7d32', 
                          mr: 2, 
                          fontSize: 40,
                          filter: 'drop-shadow(0 2px 4px rgba(46, 125, 50, 0.3))'
                        }} />
                      ) : whatsappSession.status === 'error' ? (
                        <ErrorIcon sx={{ 
                          color: '#d32f2f', 
                          mr: 2, 
                          fontSize: 40,
                          filter: 'drop-shadow(0 2px 4px rgba(211, 47, 47, 0.3))'
                        }} />
                      ) : (
                        <QrCode sx={{ 
                          color: '#666', 
                          mr: 2, 
                          fontSize: 40,
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                        }} />
                      )}
                      
                      <Box>
                        <Typography variant="h6" fontWeight={600} sx={{ 
                          color: whatsappSession.connected ? '#2e7d32' : '#d32f2f',
                          mb: 0.5
                        }}>
                          {whatsappSession.status === 'connected' ? '🟢 Conectado' : 
                           whatsappSession.status === 'connecting' ? '🟡 Conectando' : '🔴 Desconectado'}
                        </Typography>
                        {whatsappSession.name && (
                          <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 500 }}>
                            📱 {whatsappSession.name} • {whatsappSession.phone}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ 
                      background: whatsappSession.connected 
                        ? 'linear-gradient(135deg, #4caf50, #2e7d32)' 
                        : 'linear-gradient(135deg, #f44336, #d32f2f)',
                      borderRadius: 3,
                      p: 1
                    }}>
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
                        sx={{
                          '& .MuiSwitch-track': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '& .MuiSwitch-thumb': {
                            color: 'white',
                          }
                        }}
                      />
                    </Box>
                  </Box>

                  <Stack direction={isMobile ? 'column' : 'row'} spacing={3} sx={{ mb: 4 }}>
                    {!whatsappSession.connected && (
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <QrCode />}
                        onClick={initializeWhatsApp}
                        disabled={loading}
                        sx={{
                          background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                          '&:hover': { 
                            background: 'linear-gradient(135deg, #128c7e 0%, #0d7968 100%)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(37, 211, 102, 0.4)'
                          },
                          borderRadius: 3,
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {loading ? 'Conectando...' : '🚀 Conectar WhatsApp'}
                      </Button>
                    )}

                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<Refresh />}
                      onClick={checkWhatsAppStatus}
                      disabled={loading}
                      sx={{
                        borderColor: '#1976d2',
                        color: '#1976d2',
                        '&:hover': { 
                          backgroundColor: '#1976d2',
                          color: 'white',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)'
                        },
                        borderRadius: 3,
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        borderWidth: 2
                      }}
                    >
                      🔄 Atualizar Status
                    </Button>
                  </Stack>

                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      border: '1px solid #2196f3',
                      '& .MuiAlert-icon': {
                        fontSize: '1.5rem'
                      }
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      <strong>📋 Como conectar:</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6 }}>
                      1. 📱 Clique em "Conectar WhatsApp"<br/>
                      2. 📷 Escaneie o QR Code com seu telefone<br/>
                      3. 📲 WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo<br/>
                      4. ✅ Aguarde a confirmação de conexão
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Card 
                variant="outlined"
                sx={{ 
                  borderRadius: 4,
                  border: '2px solid #e8f5e8',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%)',
                  boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight={700} sx={{ 
                    color: '#2e7d32', 
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    📊 Informações da Conexão
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, #f3e5f5 0%, #e8eaf6 100%)',
                      border: '1px solid #9c27b0'
                    }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#7b1fa2', mb: 1 }}>
                        🔗 Tipo de Conexão
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4a148c' }}>
                        WhatsApp Web (QR Code)
                      </Typography>
                    </Box>

                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                      border: '1px solid #ff9800'
                    }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#f57c00', mb: 1 }}>
                        🏢 Tenant ID
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#e65100',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        wordBreak: 'break-all'
                      }}>
                        {tenantId}
                      </Typography>
                    </Box>

                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2, 
                      background: whatsappSession.connected 
                        ? 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
                        : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                      border: whatsappSession.connected 
                        ? '1px solid #4caf50' 
                        : '1px solid #f44336'
                    }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ 
                        color: whatsappSession.connected ? '#2e7d32' : '#d32f2f', 
                        mb: 1 
                      }}>
                        ⚡ Status da API
                      </Typography>
                      <Chip 
                        label={whatsappSession.connected ? "🟢 Ativo" : "🔴 Inativo"}
                        sx={{
                          background: whatsappSession.connected 
                            ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
                            : 'linear-gradient(135deg, #f44336, #d32f2f)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

      </Paper>

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