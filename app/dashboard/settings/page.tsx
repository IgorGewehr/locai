'use client';

import { useState, useEffect } from 'react';
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
  Delete,
  Add,
  PhoneAndroid,
  Link as LinkIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import QRCode from 'qrcode';

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
  const [activeTab, setActiveTab] = useState(0);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whatsappCredentials, setWhatsappCredentials] = useState({
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
  });

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
      const response = await fetch('/api/config/whatsapp');
      const result = await response.json();
      
      if (result.status === 'connected') {
        setWhatsappConnected(true);
      } else {
        setWhatsappConnected(false);
      }
    } catch (error) {
      console.error('Failed to check WhatsApp connection:', error);
      setWhatsappConnected(false);
    }
  };

  const generateQRCode = async () => {
    try {
      // Generate WhatsApp setup instructions QR code
      const setupUrl = `${window.location.origin}/dashboard/settings?tab=whatsapp&setup=true`;
      const qrCode = await QRCode.toDataURL(setupUrl);
      setQrCodeData(qrCode);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleWhatsAppConnect = async () => {
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

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Configurações
        </Typography>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={saveAllConfigs}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="WhatsApp" icon={<WhatsApp />} iconPosition="start" />
          <Tab label="Empresa" icon={<Business />} iconPosition="start" />
          <Tab label="Assistente IA" icon={<SmartToy />} iconPosition="start" />
          <Tab label="Cobrança Automática" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* WhatsApp Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Conexão WhatsApp Business
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conecte seu WhatsApp Business para começar a atender clientes automaticamente
                    </Typography>
                  </Box>
                  {whatsappConnected ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle color="success" />
                        <Typography variant="body2" color="success.main" fontWeight={500}>
                          Conectado
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={handleWhatsAppDisconnect}
                      >
                        Desconectar
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<QrCode2 />}
                      onClick={() => setShowWhatsAppConfig(true)}
                    >
                      Configurar WhatsApp
                    </Button>
                  )}
                </Box>

                {whatsappConnected && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 3 }}>
                      Seu WhatsApp Business está conectado e pronto para atender clientes automaticamente.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <PhoneAndroid color="primary" />
                            <Box>
                              <Typography variant="subtitle2">Número Conectado</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {whatsappCredentials.phoneNumberId ? '+55 (XX) XXXXX-XXXX' : 'Não configurado'}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LinkIcon color="primary" />
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
                <Typography variant="h6" gutterBottom>
                  Informações da Empresa
                </Typography>

                {/* Logo Upload */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Logo da Empresa
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {companyConfig.logo ? (
                      <Avatar
                        src={companyConfig.logo}
                        sx={{ width: 80, height: 80 }}
                        variant="rounded"
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Business sx={{ fontSize: 32, color: 'text.secondary' }} />
                      </Box>
                    )}
                    <Box>
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
                          size="small"
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

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome da Empresa"
                      value={companyConfig.name}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Imobiliária Exemplo"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      value={companyConfig.phone}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(21) 99999-9999"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="E-mail"
                      value={companyConfig.email}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@imobiliaria.com.br"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={companyConfig.website}
                      onChange={(e) => setCompanyConfig(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="www.imobiliaria.com.br"
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
                <Typography variant="h6" gutterBottom>
                  Configurações do Assistente
                </Typography>

                <Grid container spacing={3}>
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
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                          <TextField
                            label="Início"
                            type="time"
                            value={aiConfig.businessHours.start}
                            onChange={(e) => setAIConfig(prev => ({ 
                              ...prev, 
                              businessHours: { ...prev.businessHours, start: e.target.value }
                            }))}
                            InputLabelProps={{ shrink: true }}
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

      {/* Automatic Billing Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
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
                  />
                </Box>

                {billingConfig.automaticBilling && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Dias de antecedência para lembrete"
                        value={billingConfig.reminderDays}
                        onChange={(e) => setBillingConfig(prev => ({ ...prev, reminderDays: parseInt(e.target.value) }))}
                        InputProps={{ inputProps: { min: 1, max: 30 } }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Multa por atraso (%)"
                        value={billingConfig.lateFeePercentage}
                        onChange={(e) => setBillingConfig(prev => ({ ...prev, lateFeePercentage: parseFloat(e.target.value) }))}
                        InputProps={{ inputProps: { min: 0, max: 10, step: 0.5 } }}
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
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência'].map(method => (
                          <FormControlLabel
                            key={method}
                            control={
                              <Switch
                                size="small"
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

      {/* WhatsApp Configuration Dialog */}
      <Dialog 
        open={showWhatsAppConfig} 
        onClose={() => !connectingWhatsApp && setShowWhatsAppConfig(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Configurar WhatsApp Business API
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
                />
              </Grid>
            </Grid>

            <Alert severity="warning" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Webhook URL:</strong> Configure no Facebook Developer Console:<br/>
                <code>{process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp</code>
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
        <DialogActions>
          <Button onClick={() => setShowWhatsAppConfig(false)} disabled={connectingWhatsApp}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleWhatsAppConnect}
            color="success"
            disabled={connectingWhatsApp || !whatsappCredentials.phoneNumberId || !whatsappCredentials.accessToken || !whatsappCredentials.verifyToken}
          >
            {connectingWhatsApp ? 'Testando...' : 'Conectar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}