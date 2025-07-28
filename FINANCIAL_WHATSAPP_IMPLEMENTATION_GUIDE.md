# 📊 Guia de Implementação: Sistema Financeiro + WhatsApp Web para Software Médico

## 🎯 Objetivo
Implementar um sistema financeiro completo com integração WhatsApp Web para envio de lembretes de cobrança em um software médico usando JavaScript (não TypeScript).

## 🏗️ Arquitetura Geral

### Estrutura de Pastas Necessária
```
src/
├── components/
│   ├── financial/
│   │   ├── dashboard/
│   │   │   ├── FinancialOverview.js
│   │   │   ├── RevenueChart.js
│   │   │   ├── ExpenseChart.js
│   │   │   ├── CashFlowChart.js
│   │   │   └── FinancialMetrics.js
│   │   ├── transactions/
│   │   │   ├── TransactionList.js
│   │   │   ├── TransactionForm.js
│   │   │   ├── TransactionFilters.js
│   │   │   └── TransactionDetails.js
│   │   └── billing/
│   │       ├── BillingList.js
│   │       ├── BillingReminder.js
│   │       ├── PaymentStatus.js
│   │       └── WhatsAppReminder.js
│   └── whatsapp/
│       ├── WhatsAppConnector.js
│       ├── QRCodeDisplay.js
│       └── MessageSender.js
├── services/
│   ├── financialService.js
│   ├── whatsappService.js
│   └── billingService.js
├── api/
│   ├── financial/
│   │   ├── transactions.js
│   │   ├── billing.js
│   │   └── analytics.js
│   └── whatsapp/
│       ├── session.js
│       └── webhook.js
└── utils/
    ├── formatters.js
    ├── calculations.js
    └── whatsappTemplates.js
```

## 💻 1. Sistema Financeiro - Visão Geral (Dashboard)

### 1.1 Component Principal - FinancialOverview.js

```javascript
// src/components/financial/dashboard/FinancialOverview.js
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Skeleton,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  AccountBalance,
  CalendarToday,
  Download,
  Print,
  MoreVert,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FinancialOverview = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [metrics, setMetrics] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    pendingPayments: 0,
    paidThisMonth: 0,
    growthRate: 0,
  });

  // Implementar:
  // 1. Cards de métricas com ícones e cores
  // 2. Gráficos de receita vs despesa
  // 3. Fluxo de caixa mensal
  // 4. Top 5 procedimentos mais rentáveis
  // 5. Status de pagamentos (pizza chart)
  // 6. Comparação com mês anterior
  // 7. Exportação de relatórios
  
  return (
    <Box>
      {/* Header com período e ações */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Visão Geral Financeira</Typography>
        <Box>
          <Button startIcon={<CalendarToday />}>
            {format(dateRange.start, 'MMM yyyy', { locale: ptBR })}
          </Button>
          <IconButton><Download /></IconButton>
          <IconButton><Print /></IconButton>
        </Box>
      </Box>

      {/* Cards de Métricas */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Receita Total
                  </Typography>
                  <Typography variant="h4">
                    R$ {metrics.revenue.toLocaleString('pt-BR')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                    <Typography variant="body2" color="success.main">
                      +{metrics.growthRate}% vs mês anterior
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Repetir para: Despesas, Lucro Líquido, Pagamentos Pendentes */}
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receita vs Despesas
              </Typography>
              {/* Implementar gráfico de linhas com Recharts */}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status de Pagamentos
              </Typography>
              {/* Implementar gráfico de pizza */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

### 1.2 Gráfico de Receitas - RevenueChart.js

```javascript
// src/components/financial/dashboard/RevenueChart.js
import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const RevenueChart = ({ data, period = 'monthly' }) => {
  // Formatar dados para o gráfico
  const formatCurrency = (value) => 
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, boxShadow: 2 }}>
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} sx={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="receita"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorReceita)"
        />
        <Line
          type="monotone"
          dataKey="despesa"
          stroke="#ff7300"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

## 📝 2. Sistema de Transações

### 2.1 Lista de Transações - TransactionList.js

```javascript
// src/components/financial/transactions/TransactionList.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Print,
  WhatsApp,
} from '@mui/icons-material';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all', // all, income, expense
    status: 'all', // all, paid, pending, overdue
    dateRange: 'month', // today, week, month, custom
  });

  // Cores e ícones por tipo
  const getTransactionStyle = (transaction) => {
    if (transaction.type === 'income') {
      return {
        color: 'success',
        icon: <TrendingUp />,
        bgColor: 'success.light',
      };
    }
    return {
      color: 'error',
      icon: <TrendingDown />,
      bgColor: 'error.light',
    };
  };

  // Status badges
  const getStatusChip = (status) => {
    const statusConfig = {
      paid: { label: 'Pago', color: 'success' },
      pending: { label: 'Pendente', color: 'warning' },
      overdue: { label: 'Vencido', color: 'error' },
      cancelled: { label: 'Cancelado', color: 'default' },
    };
    
    return (
      <Chip
        label={statusConfig[status].label}
        color={statusConfig[status].color}
        size="small"
      />
    );
  };

  return (
    <Card>
      {/* Header com busca e filtros */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
          />
          <Button startIcon={<FilterList />}>
            Filtros
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {/* Abrir modal de nova transação */}}
          >
            Nova Transação
          </Button>
        </Box>
      </Box>

      {/* Tabela de transações */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id} hover>
                <TableCell>
                  {format(new Date(transaction.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTransactionStyle(transaction).icon}
                    <Box>
                      <Typography variant="body2">
                        {transaction.description}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {transaction.paymentMethod}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{transaction.category}</TableCell>
                <TableCell>{transaction.patientName}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                    sx={{ fontWeight: 600 }}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    R$ {transaction.amount.toLocaleString('pt-BR')}
                  </Typography>
                </TableCell>
                <TableCell>{getStatusChip(transaction.status)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Visualizar">
                    <IconButton size="small">
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  {transaction.status === 'pending' && (
                    <Tooltip title="Enviar lembrete WhatsApp">
                      <IconButton size="small" color="success">
                        <WhatsApp />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={transactions.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        labelRowsPerPage="Linhas por página"
      />
    </Card>
  );
};
```

## 📱 3. Sistema de Cobranças com WhatsApp

### 3.1 Lista de Cobranças - BillingList.js

```javascript
// src/components/financial/billing/BillingList.js
import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  WhatsApp,
  Email,
  Phone,
  Schedule,
  AttachMoney,
  Warning,
  CheckCircle,
} from '@mui/icons-material';

const BillingList = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBills, setSelectedBills] = useState([]);
  const [reminderDialog, setReminderDialog] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState('default');

  const bills = [
    {
      id: 1,
      patientName: 'João Silva',
      patientPhone: '11999999999',
      amount: 350.00,
      dueDate: '2024-02-15',
      daysOverdue: 5,
      services: ['Consulta', 'Exame'],
      status: 'overdue',
      lastReminder: '2024-02-10',
    },
    // ... mais cobranças
  ];

  const whatsappTemplates = {
    default: `Olá {nome}! 👋

Identificamos uma pendência financeira em seu nome no valor de R$ {valor}.

📅 Vencimento: {vencimento}
🏥 Referente a: {servicos}

Para sua comodidade, oferecemos as seguintes formas de pagamento:
• PIX: (11) 99999-9999
• Cartão de crédito (parcelamento disponível)
• Boleto bancário

Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem.

Atenciosamente,
Clínica Médica`,

    friendly: `Oi {nome}! 😊

Tudo bem? Passando para lembrar sobre o pagamento de R$ {valor} que venceu em {vencimento}.

Se precisar de alguma facilidade no pagamento, é só me avisar!

Abraços,
Equipe Financeira`,

    urgent: `⚠️ AVISO IMPORTANTE

{nome}, seu débito de R$ {valor} está vencido há {dias} dias.

Para evitar restrições em seu cadastro, regularize sua situação o quanto antes.

Entre em contato: (11) 3333-3333`,
  };

  const sendWhatsAppReminder = async (bill) => {
    try {
      const message = whatsappTemplates[whatsappTemplate]
        .replace('{nome}', bill.patientName)
        .replace('{valor}', bill.amount.toFixed(2))
        .replace('{vencimento}', format(new Date(bill.dueDate), 'dd/MM/yyyy'))
        .replace('{servicos}', bill.services.join(', '))
        .replace('{dias}', bill.daysOverdue);

      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: bill.patientPhone,
          message: message,
          type: 'billing_reminder',
          billId: bill.id,
        }),
      });

      // Atualizar status do lembrete
      // Mostrar notificação de sucesso
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Cobranças</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<WhatsApp />}
            onClick={() => setReminderDialog(true)}
            disabled={selectedBills.length === 0}
          >
            Enviar Lembretes ({selectedBills.length})
          </Button>
          <Button startIcon={<Schedule />}>
            Agendar Lembretes
          </Button>
        </Box>
      </Box>

      {/* Tabs de status */}
      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab 
            label={
              <Badge badgeContent={15} color="error">
                Vencidas
              </Badge>
            }
          />
          <Tab 
            label={
              <Badge badgeContent={8} color="warning">
                A Vencer
              </Badge>
            }
          />
          <Tab label="Pagas" />
          <Tab label="Todas" />
        </Tabs>

        {/* Lista de cobranças */}
        <List>
          {bills.map((bill) => (
            <ListItem
              key={bill.id}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {bill.patientName.charAt(0)}
              </Avatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      {bill.patientName}
                    </Typography>
                    {bill.status === 'overdue' && (
                      <Chip
                        icon={<Warning />}
                        label={`${bill.daysOverdue} dias atraso`}
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      {bill.services.join(' • ')} | Venc: {format(new Date(bill.dueDate), 'dd/MM/yyyy')}
                    </Typography>
                    {bill.lastReminder && (
                      <Typography variant="caption" color="textSecondary">
                        Último lembrete: {format(new Date(bill.lastReminder), 'dd/MM/yyyy')}
                      </Typography>
                    )}
                  </Box>
                }
              />

              <Typography variant="h6" sx={{ mr: 2 }}>
                R$ {bill.amount.toFixed(2)}
              </Typography>

              <ListItemSecondaryAction>
                <Tooltip title="WhatsApp">
                  <IconButton
                    color="success"
                    onClick={() => sendWhatsAppReminder(bill)}
                  >
                    <WhatsApp />
                  </IconButton>
                </Tooltip>
                <Tooltip title="E-mail">
                  <IconButton>
                    <Email />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Ligar">
                  <IconButton>
                    <Phone />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Card>

      {/* Dialog de envio em massa */}
      <Dialog
        open={reminderDialog}
        onClose={() => setReminderDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enviar Lembretes via WhatsApp</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Template de Mensagem</InputLabel>
            <Select
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
            >
              <MenuItem value="default">Padrão</MenuItem>
              <MenuItem value="friendly">Amigável</MenuItem>
              <MenuItem value="urgent">Urgente</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={8}
            value={whatsappTemplates[whatsappTemplate]}
            sx={{ mt: 2 }}
            disabled
          />
          
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            {selectedBills.length} cobranças selecionadas
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReminderDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<WhatsApp />}
            onClick={() => {/* Enviar lembretes em massa */}}
          >
            Enviar Lembretes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
```

## 🔌 4. Integração WhatsApp Web

### 4.1 Conector WhatsApp - WhatsAppConnector.js

```javascript
// src/components/whatsapp/WhatsAppConnector.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
} from '@mui/material';
import {
  WhatsApp,
  QrCode2,
  CheckCircle,
  Error,
  Refresh,
} from '@mui/icons-material';
import QRCode from 'react-qr-code';

const WhatsAppConnector = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/session');
      const data = await response.json();
      
      setConnectionStatus(data.status);
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setActiveStep(1);
      }
      if (data.connected) {
        setPhoneNumber(data.phoneNumber);
        setActiveStep(2);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const initializeWhatsApp = async () => {
    try {
      setConnectionStatus('connecting');
      const response = await fetch('/api/whatsapp/session', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success && data.qrCode) {
        setQrCode(data.qrCode);
        setActiveStep(1);
      }
    } catch (error) {
      console.error('Erro ao inicializar WhatsApp:', error);
      setConnectionStatus('error');
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp/session', {
        method: 'DELETE',
      });
      setConnectionStatus('disconnected');
      setQrCode('');
      setPhoneNumber('');
      setActiveStep(0);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  };

  const getStatusConfig = () => {
    const configs = {
      disconnected: {
        color: 'default',
        icon: <WhatsApp />,
        text: 'Desconectado',
      },
      connecting: {
        color: 'warning',
        icon: <CircularProgress size={20} />,
        text: 'Conectando...',
      },
      connected: {
        color: 'success',
        icon: <CheckCircle />,
        text: 'Conectado',
      },
      error: {
        color: 'error',
        icon: <Error />,
        text: 'Erro na conexão',
      },
    };
    return configs[connectionStatus];
  };

  const steps = [
    {
      label: 'Iniciar Conexão',
      content: (
        <Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Clique no botão abaixo para iniciar a conexão com o WhatsApp Web.
          </Typography>
          <Button
            variant="contained"
            startIcon={<WhatsApp />}
            onClick={initializeWhatsApp}
            disabled={connectionStatus === 'connecting'}
          >
            Conectar WhatsApp
          </Button>
        </Box>
      ),
    },
    {
      label: 'Escanear QR Code',
      content: (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Abra o WhatsApp no seu celular, vá em Configurações → WhatsApp Web e escaneie o código:
          </Typography>
          {qrCode && (
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, display: 'inline-block' }}>
              <QRCode value={qrCode} size={256} />
            </Box>
          )}
          <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
            O código expira em 60 segundos
          </Typography>
        </Box>
      ),
    },
    {
      label: 'Conexão Estabelecida',
      content: (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            WhatsApp conectado com sucesso!
          </Alert>
          <Typography variant="body2">
            Número conectado: <strong>{phoneNumber}</strong>
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Error />}
            onClick={disconnectWhatsApp}
            sx={{ mt: 2 }}
          >
            Desconectar
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Conexão WhatsApp</Typography>
          <Chip
            icon={getStatusConfig().icon}
            label={getStatusConfig().text}
            color={getStatusConfig().color}
          />
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                {step.content}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </CardContent>
    </Card>
  );
};
```

## 🔧 5. Serviços Backend

### 5.1 WhatsApp Service - whatsappService.js

```javascript
// src/services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

class WhatsAppService {
  constructor() {
    this.sessions = new Map();
    this.qrCodes = new Map();
  }

  async initializeSession(tenantId) {
    if (this.sessions.has(tenantId)) {
      const existingSession = this.sessions.get(tenantId);
      if (existingSession.info && existingSession.info.pushname) {
        return {
          connected: true,
          phoneNumber: existingSession.info.wid._serialized,
        };
      }
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: tenantId }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    client.on('qr', async (qr) => {
      const qrDataUrl = await qrcode.toDataURL(qr);
      this.qrCodes.set(tenantId, qrDataUrl);
    });

    client.on('ready', () => {
      console.log(`WhatsApp cliente ${tenantId} pronto!`);
      this.qrCodes.delete(tenantId);
    });

    client.on('authenticated', () => {
      console.log(`WhatsApp cliente ${tenantId} autenticado!`);
    });

    await client.initialize();
    this.sessions.set(tenantId, client);

    return {
      success: true,
      qrCode: this.qrCodes.get(tenantId),
    };
  }

  async sendMessage(tenantId, to, message, options = {}) {
    const client = this.sessions.get(tenantId);
    if (!client) {
      throw new Error('Sessão WhatsApp não encontrada');
    }

    const number = to.replace(/\D/g, '');
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

    try {
      const result = await client.sendMessage(chatId, message);
      
      // Registrar envio no banco de dados
      await this.logMessage({
        tenantId,
        to: chatId,
        message,
        type: options.type || 'general',
        status: 'sent',
        messageId: result.id._serialized,
        timestamp: new Date(),
      });

      return { success: true, messageId: result.id._serialized };
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  async sendBillingReminder(tenantId, billData) {
    const { patientPhone, patientName, amount, dueDate, services } = billData;
    
    const message = `Olá ${patientName}! 👋

📋 *Lembrete de Pagamento*

Identificamos uma pendência financeira:
💰 Valor: *R$ ${amount.toFixed(2)}*
📅 Vencimento: *${format(new Date(dueDate), 'dd/MM/yyyy')}*
🏥 Serviços: ${services.join(', ')}

*Formas de Pagamento:*
• PIX: clinica@email.com
• Cartão (parcelamento disponível)
• Transferência bancária

Para mais informações, responda esta mensagem ou ligue para (11) 3333-3333.

_Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem._`;

    return await this.sendMessage(tenantId, patientPhone, message, {
      type: 'billing_reminder',
      billId: billData.id,
    });
  }

  async getSessionStatus(tenantId) {
    const client = this.sessions.get(tenantId);
    
    if (!client) {
      return {
        connected: false,
        status: 'disconnected',
      };
    }

    const state = await client.getState();
    const info = client.info;

    return {
      connected: state === 'CONNECTED',
      status: state,
      phoneNumber: info?.wid?._serialized,
      businessName: info?.pushname,
      qrCode: this.qrCodes.get(tenantId),
    };
  }

  async disconnectSession(tenantId) {
    const client = this.sessions.get(tenantId);
    if (client) {
      await client.destroy();
      this.sessions.delete(tenantId);
      this.qrCodes.delete(tenantId);
    }
    return { success: true };
  }
}

module.exports = new WhatsAppService();
```

### 5.2 Financial Service - financialService.js

```javascript
// src/services/financialService.js
class FinancialService {
  async getDashboardMetrics(tenantId, dateRange) {
    const { start, end } = dateRange;
    
    // Buscar transações do período
    const transactions = await db.collection('transactions')
      .where('tenantId', '==', tenantId)
      .where('date', '>=', start)
      .where('date', '<=', end)
      .get();

    let revenue = 0;
    let expenses = 0;
    const categorySummary = {};
    const dailyData = {};

    transactions.forEach(doc => {
      const data = doc.data();
      
      if (data.type === 'income') {
        revenue += data.amount;
      } else {
        expenses += data.amount;
      }

      // Agrupar por categoria
      if (!categorySummary[data.category]) {
        categorySummary[data.category] = { income: 0, expense: 0 };
      }
      
      if (data.type === 'income') {
        categorySummary[data.category].income += data.amount;
      } else {
        categorySummary[data.category].expense += data.amount;
      }

      // Agrupar por dia para gráficos
      const dayKey = format(data.date.toDate(), 'yyyy-MM-dd');
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = { revenue: 0, expenses: 0 };
      }
      
      if (data.type === 'income') {
        dailyData[dayKey].revenue += data.amount;
      } else {
        dailyData[dayKey].expenses += data.amount;
      }
    });

    // Calcular métricas de crescimento
    const previousMonth = subMonths(start, 1);
    const previousRevenue = await this.getMonthRevenue(tenantId, previousMonth);
    const growthRate = previousRevenue > 0 
      ? ((revenue - previousRevenue) / previousRevenue * 100).toFixed(2)
      : 0;

    // Buscar pagamentos pendentes
    const pendingPayments = await db.collection('bills')
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'pending')
      .get();

    let pendingAmount = 0;
    pendingPayments.forEach(doc => {
      pendingAmount += doc.data().amount;
    });

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      pendingPayments: pendingAmount,
      growthRate,
      categorySummary,
      dailyData: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
      topProcedures: await this.getTopProcedures(tenantId, dateRange),
      paymentMethods: await this.getPaymentMethodsSummary(tenantId, dateRange),
    };
  }

  async getTransactions(tenantId, filters = {}) {
    let query = db.collection('transactions')
      .where('tenantId', '==', tenantId);

    if (filters.type && filters.type !== 'all') {
      query = query.where('type', '==', filters.type);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }

    const snapshot = await query
      .orderBy('date', 'desc')
      .limit(filters.limit || 50)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async createTransaction(tenantId, transactionData) {
    const transaction = {
      ...transactionData,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('transactions').add(transaction);
    
    // Atualizar saldo do paciente se aplicável
    if (transaction.patientId) {
      await this.updatePatientBalance(transaction.patientId, transaction);
    }

    return { id: docRef.id, ...transaction };
  }

  async getBillingList(tenantId, status = 'all') {
    let query = db.collection('bills')
      .where('tenantId', '==', tenantId);

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('dueDate', 'asc')
      .get();

    const bills = [];
    const today = new Date();

    snapshot.forEach(doc => {
      const data = doc.data();
      const dueDate = data.dueDate.toDate();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      bills.push({
        id: doc.id,
        ...data,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        isOverdue: daysOverdue > 0,
      });
    });

    return bills;
  }

  async createBillingReminder(tenantId, billId, reminderData) {
    const reminder = {
      tenantId,
      billId,
      ...reminderData,
      createdAt: new Date(),
      status: 'scheduled',
    };

    await db.collection('billing_reminders').add(reminder);
    
    // Atualizar última data de lembrete na cobrança
    await db.collection('bills').doc(billId).update({
      lastReminder: new Date(),
      reminderCount: admin.firestore.FieldValue.increment(1),
    });

    return reminder;
  }
}

module.exports = new FinancialService();
```

## 📋 6. APIs Necessárias

### 6.1 API Routes - Transações

```javascript
// pages/api/financial/transactions.js
import financialService from '../../../services/financialService';

export default async function handler(req, res) {
  const { method } = req;
  const tenantId = req.headers['x-tenant-id'] || 'default';

  switch (method) {
    case 'GET':
      try {
        const { type, status, startDate, endDate, page = 1, limit = 10 } = req.query;
        
        const transactions = await financialService.getTransactions(tenantId, {
          type,
          status,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
        });

        res.status(200).json({
          success: true,
          data: transactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: transactions.length,
          },
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    case 'POST':
      try {
        const transaction = await financialService.createTransaction(
          tenantId,
          req.body
        );
        res.status(201).json({ success: true, data: transaction });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
```

### 6.2 API Routes - WhatsApp

```javascript
// pages/api/whatsapp/session.js
import whatsappService from '../../../services/whatsappService';

export default async function handler(req, res) {
  const { method } = req;
  const tenantId = req.headers['x-tenant-id'] || 'default';

  switch (method) {
    case 'GET':
      try {
        const status = await whatsappService.getSessionStatus(tenantId);
        res.status(200).json({ success: true, ...status });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    case 'POST':
      try {
        const result = await whatsappService.initializeSession(tenantId);
        res.status(200).json({ success: true, ...result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    case 'DELETE':
      try {
        await whatsappService.disconnectSession(tenantId);
        res.status(200).json({ success: true, message: 'Sessão desconectada' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
```

## 🎨 7. Estilos e Tema

### 7.1 Tema Customizado

```javascript
// src/theme/medicalTheme.js
import { createTheme } from '@mui/material/styles';

export const medicalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2E7D32', // Verde médico
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    secondary: {
      main: '#0288D1',
      light: '#03A9F4',
      dark: '#01579B',
    },
    success: {
      main: '#43A047',
    },
    error: {
      main: '#E53935',
    },
    warning: {
      main: '#FB8C00',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});
```

## 📦 8. Dependências Necessárias

```json
{
  "dependencies": {
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.15.0",
    "date-fns": "^2.30.0",
    "whatsapp-web.js": "^1.25.0",
    "qrcode": "^1.5.3",
    "react-qr-code": "^2.0.12",
    "axios": "^1.6.0",
    "firebase": "^10.7.0",
    "firebase-admin": "^12.0.0"
  }
}
```

## 🚀 9. Instruções de Implementação

### Passo 1: Configurar Firebase
```javascript
// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Suas configurações do Firebase
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Passo 2: Configurar WhatsApp Web
1. Instalar Puppeteer: `npm install puppeteer`
2. Criar pasta para sessões: `mkdir .wwebjs_auth`
3. Configurar variáveis de ambiente

### Passo 3: Criar Rotas no React Router
```javascript
// src/App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/financeiro" element={<FinancialDashboard />} />
        <Route path="/financeiro/transacoes" element={<TransactionList />} />
        <Route path="/financeiro/cobrancas" element={<BillingList />} />
        <Route path="/configuracoes/whatsapp" element={<WhatsAppConnector />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Passo 4: Configurar Webhooks WhatsApp
```javascript
// pages/api/whatsapp/webhook.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { body } = req;
    
    // Processar mensagens recebidas
    if (body.messages) {
      for (const message of body.messages) {
        // Processar respostas automáticas
        await processIncomingMessage(message);
      }
    }
    
    res.status(200).json({ received: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

## 📊 10. Modelo de Dados

### Collections do Firestore

```javascript
// Transações
{
  id: string,
  tenantId: string,
  type: 'income' | 'expense',
  amount: number,
  description: string,
  category: string,
  patientId: string,
  patientName: string,
  paymentMethod: string,
  status: 'paid' | 'pending' | 'cancelled',
  date: timestamp,
  dueDate: timestamp,
  paidDate: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  notes: string,
  attachments: array
}

// Cobranças
{
  id: string,
  tenantId: string,
  patientId: string,
  patientName: string,
  patientPhone: string,
  patientEmail: string,
  amount: number,
  originalAmount: number,
  services: array,
  dueDate: timestamp,
  status: 'pending' | 'paid' | 'overdue' | 'cancelled',
  paymentMethod: string,
  reminderCount: number,
  lastReminder: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
  notes: string
}

// Lembretes WhatsApp
{
  id: string,
  tenantId: string,
  billId: string,
  patientId: string,
  to: string,
  message: string,
  template: string,
  status: 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed',
  scheduledFor: timestamp,
  sentAt: timestamp,
  deliveredAt: timestamp,
  readAt: timestamp,
  error: string,
  attempts: number
}
```

## ✅ 11. Checklist de Implementação

- [ ] Configurar estrutura de pastas
- [ ] Instalar dependências necessárias
- [ ] Configurar Firebase e autenticação
- [ ] Implementar componente de Dashboard Financeiro
- [ ] Criar lista de transações com filtros
- [ ] Implementar sistema de cobranças
- [ ] Configurar WhatsApp Web com Baileys/whatsapp-web.js
- [ ] Criar interface de conexão com QR Code
- [ ] Implementar envio de lembretes
- [ ] Criar templates de mensagens
- [ ] Configurar webhooks para respostas
- [ ] Implementar relatórios e exportação
- [ ] Adicionar gráficos e visualizações
- [ ] Criar sistema de notificações
- [ ] Implementar agendamento de lembretes
- [ ] Adicionar logs e auditoria
- [ ] Realizar testes de integração
- [ ] Documentar APIs
- [ ] Configurar backup automático

## 🔒 12. Considerações de Segurança

1. **Autenticação**: Implementar JWT para todas as rotas
2. **Rate Limiting**: Limitar envios de WhatsApp (20 msgs/min)
3. **Validação**: Sanitizar todas as entradas do usuário
4. **Criptografia**: Criptografar dados sensíveis
5. **Logs**: Registrar todas as transações financeiras
6. **Backup**: Backup diário dos dados financeiros
7. **LGPD**: Implementar consentimento para lembretes

## 📚 13. Recursos Adicionais

### Templates de Mensagem WhatsApp
```javascript
const templates = {
  appointment_reminder: `Olá {name}! 
  
Lembrando da sua consulta amanhã às {time}.
Endereço: {address}

Confirme sua presença respondendo:
1️⃣ - Confirmar
2️⃣ - Remarcar
3️⃣ - Cancelar`,

  payment_receipt: `✅ Pagamento Recebido!

Paciente: {name}
Valor: R$ {amount}
Data: {date}
Forma: {method}

Obrigado pela confiança!
{clinic_name}`,

  monthly_statement: `📊 Extrato Mensal - {month}

Paciente: {name}

💰 Saldo anterior: R$ {previous_balance}
➕ Consultas/Procedimentos: R$ {charges}
➖ Pagamentos: R$ {payments}
💳 Saldo atual: R$ {current_balance}

Detalhes no portal do paciente.`
};
```

---

Este guia fornece uma implementação completa do sistema financeiro com integração WhatsApp. Adapte conforme necessário para o contexto específico do software médico.