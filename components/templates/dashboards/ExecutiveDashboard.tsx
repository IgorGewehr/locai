'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Stack,
  Chip,
  Avatar,
  Button,
  IconButton,
  Divider,
  LinearProgress,
  CircularProgress,
  Alert,
  Tooltip,
  Badge,
  useTheme,
  alpha,
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
  Skeleton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
  Schedule,
  AutoAwesome,
  BusinessCenter,
  Timeline,
  BarChart,
  PieChart,
  ShowChart,
  FilterList,
  Download,
  Share,
  Notifications,
  Settings,
  Refresh,
  Launch,
  Star,
  ThumbUp,
  MonetizationOn,
  SwapHoriz,
  CallMade,
  CallReceived,
  Analytics,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { useTenant } from '@/contexts/TenantContext';
import { realInsightsService } from '@/lib/services/real-insights-service';
import { AIGeneratedInsight } from '@/lib/services/advanced-ai-insights';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

interface ExecutiveKPI {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  target?: string;
}

interface ActionableInsight {
  insight: AIGeneratedInsight;
  priority: number;
  quickWins: boolean;
  impactLevel: 'high' | 'medium' | 'low';
}

interface ExecutiveSummary {
  period: string;
  businessHealth: {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    factors: string[];
  };
  keyWins: string[];
  urgentActions: string[];
  opportunities: {
    title: string;
    value: number;
    effort: 'low' | 'medium' | 'high';
  }[];
}

export default function ExecutiveDashboard() {
  const theme = useTheme();
  const { tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AIGeneratedInsight[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [kpis, setKPIs] = useState<ExecutiveKPI[]>([]);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (isReady && tenantId) {
      loadExecutiveData();
    }
  }, [isReady, tenantId, timeRange]);

  const loadExecutiveData = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      // Load real insights
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const realInsights = await realInsightsService.generateRealInsights(tenantId, days);
      setInsights(realInsights);

      // Generate executive summary
      const summary = generateExecutiveSummary(realInsights);
      setExecutiveSummary(summary);

      // Generate KPIs
      const executiveKPIs = generateExecutiveKPIs(realInsights);
      setKPIs(executiveKPIs);

    } catch (error) {
      console.error('Error loading executive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateExecutiveSummary = (insights: AIGeneratedInsight[]): ExecutiveSummary => {
    const criticalInsights = insights.filter(i => i.priority === 'critical').length;
    const highInsights = insights.filter(i => i.priority === 'high').length;
    const totalRevenuePotential = insights.reduce((sum, i) => sum + (i.estimatedROI || 0), 0);

    let score = 85;
    let status: ExecutiveSummary['businessHealth']['status'] = 'good';
    const factors: string[] = [];

    if (criticalInsights > 0) {
      score -= criticalInsights * 15;
      factors.push(`${criticalInsights} issue(s) crítico(s) detectado(s)`);
    }
    if (highInsights > 2) {
      score -= (highInsights - 2) * 5;
      factors.push(`${highInsights} oportunidades de alta prioridade`);
    }

    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'warning';
    else status = 'critical';

    const keyWins = [
      totalRevenuePotential > 10000 ? `R$ ${(totalRevenuePotential / 1000).toFixed(0)}k em oportunidades identificadas` : null,
      insights.length > 0 ? `${insights.length} insights acionáveis gerados` : null,
      'Sistema de IA operacional e gerando valor'
    ].filter(Boolean) as string[];

    const urgentActions = insights
      .filter(i => i.priority === 'critical')
      .slice(0, 3)
      .map(i => i.actionableSteps[0] || i.title);

    const opportunities = insights
      .filter(i => i.estimatedROI && i.estimatedROI > 1000)
      .slice(0, 3)
      .map(i => ({
        title: i.title,
        value: i.estimatedROI!,
        effort: i.timeToImplement.includes('semana') ? 'low' : 'medium' as 'low' | 'medium' | 'high'
      }));

    return {
      period: `Últimos ${timeRange === '7d' ? '7 dias' : timeRange === '30d' ? '30 dias' : '90 dias'}`,
      businessHealth: { score, status, factors },
      keyWins,
      urgentActions,
      opportunities
    };
  };

  const generateExecutiveKPIs = (insights: AIGeneratedInsight[]): ExecutiveKPI[] => {
    const totalOpportunities = insights.reduce((sum, i) => sum + (i.estimatedROI || 0), 0);
    const criticalIssues = insights.filter(i => i.priority === 'critical').length;
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / Math.max(insights.length, 1);
    const automationPotential = insights.filter(i => 
      i.category === 'operational' || i.actionableSteps.some(a => a.includes('automat'))
    ).length;

    return [
      {
        title: 'Oportunidades de Receita',
        value: `R$ ${(totalOpportunities / 1000).toFixed(0)}k`,
        change: 15.3,
        trend: 'up',
        icon: <MonetizationOn />,
        color: COLORS.success,
        subtitle: `${insights.length} insights identificados`,
        target: 'Meta: R$ 50k/mês'
      },
      {
        title: 'Issues Críticos',
        value: criticalIssues.toString(),
        change: criticalIssues > 0 ? -25 : 0,
        trend: criticalIssues > 0 ? 'up' : 'stable',
        icon: <Warning />,
        color: criticalIssues > 0 ? COLORS.error : COLORS.success,
        subtitle: 'Requer ação imediata',
        target: 'Meta: 0 issues'
      },
      {
        title: 'Confiança da IA',
        value: `${(avgConfidence * 100).toFixed(0)}%`,
        change: 8.7,
        trend: 'up',
        icon: <AutoAwesome />,
        color: COLORS.info,
        subtitle: 'Qualidade das análises',
        target: 'Meta: >85%'
      },
      {
        title: 'Potencial Automação',
        value: automationPotential.toString(),
        change: 12.1,
        trend: 'up',
        icon: <Speed />,
        color: COLORS.secondary,
        subtitle: 'Processos automatizáveis',
        target: 'Eficiência operacional'
      }
    ];
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return COLORS.success;
      case 'good': return COLORS.info;
      case 'warning': return COLORS.warning;
      case 'critical': return COLORS.error;
      default: return COLORS.info;
    }
  };

  const renderKPICard = (kpi: ExecutiveKPI, index: number) => (
    <Grid item xs={12} sm={6} lg={3} key={index}>
      <Card
        sx={{
          height: '100%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 40px ${alpha(kpi.color, 0.3)}`,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: alpha(kpi.color, 0.15),
                color: kpi.color,
                width: 48,
                height: 48,
              }}
            >
              {kpi.icon}
            </Avatar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {kpi.trend === 'up' ? (
                <TrendingUp sx={{ color: COLORS.success, fontSize: 20 }} />
              ) : kpi.trend === 'down' ? (
                <TrendingDown sx={{ color: COLORS.error, fontSize: 20 }} />
              ) : null}
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color: kpi.trend === 'up' ? COLORS.success : 
                         kpi.trend === 'down' ? COLORS.error : 'text.secondary'
                }}
              >
                {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          <Typography variant="h4" fontWeight={700} sx={{ color: 'white', mb: 1 }}>
            {kpi.value}
          </Typography>
          
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: 'white', mb: 1 }}>
            {kpi.title}
          </Typography>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
            {kpi.subtitle}
          </Typography>

          {kpi.target && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {kpi.target}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  const renderBusinessHealthScore = () => {
    if (!executiveSummary) return null;

    const { score, status } = executiveSummary.businessHealth;
    const color = getHealthColor(status);

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: 'white' }}>
            Saúde do Negócio
          </Typography>
          
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={120}
                  thickness={4}
                  sx={{ color: 'rgba(255,255,255,0.1)' }}
                />
                <CircularProgress
                  variant="determinate"
                  value={score}
                  size={120}
                  thickness={4}
                  sx={{ 
                    color,
                    position: 'absolute',
                    left: 0,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="h4" fontWeight={700} sx={{ color: 'white' }}>
                    {score}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Score
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={status.toUpperCase()}
                  sx={{
                    bgcolor: alpha(color, 0.15),
                    color,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    mb: 2
                  }}
                />
              </Box>

              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Fatores Analisados:
              </Typography>
              
              <List dense>
                {executiveSummary.businessHealth.factors.map((factor, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: COLORS.success, fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={factor}
                      sx={{ '& .MuiTypography-root': { color: 'rgba(255,255,255,0.8)' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderQuickActions = () => {
    if (!executiveSummary) return null;

    return (
      <Grid container spacing={3}>
        {/* Key Wins */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: alpha(COLORS.success, 0.15), color: COLORS.success }}>
                  <Star />
                </Avatar>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
                  Principais Conquistas
                </Typography>
              </Box>

              <Stack spacing={2}>
                {executiveSummary.keyWins.map((win, index) => (
                  <Paper
                    key={index}
                    sx={{
                      p: 2,
                      background: alpha(COLORS.success, 0.08),
                      border: `1px solid ${alpha(COLORS.success, 0.2)}`
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      • {win}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Urgent Actions */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: alpha(COLORS.error, 0.15), color: COLORS.error }}>
                  <Warning />
                </Avatar>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
                  Ações Urgentes
                </Typography>
              </Box>

              <Stack spacing={2}>
                {executiveSummary.urgentActions.length > 0 ? (
                  executiveSummary.urgentActions.map((action, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 2,
                        background: alpha(COLORS.error, 0.08),
                        border: `1px solid ${alpha(COLORS.error, 0.2)}`
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        • {action}
                      </Typography>
                    </Paper>
                  ))
                ) : (
                  <Paper
                    sx={{
                      p: 2,
                      background: alpha(COLORS.success, 0.08),
                      border: `1px solid ${alpha(COLORS.success, 0.2)}`
                    }}
                  >
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      ✅ Nenhuma ação urgente necessária
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Opportunities */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: alpha(COLORS.warning, 0.15), color: COLORS.warning }}>
                  <TrendingUp />
                </Avatar>
                <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
                  Maiores Oportunidades
                </Typography>
              </Box>

              <Stack spacing={2}>
                {executiveSummary.opportunities.slice(0, 3).map((opp, index) => (
                  <Paper
                    key={index}
                    sx={{
                      p: 2,
                      background: alpha(COLORS.warning, 0.08),
                      border: `1px solid ${alpha(COLORS.warning, 0.2)}`
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'white' }}>
                        {opp.title.substring(0, 40)}...
                      </Typography>
                      <Chip
                        label={opp.effort}
                        size="small"
                        sx={{
                          bgcolor: alpha(
                            opp.effort === 'low' ? COLORS.success : 
                            opp.effort === 'medium' ? COLORS.warning : COLORS.error,
                            0.2
                          ),
                          color: opp.effort === 'low' ? COLORS.success : 
                                 opp.effort === 'medium' ? COLORS.warning : COLORS.error,
                        }}
                      />
                    </Box>
                    <Typography variant="h6" sx={{ color: COLORS.warning }}>
                      R$ {(opp.value / 1000).toFixed(0)}k
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography 
            variant="h3" 
            fontWeight={700}
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
            }}
          >
            Dashboard Executivo
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Visão estratégica do negócio • {executiveSummary?.period}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant={timeRange === '7d' ? 'contained' : 'outlined'}
            onClick={() => setTimeRange('7d')}
            size="small"
          >
            7 dias
          </Button>
          <Button
            variant={timeRange === '30d' ? 'contained' : 'outlined'}
            onClick={() => setTimeRange('30d')}
            size="small"
          >
            30 dias
          </Button>
          <Button
            variant={timeRange === '90d' ? 'contained' : 'outlined'}
            onClick={() => setTimeRange('90d')}
            size="small"
          >
            90 dias
          </Button>
          <IconButton
            onClick={loadExecutiveData}
            sx={{
              bgcolor: alpha(COLORS.primary, 0.1),
              border: `1px solid ${alpha(COLORS.primary, 0.2)}`,
            }}
          >
            <Refresh sx={{ color: COLORS.primary }} />
          </IconButton>
        </Stack>
      </Box>

      {/* Executive KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, index) => renderKPICard(kpi, index))}
      </Grid>

      {/* Business Health Score */}
      {renderBusinessHealthScore()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Detailed Insights */}
      {insights.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: 'white', mb: 3 }}>
              Insights Detalhados
            </Typography>
            
            <Grid container spacing={3}>
              {insights.slice(0, 6).map((insight, index) => (
                <Grid item xs={12} md={6} lg={4} key={insight.id}>
                  <Paper
                    sx={{
                      p: 3,
                      height: '100%',
                      background: alpha(theme.palette.background.paper, 0.6),
                      border: `1px solid ${alpha(
                        insight.priority === 'critical' ? COLORS.error :
                        insight.priority === 'high' ? COLORS.warning :
                        COLORS.info, 0.3
                      )}`,
                      borderLeft: `4px solid ${
                        insight.priority === 'critical' ? COLORS.error :
                        insight.priority === 'high' ? COLORS.warning :
                        COLORS.info
                      }`,
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={insight.priority.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: alpha(
                            insight.priority === 'critical' ? COLORS.error :
                            insight.priority === 'high' ? COLORS.warning :
                            COLORS.info, 0.15
                          ),
                          color: insight.priority === 'critical' ? COLORS.error :
                                 insight.priority === 'high' ? COLORS.warning :
                                 COLORS.info,
                          fontWeight: 600,
                          mb: 1
                        }}
                      />
                    </Box>

                    <Typography variant="h6" fontWeight={600} sx={{ color: 'white', mb: 2 }}>
                      {insight.title}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                      {insight.description.length > 120 
                        ? insight.description.substring(0, 120) + '...'
                        : insight.description
                      }
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={`${(insight.confidence * 100).toFixed(0)}% conf.`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                        {insight.estimatedROI && (
                          <Chip
                            label={`R$ ${(insight.estimatedROI / 1000).toFixed(0)}k`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {insight.timeToImplement}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}