'use client';

import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Alert,
  useTheme,
  Tab,
  Tabs,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  TrendingDown,
  Refresh,
  SmartToy,
  WhatsApp,
  Home,
  People,
  EventAvailable,
  Insights,
  Star,
  CalendarMonth,
  AttachMoney,
  Schedule,
  LocationOn,
  Wifi,
  Pool,
  DirectionsCar,
  Kitchen,
  Balcony,
  FitnessCenter,
  Warning,
  CheckCircle,
  Speed,
  MonetizationOn,
  Chat,
  Functions,
  Timer,
  Psychology,
  Lightbulb,
  TipsAndUpdates,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sofiaAnalytics } from '@/lib/services/sofia-analytics-service';
import { getAnalytics } from '@/lib/services/analytics-service';
import { logger } from '@/lib/utils/logger';

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  insights?: string[];
}

const MetricCardComponent = ({ title, value, subtitle, trend, icon, color }: MetricCard) => {
  const theme = useTheme();
  
  const getGradient = () => {
    const gradients: Record<typeof color, string> = {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      error: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    };
    return gradients[color];
  };
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        background: getGradient(),
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          zIndex: 0,
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
            {icon}
          </Avatar>
          {trend && (
            <Chip
              size="small"
              icon={trend.isPositive ? <TrendingUp /> : <TrendingDown />}
              label={`${trend.isPositive ? '+' : ''}${trend.value.toFixed(1)}%`}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          )}
        </Box>
        
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default function MetricsPage() {
  const theme = useTheme();
  const { services, tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Real-time metrics from Sofia Analytics
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<any[]>([]);
  const [businessInsights, setBusinessInsights] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const loadMetrics = async () => {
    if (!services || !isReady || !tenantId) return;
    
    setLoading(true);
    try {
      // Carregar métricas em tempo real da Sofia
      const [realTime, aggregated, insights, analytics] = await Promise.all([
        sofiaAnalytics.getRealTimeMetrics(tenantId),
        sofiaAnalytics.getAggregatedMetrics(tenantId, 'daily', 7),
        sofiaAnalytics.getBusinessInsights(tenantId, 7),
        getAnalytics(tenantId, {
          period: {
            startDate: startOfMonth(new Date()),
            endDate: endOfMonth(new Date())
          }
        })
      ]);

      setRealTimeMetrics(realTime);
      setAggregatedMetrics(aggregated);
      setBusinessInsights(insights);
      setAnalyticsData(analytics);
      
      logger.info('📊 [Metrics Page] Dados carregados', {
        realTime: !!realTime,
        aggregatedCount: aggregated.length,
        insightsCount: insights.length
      });
    } catch (error) {
      logger.error('❌ [Metrics Page] Erro ao carregar métricas', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [services, isReady, tenantId]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Carregando métricas...</Typography>
      </Box>
    );
  }

  // Calcular tendências
  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const trend = ((current - previous) / previous) * 100;
    return { value: Math.abs(trend), isPositive: trend >= 0 };
  };

  // Obter métricas do dia anterior para comparação
  const yesterdayMetrics = aggregatedMetrics.length > 1 ? aggregatedMetrics[1] : null;
  const todayMetrics = aggregatedMetrics.length > 0 ? aggregatedMetrics[0] : null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Central de Métricas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Acompanhe o desempenho da Sofia e insights de negócio em tempo real
          </Typography>
        </Box>
        <IconButton onClick={loadMetrics} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Visão Geral" icon={<Analytics />} iconPosition="start" />
        <Tab label="Sofia AI" icon={<SmartToy />} iconPosition="start" />
        <Tab label="Conversões" icon={<MonetizationOn />} iconPosition="start" />
        <Tab label="Insights" icon={<Lightbulb />} iconPosition="start" />
      </Tabs>

      {/* Tab: Visão Geral */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Métricas em Tempo Real */}
          <Grid item xs={12} md={3}>
            <MetricCardComponent
              title="Conversas Ativas"
              value={realTimeMetrics?.activeConversations || 0}
              subtitle="Neste momento"
              icon={<Chat />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCardComponent
              title="Conversas Hoje"
              value={realTimeMetrics?.todayConversations || 0}
              subtitle={`${realTimeMetrics?.todayMessages || 0} mensagens`}
              trend={todayMetrics && yesterdayMetrics ? 
                calculateTrend(todayMetrics.totalConversations, yesterdayMetrics.totalConversations) : 
                undefined
              }
              icon={<WhatsApp />}
              color="success"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCardComponent
              title="Conversões Hoje"
              value={realTimeMetrics?.todayConversions || 0}
              subtitle={`Taxa: ${todayMetrics?.overallConversionRate?.toFixed(1) || 0}%`}
              trend={todayMetrics && yesterdayMetrics ? 
                calculateTrend(todayMetrics.overallConversionRate, yesterdayMetrics.overallConversionRate) : 
                undefined
              }
              icon={<EventAvailable />}
              color="warning"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCardComponent
              title="Tempo de Resposta"
              value={`${(realTimeMetrics?.avgResponseTime || 0) / 1000}s`}
              subtitle="Média do dia"
              trend={todayMetrics && yesterdayMetrics ? 
                calculateTrend(yesterdayMetrics.avgResponseTime, todayMetrics.avgResponseTime) : // Invertido - menor é melhor
                undefined
              }
              icon={<Timer />}
              color="info"
            />
          </Grid>

          {/* Métricas de Negócio */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Métricas de Negócio
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <MetricCardComponent
              title="Receita do Mês"
              value={`R$ ${analyticsData?.totalRevenue?.toFixed(2) || '0,00'}`}
              subtitle={`Líquido: R$ ${analyticsData?.netRevenue?.toFixed(2) || '0,00'}`}
              icon={<AttachMoney />}
              color="success"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <MetricCardComponent
              title="Taxa de Ocupação"
              value={`${analyticsData?.occupancyRate?.toFixed(1) || 0}%`}
              subtitle={`ADR: R$ ${analyticsData?.adr?.toFixed(2) || '0,00'}`}
              icon={<Home />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <MetricCardComponent
              title="MRR"
              value={`R$ ${analyticsData?.mrr?.toFixed(2) || '0,00'}`}
              subtitle={`ARR: R$ ${analyticsData?.arr?.toFixed(2) || '0,00'}`}
              icon={<MonetizationOn />}
              color="secondary"
            />
          </Grid>
        </Grid>
      )}

      {/* Tab: Sofia AI */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance da Sofia - Últimos 7 dias
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell align="right">Conversas</TableCell>
                        <TableCell align="right">Mensagens</TableCell>
                        <TableCell align="right">Funções Exec.</TableCell>
                        <TableCell align="right">Taxa Conversão</TableCell>
                        <TableCell align="right">Tempo Resp.</TableCell>
                        <TableCell align="right">Taxa Erro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {aggregatedMetrics.map((metric, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {format(new Date(metric.date), 'dd/MM', { locale: ptBR })}
                          </TableCell>
                          <TableCell align="right">{metric.totalConversations}</TableCell>
                          <TableCell align="right">{metric.totalMessages}</TableCell>
                          <TableCell align="right">
                            {metric.topIntents?.reduce((sum, i) => sum + i.count, 0) || 0}
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${metric.overallConversionRate?.toFixed(1)}%`}
                              size="small"
                              color={metric.overallConversionRate > 20 ? 'success' : 'warning'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {(metric.avgResponseTime / 1000).toFixed(1)}s
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${metric.errorRate?.toFixed(1)}%`}
                              size="small"
                              color={metric.errorRate < 5 ? 'success' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Intents */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Intenções Mais Detectadas
                </Typography>
                <List>
                  {todayMetrics?.topIntents?.map((intent: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Psychology color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={intent.intent}
                        secondary={`${intent.count} vezes`}
                      />
                    </ListItem>
                  )) || (
                    <Typography color="text.secondary">
                      Nenhuma intenção detectada hoje
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Properties */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Propriedades Mais Vistas
                </Typography>
                <List>
                  {todayMetrics?.topProperties?.map((prop: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Home color="secondary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`Propriedade ${prop.propertyId.slice(0, 8)}...`}
                        secondary={`${prop.views} visualizações`}
                      />
                    </ListItem>
                  )) || (
                    <Typography color="text.secondary">
                      Nenhuma propriedade visualizada hoje
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab: Conversões */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Funil de Conversão
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  {todayMetrics && (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Visualização → Interesse
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={todayMetrics.viewToInterestRate || 0}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {todayMetrics.viewToInterestRate?.toFixed(1)}%
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Interesse → Cálculo de Preço
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={todayMetrics.interestToCalculationRate || 0}
                          sx={{ height: 10, borderRadius: 5 }}
                          color="secondary"
                        />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {todayMetrics.interestToCalculationRate?.toFixed(1)}%
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Cálculo → Reserva
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={todayMetrics.calculationToReservationRate || 0}
                          sx={{ height: 10, borderRadius: 5 }}
                          color="success"
                        />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {todayMetrics.calculationToReservationRate?.toFixed(1)}%
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Métricas de Cliente */}
          <Grid item xs={12} md={6}>
            <MetricCardComponent
              title="Taxa de Conversão"
              value={`${analyticsData?.conversionRate?.toFixed(1) || 0}%`}
              subtitle="Leads → Clientes"
              icon={<People />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <MetricCardComponent
              title="Taxa de Recompra"
              value={`${analyticsData?.repeatBookingRate?.toFixed(1) || 0}%`}
              subtitle="Clientes recorrentes"
              icon={<Star />}
              color="warning"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <MetricCardComponent
              title="CAC"
              value={`R$ ${analyticsData?.cac?.toFixed(2) || '0,00'}`}
              subtitle="Custo de aquisição"
              icon={<MonetizationOn />}
              color="error"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <MetricCardComponent
              title="LTV"
              value={`R$ ${analyticsData?.ltv?.toFixed(2) || '0,00'}`}
              subtitle="Valor do cliente"
              icon={<AttachMoney />}
              color="success"
            />
          </Grid>
        </Grid>
      )}

      {/* Tab: Insights */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          {businessInsights.map((dayInsight, index) => (
            <Grid item xs={12} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Insights - {format(new Date(dayInsight.period), 'dd/MM/yyyy', { locale: ptBR })}
                  </Typography>

                  {/* Localizações Mais Requisitadas */}
                  {dayInsight.mostRequestedLocations?.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        <LocationOn sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Localizações Populares
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {dayInsight.mostRequestedLocations.map((loc: any, i: number) => (
                          <Chip 
                            key={i}
                            label={`${loc.location} (${loc.count})`}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Oportunidades Perdidas */}
                  {dayInsight.missedOpportunities?.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        <Warning sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />
                        Oportunidades Perdidas
                      </Typography>
                      {dayInsight.missedOpportunities.map((opp: any, i: number) => (
                        <Alert severity="warning" sx={{ mt: 1 }} key={i}>
                          <Typography variant="body2">
                            {opp.reason} - {opp.count} casos (Potencial: R$ {opp.potentialRevenue?.toFixed(2)})
                          </Typography>
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* Recomendações */}
                  {dayInsight.recommendations?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        <TipsAndUpdates sx={{ verticalAlign: 'middle', mr: 1, color: 'info.main' }} />
                        Recomendações
                      </Typography>
                      {dayInsight.recommendations.map((rec: any, i: number) => (
                        <Alert 
                          severity={rec.impact === 'high' ? 'error' : rec.impact === 'medium' ? 'warning' : 'info'}
                          sx={{ mt: 1 }}
                          key={i}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {rec.type.toUpperCase()}: {rec.suggestion}
                          </Typography>
                          {rec.estimatedRevenue && (
                            <Typography variant="caption">
                              Impacto estimado: R$ {rec.estimatedRevenue.toFixed(2)}
                            </Typography>
                          )}
                        </Alert>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}

          {businessInsights.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">
                Ainda não há insights disponíveis. Os insights são gerados após o processamento de conversas com a Sofia.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}