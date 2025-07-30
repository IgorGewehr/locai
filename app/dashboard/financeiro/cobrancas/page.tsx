'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  Alert,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  RadioGroup,
  Radio,
  FormHelperText,
  CircularProgress,
  Snackbar,
  Collapse,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Settings,
  WhatsApp,
  Schedule,
  Message,
  TrendingUp,
  Warning,
  CheckCircle,
  Edit,
  Save,
  Cancel,
  Add,
  Delete,
  ExpandMore,
  ExpandLess,
  Info,
  AttachMoney,
  CalendarMonth,
  AccessTime,
  People,
  Campaign,
  Analytics,
  Preview,
  Send,
  Smartphone,
  BusinessCenter,
} from '@mui/icons-material';
import { BillingSettings, SimpleBillingConfig, BillingTemplate, TEMPLATE_VARIABLES } from '@/lib/types/billing';
import { useAuth } from '@/lib/hooks/useAuth';
import GeneralSettings from './components/GeneralSettings';
import MessageTemplates from './components/MessageTemplates';
import ScheduleSettings from './components/ScheduleSettings';
import CampaignManager from './components/CampaignManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CobrancasConfigPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [simpleMode, setSimpleMode] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [advancedSettings, setAdvancedSettings] = useState<BillingSettings | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Configuração simplificada
  const [simpleConfig, setSimpleConfig] = useState<SimpleBillingConfig>({
    enabled: false,
    reminderDays: '2_days',
    overdueReminder: true,
    tone: 'friendly',
    autoSend: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Get authentication token
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('Token de autenticação não encontrado');
        showSnackbar('Erro de autenticação', 'error');
        return;
      }

      const response = await fetch('/api/billing/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          showSnackbar('Token de autenticação inválido', 'error');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
        setAdvancedSettings(data.settings);
        // Converter configurações complexas para simples
        setSimpleConfig({
          enabled: data.settings.enabled,
          reminderDays: `${data.settings.defaultReminderDays}_day${data.settings.defaultReminderDays > 1 ? 's' : ''}` as any,
          overdueReminder: data.settings.defaultOverdueDays > 0,
          tone: data.settings.templates.beforeDue.tone,
          autoSend: true
        });
      } else {
        // Configurações não encontradas, criar padrões
        const defaultSettings = {
          id: '',
          tenantId: user?.uid || '',
          enabled: false,
          defaultReminderDays: 2,
          defaultOverdueDays: 1,
          maxReminders: 3,
          sendTimeStart: '09:00',
          sendTimeEnd: '18:00',
          workDays: [1, 2, 3, 4, 5],
          templates: {
            beforeDue: {
              id: 'before_due_default',
              name: 'Lembrete antes do vencimento',
              message: 'Sua fatura vence em breve',
              tone: 'friendly' as const,
              includePaymentLink: true,
              includeInvoice: false
            },
            onDue: {
              id: 'on_due_default',
              name: 'Lembrete no vencimento',
              message: 'Sua fatura vence hoje',
              tone: 'friendly' as const,
              includePaymentLink: true,
              includeInvoice: false
            },
            overdue: {
              id: 'overdue_default',
              name: 'Cobrança em atraso',
              message: 'Sua fatura está em atraso',
              tone: 'friendly' as const,
              includePaymentLink: true,
              includeInvoice: true
            },
            receipt: {
              id: 'receipt_default',
              name: 'Confirmação de pagamento',
              message: 'Pagamento confirmado',
              tone: 'friendly' as const,
              includePaymentLink: false,
              includeInvoice: true
            }
          },
          transactionTypes: {
            all: true,
            reservation: true,
            maintenance: true,
            cleaning: true,
            commission: true,
            other: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setAdvancedSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      showSnackbar('Erro ao carregar configurações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSimpleSettings = async () => {
    try {
      setSaving(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showSnackbar('Erro de autenticação', 'error');
        return;
      }

      const response = await fetch('/api/billing/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ simpleConfig })
      });

      if (response.ok) {
        showSnackbar('Configurações salvas com sucesso!', 'success');
        await loadSettings();
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showSnackbar('Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAdvancedSettings = async () => {
    try {
      setSaving(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showSnackbar('Erro de autenticação', 'error');
        return;
      }

      const response = await fetch('/api/billing/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: advancedSettings })
      });

      if (response.ok) {
        showSnackbar('Configurações avançadas salvas com sucesso!', 'success');
        await loadSettings();
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showSnackbar('Erro ao salvar configurações avançadas', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvancedSettingsChange = (updates: Partial<BillingSettings>) => {
    if (advancedSettings) {
      setAdvancedSettings({ ...advancedSettings, ...updates });
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const processTestReminders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        showSnackbar('Erro de autenticação', 'error');
        return;
      }

      const response = await fetch('/api/billing/reminders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'process_pending' })
      });

      if (response.ok) {
        showSnackbar('Lembretes processados com sucesso!', 'success');
      }
    } catch (error) {
      showSnackbar('Erro ao processar lembretes', 'error');
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
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      bgcolor: 'background.default',
      minHeight: '100vh',
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: { xs: 2, sm: 0 },
        mb: 4 
      }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
            Configurações de Cobrança
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure lembretes automáticos via WhatsApp para suas cobranças
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={simpleMode ? 'simple' : 'advanced'}
          exclusive
          onChange={(_, value) => value && setSimpleMode(value === 'simple')}
          size="small"
          sx={{ 
            '& .MuiToggleButton-root': { 
              px: 2, 
              py: 1,
              minWidth: 120,
              fontSize: '0.875rem',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
              }
            }
          }}
        >
          <ToggleButton value="simple">
            <Smartphone sx={{ mr: 1, fontSize: 20 }} />
            Modo Simples
          </ToggleButton>
          <ToggleButton value="advanced">
            <BusinessCenter sx={{ mr: 1, fontSize: 20 }} />
            Modo Avançado
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {simpleMode ? (
        // Modo Simples - Para pequenos proprietários
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card 
              sx={{ 
                borderRadius: 2,
                boxShadow: (theme) => theme.shadows[1],
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: (theme) => `1px solid ${theme.palette.divider}`
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between', 
                  gap: { xs: 2, sm: 0 },
                  mb: 3 
                }}>
                  <Box>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      Cobrança Automática via WhatsApp
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure lembretes automáticos para seus clientes
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={simpleConfig.enabled}
                        onChange={(e) => setSimpleConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        color="primary"
                        size="medium"
                      />
                    }
                    label={
                      <Chip 
                        label={simpleConfig.enabled ? 'Ativado' : 'Desativado'}
                        color={simpleConfig.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    }
                    labelPlacement="start"
                    sx={{ 
                      m: 0,
                      '& .MuiFormControlLabel-label': { mr: 1 }
                    }}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Collapse in={simpleConfig.enabled}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600} color="primary">
                        Quando enviar lembretes?
                      </Typography>
                      <FormControl fullWidth>
                        <RadioGroup
                          value={simpleConfig.reminderDays}
                          onChange={(e) => setSimpleConfig(prev => ({ ...prev, reminderDays: e.target.value as any }))}
                        >
                          <FormControlLabel 
                            value="none" 
                            control={<Radio />} 
                            label="Não enviar lembretes antes do vencimento" 
                          />
                          <FormControlLabel 
                            value="1_day" 
                            control={<Radio />} 
                            label="1 dia antes do vencimento" 
                          />
                          <FormControlLabel 
                            value="2_days" 
                            control={<Radio />} 
                            label="2 dias antes do vencimento (recomendado)" 
                          />
                          <FormControlLabel 
                            value="3_days" 
                            control={<Radio />} 
                            label="3 dias antes do vencimento" 
                          />
                          <FormControlLabel 
                            value="7_days" 
                            control={<Radio />} 
                            label="7 dias antes do vencimento" 
                          />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={simpleConfig.overdueReminder}
                            onChange={(e) => setSimpleConfig(prev => ({ ...prev, overdueReminder: e.target.checked }))}
                          />
                        }
                        label="Enviar lembrete após o vencimento"
                      />
                      <FormHelperText>
                        Envia um lembrete 1 dia após o vencimento se o pagamento não foi realizado
                      </FormHelperText>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600} color="primary">
                        Tom da mensagem
                      </Typography>
                      <ToggleButtonGroup
                        value={simpleConfig.tone}
                        exclusive
                        onChange={(_, value) => value && setSimpleConfig(prev => ({ ...prev, tone: value }))}
                        fullWidth
                      >
                        <ToggleButton value="formal">
                          <BusinessCenter sx={{ mr: 1 }} />
                          Formal
                        </ToggleButton>
                        <ToggleButton value="friendly">
                          <People sx={{ mr: 1 }} />
                          Amigável
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Grid>

                    <Grid item xs={12}>
                      <Alert severity="info">
                        <Typography variant="body2">
                          As cobranças serão enviadas automaticamente via WhatsApp entre 9h e 18h, de segunda a sexta.
                          O sistema envia no máximo 3 lembretes por fatura.
                        </Typography>
                      </Alert>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          startIcon={<Preview />}
                          onClick={() => setShowPreview(true)}
                        >
                          Visualizar Mensagem
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={saveSimpleSettings}
                          disabled={saving}
                        >
                          {saving ? <CircularProgress size={24} /> : 'Salvar Configurações'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              <Card 
                sx={{ 
                  borderRadius: 2,
                  boxShadow: (theme) => theme.shadows[1],
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Info sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={600}>Como funciona?</Typography>
                  </Box>
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            1. Criação automática
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Quando você criar uma fatura, o sistema programa os lembretes automaticamente
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            2. Envio inteligente
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Mensagens são enviadas no horário comercial via WhatsApp
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            3. Acompanhamento
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Você recebe notificações sobre respostas e pagamentos
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="subtitle2" fontWeight={600}>
                            4. Confirmação automática
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Quando o cliente pagar, o sistema atualiza automaticamente
                          </Typography>
                        }
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              <Card sx={{ 
                borderRadius: 2,
                boxShadow: (theme) => theme.shadows[1],
                bgcolor: 'background.paper',
                border: (theme) => `1px solid ${theme.palette.divider}`
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" fontWeight={600}>Benefícios</Typography>
                  </Box>
                  <Typography variant="body2" paragraph color="text.secondary">
                    • Redução de inadimplência em até 40%
                  </Typography>
                  <Typography variant="body2" paragraph color="text.secondary">
                    • Economia de tempo com cobranças manuais
                  </Typography>
                  <Typography variant="body2" paragraph color="text.secondary">
                    • Melhora no relacionamento com clientes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Pagamentos mais rápidos
                  </Typography>
                </CardContent>
              </Card>

              {simpleConfig.enabled && (
                <Card sx={{ 
                  borderRadius: 2,
                  boxShadow: (theme) => theme.shadows[1],
                  bgcolor: 'background.paper',
                  border: (theme) => `1px solid ${theme.palette.divider}`
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      Ações Rápidas
                    </Typography>
                    <Stack spacing={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Send />}
                        onClick={processTestReminders}
                      >
                        Processar Lembretes Agora
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Analytics />}
                        href="/dashboard/financeiro/relatorios"
                      >
                        Ver Relatórios
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      ) : (
        // Modo Avançado - Configurações completas
        <Card 
          sx={{ 
            borderRadius: 2,
            boxShadow: (theme) => theme.shadows[1],
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: (theme) => `1px solid ${theme.palette.divider}`
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={(_, newValue) => setTabValue(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ 
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0'
                  },
                  '& .MuiTab-root': {
                    minWidth: 140,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    py: 2
                  }
                }}
              >
                <Tab 
                  label="Configurações Gerais" 
                  icon={<Settings />}
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
                <Tab 
                  label="Templates de Mensagem" 
                  icon={<Message />}
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
                <Tab 
                  label="Horários e Frequência" 
                  icon={<Schedule />}
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
                <Tab 
                  label="Campanhas" 
                  icon={<Campaign />}
                  iconPosition="start"
                  sx={{ gap: 1 }}
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <GeneralSettings settings={advancedSettings} onChange={handleAdvancedSettingsChange} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <MessageTemplates settings={advancedSettings} onChange={handleAdvancedSettingsChange} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <ScheduleSettings settings={advancedSettings} onChange={handleAdvancedSettingsChange} />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <CampaignManager tenantId={user?.uid || ''} />
            </TabPanel>
          </CardContent>
          
          <Box sx={{ 
            p: 3, 
            borderTop: 1, 
            borderColor: 'divider', 
            bgcolor: 'background.default',
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: 2
          }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Cancel />}
              onClick={() => setAdvancedSettings(settings)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<Save />}
              onClick={saveAdvancedSettings}
              disabled={saving || !advancedSettings}
              sx={{ minWidth: 180 }}
            >
              {saving ? <CircularProgress size={24} /> : 'Salvar Configurações'}
            </Button>
          </Box>
        </Card>
      )}

      {/* Dialog de Preview */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Preview das Mensagens</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Paper sx={{ 
              p: 2, 
              bgcolor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Lembrete antes do vencimento
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {simpleConfig.tone === 'formal' ? 
`Prezado(a) João Silva,

Gostaríamos de lembrá-lo(a) que sua fatura no valor de R$ 1.500,00 vence em 10/01/2024.

Casa de Praia - Ubatuba
Período: 05/01 a 10/01

Para sua comodidade, você pode realizar o pagamento através do link abaixo:
https://pay.locai.com/abc123

Caso já tenha efetuado o pagamento, por favor, desconsidere esta mensagem.

Atenciosamente,
Sua Imobiliária` :
`Oi João! 👋

Passando para lembrar que sua fatura de R$ 1.500,00 vence 10/01/2024 📅

Casa de Praia - Ubatuba
Período: 05/01 a 10/01

Se quiser, pode pagar pelo link:
https://pay.locai.com/abc123

Qualquer dúvida, é só chamar! 😊

Sua Imobiliária`}
              </Typography>
            </Paper>

            {simpleConfig.overdueReminder && (
              <Paper sx={{ 
              p: 2, 
              bgcolor: 'background.paper',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}>
                <Typography variant="subtitle2" gutterBottom color="error">
                  Lembrete após vencimento
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {simpleConfig.tone === 'formal' ? 
`Prezado(a) João Silva,

Identificamos que sua fatura no valor de R$ 1.500,00 está vencida desde 10/01/2024.

Casa de Praia - Ubatuba
Período: 05/01 a 10/01

Para regularizar sua situação, por favor efetue o pagamento através do link:
https://pay.locai.com/abc123

Valor atualizado: R$ 1.530,00

Aguardamos seu contato.

Atenciosamente,
Sua Imobiliária` :
`Oi João,

Vi aqui que sua fatura de R$ 1.500,00 venceu em 10/01/2024 📋

Casa de Praia - Ubatuba
Período: 05/01 a 10/01

Que tal regularizar? 
https://pay.locai.com/abc123

Valor atualizado: R$ 1.530,00

Me avisa se precisar de algo! 

Sua Imobiliária`}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}