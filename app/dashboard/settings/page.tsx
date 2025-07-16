'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateMiniSiteUrl, generateQRCodeUrl } from '@/lib/utils/url-generator';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Avatar,
  Paper,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  useMediaQuery,
  Stack,
} from '@mui/material';
import {
  WhatsApp,
  CheckCircle,
  Save,
  Business,
  Upload,
  SmartToy,
  QrCode2,
  Edit,
  Language,
  Visibility,
  Share,
  Palette,
  Analytics,
  Delete,
  Add,
  PhoneAndroid,
  Link as LinkIcon,
  Settings as SettingsIcon,
  Close,
  Brush,
  Speed,
  Public,
} from '@mui/icons-material';
import QRCode from 'react-qr-code';

interface CompanyConfig {
  name: string;
  logo: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface AIConfig {
  personalityPrompt: string;
  responseStyle: 'formal' | 'friendly' | 'casual';
  customInstructions: string;
  greetingMessage: string;
  unavailableMessage: string;
  autoReply: boolean;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface BillingConfig {
  automaticBilling: boolean;
  reminderDays: number;
  paymentMethods: string[];
  lateFeePercentage: number;
  customMessage: string;
}

export default function SettingsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(0);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'qr' | 'connected'>('disconnected');
  const [whatsappQRCode, setWhatsappQRCode] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<'api' | 'web'>('web');
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whatsappCredentials, setWhatsappCredentials] = useState({
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
  });
  
  // Mini-site states
  const [miniSiteConfig, setMiniSiteConfig] = useState({
    active: false,
    title: 'Minha Imobiliária',
    description: 'Encontre o imóvel perfeito para você',
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    accentColor: '#ed6c02',
    fontFamily: 'modern',
    borderRadius: 'rounded',
    showPrices: true,
    showAvailability: true,
    showReviews: true,
    whatsappNumber: '',
    companyEmail: '',
    seoKeywords: 'imóveis, aluguel, venda, imobiliária',
    customDomain: '',
    template: 'modern-blue',
  });
  const [miniSiteUrl, setMiniSiteUrl] = useState('');
  const [miniSiteAnalytics, setMiniSiteAnalytics] = useState({
    totalViews: 0,
    propertyViews: 0,
    inquiries: 0,
    conversionRate: 0,
  });
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    name: '',
    logo: null,
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  const [aiConfig, setAIConfig] = useState<AIConfig>({
    personalityPrompt: 'Você é um assistente imobiliário profissional e atencioso.',
    responseStyle: 'friendly',
    customInstructions: '',
    greetingMessage: 'Olá! Sou o assistente virtual da {company}. Como posso ajudá-lo hoje?',
    unavailableMessage: 'Desculpe, não tenho imóveis disponíveis com essas características no momento.',
    autoReply: true,
    businessHours: {
      enabled: false,
      start: '09:00',
      end: '18:00',
    },
  });

  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    automaticBilling: false,
    reminderDays: 3,
    paymentMethods: ['PIX', 'Cartão de Crédito'],
    lateFeePercentage: 2,
    customMessage: 'Olá {nome}, seu aluguel de {valor} vence em {dias} dias. Utilize o código PIX abaixo para pagamento.',
  });

  useEffect(() => {
    loadConfiguration();
    generateQRCode();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      
      // Load settings from Firebase
      const response = await fetch('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        
        if (settings) {
          if (settings.company) {
            setCompanyConfig(settings.company);
          }
          if (settings.ai) {
            setAIConfig(settings.ai);
          }
          if (settings.billing) {
            setBillingConfig(settings.billing);
          }
          if (settings.whatsapp) {
            setWhatsappConnected(settings.whatsapp.connected);
            if (settings.whatsapp.phoneNumberId) {
              setWhatsappCredentials({
                phoneNumberId: settings.whatsapp.phoneNumberId,
                accessToken: '', // Don't expose the actual token
                verifyToken: '', // Don't expose the actual token
              });
            }
          }
          if (settings.miniSite) {
            setMiniSiteConfig(prev => ({ ...prev, ...settings.miniSite }));
            // Generate mini-site URL using current user's UID as tenant ID
            const actualTenantId = user?.uid || 'default-tenant';
            const miniSiteUrl = generateMiniSiteUrl({
              tenantId: actualTenantId,
              subdomain: settings.miniSite.customDomain,
              isProduction: process.env.NODE_ENV === 'production'
            });
            setMiniSiteUrl(miniSiteUrl);
          }
        }
      }
      
      // Also check WhatsApp connection status
      await checkWhatsAppConnection();
      
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWhatsAppConnection = async () => {
    try {
      // Check web session status
      const sessionResponse = await fetch('/api/whatsapp/session');
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.data) {
          setWhatsappStatus(sessionData.data.status);
          setWhatsappConnected(sessionData.data.connected);
          setWhatsappQRCode(sessionData.data.qrCode);
          
          if (sessionData.data.connected) {
            setConnectionType('web');
          }
        }
      }
      
      // Also check API connection
      const response = await fetch('/api/config/whatsapp');
      const result = await response.json();
      
      if (result.status === 'connected' && !whatsappConnected) {
        setWhatsappConnected(true);
        setConnectionType('api');
      }
    } catch (error) {
      console.error('Failed to check WhatsApp connection:', error);
      setWhatsappConnected(false);
    }
  };

  const generateQRCode = async () => {
    if (miniSiteUrl) {
      const qrUrl = generateQRCodeUrl(miniSiteUrl, 200);
      setQrCodeData(qrUrl);
    }
  };

  const handleWhatsAppConnectAPI = async () => {
    setConnectingWhatsApp(true);
    try {
      // Test real WhatsApp connection with provided credentials
      const response = await fetch('/api/config/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test',
          ...whatsappCredentials
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Save credentials and mark as connected
        await fetch('/api/config/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'save',
            ...whatsappCredentials
          })
        });
        
        setWhatsappConnected(true);
        setShowQRDialog(false);
        setShowWhatsAppConfig(false);
        alert('WhatsApp conectado com sucesso!');
        // Reload settings to get updated WhatsApp info
        await loadConfiguration();
      } else {
        alert('Erro na conexão: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao conectar WhatsApp. Verifique suas configurações.');
    } finally {
      setConnectingWhatsApp(false);
    }
  };
  
  const handleWhatsAppConnectWeb = async () => {
    setConnectingWhatsApp(true);
    setShowQRDialog(true);
    
    try {
      // Initialize WhatsApp Web session
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        setWhatsappStatus(result.data.status);
        setWhatsappQRCode(result.data.qrCode);
        
        // Start polling for status updates
        startStatusPolling();
      } else {
        alert('Erro ao iniciar sessão WhatsApp');
        setShowQRDialog(false);
      }
    } catch (error) {
      console.error('Error connecting WhatsApp Web:', error);
      alert('Erro ao conectar WhatsApp');
      setShowQRDialog(false);
    } finally {
      setConnectingWhatsApp(false);
    }
  };
  
  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/whatsapp/session');
        if (response.ok) {
          const result = await response.json();
          setWhatsappStatus(result.data.status);
          setWhatsappQRCode(result.data.qrCode);
          
          if (result.data.connected) {
            setWhatsappConnected(true);
            setShowQRDialog(false);
            clearInterval(interval);
            alert('WhatsApp conectado com sucesso!');
            await loadConfiguration();
          }
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Clear interval after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };
  
  const handleWhatsAppDisconnectWeb = async () => {
    try {
      const response = await fetch('/api/whatsapp/session', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setWhatsappConnected(false);
        setWhatsappStatus('disconnected');
        setWhatsappQRCode(null);
        alert('WhatsApp desconectado com sucesso!');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp Web:', error);
      alert('Erro ao desconectar WhatsApp');
    }
  };

  const handleWhatsAppDisconnect = async () => {
    try {
      const response = await fetch('/api/config/whatsapp', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setWhatsappConnected(false);
        setWhatsappCredentials({
          phoneNumberId: '',
          accessToken: '',
          verifyToken: '',
        });
        alert('WhatsApp desconectado com sucesso!');
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      alert('Erro ao desconectar WhatsApp');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingLogo(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/logo', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          setCompanyConfig(prev => ({ ...prev, logo: url }));
        } else {
          const error = await response.json();
          alert(error.error || 'Erro ao enviar logo');
        }
      } catch (error) {
        console.error('Logo upload error:', error);
        alert('Erro ao enviar logo');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      // Save company settings
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'company',
          data: companyConfig
        })
      });

      // Save AI settings
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'ai',
          data: aiConfig
        })
      });

      // Save billing settings
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'billing',
          data: billingConfig
        })
      });

      // Save mini-site settings
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'miniSite',
          data: miniSiteConfig
        })
      });

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleMiniSiteConfigChange = (field: string, value: any) => {
    setMiniSiteConfig(prev => ({ ...prev, [field]: value }));
  };

  const copyMiniSiteUrl = () => {
    navigator.clipboard.writeText(miniSiteUrl);
    alert('URL copiada para a área de transferência!');
  };

  const openMiniSite = () => {
    window.open(miniSiteUrl, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: isMobile ? 1 : 0 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 3,
        gap: 2 
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1" fontWeight={600}>
          Configurações
        </Typography>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={saveAllConfigs}
          disabled={saving}
          fullWidth={isMobile}
          size={isMobile ? "large" : "medium"}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
        >
          <Tab 
            label={isMobile ? "WhatsApp" : "WhatsApp"} 
            icon={<WhatsApp />} 
            iconPosition={isMobile ? "top" : "start"}
            sx={{ minWidth: isMobile ? 100 : 'auto' }}
          />
          <Tab 
            label={isMobile ? "Empresa" : "Empresa"} 
            icon={<Business />} 
            iconPosition={isMobile ? "top" : "start"}
            sx={{ minWidth: isMobile ? 100 : 'auto' }}
          />
          <Tab 
            label={isMobile ? "IA" : "Assistente IA"} 
            icon={<SmartToy />} 
            iconPosition={isMobile ? "top" : "start"}
            sx={{ minWidth: isMobile ? 100 : 'auto' }}
          />
          <Tab 
            label={isMobile ? "Mini-Site" : "Mini-Site"} 
            icon={<Language />} 
            iconPosition={isMobile ? "top" : "start"}
            sx={{ minWidth: isMobile ? 100 : 'auto' }}
          />
          <Tab 
            label={isMobile ? "Cobrança" : "Cobrança Automática"} 
            icon={<SettingsIcon />} 
            iconPosition={isMobile ? "top" : "start"}
            sx={{ minWidth: isMobile ? 100 : 'auto' }}
          />
        </Tabs>
      </Paper>

      {/* WhatsApp Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'stretch' : 'center', 
                  mb: 3,
                  gap: 2
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight={600}>
                      Conexão WhatsApp Business
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conecte seu WhatsApp Business para começar a atender clientes automaticamente
                    </Typography>
                  </Box>
                  {whatsappConnected ? (
                    <Stack 
                      direction={isMobile ? "column" : "row"} 
                      spacing={2}
                      sx={{ width: isMobile ? '100%' : 'auto' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                        <CheckCircle color="success" />
                        <Typography variant="body2" color="success.main" fontWeight={500}>
                          Conectado
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size={isMobile ? "medium" : "small"}
                        onClick={connectionType === 'web' ? handleWhatsAppDisconnectWeb : handleWhatsAppDisconnect}
                        fullWidth={isMobile}
                      >
                        Desconectar
                      </Button>
                    </Stack>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<QrCode2 />}
                      onClick={() => {
                        if (connectionType === 'web') {
                          handleWhatsAppConnectWeb();
                        } else {
                          setShowWhatsAppConfig(true);
                        }
                      }}
                      fullWidth={isMobile}
                      size={isMobile ? "large" : "medium"}
                    >
                      Conectar WhatsApp
                    </Button>
                  )}
                </Box>

                {whatsappConnected && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      Seu WhatsApp Business está conectado e pronto para atender clientes automaticamente.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2,
                            flexDirection: isMobile ? 'column' : 'row',
                            textAlign: isMobile ? 'center' : 'left'
                          }}>
                            <PhoneAndroid color="primary" fontSize={isMobile ? "large" : "medium"} />
                            <Box>
                              <Typography variant="subtitle2">Número Conectado</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {whatsappCredentials.phoneNumberId ? '+55 (XX) XXXXX-XXXX' : 'Não configurado'}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2,
                            flexDirection: isMobile ? 'column' : 'row',
                            textAlign: isMobile ? 'center' : 'left'
                          }}>
                            <LinkIcon color="primary" fontSize={isMobile ? "large" : "medium"} />
                            <Box>
                              <Typography variant="subtitle2">Status da Conexão</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {whatsappConnected ? 'Conectado' : 'Desconectado'}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                {!whatsappConnected && (
                  <Alert severity="info">
                    Conecte seu WhatsApp Business para permitir que o assistente IA responda automaticamente seus clientes 24/7.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Company Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight={600}>
                  Informações da Empresa
                </Typography>

                {/* Logo Upload */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Logo da Empresa
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    gap: isMobile ? 2 : 3,
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    {companyConfig.logo ? (
                      <Avatar
                        src={companyConfig.logo}
                        sx={{ 
                          width: isMobile ? 100 : 80, 
                          height: isMobile ? 100 : 80,
                          alignSelf: isMobile ? 'center' : 'flex-start'
                        }}
                        variant="rounded"
                      />
                    ) : (
                      <Box
                        sx={{
                          width: isMobile ? 100 : 80,
                          height: isMobile ? 100 : 80,
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                          alignSelf: isMobile ? 'center' : 'flex-start'
                        }}
                      >
                        <Business sx={{ fontSize: 32, color: 'text.secondary' }} />
                      </Box>
                    )}
                    <Box sx={{ 
                      width: isMobile ? '100%' : 'auto',
                      textAlign: isMobile ? 'center' : 'left'
                    }}>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="logo-upload"
                        type="file"
                        onChange={handleLogoUpload}
                      />
                      <label htmlFor="logo-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<Upload />}
                          disabled={uploadingLogo}
                          size={isMobile ? "medium" : "small"}
                          fullWidth={isMobile}
                        >
                          {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                        </Button>
                      </label>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        JPG, PNG ou SVG. Máximo 2MB.
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Grid container spacing={isMobile ? 2 : 3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nome da Empresa"
                      value={companyConfig.name}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Imobiliária Exemplo"
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      value={companyConfig.phone}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(21) 99999-9999"
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="E-mail"
                      value={companyConfig.email}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@imobiliaria.com.br"
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={companyConfig.website}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="www.imobiliaria.com.br"
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Endereço"
                      value={companyConfig.address}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Rua das Flores, 123 - Centro - Rio de Janeiro/RJ"
                      multiline
                      rows={2}
                      size={isMobile ? "small" : "medium"}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* AI Assistant Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight={600}>
                  Configurações do Assistente
                </Typography>

                <Grid container spacing={isMobile ? 2 : 3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Estilo de Resposta</InputLabel>
                      <Select
                        value={aiConfig.responseStyle}
                        onChange={(e) => setAIConfig(prev => ({ ...prev, responseStyle: e.target.value as any }))}
                        label="Estilo de Resposta"
                      >
                        <MenuItem value="formal">Formal - Profissional e objetivo</MenuItem>
                        <MenuItem value="friendly">Amigável - Equilibrado e acolhedor</MenuItem>
                        <MenuItem value="casual">Casual - Descontraído e próximo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Mensagem de Boas-vindas"
                      value={aiConfig.greetingMessage}
                      onChange={(e) => setAIConfig(prev => ({ ...prev, greetingMessage: e.target.value }))}
                      multiline
                      rows={2}
                      helperText="Use {company} para incluir o nome da empresa"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Instruções Especiais"
                      value={aiConfig.customInstructions}
                      onChange={(e) => setAIConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
                      multiline
                      rows={3}
                      placeholder="Ex: Sempre mencione nossa política de cancelamento flexível"
                      helperText="Instruções específicas para o assistente seguir"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={aiConfig.autoReply}
                          onChange={(e) => setAIConfig(prev => ({ ...prev, autoReply: e.target.checked }))}
                        />
                      }
                      label="Resposta automática ativada"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={aiConfig.businessHours.enabled}
                            onChange={(e) => setAIConfig(prev => ({ 
                              ...prev, 
                              businessHours: { ...prev.businessHours, enabled: e.target.checked }
                            }))}
                          />
                        }
                        label="Configurar horário de atendimento"
                      />
                      {aiConfig.businessHours.enabled && (
                        <Box sx={{ 
                          mt: 2, 
                          display: 'flex', 
                          gap: 2,
                          flexDirection: isMobile ? 'column' : 'row'
                        }}>
                          <TextField
                            label="Início"
                            type="time"
                            value={aiConfig.businessHours.start}
                            onChange={(e) => setAIConfig(prev => ({ 
                              ...prev, 
                              businessHours: { ...prev.businessHours, start: e.target.value }
                            }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                          />
                          <TextField
                            label="Fim"
                            type="time"
                            value={aiConfig.businessHours.end}
                            onChange={(e) => setAIConfig(prev => ({ 
                              ...prev, 
                              businessHours: { ...prev.businessHours, end: e.target.value }
                            }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            size={isMobile ? "small" : "medium"}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Mini-Site Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'stretch' : 'center', 
                  gap: isMobile ? 2 : 3,
                  mb: 3 
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight={600}>
                      Mini-Site para Imóveis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Crie seu próprio site de imóveis personalizado para compartilhar com clientes
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
                    <Button
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={openMiniSite}
                      disabled={!miniSiteConfig.active}
                      fullWidth={isMobile}
                    >
                      Visualizar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={copyMiniSiteUrl}
                      disabled={!miniSiteConfig.active}
                      fullWidth={isMobile}
                    >
                      Copiar URL
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<QrCode2 />}
                      onClick={() => setShowQRCode(true)}
                      disabled={!miniSiteConfig.active}
                      fullWidth={isMobile}
                    >
                      QR Code
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Configurações Básicas
                      </Typography>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={miniSiteConfig.active}
                            onChange={(e) => handleMiniSiteConfigChange('active', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Ativar Mini-Site"
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Título do Site"
                        value={miniSiteConfig.title}
                        onChange={(e) => handleMiniSiteConfigChange('title', e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Descrição"
                        value={miniSiteConfig.description}
                        onChange={(e) => handleMiniSiteConfigChange('description', e.target.value)}
                        sx={{ mb: 2 }}
                      />
                      
                      <TextField
                        fullWidth
                        label="Palavras-chave SEO"
                        value={miniSiteConfig.seoKeywords}
                        onChange={(e) => handleMiniSiteConfigChange('seoKeywords', e.target.value)}
                        helperText="Separadas por vírgula"
                        sx={{ mb: 2 }}
                      />

                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Button
                          variant="outlined"
                          startIcon={<Brush />}
                          onClick={() => setShowTemplateSelector(true)}
                          fullWidth
                        >
                          Escolher Template
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<Public />}
                          onClick={() => setShowDomainConfig(true)}
                          fullWidth
                        >
                          Domínio
                        </Button>
                      </Box>

                      <Button
                        variant="outlined"
                        startIcon={<Analytics />}
                        onClick={() => setShowAdvancedAnalytics(true)}
                        fullWidth
                        disabled={!miniSiteConfig.active}
                      >
                        Analytics Avançadas
                      </Button>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Personalização Visual
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Cor Primária
                          </Typography>
                          <input
                            type="color"
                            value={miniSiteConfig.primaryColor}
                            onChange={(e) => handleMiniSiteConfigChange('primaryColor', e.target.value)}
                            style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Cor Secundária
                          </Typography>
                          <input
                            type="color"
                            value={miniSiteConfig.secondaryColor}
                            onChange={(e) => handleMiniSiteConfigChange('secondaryColor', e.target.value)}
                            style={{ width: '100%', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          />
                        </Box>
                      </Box>
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Fonte</InputLabel>
                        <Select
                          value={miniSiteConfig.fontFamily}
                          onChange={(e) => handleMiniSiteConfigChange('fontFamily', e.target.value)}
                          label="Fonte"
                        >
                          <MenuItem value="modern">Moderna</MenuItem>
                          <MenuItem value="classic">Clássica</MenuItem>
                          <MenuItem value="elegant">Elegante</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Bordas</InputLabel>
                        <Select
                          value={miniSiteConfig.borderRadius}
                          onChange={(e) => handleMiniSiteConfigChange('borderRadius', e.target.value)}
                          label="Bordas"
                        >
                          <MenuItem value="sharp">Retas</MenuItem>
                          <MenuItem value="rounded">Arredondadas</MenuItem>
                          <MenuItem value="extra-rounded">Muito Arredondadas</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Funcionalidades
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={miniSiteConfig.showPrices}
                                onChange={(e) => handleMiniSiteConfigChange('showPrices', e.target.checked)}
                              />
                            }
                            label="Mostrar Preços"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={miniSiteConfig.showAvailability}
                                onChange={(e) => handleMiniSiteConfigChange('showAvailability', e.target.checked)}
                              />
                            }
                            label="Mostrar Disponibilidade"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={miniSiteConfig.showReviews}
                                onChange={(e) => handleMiniSiteConfigChange('showReviews', e.target.checked)}
                              />
                            }
                            label="Mostrar Avaliações"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 3, 
                      bgcolor: 'background.paper', 
                      borderRadius: 2, 
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        URL do seu Mini-Site
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                          value={miniSiteUrl}
                          InputProps={{
                            readOnly: true,
                            endAdornment: (
                              <IconButton onClick={copyMiniSiteUrl} size="small">
                                <Share />
                              </IconButton>
                            )
                          }}
                          sx={{ flex: 1, minWidth: 300 }}
                        />
                        <Button
                          variant="outlined"
                          startIcon={<Visibility />}
                          onClick={openMiniSite}
                          disabled={!miniSiteConfig.active}
                        >
                          Abrir
                        </Button>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Compartilhe este link com seus clientes para que eles vejam seus imóveis
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Automatic Billing Tab */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'stretch' : 'center', 
                  mb: 3,
                  gap: 2
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom fontWeight={600}>
                      Cobrança Automática via WhatsApp
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure lembretes e cobranças automáticas para aluguéis
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={billingConfig.automaticBilling}
                        onChange={(e) => setBillingConfig(prev => ({ ...prev, automaticBilling: e.target.checked }))}
                        color="primary"
                      />
                    }
                    label="Ativado"
                    sx={{ margin: isMobile ? '0 auto' : 0 }}
                  />
                </Box>

                {billingConfig.automaticBilling && (
                  <Grid container spacing={isMobile ? 2 : 3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Dias de antecedência para lembrete"
                        value={billingConfig.reminderDays}
                        onChange={(e) => setBillingConfig(prev => ({ ...prev, reminderDays: parseInt(e.target.value) }))}
                        InputProps={{ inputProps: { min: 1, max: 30 } }}
                        size={isMobile ? "small" : "medium"}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Multa por atraso (%)"
                        value={billingConfig.lateFeePercentage}
                        onChange={(e) => setBillingConfig(prev => ({ ...prev, lateFeePercentage: parseFloat(e.target.value) }))}
                        InputProps={{ inputProps: { min: 0, max: 10, step: 0.5 } }}
                        size={isMobile ? "small" : "medium"}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Mensagem personalizada"
                        value={billingConfig.customMessage}
                        onChange={(e) => setBillingConfig(prev => ({ ...prev, customMessage: e.target.value }))}
                        multiline
                        rows={3}
                        helperText="Use {nome}, {valor} e {dias} como variáveis"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Métodos de Pagamento Aceitos
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        flexWrap: 'wrap',
                        flexDirection: isMobile ? 'column' : 'row'
                      }}>
                        {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência'].map(method => (
                          <FormControlLabel
                            key={method}
                            control={
                              <Switch
                                size={isMobile ? "medium" : "small"}
                                checked={billingConfig.paymentMethods.includes(method)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBillingConfig(prev => ({ 
                                      ...prev, 
                                      paymentMethods: [...prev.paymentMethods, method]
                                    }));
                                  } else {
                                    setBillingConfig(prev => ({ 
                                      ...prev, 
                                      paymentMethods: prev.paymentMethods.filter(m => m !== method)
                                    }));
                                  }
                                }}
                              />
                            }
                            label={method}
                            sx={{ 
                              width: isMobile ? '100%' : 'auto',
                              marginLeft: 0
                            }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* QR Code Dialog for WhatsApp Web */}
      <Dialog 
        open={showQRDialog} 
        onClose={() => !connectingWhatsApp && setShowQRDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Conectar WhatsApp
          <IconButton
            onClick={() => setShowQRDialog(false)}
            disabled={connectingWhatsApp}
            size="small"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {whatsappStatus === 'qr' && whatsappQRCode ? (
              <>
                <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
                  Escaneie o código QR com seu WhatsApp
                </Typography>
                <Box sx={{ 
                  display: 'inline-block', 
                  p: 2, 
                  bgcolor: 'white',
                  borderRadius: 2,
                  boxShadow: 2
                }}>
                  <QRCode value={whatsappQRCode} size={256} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                  1. Abra o WhatsApp no seu celular<br/>
                  2. Toque em Menu ou Configurações e selecione "Dispositivos conectados"<br/>
                  3. Toque em "Conectar dispositivo"<br/>
                  4. Aponte seu telefone para esta tela para capturar o código
                </Typography>
              </>
            ) : whatsappStatus === 'connecting' ? (
              <>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="body1">
                  Gerando código QR...
                </Typography>
              </>
            ) : whatsappStatus === 'connected' ? (
              <>
                <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h6" color="success.main">
                  WhatsApp conectado com sucesso!
                </Typography>
              </>
            ) : (
              <Typography variant="body1" color="error">
                Erro ao gerar código QR. Tente novamente.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>
            {whatsappStatus === 'connected' ? 'Fechar' : 'Cancelar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Connection Type Selection Dialog */}
      <Dialog
        open={showWhatsAppConfig && connectionType === 'web'}
        onClose={() => setShowWhatsAppConfig(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Escolha o tipo de conexão</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<QrCode2 />}
              onClick={() => {
                setShowWhatsAppConfig(false);
                handleWhatsAppConnectWeb();
              }}
              sx={{ mb: 2 }}
            >
              WhatsApp Web (QR Code)
            </Button>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Business />}
              onClick={() => {
                setConnectionType('api');
              }}
            >
              WhatsApp Business API
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              <strong>WhatsApp Web:</strong> Use seu WhatsApp pessoal ou Business. Conecte via QR Code.<br/><br/>
              <strong>WhatsApp Business API:</strong> Para empresas maiores. Requer aprovação do Meta.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Business API Configuration Dialog */}
      <Dialog 
        open={showWhatsAppConfig && connectionType === 'api'} 
        onClose={() => !connectingWhatsApp && setShowWhatsAppConfig(false)}
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Configurar WhatsApp Business API
          {isMobile && (
            <IconButton
              onClick={() => setShowWhatsAppConfig(false)}
              disabled={connectingWhatsApp}
              size="small"
            >
              <Close />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Para conectar o WhatsApp Business, você precisa das credenciais da API do Meta Business.
                Obtenha essas informações no Facebook Developer Console.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number ID"
                  value={whatsappCredentials.phoneNumberId}
                  onChange={(e) => setWhatsappCredentials(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  placeholder="Ex: 123456789012345"
                  helperText="ID do número de telefone do WhatsApp Business"
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Access Token"
                  type="password"
                  value={whatsappCredentials.accessToken}
                  onChange={(e) => setWhatsappCredentials(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="Ex: EAAxxxxxxxxxx..."
                  helperText="Token de acesso permanente do WhatsApp Business API"
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Verify Token"
                  value={whatsappCredentials.verifyToken}
                  onChange={(e) => setWhatsappCredentials(prev => ({ ...prev, verifyToken: e.target.value }))}
                  placeholder="Ex: meu_token_secreto"
                  helperText="Token de verificação para webhook (defina um valor único)"
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                <strong>Webhook URL:</strong> Configure no Facebook Developer Console:<br/>
                <code style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                  {process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp
                </code>
              </Typography>
            </Alert>

            {connectingWhatsApp && (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Testando conexão...
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0,
          px: isMobile ? 3 : 2,
          pb: isMobile ? 3 : 2
        }}>
          <Button 
            onClick={() => setShowWhatsAppConfig(false)} 
            disabled={connectingWhatsApp}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleWhatsAppConnectAPI}
            color="success"
            disabled={connectingWhatsApp || !whatsappCredentials.phoneNumberId || !whatsappCredentials.accessToken || !whatsappCredentials.verifyToken}
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            {connectingWhatsApp ? 'Testando...' : 'Conectar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}