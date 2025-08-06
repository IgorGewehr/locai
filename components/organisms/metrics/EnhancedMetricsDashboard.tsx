'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Alert,
  Stack,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Paper,
  Fade,
  Slide,
  Grow,
  Collapse,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Psychology,
  AutoAwesome,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Warning,
  CheckCircle,
  Speed,
  AttachMoney,
  Analytics,
  Refresh,
  Settings,
  NotificationsActive,
  TrendingUp as PredictiveText,
  SmartToy,
  Insights,
  Timeline,
  Assignment,
  Loop,
  ContentPaste,
  Alarm,
  MoneyOff,
  EmojiEvents,
  BubbleChart,
  Whatshot,
  ShowChart,
  BarChart,
  PieChart,
  Radar,
  DonutSmall,
  Functions,
  AutoGraph,
  Close,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Pause,
  Notifications,
  Campaign,
  LocalOffer,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { 
  AIGeneratedInsight,
  PredictiveAnalysis,
  SmartRecommendations,
  RealTimeAlerts
} from '@/lib/services/advanced-ai-insights';
import { realInsightsService } from '@/lib/services/real-insights-service';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
  Cell,
  LabelList,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4', 
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  gradient: {
    primary: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  }
};

interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  showPredictions: boolean;
  alertsEnabled: boolean;
  advancedCharts: boolean;
}

export default function EnhancedMetricsDashboard() {
  const theme = useTheme();
  const { tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AIGeneratedInsight[]>([]);
  const [predictions, setPredictions] = useState<PredictiveAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<SmartRecommendations | null>(null);
  const [alerts, setAlerts] = useState<RealTimeAlerts[]>([]);
  const [settings, setSettings] = useState<DashboardSettings>({
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    showPredictions: true,
    alertsEnabled: true,
    advancedCharts: true,
  });
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    insights: true,
    predictions: true,
    recommendations: true,
    alerts: true,
  });
  const [selectedInsight, setSelectedInsight] = useState<AIGeneratedInsight | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh effect
  useEffect(() => {
    if (!settings.autoRefresh) return;
    
    const interval = setInterval(() => {
      loadData();
    }, settings.refreshInterval);

    return () => clearInterval(interval);
  }, [settings.autoRefresh, settings.refreshInterval, tenantId]);

  // Initial load
  useEffect(() => {
    if (isReady && tenantId) {
      loadData();
    }
  }, [isReady, tenantId]);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    
    setRefreshing(true);
    try {
      const [
        aiInsights,
        predictiveAnalysis,
        smartRecommendations,
        realTimeAlerts
      ] = await Promise.all([
        realInsightsService.generateRealInsights(tenantId, 30),
        realInsightsService.generateRealPredictions(tenantId),
        realInsightsService.generateRealRecommendations(tenantId),
        realInsightsService.generateRealAlerts(tenantId),
      ]);

      setInsights(aiInsights);
      setPredictions(predictiveAnalysis);
      setRecommendations(smartRecommendations);
      setAlerts(realTimeAlerts.filter(alert => !alert.dismissed));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return COLORS.error;
      case 'high': return COLORS.warning;
      case 'medium': return COLORS.info;
      case 'low': return COLORS.success;
      default: return theme.palette.text.secondary;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'revenue': return <AttachMoney />;
      case 'efficiency': return <Speed />;
      case 'satisfaction': return <EmojiEvents />;
      case 'retention': return <Loop />;
      default: return <Insights />;
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const renderInsightCard = (insight: AIGeneratedInsight, index: number) => (
    <Grow in timeout={300 + index * 100} key={insight.id}>
      <Card
        sx={{
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(getPriorityColor(insight.priority), 0.3)}`,
          borderLeft: `4px solid ${getPriorityColor(insight.priority)}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha(getPriorityColor(insight.priority), 0.2)}`,
          },
        }}
        onClick={() => setSelectedInsight(insight)}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(getPriorityColor(insight.priority), 0.1),
                  color: getPriorityColor(insight.priority),
                  width: 48,
                  height: 48,
                }}
              >
                {getImpactIcon(insight.impact)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {insight.title}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Chip
                    label={insight.priority}
                    size="small"
                    sx={{
                      bgcolor: alpha(getPriorityColor(insight.priority), 0.1),
                      color: getPriorityColor(insight.priority),
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={insight.category}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${(insight.confidence * 100).toFixed(0)}% confiança`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Stack>
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            {insight.description}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={2}>
              {insight.estimatedROI && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoney color="success" fontSize="small" />
                  <Typography variant="caption" fontWeight={600} color="success.main">
                    R$ {insight.estimatedROI.toLocaleString()}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Assignment fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {insight.actionableSteps.length} ações
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timeline fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {insight.timeToImplement}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {format(insight.generatedAt, 'HH:mm', { locale: ptBR })}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  const renderPredictionChart = () => {
    if (!predictions) return null;

    const data = [{
      name: 'Atual',
      conversions: predictions.conversionPrediction.nextMonth.expected * 0.8,
    }, {
      name: 'Próximo Mês',
      conversions: predictions.conversionPrediction.nextMonth.expected,
      min: predictions.conversionPrediction.nextMonth.range.min,
      max: predictions.conversionPrediction.nextMonth.range.max,
    }];

    return (
      <Box sx={{ height: 300, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip 
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
              }}
            />
            <Bar dataKey="conversions" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
            <Line 
              type="monotone" 
              dataKey="min" 
              stroke={COLORS.warning} 
              strokeDasharray="5 5"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="max" 
              stroke={COLORS.success} 
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const renderRecommendationChart = () => {
    if (!recommendations) return null;

    const data = [
      ...recommendations.automationOpportunities.map((opp, index) => ({
        name: opp.task.substring(0, 20) + '...',
        value: opp.potentialSavings,
        type: 'Automação',
        fill: COLORS.success,
      })),
      ...recommendations.contentGaps.map((gap, index) => ({
        name: gap.topic.substring(0, 20) + '...',
        value: gap.requestFrequency * 100, // Scale for visualization
        type: 'Conteúdo',
        fill: COLORS.warning,
      })),
    ].slice(0, 8);

    return (
      <Box sx={{ height: 300, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <ChartTooltip 
              formatter={(value, name) => [`R$ ${value}`, 'Valor Potencial']}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8,
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            sx={{
              background: COLORS.gradient.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
            }}
          >
            Inteligência Avançada
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Insights gerados por IA para maximizar performance do negócio
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Badge badgeContent={alerts.length} color="error">
            <IconButton 
              color="primary"
              onClick={() => setSettingsOpen(true)}
            >
              <NotificationsActive />
            </IconButton>
          </Badge>
          <IconButton onClick={() => setSettingsOpen(true)} color="primary">
            <Settings />
          </IconButton>
          <Button
            variant="contained"
            startIcon={refreshing ? <Pause /> : <Refresh />}
            onClick={loadData}
            disabled={refreshing}
            sx={{
              background: COLORS.gradient.primary,
              boxShadow: `0 4px 14px ${alpha(COLORS.primary, 0.3)}`,
            }}
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </Stack>
      </Box>

      {/* Real-time Alerts */}
      {alerts.length > 0 && (
        <Fade in>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Alarm color="error" />
              Alertas em Tempo Real ({alerts.length})
            </Typography>
            <Stack spacing={2}>
              {alerts.slice(0, 3).map((alert, index) => (
                <Slide in direction="left" timeout={300 + index * 100} key={alert.id}>
                  <Alert
                    severity={alert.severity as any}
                    action={
                      <IconButton onClick={() => dismissAlert(alert.id)} size="small">
                        <Close />
                      </IconButton>
                    }
                    sx={{
                      background: alpha(
                        alert.severity === 'high' ? COLORS.error : 
                        alert.severity === 'medium' ? COLORS.warning : COLORS.info,
                        0.1
                      ),
                      border: `1px solid ${alpha(
                        alert.severity === 'high' ? COLORS.error : 
                        alert.severity === 'medium' ? COLORS.warning : COLORS.info,
                        0.3
                      )}`,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      {alert.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="primary.main">
                      <Lightbulb sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      {alert.suggestedAction}
                    </Typography>
                  </Alert>
                </Slide>
              ))}
            </Stack>
          </Box>
        </Fade>
      )}

      {/* AI Generated Insights */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('insights')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }}>
                <Psychology />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Insights Gerados por IA
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {insights.length} insights descobertos • Atualizado há {format(new Date(), 'HH:mm')}
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.insights ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.insights}>
            <Grid container spacing={3}>
              {insights.slice(0, 6).map((insight, index) => (
                <Grid item xs={12} md={6} lg={4} key={insight.id}>
                  {renderInsightCard(insight, index)}
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Predictive Analysis */}
      {settings.showPredictions && predictions && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                cursor: 'pointer',
              }}
              onClick={() => toggleSection('predictions')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(COLORS.info, 0.1), color: COLORS.info }}>
                  <PredictiveText />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Análise Preditiva
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Previsões baseadas em padrões históricos
                  </Typography>
                </Box>
              </Box>
              <IconButton>
                {expandedSections.predictions ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={expandedSections.predictions}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Previsão de Conversões - Próximo Mês
                    </Typography>
                    {renderPredictionChart()}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <Chip
                        label={`${(predictions.conversionPrediction.nextMonth.confidence * 100).toFixed(0)}% confiança`}
                        color="info"
                        icon={<Analytics />}
                      />
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Fatores de Influência
                    </Typography>
                    <Stack spacing={2}>
                      {predictions.conversionPrediction.factors.slice(0, 4).map((factor, index) => (
                        <Box key={index} sx={{ p: 2, background: alpha(theme.palette.background.default, 0.5), borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {factor.factor}
                            </Typography>
                            <Chip
                              label={factor.influence > 0 ? `+${(factor.influence * 100).toFixed(0)}%` : `${(factor.influence * 100).toFixed(0)}%`}
                              size="small"
                              color={factor.influence > 0 ? 'success' : 'error'}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {factor.description}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Smart Recommendations */}
      {recommendations && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                cursor: 'pointer',
              }}
              onClick={() => toggleSection('recommendations')}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha(COLORS.success, 0.1), color: COLORS.success }}>
                  <AutoAwesome />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Recomendações Inteligentes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Otimizações baseadas em análise de dados
                  </Typography>
                </Box>
              </Box>
              <IconButton>
                {expandedSections.recommendations ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={expandedSections.recommendations}>
              <Grid container spacing={3}>
                {/* Automation Opportunities */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Loop color="success" />
                      Oportunidades de Automação
                    </Typography>
                    <Stack spacing={2}>
                      {recommendations.automationOpportunities.slice(0, 4).map((opp, index) => (
                        <Box key={index} sx={{ p: 2, background: alpha(COLORS.success, 0.05), borderRadius: 2, border: `1px solid ${alpha(COLORS.success, 0.2)}` }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {opp.task}
                            </Typography>
                            <Chip
                              label={`R$ ${opp.potentialSavings.toLocaleString()}/mês`}
                              size="small"
                              color="success"
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {opp.timeWasted} min/dia desperdiçados • {opp.frequency}x por semana
                          </Typography>
                          <Typography variant="caption" color="primary.main">
                            {opp.implementation}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                {/* Content Gaps */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ContentPaste color="warning" />
                      Lacunas de Conteúdo
                    </Typography>
                    <Stack spacing={2}>
                      {recommendations.contentGaps.slice(0, 4).map((gap, index) => (
                        <Box key={index} sx={{ p: 2, background: alpha(COLORS.warning, 0.05), borderRadius: 2, border: `1px solid ${alpha(COLORS.warning, 0.2)}` }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {gap.topic}
                            </Typography>
                            <Chip
                              label={`${gap.requestFrequency} perguntas`}
                              size="small"
                              color="warning"
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Atual: {gap.currentResponse}
                          </Typography>
                          <Typography variant="caption" color="primary.main">
                            <Lightbulb sx={{ fontSize: 12, mr: 0.5 }} />
                            {gap.suggestedImprovement}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                {/* Visual Recommendations */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      Oportunidades por Valor
                    </Typography>
                    {renderRecommendationChart()}
                  </Paper>
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {/* Insight Detail Dialog */}
      <Dialog
        open={Boolean(selectedInsight)}
        onClose={() => setSelectedInsight(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        {selectedInsight && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: alpha(getPriorityColor(selectedInsight.priority), 0.1),
                    color: getPriorityColor(selectedInsight.priority),
                  }}
                >
                  {getImpactIcon(selectedInsight.impact)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedInsight.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip label={selectedInsight.priority} size="small" color="primary" />
                    <Chip label={selectedInsight.category} size="small" variant="outlined" />
                  </Stack>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent>
              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
                {selectedInsight.description}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    📋 Plano de Ação
                  </Typography>
                  <List dense>
                    {selectedInsight.actionableSteps.map((step, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Chip label={index + 1} size="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={step} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    📊 Métricas de Impacto
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, background: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="body2">Conversas Afetadas</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedInsight.metrics.affectedConversations}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, background: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="body2">Receita Potencial</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        R$ {selectedInsight.metrics.potentialRevenue.toLocaleString()}
                      </Typography>
                    </Box>
                    {selectedInsight.metrics.currentLoss && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, background: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                        <Typography variant="body2">Perda Atual</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          R$ {selectedInsight.metrics.currentLoss.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                    🔍 Evidências
                  </Typography>
                  <Box sx={{ p: 3, background: alpha(theme.palette.background.default, 0.5), borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Detectado em {selectedInsight.evidence.frequency} conversas
                    </Typography>
                    <Stack spacing={1}>
                      {selectedInsight.evidence.patterns.map((pattern, index) => (
                        <Typography key={index} variant="caption" sx={{ display: 'block' }}>
                          • {pattern}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={() => setSelectedInsight(null)}>
                Fechar
              </Button>
              <Button variant="contained" sx={{ background: COLORS.gradient.primary }}>
                Implementar Agora
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configurações do Dashboard</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                />
              }
              label="Atualização Automática"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showPredictions}
                  onChange={(e) => setSettings(prev => ({ ...prev, showPredictions: e.target.checked }))}
                />
              }
              label="Mostrar Previsões"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.alertsEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, alertsEnabled: e.target.checked }))}
                />
              }
              label="Alertas em Tempo Real"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.advancedCharts}
                  onChange={(e) => setSettings(prev => ({ ...prev, advancedCharts: e.target.checked }))}
                />
              }
              label="Gráficos Avançados"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}