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
import { BillingSettings, SimpleBillingConfig, TEMPLATE_VARIABLES } from '@/lib/types/billing';
import { useAuth } from '@/lib/hooks/useAuth';

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
      const response = await fetch('/api/billing/settings');
      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
        // Converter configurações complexas para simples
        setSimpleConfig({
          enabled: data.settings.enabled,
          reminderDays: `${data.settings.defaultReminderDays}_day${data.settings.defaultReminderDays > 1 ? 's' : ''}` as any,
          overdueReminder: data.settings.defaultOverdueDays > 0,
          tone: data.settings.templates.beforeDue.tone,
          autoSend: true
        });
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
      const response = await fetch('/api/billing/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const processTestReminders = async () => {
    try {
      const response = await fetch('/api/billing/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Configurações de Cobrança
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={simpleMode ? 'simple' : 'advanced'}
            exclusive
            onChange={(_, value) => value && setSimpleMode(value === 'simple')}
            size="small"
          >
            <ToggleButton value="simple">
              <Smartphone sx={{ mr: 1 }} />
              Modo Simples
            </ToggleButton>
            <ToggleButton value="advanced">
              <BusinessCenter sx={{ mr: 1 }} />
              Modo Avançado
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {simpleMode ? (
        // Modo Simples - Para pequenos proprietários
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
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
                      />
                    }
                    label={simpleConfig.enabled ? 'Ativado' : 'Desativado'}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Collapse in={simpleConfig.enabled}>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={500}>
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
                      <Typography variant="subtitle1" gutterBottom fontWeight={500}>
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

          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Info sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Como funciona?</Typography>
                  </Box>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="1. Criação automática"
                        secondary="Quando você criar uma fatura, o sistema programa os lembretes automaticamente"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="2. Envio inteligente"
                        secondary="Mensagens são enviadas no horário comercial via WhatsApp"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="3. Acompanhamento"
                        secondary="Você recebe notificações sobre respostas e pagamentos"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="4. Confirmação automática"
                        secondary="Quando o cliente pagar, o sistema atualiza automaticamente"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">Benefícios</Typography>
                  </Box>
                  <Typography variant="body2" paragraph>
                    • Redução de inadimplência em até 40%
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Economia de tempo com cobranças manuais
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • Melhora no relacionamento com clientes
                  </Typography>
                  <Typography variant="body2">
                    • Pagamentos mais rápidos
                  </Typography>
                </CardContent>
              </Card>

              {simpleConfig.enabled && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
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
        <Card>
          <CardContent>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Configurações Gerais" />
              <Tab label="Templates de Mensagem" />
              <Tab label="Horários e Frequência" />
              <Tab label="Campanhas" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Modo avançado em desenvolvimento. Use o modo simples para configurações básicas.
              </Alert>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="body1">Templates de mensagem em desenvolvimento...</Typography>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="body1">Configurações de horário em desenvolvimento...</Typography>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="body1">Campanhas em desenvolvimento...</Typography>
            </TabPanel>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Preview */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Preview das Mensagens</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
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
              <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
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