'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  LinearProgress,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Badge,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  LocalFireDepartment,
  AcUnit,
  WbSunny,
  WhatsApp,
  Phone,
  Email,
  Schedule,
  Assignment,
  Analytics,
  Timeline,
  Speed,
  Star,
  StarBorder,
  Visibility,
  Edit,
  PlayArrow,
  Pause,
  Stop,
  FilterList,
  Sort,
  MoreVert,
  Close,
  CheckCircle,
  Warning,
  Info,
  Error,
} from '@mui/icons-material';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lead, LeadStatus, LeadTemperature } from '@/lib/types/crm';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface LeadPerformanceTrackerProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  onQuickAction?: (lead: Lead, action: string) => void;
}

interface LeadMetrics {
  lead: Lead;
  scoreChange: number;
  temperatureChange: 'up' | 'down' | 'stable';
  daysInPipeline: number;
  interactionRate: number;
  conversionProbability: number;
  nextBestAction: string;
  riskLevel: 'low' | 'medium' | 'high';
  momentum: 'increasing' | 'decreasing' | 'stable';
  lastActivity: string;
  scoreHistory: Array<{ date: string; score: number }>;
}

interface SortOption {
  key: keyof LeadMetrics | 'lead.name' | 'lead.score' | 'lead.createdAt';
  label: string;
  direction: 'asc' | 'desc';
}

const sortOptions: SortOption[] = [
  { key: 'conversionProbability', label: 'Probabilidade de Conversão', direction: 'desc' },
  { key: 'lead.score', label: 'Score Atual', direction: 'desc' },
  { key: 'scoreChange', label: 'Mudança de Score', direction: 'desc' },
  { key: 'daysInPipeline', label: 'Tempo no Pipeline', direction: 'asc' },
  { key: 'interactionRate', label: 'Taxa de Interação', direction: 'desc' },
  { key: 'lead.name', label: 'Nome', direction: 'asc' },
  { key: 'lead.createdAt', label: 'Data de Criação', direction: 'desc' },
];

export default function LeadPerformanceTracker({
  leads,
  onLeadClick,
  onQuickAction,
}: LeadPerformanceTrackerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0]);
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Calculate metrics for each lead
  const leadMetrics = useMemo((): LeadMetrics[] => {
    return leads.map(lead => {
      const daysInPipeline = differenceInDays(new Date(), new Date(lead.createdAt));
      const hoursInPipeline = differenceInHours(new Date(), new Date(lead.createdAt));

      // Simulate score history (in real app, this would come from database)
      const scoreHistory = Array.from({ length: Math.min(7, daysInPipeline + 1) }, (_, i) => ({
        date: format(new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000), 'dd/MM'),
        score: Math.max(0, Math.min(100, lead.score + (Math.random() - 0.5) * 20))
      }));

      // Calculate score change (simulate from history)
      const scoreChange = scoreHistory.length > 1
        ? scoreHistory[scoreHistory.length - 1].score - scoreHistory[0].score
        : 0;

      // Calculate interaction rate
      const interactionRate = daysInPipeline > 0
        ? (lead.totalInteractions / daysInPipeline) * 7 // interactions per week
        : lead.totalInteractions;

      // Calculate temperature change
      let temperatureChange: 'up' | 'down' | 'stable' = 'stable';
      if (scoreChange > 5) temperatureChange = 'up';
      else if (scoreChange < -5) temperatureChange = 'down';

      // Calculate conversion probability
      let conversionProbability = lead.score;

      // Adjust based on temperature
      if (lead.temperature === 'hot') conversionProbability += 15;
      else if (lead.temperature === 'warm') conversionProbability += 5;
      else if (lead.temperature === 'cold') conversionProbability -= 10;

      // Adjust based on interactions
      if (interactionRate > 2) conversionProbability += 10;
      else if (interactionRate < 0.5) conversionProbability -= 15;

      // Adjust based on time in pipeline
      if (daysInPipeline > 30) conversionProbability -= 10;
      else if (daysInPipeline < 7) conversionProbability += 5;

      conversionProbability = Math.max(0, Math.min(100, conversionProbability));

      // Determine next best action
      const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));
      let nextBestAction = 'follow_up';

      if (daysSinceLastContact > 7) nextBestAction = 'urgent_follow_up';
      else if (lead.temperature === 'hot' && lead.status === 'opportunity') nextBestAction = 'send_proposal';
      else if (lead.status === 'qualified') nextBestAction = 'schedule_meeting';
      else if (lead.status === 'negotiation') nextBestAction = 'close_deal';
      else if (interactionRate < 0.5) nextBestAction = 'increase_engagement';

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      if (daysSinceLastContact > 14 || lead.temperature === 'cold' || conversionProbability < 30) {
        riskLevel = 'high';
      } else if (daysSinceLastContact > 7 || conversionProbability < 50) {
        riskLevel = 'medium';
      }

      // Determine momentum
      let momentum: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (scoreChange > 5 && interactionRate > 1) momentum = 'increasing';
      else if (scoreChange < -5 || daysSinceLastContact > 7) momentum = 'decreasing';

      // Last activity description
      const lastActivity = daysSinceLastContact === 0
        ? 'Hoje'
        : daysSinceLastContact === 1
        ? 'Ontem'
        : `${daysSinceLastContact} dias atrás`;

      return {
        lead,
        scoreChange,
        temperatureChange,
        daysInPipeline,
        interactionRate,
        conversionProbability,
        nextBestAction,
        riskLevel,
        momentum,
        lastActivity,
        scoreHistory,
      };
    });
  }, [leads]);

  // Filter and sort leads
  const filteredAndSortedMetrics = useMemo(() => {
    let filtered = leadMetrics;

    // Apply risk filter
    if (filterRisk !== 'all') {
      filtered = filtered.filter(metric => metric.riskLevel === filterRisk);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortBy.key.includes('.')) {
        const keys = sortBy.key.split('.');
        aValue = keys.reduce((obj, key) => obj?.[key], a);
        bValue = keys.reduce((obj, key) => obj?.[key], b);
      } else {
        aValue = a[sortBy.key as keyof LeadMetrics];
        bValue = b[sortBy.key as keyof LeadMetrics];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (typeof aValue === 'string' && aValue.includes('ago')) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortBy.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [leadMetrics, sortBy, filterRisk]);

  const handleLeadClick = (metric: LeadMetrics) => {
    setSelectedLead(metric.lead);
    setDetailsOpen(true);
    if (onLeadClick) {
      onLeadClick(metric.lead);
    }
  };

  const handleQuickAction = (metric: LeadMetrics, action: string) => {
    if (onQuickAction) {
      onQuickAction(metric.lead, action);
    }
  };

  const getTemperatureIcon = (temperature: LeadTemperature) => {
    switch (temperature) {
      case 'hot':
        return <LocalFireDepartment sx={{ color: '#ef4444', fontSize: 20 }} />;
      case 'warm':
        return <WbSunny sx={{ color: '#f59e0b', fontSize: 20 }} />;
      case 'cold':
        return <AcUnit sx={{ color: '#06b6d4', fontSize: 20 }} />;
      default:
        return null;
    }
  };

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
    }
  };

  const getMomentumIcon = (momentum: 'increasing' | 'decreasing' | 'stable') => {
    switch (momentum) {
      case 'increasing':
        return <TrendingUp sx={{ color: '#10b981', fontSize: 18 }} />;
      case 'decreasing':
        return <TrendingDown sx={{ color: '#ef4444', fontSize: 18 }} />;
      case 'stable':
        return <Timeline sx={{ color: '#6b7280', fontSize: 18 }} />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'urgent_follow_up':
        return <Phone sx={{ color: '#ef4444' }} />;
      case 'send_proposal':
        return <Email sx={{ color: '#06b6d4' }} />;
      case 'schedule_meeting':
        return <Schedule sx={{ color: '#f59e0b' }} />;
      case 'close_deal':
        return <CheckCircle sx={{ color: '#10b981' }} />;
      case 'increase_engagement':
        return <WhatsApp sx={{ color: '#25d366' }} />;
      default:
        return <Assignment sx={{ color: '#6b7280' }} />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'urgent_follow_up':
        return 'Follow-up Urgente';
      case 'send_proposal':
        return 'Enviar Proposta';
      case 'schedule_meeting':
        return 'Agendar Reunião';
      case 'close_deal':
        return 'Fechar Negócio';
      case 'increase_engagement':
        return 'Aumentar Engajamento';
      default:
        return 'Follow-up';
    }
  };

  return (
    <Box>
      {/* Header with Controls */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
      }}>
        <Box>
          <Typography variant="h5" fontWeight="700" color="white">
            Rastreamento de Performance
          </Typography>
          <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
            Análise em tempo real do desempenho dos leads
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant={filterRisk === 'all' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setFilterRisk('all')}
          >
            Todos
          </Button>
          <Button
            variant={filterRisk === 'high' ? 'contained' : 'outlined'}
            size="small"
            color="error"
            onClick={() => setFilterRisk('high')}
            startIcon={<Error />}
          >
            Alto Risco
          </Button>
          <Button
            variant={filterRisk === 'medium' ? 'contained' : 'outlined'}
            size="small"
            color="warning"
            onClick={() => setFilterRisk('medium')}
            startIcon={<Warning />}
          >
            Médio Risco
          </Button>
          <Button
            variant={filterRisk === 'low' ? 'contained' : 'outlined'}
            size="small"
            color="success"
            onClick={() => setFilterRisk('low')}
            startIcon={<CheckCircle />}
          >
            Baixo Risco
          </Button>
        </Stack>
      </Box>

      {/* Performance Cards */}
      <Grid container spacing={3}>
        {filteredAndSortedMetrics.map((metric) => (
          <Grid item xs={12} md={6} lg={4} key={metric.lead.id}>
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${getRiskColor(metric.riskLevel)}40`,
              borderRadius: '20px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: `0 20px 60px ${getRiskColor(metric.riskLevel)}30`,
                border: `1px solid ${getRiskColor(metric.riskLevel)}80`,
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{
                      bgcolor: getRiskColor(metric.riskLevel),
                      width: 48,
                      height: 48,
                      fontSize: '1.25rem',
                      fontWeight: 700
                    }}>
                      {metric.lead.name?.charAt(0).toUpperCase() || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="600" color="white" noWrap>
                        {metric.lead.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTemperatureIcon(metric.lead.temperature)}
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                          {metric.lastActivity}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getMomentumIcon(metric.momentum)}
                    <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      <MoreVert />
                    </IconButton>
                  </Box>
                </Box>

                {/* Metrics */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Paper sx={{
                      p: 2,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h5" fontWeight="700" color={getRiskColor(metric.riskLevel)}>
                        {metric.conversionProbability.toFixed(0)}%
                      </Typography>
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        Conversão
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{
                      p: 2,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h5" fontWeight="700" color="white">
                        {metric.lead.score}
                      </Typography>
                      <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                        Score Atual
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Score Change */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                      Mudança de Score
                    </Typography>
                    <Chip
                      size="small"
                      label={`${metric.scoreChange > 0 ? '+' : ''}${metric.scoreChange.toFixed(1)}`}
                      color={metric.scoreChange > 0 ? 'success' : metric.scoreChange < 0 ? 'error' : 'default'}
                      icon={metric.scoreChange > 0 ? <TrendingUp /> : metric.scoreChange < 0 ? <TrendingDown /> : <Timeline />}
                    />
                  </Box>
                  <Box sx={{ height: 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metric.scoreHistory}>
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={getRiskColor(metric.riskLevel)}
                          strokeWidth={2}
                          dot={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                {/* Key Stats */}
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="600" color="white">
                      {metric.daysInPipeline}
                    </Typography>
                    <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
                      Dias no Pipeline
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight="600" color="white">
                      {metric.interactionRate.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
                      Interações/Semana
                    </Typography>
                  </Box>
                </Stack>

                {/* Next Action */}
                <Box sx={{
                  p: 2,
                  background: `${getRiskColor(metric.riskLevel)}20`,
                  borderRadius: '12px',
                  border: `1px solid ${getRiskColor(metric.riskLevel)}40`,
                  mb: 3
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getActionIcon(metric.nextBestAction)}
                    <Typography variant="subtitle2" fontWeight="600" color="white">
                      Próxima Ação Recomendada
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
                    {getActionLabel(metric.nextBestAction)}
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={getActionIcon(metric.nextBestAction)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAction(metric, metric.nextBestAction);
                    }}
                    sx={{
                      flex: 1,
                      background: `linear-gradient(135deg, ${getRiskColor(metric.riskLevel)} 0%, ${getRiskColor(metric.riskLevel)}CC 100%)`,
                      fontSize: '0.75rem',
                      py: 1,
                    }}
                  >
                    Executar
                  </Button>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeadClick(metric);
                    }}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAction(metric, 'whatsapp');
                    }}
                    sx={{
                      background: 'rgba(37, 211, 102, 0.2)',
                      color: '#25d366',
                      '&:hover': {
                        background: 'rgba(37, 211, 102, 0.3)',
                      }
                    }}
                  >
                    <WhatsApp />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: isMobile ? 0 : '24px',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Typography variant="h6" fontWeight="600">
            Detalhes de Performance
          </Typography>
          <IconButton onClick={() => setDetailsOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedLead && (
            <Box>
              <Typography variant="h5" fontWeight="700" color="white" gutterBottom>
                {selectedLead.name}
              </Typography>
              <Typography variant="body1" color="rgba(255, 255, 255, 0.7)">
                Análise detalhada será implementada aqui...
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <Box sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Paper sx={{
              p: 3,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <Typography variant="h4" fontWeight="700" color="#ef4444">
                {filteredAndSortedMetrics.filter(m => m.riskLevel === 'high').length}
              </Typography>
              <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                Alto Risco
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{
              p: 3,
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <Typography variant="h4" fontWeight="700" color="#f59e0b">
                {filteredAndSortedMetrics.filter(m => m.riskLevel === 'medium').length}
              </Typography>
              <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                Médio Risco
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{
              p: 3,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <Typography variant="h4" fontWeight="700" color="#10b981">
                {filteredAndSortedMetrics.filter(m => m.riskLevel === 'low').length}
              </Typography>
              <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                Baixo Risco
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{
              p: 3,
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <Typography variant="h4" fontWeight="700" color="#6366f1">
                {filteredAndSortedMetrics.filter(m => m.momentum === 'increasing').length}
              </Typography>
              <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                Em Crescimento
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}