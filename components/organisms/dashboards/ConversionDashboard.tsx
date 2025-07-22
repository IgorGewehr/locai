import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  ShoppingCart as CartIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';

interface ConversionMetrics {
  totalConversations: number;
  totalReservations: number;
  conversionRate: number;
  averageTicket: number;
  costPerConversion: number;
  todayConversations: number;
  todayReservations: number;
  todayRevenue: number;
  trend: 'up' | 'down' | 'stable';
}

export default function ConversionDashboard() {
  const { services, isReady } = useTenant();
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loadMetrics = async () => {
    if (!services || !isReady) return;
    
    setLoading(true);
    try {
      // Buscar conversas de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const allConversations = await services.conversations.getAll();
      const todayConversations = allConversations.filter(
        c => new Date(c.createdAt) >= today
      );

      // Buscar reservas
      const allReservations = await services.reservations.getAll();
      const todayReservations = allReservations.filter(
        r => new Date(r.createdAt) >= today
      );

      // Calcular métricas
      const conversionRate = allConversations.length > 0 
        ? (allReservations.length / allConversations.length) * 100 
        : 0;

      const totalRevenue = allReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const todayRevenue = todayReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const averageTicket = allReservations.length > 0 
        ? totalRevenue / allReservations.length 
        : 0;

      // Custo estimado por conversão (baseado em uso de AI)
      const estimatedAICost = allConversations.length * 0.02; // $0.02 por conversa
      const costPerConversion = allReservations.length > 0
        ? estimatedAICost / allReservations.length
        : 0;

      // Determinar tendência
      const yesterdayConversations = allConversations.filter(c => {
        const date = new Date(c.createdAt);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return date >= yesterday && date < today;
      });

      const trend = todayConversations.length > yesterdayConversations.length ? 'up' : 
                   todayConversations.length < yesterdayConversations.length ? 'down' : 'stable';

      setMetrics({
        totalConversations: allConversations.length,
        totalReservations: allReservations.length,
        conversionRate,
        averageTicket,
        costPerConversion,
        todayConversations: todayConversations.length,
        todayReservations: todayReservations.length,
        todayRevenue,
        trend,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
    // Atualizar a cada 5 minutos
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [services, isReady]);

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = 'primary',
    target,
    format = 'number'
  }: any) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="caption" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
              {format === 'currency' ? `R$ ${value.toFixed(2)}` : 
               format === 'percent' ? `${value.toFixed(1)}%` : 
               value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            bgcolor: `${color}.light`, 
            borderRadius: 2, 
            p: 1,
            opacity: 0.1
          }}>
            {icon}
          </Box>
        </Box>
        
        {target && (
          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption">Meta</Typography>
              <Typography variant="caption">{target}</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min((value / parseFloat(target.replace('%', ''))) * 100, 100)} 
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>
      
      {/* Indicador de tendência */}
      {metrics?.trend && (
        <Box position="absolute" top={8} right={8}>
          {metrics.trend === 'up' ? (
            <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />
          ) : metrics.trend === 'down' ? (
            <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />
          ) : null}
        </Box>
      )}
    </Card>
  );

  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header com título e botão de atualizar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Dashboard de Conversão 🎯
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
        <Tooltip title="Atualizar dados">
          <IconButton onClick={loadMetrics} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Alerta de performance */}
      {metrics && metrics.conversionRate < 15 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Taxa de conversão abaixo da meta! Considere revisar as técnicas de vendas do agente.
        </Alert>
      )}

      {/* Métricas principais */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Conversões Hoje"
            value={metrics?.todayReservations || 0}
            subtitle={`de ${metrics?.todayConversations || 0} conversas`}
            icon={<CartIcon sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Taxa de Conversão"
            value={metrics?.conversionRate || 0}
            subtitle="Meta: 30%"
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
            color="primary"
            target="30%"
            format="percent"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Ticket Médio"
            value={metrics?.averageTicket || 0}
            subtitle="Meta: R$ 500"
            icon={<MoneyIcon sx={{ fontSize: 40 }} />}
            color="secondary"
            target="500"
            format="currency"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Custo/Venda"
            value={metrics?.costPerConversion || 0}
            subtitle="Meta: < R$ 5"
            icon={<TimerIcon sx={{ fontSize: 40 }} />}
            color={metrics?.costPerConversion > 5 ? 'error' : 'success'}
            target="5"
            format="currency"
          />
        </Grid>
      </Grid>

      {/* Resumo do dia */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo de Hoje 📊
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h3" color="primary">
                  {metrics?.todayConversations || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Conversas
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h3" color="success.main">
                  {metrics?.todayReservations || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Reservas
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box textAlign="center">
                <Typography variant="h3" color="secondary">
                  R$ {metrics?.todayRevenue.toFixed(0) || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Receita
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Funil simplificado */}
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Funil de Conversão
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={`${metrics?.todayConversations || 0} contatos`}
                color="default"
                size="small"
              />
              <Typography>→</Typography>
              <Chip 
                label={`${Math.floor((metrics?.todayConversations || 0) * 0.4)} interessados`}
                color="primary"
                size="small"
              />
              <Typography>→</Typography>
              <Chip 
                label={`${metrics?.todayReservations || 0} vendas`}
                color="success"
                size="small"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}