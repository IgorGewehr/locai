'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
  FormControlLabel,
  Switch,
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  AttachMoney,
  CalendarMonth,
  TrendingUp,
  TrendingDown,
  Add,
  CheckCircle,
  Schedule,
  Warning,
  Notifications,
  WhatsApp,
  Settings,
  Home,
  Person,
  ArrowUpward,
  ArrowDownward,
  NotificationsActive,
  Edit,
  Delete,
  Info,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths, addDays, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, Client, Reservation } from '@/lib/types';
import { Property } from '@/lib/types/property';
import { BillingSettings, SimpleBillingConfig } from '@/lib/types/billing';
import { billingService } from '@/lib/services/billing-service';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface TransactionWithDetails extends Transaction {
  propertyData?: Property;
  clientData?: Client;
  hasAutomaticBilling?: boolean;
  nextReminderDate?: Date;
}

export default function FinanceiroSimplesPage() {
  const { user } = useAuth();
  const { services, isReady } = useTenant();
  const [viewPeriod, setViewPeriod] = useState<'current' | 'past'>('current');
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  
  // Configuração simplificada de cobrança
  const [simpleBillingConfig, setSimpleBillingConfig] = useState<SimpleBillingConfig>({
    enabled: false,
    reminderDays: '2_days',
    overdueReminder: true,
    tone: 'friendly',
    autoSend: true,
  });

  const [stats, setStats] = useState({
    totalReceivable: 0,
    totalReceived: 0,
    totalOverdue: 0,
    upcomingCount: 0,
    overdueCount: 0,
  });

  useEffect(() => {
    if (isReady && services) {
      loadData();
      loadBillingSettings();
    }
  }, [viewPeriod, isReady, services]);

  const loadData = async () => {
    if (!services) return;
    
    try {
      setLoading(true);

      // Carregar dados relacionados
      const [propertiesData, clientsData] = await Promise.all([
        services.properties.getAll(),
        services.clients.getAll(),
      ]);

      setProperties(propertiesData);
      setClients(clientsData);

      // Definir período
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (viewPeriod === 'current') {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      } else {
        startDate = startOfMonth(subMonths(now, 3));
        endDate = now;
      }

      // Buscar transações
      const allTransactions = await services.transactions.getWhere('type', '==', 'income', 'date');
      
      // Filtrar por data localmente
      const transactionsData = allTransactions.filter(transaction => {
        const transactionDate = transaction.date;
        const date = transactionDate instanceof Date ? transactionDate : 
                     transactionDate?.toDate ? transactionDate.toDate() : new Date(transactionDate);
        return date >= startDate && date <= endDate;
      });

      // Enriquecer transações com dados relacionados
      const enrichedTransactions = transactionsData.map(transaction => {
        const enriched: TransactionWithDetails = {
          ...transaction,
          propertyData: propertiesData.find(p => p.id === transaction.propertyId),
          clientData: clientsData.find(c => c.id === transaction.clientId),
        };
        return enriched;
      });

      setTransactions(enrichedTransactions);

      // Calcular estatísticas
      const stats = enrichedTransactions.reduce((acc, t) => {
        if (t.status === 'completed') {
          acc.totalReceived += t.amount;
        } else if (t.status === 'pending') {
          acc.totalReceivable += t.amount;
          
          if (isBefore(t.date, now)) {
            acc.totalOverdue += t.amount;
            acc.overdueCount++;
          } else {
            acc.upcomingCount++;
          }
        }
        return acc;
      }, {
        totalReceivable: 0,
        totalReceived: 0,
        totalOverdue: 0,
        upcomingCount: 0,
        overdueCount: 0,
      });

      setStats(stats);

    } catch (error) {
      // Data loading error handled
    } finally {
      setLoading(false);
    }
  };

  const loadBillingSettings = async () => {
    try {
      const settings = await billingService.getSettings(user?.tenantId || '');
      if (settings) {
        setBillingSettings(settings);
        
        // Converter para configuração simplificada
        const reminderDaysMap: { [key: number]: SimpleBillingConfig['reminderDays'] } = {
          1: '1_day',
          2: '2_days',
          3: '3_days',
          7: '7_days',
        };
        
        setSimpleBillingConfig({
          enabled: settings.enabled,
          reminderDays: reminderDaysMap[settings.defaultReminderDays] || '2_days',
          overdueReminder: settings.defaultOverdueDays > 0,
          tone: settings.templates.beforeDue.tone as 'formal' | 'friendly',
          autoSend: true,
        });
      }
    } catch (error) {
      // Billing configuration loading error handled
    }
  };

  const handleSaveBillingSettings = async () => {
    try {
      await billingService.setupSimpleBilling(user?.tenantId || '', {
        reminderDays: simpleBillingConfig.reminderDays as any,
        tone: simpleBillingConfig.tone,
        autoSend: simpleBillingConfig.autoSend,
      });
      
      setShowBillingDialog(false);
      loadBillingSettings();
    } catch (error) {
      // Configuration save error handled
    }
  };

  const handleToggleAutomaticBilling = async (transactionId: string, enable: boolean) => {
    try {
      // Implementar lógica para ativar/desativar cobrança automática para uma transação específica
      // Updating billing configuration
      // TODO: Implementar no backend
    } catch (error) {
      // Billing configuration change error handled
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTransactionStatus = (transaction: Transaction) => {
    const now = new Date();
    
    if (transaction.status === 'completed') {
      return { label: 'Recebido', color: 'success' as const, icon: <CheckCircle /> };
    } else if (isBefore(transaction.date, now)) {
      return { label: 'Vencido', color: 'error' as const, icon: <Warning /> };
    } else {
      return { label: 'A Receber', color: 'warning' as const, icon: <Schedule /> };
    }
  };

  const groupTransactionsByProperty = () => {
    const grouped: { [propertyId: string]: TransactionWithDetails[] } = {};
    
    transactions.forEach(transaction => {
      const propertyId = transaction.propertyId || 'no-property';
      if (!grouped[propertyId]) {
        grouped[propertyId] = [];
      }
      grouped[propertyId].push(transaction);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const groupedTransactions = groupTransactionsByProperty();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight={600}>
          Financeiro Simplificado
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<NotificationsActive />}
            onClick={() => setShowBillingDialog(true)}
            color={billingSettings?.enabled ? 'success' : 'inherit'}
          >
            {billingSettings?.enabled ? 'Cobrança Automática Ativa' : 'Configurar Cobrança'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedTransaction(null);
              setShowTransactionDialog(true);
            }}
          >
            Nova Entrada
          </Button>
        </Stack>
      </Box>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Recebido
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(stats.totalReceived)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {viewPeriod === 'current' ? 'Este mês' : 'Últimos 3 meses'}
                  </Typography>
                </Box>
                <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    A Receber
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {formatCurrency(stats.totalReceivable)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.upcomingCount} {stats.upcomingCount === 1 ? 'conta' : 'contas'}
                  </Typography>
                </Box>
                <Schedule sx={{ color: 'warning.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Vencidos
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(stats.totalOverdue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.overdueCount} {stats.overdueCount === 1 ? 'conta' : 'contas'}
                  </Typography>
                </Box>
                <Warning sx={{ color: 'error.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: billingSettings?.enabled ? 'success.light' : 'grey.100' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Cobrança Automática
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {billingSettings?.enabled ? 'Ativa' : 'Inativa'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Via WhatsApp
                  </Typography>
                </Box>
                <WhatsApp sx={{ color: billingSettings?.enabled ? 'success.main' : 'text.disabled', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Período de Visualização */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={viewPeriod}
          exclusive
          onChange={(_, newPeriod) => newPeriod && setViewPeriod(newPeriod)}
          size="small"
        >
          <ToggleButton value="current">
            <CalendarMonth sx={{ mr: 1 }} />
            Mês Atual
          </ToggleButton>
          <ToggleButton value="past">
            <CalendarMonth sx={{ mr: 1 }} />
            Histórico (3 meses)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Lista de Transações por Propriedade */}
      {Object.entries(groupedTransactions).map(([propertyId, propertyTransactions]) => {
        const property = properties.find(p => p.id === propertyId);
        const totalProperty = propertyTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return (
          <Card key={propertyId} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home sx={{ color: 'primary.main' }} />
                  <Typography variant="h6">
                    {property?.title || 'Outras Receitas'}
                  </Typography>
                  <Chip 
                    label={`${propertyTransactions.length} ${propertyTransactions.length === 1 ? 'entrada' : 'entradas'}`} 
                    size="small" 
                  />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  {formatCurrency(totalProperty)}
                </Typography>
              </Box>

              <List disablePadding>
                {propertyTransactions.map((transaction, index) => {
                  const status = getTransactionStatus(transaction);
                  
                  return (
                    <Box key={transaction.id}>
                      {index > 0 && <Divider />}
                      <ListItem
                        sx={{
                          px: 0,
                          py: 1.5,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1">
                                {transaction.description}
                              </Typography>
                              <Chip
                                label={status.label}
                                color={status.color}
                                size="small"
                                icon={status.icon}
                              />
                              {transaction.hasAutomaticBilling && (
                                <Tooltip title="Cobrança automática ativa">
                                  <NotificationsActive sx={{ fontSize: 20, color: 'success.main' }} />
                                </Tooltip>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                              {transaction.clientData && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {transaction.clientData.name}
                                  </Typography>
                                </Box>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                Vencimento: {format(transaction.date, 'dd/MM/yyyy')}
                              </Typography>
                              {transaction.nextReminderDate && (
                                <Typography variant="caption" color="info.main">
                                  Próximo lembrete: {format(transaction.nextReminderDate, 'dd/MM')}
                                </Typography>
                              )}
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" color={status.color}>
                              {formatCurrency(transaction.amount)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setShowTransactionDialog(true);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </Box>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        );
      })}

      {/* Alert de Cobrança Inativa */}
      {!billingSettings?.enabled && stats.overdueCount > 0 && (
        <Alert 
          severity="info" 
          action={
            <Button color="inherit" size="small" onClick={() => setShowBillingDialog(true)}>
              Configurar
            </Button>
          }
          sx={{ mt: 2 }}
        >
          Você tem {stats.overdueCount} {stats.overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}. 
          Ative a cobrança automática para enviar lembretes via WhatsApp.
        </Alert>
      )}

      {/* Dialog de Configuração de Cobrança */}
      <Dialog open={showBillingDialog} onClose={() => setShowBillingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActive />
            Configurar Cobrança Automática
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={simpleBillingConfig.enabled}
                  onChange={(e) => setSimpleBillingConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
              }
              label="Ativar cobrança automática via WhatsApp"
            />

            <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
              O agente de IA enviará lembretes automáticos para seus clientes no WhatsApp
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Enviar lembrete</InputLabel>
                  <Select
                    value={simpleBillingConfig.reminderDays}
                    onChange={(e) => setSimpleBillingConfig(prev => ({ ...prev, reminderDays: e.target.value as any }))}
                    label="Enviar lembrete"
                    disabled={!simpleBillingConfig.enabled}
                  >
                    <MenuItem value="1_day">1 dia antes do vencimento</MenuItem>
                    <MenuItem value="2_days">2 dias antes do vencimento</MenuItem>
                    <MenuItem value="3_days">3 dias antes do vencimento</MenuItem>
                    <MenuItem value="7_days">7 dias antes do vencimento</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={simpleBillingConfig.overdueReminder}
                      onChange={(e) => setSimpleBillingConfig(prev => ({ ...prev, overdueReminder: e.target.checked }))}
                      disabled={!simpleBillingConfig.enabled}
                    />
                  }
                  label="Enviar lembrete após o vencimento"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Tom da mensagem</InputLabel>
                  <Select
                    value={simpleBillingConfig.tone}
                    onChange={(e) => setSimpleBillingConfig(prev => ({ ...prev, tone: e.target.value as any }))}
                    label="Tom da mensagem"
                    disabled={!simpleBillingConfig.enabled}
                  >
                    <MenuItem value="friendly">Amigável 😊</MenuItem>
                    <MenuItem value="formal">Formal 📋</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="success">
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Exemplo de mensagem ({simpleBillingConfig.tone === 'friendly' ? 'Amigável' : 'Formal'}):
                  </Typography>
                  <Typography variant="body2">
                    {simpleBillingConfig.tone === 'friendly' 
                      ? "Oi João! 👋 Passando para lembrar que seu aluguel de R$ 1.500,00 vence amanhã 📅"
                      : "Prezado(a) João, gostaríamos de lembrá-lo(a) que sua fatura no valor de R$ 1.500,00 vence amanhã."
                    }
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBillingDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveBillingSettings}>
            Salvar Configurações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}