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
  Chip,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Avatar,
  Paper,
} from '@mui/material';
import {
  WhatsApp,
  CheckCircle,
  Error,
  Info,
  Save,
  Test,
  Link,
  Phone,
  VpnKey,
  Settings,
  Launch,
  ContentCopy,
  Business,
  Upload,
  SmartToy,
  QrCode,
} from '@mui/icons-material';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  webhookUrl: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastSync?: Date;
}

const steps = [
  'Criar conta Meta Business',
  'Configurar WhatsApp Business API',
  'Obter credenciais',
  'Configurar webhook',
  'Testar conexão'
];

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
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [config, setConfig] = useState<WhatsAppConfig>({
    phoneNumberId: '',
    accessToken: '',
    verifyToken: 'locai_webhook_verify_token_' + Date.now(),
    webhookUrl: '',
    status: 'disconnected'
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
  });
  
  const [activeStep, setActiveStep] = useState(0);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    // Generate webhook URL based on current domain
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setConfig(prev => ({
        ...prev,
        webhookUrl: `${baseUrl}/api/webhook/whatsapp`
      }));
    }
    
    // Load existing configuration
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // In a real app, this would fetch from your backend
      const savedConfig = localStorage.getItem('whatsapp_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to your backend
      localStorage.setItem('whatsapp_config', JSON.stringify(config));
      
      // Simulate API call to update environment variables
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Configuração salva com sucesso! Reinicie o servidor para aplicar as mudanças.');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConfig(prev => ({ 
        ...prev, 
        status: 'connected',
        lastSync: new Date()
      }));
      
      alert('Conexão testada com sucesso!');
    } catch (error) {
      setConfig(prev => ({ ...prev, status: 'error' }));
      alert('Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const getStatusColor = () => {
    switch (config.status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = () => {
    switch (config.status) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando...';
      case 'error': return 'Erro de conexão';
      default: return 'Desconectado';
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingLogo(true);
      // Simulate upload - in production, upload to Firebase Storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyConfig(prev => ({ ...prev, logo: reader.result as string }));
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      // Save all configurations
      localStorage.setItem('whatsapp_config', JSON.stringify(config));
      localStorage.setItem('company_config', JSON.stringify(companyConfig));
      localStorage.setItem('ai_config', JSON.stringify(aiConfig));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Todas as configurações foram salvas com sucesso!');
    } catch (error) {
      console.error('Error saving configurations:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Configurações
        </Typography>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          onClick={saveAllConfigs}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="WhatsApp" icon={<WhatsApp />} iconPosition="start" />
            <Tab label="Empresa" icon={<Business />} iconPosition="start" />
            <Tab label="Assistente IA" icon={<SmartToy />} iconPosition="start" />
          </Tabs>
        </Box>
      </Card>

      {/* WhatsApp Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Current Status */}
          <Grid item xs={12}>
          <Alert 
            severity={config.status === 'connected' ? 'success' : 'info'} 
            icon={config.status === 'connected' ? <CheckCircle /> : <Info />}
          >
            <AlertTitle>Status da Conexão WhatsApp</AlertTitle>
            {config.status === 'connected' ? (
              <>
                Seu WhatsApp Business está conectado e funcionando corretamente.
                {config.lastSync && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Última sincronização: {config.lastSync.toLocaleString()}
                  </Typography>
                )}
              </>
            ) : (
              'Configure suas credenciais WhatsApp Business API para começar a usar o agente AI.'
            )}
          </Alert>
        </Grid>

        {/* Configuration Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Credenciais WhatsApp Business API
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Phone Number ID"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                    placeholder="123456789012345"
                    helperText="ID do número de telefone do WhatsApp Business"
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Access Token"
                    type="password"
                    value={config.accessToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="EAAxxxxxxxxxx..."
                    helperText="Token de acesso permanente do WhatsApp Business API"
                    InputProps={{
                      startAdornment: <VpnKey sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Verify Token"
                    value={config.verifyToken}
                    onChange={(e) => setConfig(prev => ({ ...prev, verifyToken: e.target.value }))}
                    helperText="Token para verificação do webhook (gerado automaticamente)"
                    InputProps={{
                      startAdornment: <Settings sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Webhook URL"
                    value={config.webhookUrl}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Link sx={{ mr: 1, color: 'text.secondary' }} />,
                      endAdornment: (
                        <IconButton onClick={() => copyToClipboard(config.webhookUrl)}>
                          <ContentCopy />
                        </IconButton>
                      )
                    }}
                    helperText="URL do webhook para configurar no Meta Developer Portal"
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveConfiguration}
                  disabled={!config.phoneNumberId || !config.accessToken || saving}
                  loading={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar Configuração'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Test />}
                  onClick={handleTestConnection}
                  disabled={!config.phoneNumberId || !config.accessToken || testing}
                  loading={testing}
                >
                  {testing ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Links */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Links Úteis
              </Typography>
              
              <List>
                <ListItem 
                  button 
                  component="a" 
                  href="https://developers.facebook.com/apps/" 
                  target="_blank"
                >
                  <ListItemIcon>
                    <Launch />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Meta Developer Portal"
                    secondary="Criar app e obter credenciais"
                  />
                </ListItem>
                
                <ListItem 
                  button 
                  component="a" 
                  href="https://business.whatsapp.com/" 
                  target="_blank"
                >
                  <ListItemIcon>
                    <WhatsApp />
                  </ListItemIcon>
                  <ListItemText 
                    primary="WhatsApp Business"
                    secondary="Gerenciar conta business"
                  />
                </ListItem>
                
                <ListItem 
                  button 
                  component="a" 
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                  target="_blank"
                >
                  <ListItemIcon>
                    <Info />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Documentação API"
                    secondary="Guia completo da API"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

          {/* Environment Variables */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Variáveis de Ambiente (.env.local)
                </Typography>
                
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>Importante</AlertTitle>
                  Adicione estas variáveis ao seu arquivo .env.local e reinicie o servidor.
                </Alert>
                
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                  <pre style={{ margin: 0, fontSize: '0.875rem' }}>
{`# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=${config.phoneNumberId || 'your_phone_number_id'}
WHATSAPP_ACCESS_TOKEN=${config.accessToken || 'your_access_token'}
WHATSAPP_VERIFY_TOKEN=${config.verifyToken}

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_api_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="your_private_key"
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com`}
                  </pre>
                </Box>
                
                <Button
                  startIcon={<ContentCopy />}
                  onClick={() => copyToClipboard(`WHATSAPP_PHONE_NUMBER_ID=${config.phoneNumberId}\nWHATSAPP_ACCESS_TOKEN=${config.accessToken}\nWHATSAPP_VERIFY_TOKEN=${config.verifyToken}`)}
                  sx={{ mt: 2 }}
                >
                  Copiar Configuração
                </Button>
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
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Logo da Empresa
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {companyConfig.logo ? (
                      <Avatar
                        src={companyConfig.logo}
                        sx={{ width: 100, height: 100 }}
                        variant="rounded"
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 100,
                          height: 100,
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Business sx={{ fontSize: 40, color: 'text.secondary' }} />
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
                        >
                          {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                        </Button>
                      </label>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
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
                      placeholder="Imobiliária XYZ"
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
            <Alert severity="info" sx={{ mb: 3 }}>
              Personalize como o assistente IA responde aos clientes. As configurações abaixo ajustam o comportamento e tom das respostas.
            </Alert>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personalidade do Assistente
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
                        <MenuItem value="formal">Formal - Mais profissional e distante</MenuItem>
                        <MenuItem value="friendly">Amigável - Equilibrado e acolhedor</MenuItem>
                        <MenuItem value="casual">Casual - Descontraído e próximo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Prompt de Personalidade"
                      value={aiConfig.personalityPrompt}
                      onChange={(e) => setAIConfig(prev => ({ ...prev, personalityPrompt: e.target.value }))}
                      multiline
                      rows={3}
                      helperText="Define a personalidade base do assistente"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Instruções Customizadas"
                      value={aiConfig.customInstructions}
                      onChange={(e) => setAIConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
                      multiline
                      rows={4}
                      placeholder="Ex: Sempre mencione nossa política de cancelamento flexível. Destaque a proximidade da praia."
                      helperText="Instruções específicas para o assistente seguir"
                    />
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
                      label="Mensagem de Indisponibilidade"
                      value={aiConfig.unavailableMessage}
                      onChange={(e) => setAIConfig(prev => ({ ...prev, unavailableMessage: e.target.value }))}
                      multiline
                      rows={2}
                      helperText="Mensagem quando não há imóveis disponíveis"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Exemplos de Respostas
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Estilo Atual: {aiConfig.responseStyle === 'formal' ? 'Formal' : aiConfig.responseStyle === 'friendly' ? 'Amigável' : 'Casual'}
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {aiConfig.responseStyle === 'formal' 
                        ? '"Boa tarde. Temos disponível um excelente apartamento que atende aos seus requisitos. Permite-me apresentar os detalhes?"'
                        : aiConfig.responseStyle === 'friendly'
                        ? '"Olá! Que bom falar com você! 😊 Encontrei um apartamento perfeito que acho que vai adorar. Posso te mostrar?"'
                        : '"Oi! Achei um apê incrível que tem tudo a ver com o que você procura! Quer dar uma olhada?"'
                      }
                    </Typography>
                  </Paper>
                </Box>
                
                <Alert severity="info">
                  <AlertTitle>Dicas</AlertTitle>
                  <Typography variant="body2">
                    • Use um tom consistente com sua marca<br/>
                    • Instruções claras melhoram as respostas<br/>
                    • Teste diferentes estilos com clientes reais
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Conexão WhatsApp QR Code
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<QrCode />}
                    onClick={() => setShowQRDialog(true)}
                    color="success"
                  >
                    Conectar WhatsApp
                  </Button>
                </Box>
                
                <Alert severity={config.status === 'connected' ? 'success' : 'warning'}>
                  Status: {config.status === 'connected' ? 'WhatsApp conectado e funcionando' : 'WhatsApp desconectado - Clique em "Conectar WhatsApp" para iniciar'}
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Setup Guide Dialog */}
      <Dialog open={showGuideDialog} onClose={() => setShowGuideDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Guia de Configuração WhatsApp Business API
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  {index === 0 && (
                    <Box>
                      <Typography variant="body2" paragraph>
                        1. Acesse <strong>business.facebook.com</strong> e crie uma conta business
                      </Typography>
                      <Typography variant="body2" paragraph>
                        2. Verifique sua empresa com documentos válidos
                      </Typography>
                      <Typography variant="body2" paragraph>
                        3. Adicione uma conta WhatsApp Business ao seu portfólio
                      </Typography>
                    </Box>
                  )}
                  
                  {index === 1 && (
                    <Box>
                      <Typography variant="body2" paragraph>
                        1. Acesse <strong>developers.facebook.com/apps</strong>
                      </Typography>
                      <Typography variant="body2" paragraph>
                        2. Clique em "Criar App" → "Business" → "WhatsApp"
                      </Typography>
                      <Typography variant="body2" paragraph>
                        3. Conecte sua conta WhatsApp Business ao app
                      </Typography>
                      <Typography variant="body2" paragraph>
                        4. Adicione um número de telefone ao app
                      </Typography>
                    </Box>
                  )}
                  
                  {index === 2 && (
                    <Box>
                      <Typography variant="body2" paragraph>
                        1. No painel do app, vá em "WhatsApp" → "Getting Started"
                      </Typography>
                      <Typography variant="body2" paragraph>
                        2. Copie o <strong>Phone Number ID</strong>
                      </Typography>
                      <Typography variant="body2" paragraph>
                        3. Gere um <strong>Access Token</strong> permanente
                      </Typography>
                      <Typography variant="body2" paragraph>
                        4. Salve estas credenciais em local seguro
                      </Typography>
                    </Box>
                  )}
                  
                  {index === 3 && (
                    <Box>
                      <Typography variant="body2" paragraph>
                        1. Vá em "WhatsApp" → "Configuration"
                      </Typography>
                      <Typography variant="body2" paragraph>
                        2. Adicione a URL do webhook: <code>{config.webhookUrl}</code>
                      </Typography>
                      <Typography variant="body2" paragraph>
                        3. Use o Verify Token: <code>{config.verifyToken}</code>
                      </Typography>
                      <Typography variant="body2" paragraph>
                        4. Inscreva-se nos eventos: messages, message_status
                      </Typography>
                    </Box>
                  )}
                  
                  {index === 4 && (
                    <Box>
                      <Typography variant="body2" paragraph>
                        1. Insira suas credenciais na tela de configuração
                      </Typography>
                      <Typography variant="body2" paragraph>
                        2. Clique em "Testar Conexão"
                      </Typography>
                      <Typography variant="body2" paragraph>
                        3. Envie uma mensagem teste para seu número
                      </Typography>
                      <Typography variant="body2" paragraph>
                        4. Verifique se o agente AI responde corretamente
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(prev => prev + 1)}
                      disabled={activeStep === steps.length - 1}
                      sx={{ mr: 1 }}
                    >
                      {activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
                    </Button>
                    <Button
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep(prev => prev - 1)}
                    >
                      Voltar
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGuideDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Conectar WhatsApp Business
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" gutterBottom>
              Escaneie o QR Code com seu WhatsApp Business
            </Typography>
            <Box 
              sx={{ 
                width: 250, 
                height: 250, 
                mx: 'auto', 
                my: 3, 
                border: '2px solid',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.100'
              }}
            >
              <Typography variant="caption" color="text.secondary">
                [QR Code seria gerado aqui]
              </Typography>
            </Box>
            <Alert severity="info">
              1. Abra o WhatsApp Business no seu celular<br/>
              2. Vá em Configurações → Dispositivos conectados<br/>
              3. Clique em "Conectar dispositivo"<br/>
              4. Escaneie este QR Code
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}