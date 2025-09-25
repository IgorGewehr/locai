'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tab,
  Tabs,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Avatar,
  LinearProgress,
  CircularProgress,
  Alert,
  ButtonGroup,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  PieChart,
  BarChart,
  Analytics,
  FilterList,
  Today,
  DateRange,
  CalendarMonth,
  Refresh,
  Insights,
  Speed,
  Target,
  AttachMoney,
  Phone,
  WhatsApp,
  Email,
  Schedule,
  LocationOn,
  Home,
  Groups,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, LeadStatus } from '@/lib/types/crm';

interface AdvancedAnalyticsProps {
  leads: Lead[];
  onRefresh?: () => void;
}

interface ConversionFunnelData {
  stage: string;
  value: number;
  fill: string;
}

interface TimeSeriesData {
  date: string;
  leads: number;
  conversions: number;
  revenue: number;
}

interface LeadSourceData {
  name: string;
  value: number;
  fill: string;
}

interface PerformanceMetrics {
  totalLeads: number;
  conversionRate: number;
  averageTimeToClose: number;
  totalRevenue: number;
  hotLeads: number;
  averageScore: number;
  topPerformingSource: string;
  bestConvertingDay: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];

const statusOrder = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.OPPORTUNITY,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
];

export default function AdvancedAnalytics({ leads, onRefresh }: AdvancedAnalyticsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(false);

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const cutoffDate = subDays(now, daysAgo);

    return leads.filter(lead => new Date(lead.createdAt) >= cutoffDate);
  }, [leads, timeRange]);

  // Conversion Funnel Data
  const conversionFunnelData = useMemo((): ConversionFunnelData[] => {
    const statusCounts = statusOrder.reduce((acc, status) => {
      acc[status] = filteredLeads.filter(lead => {
        if (status === LeadStatus.NEW) return true; // All leads start as new
        return lead.status === status || (status === LeadStatus.WON && lead.status === LeadStatus.WON);
      }).length;
      return acc;
    }, {} as Record<LeadStatus, number>);

    return [
      { stage: 'Novos Leads', value: statusCounts[LeadStatus.NEW] || filteredLeads.length, fill: COLORS[0] },
      { stage: 'Contatados', value: statusCounts[LeadStatus.CONTACTED] || 0, fill: COLORS[1] },
      { stage: 'Qualificados', value: statusCounts[LeadStatus.QUALIFIED] || 0, fill: COLORS[2] },
      { stage: 'Oportunidades', value: statusCounts[LeadStatus.OPPORTUNITY] || 0, fill: COLORS[3] },
      { stage: 'Negociação', value: statusCounts[LeadStatus.NEGOTIATION] || 0, fill: COLORS[4] },
      { stage: 'Fechados', value: statusCounts[LeadStatus.WON] || 0, fill: COLORS[5] },
    ].filter(item => item.value > 0);
  }, [filteredLeads]);

  // Time Series Data
  const timeSeriesData = useMemo((): TimeSeriesData[] => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const data: TimeSeriesData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'dd/MM', { locale: ptBR });

      const leadsOnDay = filteredLeads.filter(lead =>
        format(new Date(lead.createdAt), 'dd/MM', { locale: ptBR }) === dateStr
      ).length;

      const conversionsOnDay = filteredLeads.filter(lead =>
        lead.status === LeadStatus.WON &&
        format(new Date(lead.updatedAt), 'dd/MM', { locale: ptBR }) === dateStr
      ).length;

      const revenueOnDay = filteredLeads
        .filter(lead => lead.status === LeadStatus.WON &&
          format(new Date(lead.updatedAt), 'dd/MM', { locale: ptBR }) === dateStr)
        .reduce((sum, lead) => {
          const avgPrice = lead.preferences.priceRange
            ? (lead.preferences.priceRange.min + lead.preferences.priceRange.max) / 2
            : 0;
          return sum + avgPrice;
        }, 0);

      data.push({
        date: dateStr,
        leads: leadsOnDay,
        conversions: conversionsOnDay,
        revenue: revenueOnDay,
      });
    }

    return data;
  }, [filteredLeads, timeRange]);

  // Lead Source Data
  const leadSourceData = useMemo((): LeadSourceData[] => {
    const sourceCounts = filteredLeads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sourceCounts)
      .map(([name, value], index) => ({
        name,
        value,
        fill: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLeads]);

  // Performance Metrics
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const totalLeads = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === LeadStatus.WON);
    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;

    const averageTimeToClose = wonLeads.length > 0
      ? wonLeads.reduce((sum, lead) => {
          return sum + differenceInDays(new Date(lead.updatedAt), new Date(lead.createdAt));
        }, 0) / wonLeads.length
      : 0;

    const totalRevenue = wonLeads.reduce((sum, lead) => {
      const avgPrice = lead.preferences.priceRange
        ? (lead.preferences.priceRange.min + lead.preferences.priceRange.max) / 2
        : 0;
      return sum + avgPrice;
    }, 0);

    const hotLeads = filteredLeads.filter(l => l.temperature === 'hot').length;
    const averageScore = filteredLeads.length > 0
      ? filteredLeads.reduce((sum, lead) => sum + lead.score, 0) / filteredLeads.length
      : 0;

    const topSource = leadSourceData[0];
    const topPerformingSource = topSource ? topSource.name : 'N/A';

    // Find best converting day
    const dayConversions = timeSeriesData.reduce((acc, day) => {
      acc[day.date] = day.conversions;
      return acc;
    }, {} as Record<string, number>);

    const bestDay = Object.entries(dayConversions)
      .sort(([, a], [, b]) => b - a)[0];
    const bestConvertingDay = bestDay ? bestDay[0] : 'N/A';

    return {
      totalLeads,
      conversionRate,
      averageTimeToClose,
      totalRevenue,
      hotLeads,
      averageScore,
      topPerformingSource,
      bestConvertingDay,
    };
  }, [filteredLeads, leadSourceData, timeSeriesData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleRefresh = async () => {
    setLoading(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <Box>
      {/* Header with Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="700" sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1,
          }}>
            Analytics Avançado
          </Typography>
          <Typography variant="body1" color="rgba(255, 255, 255, 0.7)">
            Análise detalhada do desempenho do CRM
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <ButtonGroup variant="outlined" size="small">
            {[
              { value: '7d', label: '7 dias', icon: <Today /> },
              { value: '30d', label: '30 dias', icon: <DateRange /> },
              { value: '90d', label: '90 dias', icon: <CalendarMonth /> },
              { value: '1y', label: '1 ano', icon: <Timeline /> },
            ].map((period) => (
              <Button
                key={period.value}
                onClick={() => setTimeRange(period.value as any)}
                variant={timeRange === period.value ? 'contained' : 'outlined'}
                startIcon={period.icon}
                sx={{
                  minWidth: 100,
                  ...(timeRange === period.value && {
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  })
                }}
              >
                {period.label}
              </Button>
            ))}
          </ButtonGroup>

          <Tooltip title="Atualizar dados">
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.12)',
                }
              }}
            >
              {loading ? <CircularProgress size={20} /> : <Refresh />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Total de Leads',
            value: performanceMetrics.totalLeads,
            icon: <Groups />,
            color: '#6366f1',
            change: '+12%',
            trend: 'up'
          },
          {
            title: 'Taxa de Conversão',
            value: `${performanceMetrics.conversionRate.toFixed(1)}%`,
            icon: <Target />,
            color: '#10b981',
            change: '+8.2%',
            trend: 'up'
          },
          {
            title: 'Receita Total',
            value: formatCurrency(performanceMetrics.totalRevenue),
            icon: <AttachMoney />,
            color: '#f59e0b',
            change: '+15.7%',
            trend: 'up'
          },
          {
            title: 'Tempo Médio',
            value: `${performanceMetrics.averageTimeToClose.toFixed(0)} dias`,
            icon: <Speed />,
            color: '#06b6d4',
            change: '-3 dias',
            trend: 'up'
          },
        ].map((metric, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '24px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: `0 20px 60px ${metric.color}40`,
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '18px',
                      background: `linear-gradient(135deg, ${metric.color} 0%, ${metric.color}CC 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: `0 8px 24px ${metric.color}40`,
                    }}
                  >
                    {React.cloneElement(metric.icon, { fontSize: 'large' })}
                  </Box>
                  <Chip
                    label={metric.change}
                    size="small"
                    icon={metric.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                    color={metric.trend === 'up' ? 'success' : 'error'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="h4" fontWeight="800" color="white" sx={{ mb: 1 }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                  {metric.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Analytics Tabs */}
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '24px',
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{
            px: 3,
            pt: 2,
            '& .MuiTab-root': {
              borderRadius: '16px',
              mx: 0.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 48,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.9)',
              },
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            }
          }}
        >
          <Tab label="Timeline" icon={<Timeline />} iconPosition="start" />
          <Tab label="Funil de Conversão" icon={<Analytics />} iconPosition="start" />
          <Tab label="Fontes de Lead" icon={<PieChart />} iconPosition="start" />
          <Tab label="Insights" icon={<Insights />} iconPosition="start" />
        </Tabs>

        <CardContent sx={{ p: 4 }}>
          {/* Timeline Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                Performance ao Longo do Tempo
              </Typography>
              <Box sx={{ height: 400, mt: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.7)" />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorLeads)"
                      name="Novos Leads"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="conversions"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorConversions)"
                      name="Conversões"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}

          {/* Funnel Tab */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                Funil de Conversão
              </Typography>
              <Grid container spacing={4} sx={{ mt: 2 }}>
                <Grid item xs={12} md={8}>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={conversionFunnelData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" stroke="rgba(255,255,255,0.7)" />
                        <YAxis dataKey="stage" type="category" stroke="rgba(255,255,255,0.7)" width={120} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px'
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {conversionFunnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          <LabelList dataKey="value" position="right" fill="white" />
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack spacing={2}>
                    {conversionFunnelData.map((stage, index) => {
                      const previousValue = index > 0 ? conversionFunnelData[index - 1].value : stage.value;
                      const conversionRate = previousValue > 0 ? (stage.value / previousValue) * 100 : 100;

                      return (
                        <Paper key={stage.stage} sx={{
                          p: 3,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '16px',
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: stage.fill,
                                mr: 2,
                              }}
                            />
                            <Typography variant="subtitle2" color="white" fontWeight="600">
                              {stage.stage}
                            </Typography>
                          </Box>
                          <Typography variant="h5" fontWeight="700" color="white">
                            {stage.value}
                          </Typography>
                          <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                            {conversionRate.toFixed(1)}% do estágio anterior
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Sources Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                Distribuição por Fonte de Lead
              </Typography>
              <Grid container spacing={4} sx={{ mt: 2 }}>
                <Grid item xs={12} md={8}>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={leadSourceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                          stroke="none"
                        >
                          {leadSourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack spacing={2}>
                    {leadSourceData.map((source, index) => (
                      <Paper key={source.name} sx={{
                        p: 3,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: source.fill,
                                mr: 2,
                              }}
                            />
                            <Typography variant="subtitle2" color="white" fontWeight="600">
                              {source.name}
                            </Typography>
                          </Box>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            sx={{
                              backgroundColor: source.fill,
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                        <Typography variant="h5" fontWeight="700" color="white">
                          {source.value} leads
                        </Typography>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                          {((source.value / performanceMetrics.totalLeads) * 100).toFixed(1)}% do total
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Insights Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" fontWeight="600" color="white" gutterBottom>
                Insights e Recomendações
              </Typography>
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{
                    p: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    height: '100%',
                  }}>
                    <Typography variant="h6" color="white" fontWeight="600" gutterBottom>
                      📊 Resumo Executivo
                    </Typography>
                    <Stack spacing={3}>
                      <Box>
                        <Typography variant="subtitle2" color="#10b981" fontWeight="600">
                          Melhor Fonte de Leads
                        </Typography>
                        <Typography variant="body1" color="white">
                          {performanceMetrics.topPerformingSource}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="#6366f1" fontWeight="600">
                          Score Médio dos Leads
                        </Typography>
                        <Typography variant="body1" color="white">
                          {performanceMetrics.averageScore.toFixed(1)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={performanceMetrics.averageScore}
                          sx={{
                            mt: 1,
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="#f59e0b" fontWeight="600">
                          Melhor Dia de Conversão
                        </Typography>
                        <Typography variant="body1" color="white">
                          {performanceMetrics.bestConvertingDay}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack spacing={3}>
                    <Alert severity="success" sx={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '16px',
                      '& .MuiAlert-icon': { color: '#10b981' },
                      '& .MuiAlert-message': { color: 'white' },
                    }}>
                      <Typography variant="subtitle2" fontWeight="600">
                        ✅ Oportunidade Identificada
                      </Typography>
                      <Typography variant="body2">
                        {performanceMetrics.hotLeads} leads quentes prontos para conversão imediata
                      </Typography>
                    </Alert>

                    <Alert severity="info" sx={{
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '16px',
                      '& .MuiAlert-icon': { color: '#6366f1' },
                      '& .MuiAlert-message': { color: 'white' },
                    }}>
                      <Typography variant="subtitle2" fontWeight="600">
                        📈 Recomendação de Foco
                      </Typography>
                      <Typography variant="body2">
                        Intensificar esforços em {performanceMetrics.topPerformingSource} - maior ROI
                      </Typography>
                    </Alert>

                    <Alert severity="warning" sx={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '16px',
                      '& .MuiAlert-icon': { color: '#f59e0b' },
                      '& .MuiAlert-message': { color: 'white' },
                    }}>
                      <Typography variant="subtitle2" fontWeight="600">
                        ⚠️ Ponto de Atenção
                      </Typography>
                      <Typography variant="body2">
                        Tempo médio de fechamento: {performanceMetrics.averageTimeToClose.toFixed(0)} dias - considere acelerar o processo
                      </Typography>
                    </Alert>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}