'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Stack,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  Skeleton,
  Fade,
  Grow,
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Lightbulb,
  Speed,
  AttachMoney,
  People,
  LocationOn,
  Language,
  Refresh,
  MoreVert,
  ExpandMore,
  ExpandLess,
  AutoAwesome,
  SentimentVerySatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  Block,
  EmojiEvents,
  Timeline,
  Analytics,
  Insights,
  Campaign,
  AssignmentTurnedIn,
  LocalOffer,
  WorkspacePremium,
  Whatshot,
  AccessTime,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { conversationInsightsService, AggregatedInsights, ConversationInsight } from '@/lib/services/conversation-insights-service';
import { advancedMetricsService, AdvancedMetrics } from '@/lib/services/advanced-metrics-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  Sankey,
  ComposedChart,
} from 'recharts';

interface MetricHighlight {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  insight?: string;
}

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

export default function AIMetricsDashboard() {
  const theme = useTheme();
  const { tenantId, isReady } = useTenant();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<AggregatedInsights | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    concerns: true,
    blockers: true,
    patterns: true,
    language: false,
    competitors: false,
    regional: false,
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState(30);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (isReady && tenantId) {
      loadInsights();
    }
  }, [isReady, tenantId, selectedTimeRange]);

  const loadInsights = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const [conversationInsights, metrics] = await Promise.all([
        conversationInsightsService.getAggregatedInsights(tenantId, selectedTimeRange),
        advancedMetricsService.getAdvancedMetrics(tenantId),
      ]);
      
      setInsights(conversationInsights);
      setAdvancedMetrics(metrics);
    } catch (error) {
      console.error('Error loading AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return <SentimentVerySatisfied sx={{ color: CHART_COLORS.success }} />;
      case 'neutral': return <SentimentNeutral sx={{ color: CHART_COLORS.warning }} />;
      case 'negative': return <SentimentDissatisfied sx={{ color: CHART_COLORS.error }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'medium': return theme.palette.info.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.text.secondary;
    }
  };

  const renderMetricHighlight = (highlight: MetricHighlight) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        background: alpha(highlight.color, 0.05),
        border: `1px solid ${alpha(highlight.color, 0.2)}`,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(highlight.color, 0.15)}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Avatar
          sx={{
            bgcolor: alpha(highlight.color, 0.1),
            color: highlight.color,
            width: 48,
            height: 48,
          }}
        >
          {highlight.icon}
        </Avatar>
        {highlight.change !== undefined && (
          <Chip
            icon={highlight.change >= 0 ? <TrendingUp /> : <TrendingDown />}
            label={`${highlight.change >= 0 ? '+' : ''}${highlight.change.toFixed(1)}%`}
            size="small"
            sx={{
              bgcolor: alpha(highlight.change >= 0 ? CHART_COLORS.success : CHART_COLORS.error, 0.1),
              color: highlight.change >= 0 ? CHART_COLORS.success : CHART_COLORS.error,
              fontWeight: 600,
            }}
          />
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} sx={{ color: highlight.color, mb: 0.5 }}>
        {highlight.value}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {highlight.label}
      </Typography>
      {highlight.insight && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
          {highlight.insight}
        </Typography>
      )}
    </Paper>
  );

  if (loading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!insights || !advancedMetrics) {
    return (
      <Alert severity="info">
        Nenhuma conversa encontrada no período selecionado para análise.
      </Alert>
    );
  }

  const highlights: MetricHighlight[] = [
    {
      label: 'Taxa de Conversão Geral',
      value: `${advancedMetrics.conversionFunnel.conversionRates.overallConversion.toFixed(1)}%`,
      change: 12.5,
      icon: <EmojiEvents />,
      color: CHART_COLORS.primary,
      insight: `${advancedMetrics.conversionFunnel.confirmedBookings} de ${advancedMetrics.conversionFunnel.whatsappContacts} conversas`,
    },
    {
      label: 'Tempo Médio de Sessão',
      value: `${Math.round(advancedMetrics.customerBehavior.averageSessionDuration / 60)}min`,
      change: -8.2,
      icon: <AccessTime />,
      color: CHART_COLORS.secondary,
      insight: 'Conversas mais eficientes',
    },
    {
      label: 'Bloqueadores Identificados',
      value: insights.conversionBlockers.length,
      icon: <Block />,
      color: CHART_COLORS.error,
      insight: `R$ ${insights.conversionBlockers.reduce((sum, b) => sum + b.lostRevenue, 0).toLocaleString()} em receita perdida`,
    },
    {
      label: 'Padrões de Sucesso',
      value: insights.successPatterns.length,
      change: 25.0,
      icon: <WorkspacePremium />,
      color: CHART_COLORS.success,
      insight: 'Estratégias que funcionam',
    },
  ];

  const funnelData = [
    { stage: 'Contatos', value: advancedMetrics.conversionFunnel.whatsappContacts, fill: CHART_COLORS.primary },
    { stage: 'Conversas', value: advancedMetrics.conversionFunnel.meaningfulConversations, fill: CHART_COLORS.secondary },
    { stage: 'Consultas', value: advancedMetrics.conversionFunnel.propertyInquiries, fill: CHART_COLORS.info },
    { stage: 'Preços', value: advancedMetrics.conversionFunnel.priceRequests, fill: CHART_COLORS.warning },
    { stage: 'Reservas', value: advancedMetrics.conversionFunnel.confirmedBookings, fill: CHART_COLORS.success },
  ];

  const behaviorRadarData = [
    { subject: 'Resposta Rápida', value: 85 },
    { subject: 'Contexto Mantido', value: 72 },
    { subject: 'Sugestões Proativas', value: 68 },
    { subject: 'Linguagem Natural', value: 90 },
    { subject: 'Resolução de Objeções', value: 65 },
    { subject: 'Fechamento', value: 78 },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Inteligência de Conversas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Insights profundos baseados em {advancedMetrics.conversionFunnel.whatsappContacts} conversas dos últimos {selectedTimeRange} dias
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Analytics />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            {selectedTimeRange} dias
          </Button>
          <IconButton onClick={() => loadInsights()} color="primary">
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {[7, 15, 30, 60, 90].map(days => (
          <MenuItem
            key={days}
            onClick={() => {
              setSelectedTimeRange(days);
              setAnchorEl(null);
            }}
            selected={selectedTimeRange === days}
          >
            Últimos {days} dias
          </MenuItem>
        ))}
      </Menu>

      {/* Metric Highlights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {highlights.map((highlight, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Grow in timeout={300 + index * 100}>
              <Box>{renderMetricHighlight(highlight)}</Box>
            </Grow>
          </Grid>
        ))}
      </Grid>

      {/* Conversion Funnel */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Funil de Conversão
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                {Object.entries(advancedMetrics.conversionFunnel.conversionRates).slice(0, 3).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key.replace(/([A-Z])/g, ' $1').trim()}: ${value.toFixed(1)}%`}
                    size="small"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Performance do AI Agent
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={behaviorRadarData}>
                    <PolarGrid stroke={alpha(theme.palette.divider, 0.3)} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Concerns */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('concerns')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(CHART_COLORS.warning, 0.1), color: CHART_COLORS.warning }}>
                <Warning />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Principais Preocupações dos Clientes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {insights.topConcerns.length} padrões identificados
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.concerns ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.concerns}>
            <List>
              {insights.topConcerns.map((concern, index) => (
                <ListItem
                  key={index}
                  sx={{
                    background: alpha(theme.palette.background.default, 0.5),
                    borderRadius: 2,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    <Badge badgeContent={concern.frequency} color="error">
                      <Warning color="warning" />
                    </Badge>
                  </ListItemIcon>
                  <ListItemText
                    primary={concern.concern}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          Taxa de resolução: {concern.satisfactionRate.toFixed(1)}% | 
                          Tempo médio: {concern.avgResolutionTime.toFixed(0)}min
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>
                          Sugestão: {concern.suggestedImprovement}
                        </Typography>
                      </Box>
                    }
                  />
                  <LinearProgress
                    variant="determinate"
                    value={concern.satisfactionRate}
                    sx={{ width: 100, mr: 2 }}
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </CardContent>
      </Card>

      {/* Conversion Blockers */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('blockers')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(CHART_COLORS.error, 0.1), color: CHART_COLORS.error }}>
                <Block />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Bloqueadores de Conversão
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  R$ {insights.conversionBlockers.reduce((sum, b) => sum + b.lostRevenue, 0).toLocaleString()} em receita perdida
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.blockers ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.blockers}>
            <Grid container spacing={2}>
              {insights.conversionBlockers.map((blocker, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: `1px solid ${alpha(getPriorityColor(blocker.priority), 0.3)}`,
                      borderLeft: `4px solid ${getPriorityColor(blocker.priority)}`,
                      background: alpha(getPriorityColor(blocker.priority), 0.05),
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {blocker.blocker}
                      </Typography>
                      <Chip
                        label={blocker.priority}
                        size="small"
                        sx={{
                          bgcolor: alpha(getPriorityColor(blocker.priority), 0.1),
                          color: getPriorityColor(blocker.priority),
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                      <Chip
                        icon={<People />}
                        label={`${blocker.impactedConversations} conversas`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<AttachMoney />}
                        label={`R$ ${blocker.lostRevenue.toLocaleString()}`}
                        size="small"
                        variant="outlined"
                        color="error"
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'primary.main' }}>
                      <Lightbulb sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                      {blocker.solution}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Success Patterns */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('patterns')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(CHART_COLORS.success, 0.1), color: CHART_COLORS.success }}>
                <EmojiEvents />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Padrões de Sucesso
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estratégias que geram resultados
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.patterns ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.patterns}>
            <Grid container spacing={2}>
              {insights.successPatterns.map((pattern, index) => (
                <Grid item xs={12} key={index}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      background: alpha(CHART_COLORS.success, 0.05),
                      border: `1px solid ${alpha(CHART_COLORS.success, 0.2)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircle sx={{ color: CHART_COLORS.success }} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {pattern.pattern}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pattern.occurrences} ocorrências | Taxa de conversão: {pattern.conversionRate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={<Whatshot />}
                        label="Alta Performance"
                        color="success"
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                      <AssignmentTurnedIn sx={{ fontSize: 16, verticalAlign: 'middle', mr: 1 }} />
                      {pattern.recommendation}
                    </Typography>
                    {pattern.keyPhrases.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                        {pattern.keyPhrases.map((phrase, i) => (
                          <Chip
                            key={i}
                            label={phrase}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Language Optimization */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('language')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(CHART_COLORS.info, 0.1), color: CHART_COLORS.info }}>
                <Language />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Otimização de Linguagem
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Palavras e frases que impactam conversões
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.language ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.language}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThumbDown color="error" />
                  Frases Ineficazes
                </Typography>
                <Stack spacing={2}>
                  {insights.languageOptimization.ineffectivePhrases.map((phrase, index) => (
                    <Paper key={index} sx={{ p: 2, background: alpha(CHART_COLORS.error, 0.05) }}>
                      <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'error.main', mb: 1 }}>
                        "{phrase.phrase}"
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'success.main' }}>
                        <AutoAwesome sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                        "{phrase.suggestedAlternative}"
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={phrase.negativeImpact * 100}
                        color="error"
                        sx={{ mt: 1, height: 4 }}
                      />
                    </Paper>
                  ))}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThumbUp color="success" />
                  Palavras Poderosas
                </Typography>
                <Stack spacing={2}>
                  {insights.languageOptimization.powerWords.map((word, index) => (
                    <Paper key={index} sx={{ p: 2, background: alpha(CHART_COLORS.success, 0.05) }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: 'success.main' }}>
                          "{word.word}"
                        </Typography>
                        <Chip
                          label={`+${(word.positiveImpact * 100).toFixed(0)}%`}
                          size="small"
                          color="success"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Contexto: {word.context}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Competitor Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('competitors')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(CHART_COLORS.warning, 0.1), color: CHART_COLORS.warning }}>
                <Campaign />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Análise de Concorrência
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Como clientes comparam com alternativas
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.competitors ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.competitors}>
            <Grid container spacing={2}>
              {insights.competitorAnalysis.map((competitor, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {competitor.competitorName}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={`${competitor.mentions} menções`}
                          size="small"
                        />
                        {getSentimentIcon(competitor.sentiment)}
                      </Stack>
                    </Box>
                    
                    {competitor.reasonsForComparison.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          Razões de comparação:
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {competitor.reasonsForComparison.map((reason, i) => (
                            <Chip key={i} label={reason} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        Nossas vantagens:
                      </Typography>
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {competitor.competitiveAdvantages.map((advantage, i) => (
                          <Typography key={i} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircle sx={{ fontSize: 12, color: 'success.main' }} />
                            {advantage}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* Regional Insights */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              cursor: 'pointer',
            }}
            onClick={() => toggleSection('regional')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: alpha(CHART_COLORS.secondary, 0.1), color: CHART_COLORS.secondary }}>
                <LocationOn />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Insights Regionais
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Preferências por localização
                </Typography>
              </Box>
            </Box>
            <IconButton>
              {expandedSections.regional ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.regional}>
            <Grid container spacing={3}>
              {insights.regionalInsights.map((region, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Paper elevation={0} sx={{ p: 3, background: alpha(theme.palette.primary.main, 0.02) }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                      {region.region}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Faixa de preço esperada:
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        R$ {region.priceExpectations.min.toLocaleString()} - R$ {region.priceExpectations.max.toLocaleString()}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Comodidades populares:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {region.popularAmenities.map((amenity, i) => (
                          <Chip
                            key={i}
                            label={amenity}
                            size="small"
                            icon={<LocalOffer />}
                            sx={{ mb: 1 }}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Divider sx={{ my: 2 }} />
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Considerações culturais:
                      </Typography>
                      {region.culturalConsiderations.map((consideration, i) => (
                        <Typography key={i} variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                          • {consideration}
                        </Typography>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
}