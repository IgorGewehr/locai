'use client';

import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Stack,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  IconButton,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AttachMoney,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning,
  Add,
  ChevronRight,
  CalendarMonth,
  Home,
  WhatsApp,
  Assessment,
} from '@mui/icons-material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimpleFinancialDashboardProps {
  summary: {
    monthlyIncome: number;
    monthlyExpenses: number;
    balance: number;
    pendingPayments: number;
    overduePayments: number;
    nextPayments: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: Date;
      clientName: string;
      propertyName?: string;
    }>;
    occupancyRate: number;
    averageTicket: number;
  };
  onAddTransaction: () => void;
}

export default function SimpleFinancialDashboard({ 
  summary, 
  onAddTransaction 
}: SimpleFinancialDashboardProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showAllPayments, setShowAllPayments] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getPaymentStatus = (dueDate: Date) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return { label: 'Vencido', color: 'error' as const };
    if (days === 0) return { label: 'Vence hoje', color: 'warning' as const };
    if (days <= 3) return { label: `${days} dias`, color: 'warning' as const };
    return { label: `${days} dias`, color: 'default' as const };
  };

  // Métricas simplificadas
  const metrics = [
    {
      title: 'Receita do Mês',
      value: summary.monthlyIncome,
      icon: <TrendingUp />,
      color: 'success.main',
      subtitle: `${summary.occupancyRate}% ocupação`,
    },
    {
      title: 'A Receber',
      value: summary.pendingPayments,
      icon: <Schedule />,
      color: 'warning.main',
      subtitle: summary.overduePayments > 0 
        ? `${summary.overduePayments} vencido${summary.overduePayments > 1 ? 's' : ''}`
        : 'Tudo em dia',
      alert: summary.overduePayments > 0,
    },
    {
      title: 'Saldo do Mês',
      value: summary.balance,
      icon: <AttachMoney />,
      color: summary.balance >= 0 ? 'primary.main' : 'error.main',
      subtitle: `Ticket médio: ${formatCurrency(summary.averageTicket)}`,
    },
  ];

  const visiblePayments = showAllPayments 
    ? summary.nextPayments 
    : summary.nextPayments.slice(0, 3);

  return (
    <Box>
      {/* Alerta de cobranças */}
      {summary.overduePayments > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => router.push('/dashboard/financeiro/cobrancas')}
            >
              Configurar Cobranças
            </Button>
          }
        >
          Você tem {summary.overduePayments} pagamento{summary.overduePayments > 1 ? 's' : ''} vencido{summary.overduePayments > 1 ? 's' : ''}. 
          Ative as cobranças automáticas via WhatsApp para reduzir a inadimplência.
        </Alert>
      )}

      {/* Cards de métricas */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 3 }}>
        {metrics.map((metric, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {metric.title}
                    </Typography>
                    <Typography variant="h5" fontWeight={600} sx={{ color: metric.color }}>
                      {formatCurrency(metric.value)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {metric.subtitle}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: `${metric.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: metric.color,
                    }}
                  >
                    {metric.alert ? <Warning /> : metric.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Próximos Pagamentos */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Próximos Pagamentos</Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={onAddTransaction}
                >
                  Adicionar
                </Button>
              </Box>

              {summary.nextPayments.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Nenhum pagamento pendente
                  </Typography>
                </Box>
              ) : (
                <>
                  <List disablePadding>
                    {visiblePayments.map((payment) => {
                      const status = getPaymentStatus(payment.dueDate);
                      return (
                        <ListItem key={payment.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">{payment.description}</Typography>
                                {payment.propertyName && (
                                  <Chip
                                    size="small"
                                    icon={<Home sx={{ fontSize: 14 }} />}
                                    label={payment.propertyName}
                                    sx={{ height: 20 }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {payment.clientName} • {format(payment.dueDate, "d 'de' MMMM", { locale: ptBR })}
                              </Typography>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={status.label}
                                size="small"
                                color={status.color}
                                sx={{ height: 24 }}
                              />
                              <Typography variant="h6" fontWeight={500}>
                                {formatCurrency(payment.amount)}
                              </Typography>
                            </Stack>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>

                  {summary.nextPayments.length > 3 && (
                    <Button
                      fullWidth
                      size="small"
                      onClick={() => setShowAllPayments(!showAllPayments)}
                      endIcon={<ChevronRight />}
                      sx={{ mt: 1 }}
                    >
                      {showAllPayments 
                        ? 'Mostrar menos' 
                        : `Ver todos (${summary.nextPayments.length})`}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Ações Rápidas */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* Card de Cobranças */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      bgcolor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WhatsApp sx={{ color: 'success.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6">Cobranças Automáticas</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Via WhatsApp
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" paragraph>
                  Reduza a inadimplência em até 40% com lembretes automáticos.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={() => router.push('/dashboard/financeiro/cobrancas')}
                >
                  Configurar Agora
                </Button>
              </CardContent>
            </Card>

            {/* Card de Dicas */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dicas Rápidas
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    • Mantenha suas transações em dia para relatórios precisos
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Use tags para categorizar melhor suas despesas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Ative lembretes para não perder prazos
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Ações */}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => router.push('/dashboard/financeiro')}
            >
              Ver Relatório Completo
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}