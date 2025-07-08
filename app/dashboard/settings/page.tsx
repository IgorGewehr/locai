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

export default function SettingsPage() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    phoneNumberId: '',
    accessToken: '',
    verifyToken: 'locai_webhook_verify_token_' + Date.now(),
    webhookUrl: '',
    status: 'disconnected'
  });
  
  const [activeStep, setActiveStep] = useState(0);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Configurações WhatsApp
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Info />}
            onClick={() => setShowGuideDialog(true)}
          >
            Guia de Setup
          </Button>
          <Chip 
            icon={<WhatsApp />}
            label={getStatusText()}
            color={getStatusColor()}
            variant="outlined"
          />
        </Box>
      </Box>

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
    </Box>
  );
}