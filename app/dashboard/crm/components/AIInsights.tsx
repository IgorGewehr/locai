'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  Avatar,
  LinearProgress,
  Alert,
  Divider,
  Stack,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Psychology,
  AutoAwesome,
  WhatsApp,
  Phone,
  Email,
  LocationOn,
  AttachMoney,
  Home,
  Timer,
  CheckCircle,
  Warning,
  LightbulbOutlined,
  PersonAdd,
  CalendarToday,
  LocalOffer,
  Refresh,
} from '@mui/icons-material';
import { Lead } from '@/lib/types/crm';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenantServices } from '@/lib/hooks/useTenantServices';
import { useAuth } from '@/lib/hooks/useAuth';

interface AIInsightsProps {
  leads: Lead[];
  onActionClick: (lead: Lead, action: string) => void;
  onRefresh: () => void;
}

interface LeadInsight {
  lead: Lead;
  conversionProbability: number;
  nextBestAction: string;
  actionReason: string;
  riskFactors: string[];
  opportunities: string[];
  estimatedValue: number;
  daysToConversion: number;
}

interface MarketInsight {
  type: 'trend' | 'opportunity' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export default function AIInsights({ leads, onActionClick, onRefresh }: AIInsightsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [topLeads, setTopLeads] = useState<LeadInsight[]>([]);
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    conversionRate: 0,
    averageTimeToClose: 0,
    totalPipelineValue: 0,
    hotLeadsCount: 0,
  });

  useEffect(() => {
    if (leads.length > 0) {
      analyzeLeads();
    }
  }, [leads]);

  const analyzeLeads = async () => {
    setLoading(true);
    
    try {
      // Real AI analysis using OpenAI and Firebase data
      const activeLeads = leads.filter(lead => lead.status !== 'won' && lead.status !== 'lost');
      
      // Call AI analysis API
      const response = await fetch('/api/ai/analyze-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: activeLeads }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze leads');
      }

      const analyzedLeads = await response.json();

      // Sort by conversion probability and take top 5
      const sortedLeads = analyzedLeads
        .sort((a, b) => b.conversionProbability - a.conversionProbability)
        .slice(0, 5);

      setTopLeads(sortedLeads);

      // Generate market insights from real data
      const insights = generateMarketInsights(leads);
      setMarketInsights(insights);

      // Calculate performance metrics from real data
      const wonLeads = leads.filter(l => l.status === 'won');
      const metrics = {
        conversionRate: leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0,
        averageTimeToClose: calculateAverageTimeToClose(wonLeads),
        totalPipelineValue: calculatePipelineValue(leads),
        hotLeadsCount: leads.filter(l => l.temperature === 'hot').length,
      };
      setPerformanceMetrics(metrics);

    } catch (error) {
      console.error('Error in AI analysis:', error);
      // Fallback to basic analysis if AI fails
      const basicAnalysis = leads
        .filter(lead => lead.status !== 'won' && lead.status !== 'lost')
        .map(lead => ({
          lead,
          conversionProbability: calculateConversionProbability(lead),
          nextBestAction: determineNextBestAction(lead),
          actionReason: getActionReason(lead),
          riskFactors: identifyRiskFactors(lead),
          opportunities: identifyOpportunities(lead),
          estimatedValue: estimateLeadValue(lead),
          daysToConversion: estimateDaysToConversion(lead),
        }))
        .sort((a, b) => b.conversionProbability - a.conversionProbability)
        .slice(0, 5);
      
      setTopLeads(basicAnalysis);
    } finally {
      setLoading(false);
    }
  };

  const calculateConversionProbability = (lead: Lead): number => {
    let probability = lead.score;

    // Adjust based on temperature
    if (lead.temperature === 'hot') probability += 15;
    else if (lead.temperature === 'warm') probability += 5;
    else probability -= 10;

    // Adjust based on interactions
    if (lead.totalInteractions > 5) probability += 10;
    else if (lead.totalInteractions > 2) probability += 5;

    // Adjust based on qualification criteria
    const qualificationScore = Object.values(lead.qualificationCriteria).filter(v => v).length;
    probability += qualificationScore * 5;

    // Adjust based on days in pipeline
    const daysInPipeline = differenceInDays(new Date(), new Date(lead.createdAt));
    if (daysInPipeline > 30) probability -= 10;
    else if (daysInPipeline < 7) probability += 5;

    return Math.min(Math.max(probability, 0), 100);
  };

  const determineNextBestAction = (lead: Lead): string => {
    const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));
    
    if (daysSinceLastContact > 7) return 'follow_up';
    if (lead.status === 'qualified' && !(lead as any).propertyViewings?.length) return 'schedule_viewing';
    if (lead.temperature === 'hot' && lead.status === 'opportunity') return 'send_proposal';
    if (lead.totalInteractions < 2) return 'initial_contact';
    if (lead.status === 'negotiation') return 'close_deal';
    
    return 'nurture';
  };

  const getActionReason = (lead: Lead): string => {
    const action = determineNextBestAction(lead);
    const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));

    switch (action) {
      case 'follow_up':
        return `Sem contato há ${daysSinceLastContact} dias`;
      case 'schedule_viewing':
        return 'Lead qualificado pronto para visita';
      case 'send_proposal':
        return 'Alta probabilidade de conversão';
      case 'initial_contact':
        return 'Novo lead aguardando primeiro contato';
      case 'close_deal':
        return 'Em negociação - momento de fechar';
      case 'nurture':
        return 'Manter relacionamento ativo';
      default:
        return 'Ação recomendada';
    }
  };

  const identifyRiskFactors = (lead: Lead): string[] => {
    const risks: string[] = [];
    const daysSinceLastContact = differenceInDays(new Date(), new Date(lead.lastContactDate));
    
    if (daysSinceLastContact > 14) risks.push('Muito tempo sem contato');
    if (lead.temperature === 'cold') risks.push('Lead frio - baixo interesse');
    if (!lead.qualificationCriteria.budget) risks.push('Orçamento não definido');
    if (!lead.qualificationCriteria.timeline) risks.push('Sem prazo definido');
    if (lead.totalInteractions < 2) risks.push('Pouca interação');
    
    return risks;
  };

  const identifyOpportunities = (lead: Lead): string[] => {
    const opportunities: string[] = [];
    
    if (lead.temperature === 'hot') opportunities.push('Lead quente - alto interesse');
    if (lead.qualificationCriteria.budget && lead.qualificationCriteria.need) {
      opportunities.push('Qualificado com orçamento');
    }
    if (lead.preferences.moveInDate) {
      const daysToMove = differenceInDays(new Date(lead.preferences.moveInDate), new Date());
      if (daysToMove < 30) opportunities.push('Urgência para mudança');
    }
    if (lead.source === 'referral') opportunities.push('Indicação - maior confiança');
    
    return opportunities;
  };

  const estimateLeadValue = (lead: Lead): number => {
    if (lead.preferences.priceRange) {
      const avgPrice = (lead.preferences.priceRange.min + lead.preferences.priceRange.max) / 2;
      const months = 12; // Assuming annual contract
      return avgPrice * months * (calculateConversionProbability(lead) / 100);
    }
    return 0;
  };

  const estimateDaysToConversion = (lead: Lead): number => {
    const basedays = 30;
    let days = basedays;
    
    if (lead.temperature === 'hot') days -= 15;
    else if (lead.temperature === 'cold') days += 15;
    
    if (lead.qualificationCriteria.timeline) days -= 10;
    if (lead.status === 'negotiation') days = 7;
    if (lead.status === 'opportunity') days = 14;
    
    return Math.max(days, 1);
  };

  const generateMarketInsights = (allLeads: Lead[]): MarketInsight[] => {
    const insights: MarketInsight[] = [];
    
    // Location trends
    const locationCounts = allLeads.reduce((acc, lead) => {
      lead.preferences.location?.forEach(loc => {
        acc[loc] = (acc[loc] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    const topLocation = Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    if (topLocation) {
      insights.push({
        type: 'trend',
        title: 'Região mais procurada',
        description: `${topLocation[0]} está com alta demanda (${topLocation[1]} leads)`,
        impact: 'high',
        actionable: true,
      });
    }
    
    // Price range analysis
    const priceRanges = allLeads
      .filter(l => l.preferences.priceRange)
      .map(l => l.preferences.priceRange!);
    
    if (priceRanges.length > 0) {
      const avgMin = priceRanges.reduce((sum, r) => sum + r.min, 0) / priceRanges.length;
      const avgMax = priceRanges.reduce((sum, r) => sum + r.max, 0) / priceRanges.length;
      
      insights.push({
        type: 'opportunity',
        title: 'Faixa de preço ideal',
        description: `Imóveis entre ${formatCurrency(avgMin)} e ${formatCurrency(avgMax)} têm maior procura`,
        impact: 'medium',
        actionable: true,
      });
    }
    
    // Cold leads alert
    const coldLeads = allLeads.filter(l => l.temperature === 'cold' && l.status !== 'lost');
    if (coldLeads.length > 5) {
      insights.push({
        type: 'alert',
        title: 'Leads esfriando',
        description: `${coldLeads.length} leads precisam de atenção urgente`,
        impact: 'high',
        actionable: true,
      });
    }
    
    return insights;
  };


  const calculateAverageTimeToClose = (wonLeads: Lead[]): number => {
    if (wonLeads.length === 0) return 0;
    
    const totalDays = wonLeads.reduce((sum, lead) => {
      const days = differenceInDays(
        new Date(lead.updatedAt),
        new Date(lead.createdAt)
      );
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / wonLeads.length);
  };

  const calculatePipelineValue = (allLeads: Lead[]): number => {
    return allLeads
      .filter(l => l.status !== 'lost' && l.status !== 'won')
      .reduce((sum, lead) => sum + estimateLeadValue(lead), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'follow_up': return <Phone />;
      case 'schedule_viewing': return <CalendarToday />;
      case 'send_proposal': return <Email />;
      case 'initial_contact': return <WhatsApp />;
      case 'close_deal': return <CheckCircle />;
      case 'nurture': return <Psychology />;
      default: return <AutoAwesome />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'follow_up': return 'Fazer Follow-up';
      case 'schedule_viewing': return 'Agendar Visita';
      case 'send_proposal': return 'Enviar Proposta';
      case 'initial_contact': return 'Primeiro Contato';
      case 'close_deal': return 'Fechar Negócio';
      case 'nurture': return 'Nutrir Lead';
      default: return 'Tomar Ação';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Insights de IA
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Análise preditiva e recomendações inteligentes
          </Typography>
        </Box>
        <Tooltip title="Atualizar análise">
          <span>
            <IconButton onClick={onRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Performance Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="success" />
                <Typography variant="h4" fontWeight={600}>
                  {performanceMetrics.conversionRate.toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Taxa de Conversão
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer color="info" />
                <Typography variant="h4" fontWeight={600}>
                  {performanceMetrics.averageTimeToClose}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Dias para Fechar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney color="primary" />
                <Typography variant="h4" fontWeight={600}>
                  {formatCurrency(performanceMetrics.totalPipelineValue)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Valor do Pipeline
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOffer color="error" />
                <Typography variant="h4" fontWeight={600}>
                  {performanceMetrics.hotLeadsCount}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Leads Quentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Conversion Leads */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Leads com Maior Probabilidade de Conversão
              </Typography>
              
              {loading ? (
                <LinearProgress sx={{ my: 2 }} />
              ) : topLeads.length === 0 ? (
                <Alert severity="info">
                  Nenhum lead ativo para análise
                </Alert>
              ) : (
                <List>
                  {topLeads.map((insight, index) => (
                    <React.Fragment key={insight.lead.id}>
                      {index > 0 && <Divider />}
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemAvatar>
                          <Avatar>
                            {insight.lead.name ? insight.lead.name.charAt(0).toUpperCase() : '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {insight.lead.name}
                              </Typography>
                              <Chip
                                label={`${insight.conversionProbability}%`}
                                size="small"
                                color={
                                  insight.conversionProbability > 70
                                    ? 'success'
                                    : insight.conversionProbability > 40
                                    ? 'warning'
                                    : 'default'
                                }
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              {insight.actionReason} • Valor estimado: {formatCurrency(insight.estimatedValue)}
                              <Stack direction="row" spacing={1} sx={{ mt: 1, display: 'flex' }}>
                                {insight.opportunities.slice(0, 2).map((opp, i) => (
                                  <Chip
                                    key={i}
                                    label={opp}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                  />
                                ))}
                                {insight.riskFactors.slice(0, 1).map((risk, i) => (
                                  <Chip
                                    key={i}
                                    label={risk}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                ))}
                              </Stack>
                            </>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={getActionIcon(insight.nextBestAction)}
                            onClick={() => onActionClick(insight.lead, insight.nextBestAction)}
                          >
                            {getActionLabel(insight.nextBestAction)}
                          </Button>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Market Insights */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Insights do Mercado
              </Typography>
              
              <Stack spacing={2}>
                {marketInsights.map((insight, index) => (
                  <Paper
                    key={index}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderLeft: 3,
                      borderLeftColor:
                        insight.type === 'alert'
                          ? 'error.main'
                          : insight.type === 'opportunity'
                          ? 'success.main'
                          : 'info.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LightbulbOutlined
                        sx={{
                          color:
                            insight.type === 'alert'
                              ? 'error.main'
                              : insight.type === 'opportunity'
                              ? 'success.main'
                              : 'info.main',
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {insight.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {insight.description}
                        </Typography>
                        {insight.actionable && (
                          <Button size="small" sx={{ mt: 1 }}>
                            Tomar Ação
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recomendações da IA
              </Typography>
              
              <Stack spacing={2}>
                <Alert severity="info" icon={<Psychology />}>
                  <Typography variant="subtitle2">
                    Foque em leads quentes
                  </Typography>
                  <Typography variant="caption">
                    Priorize contatos com score acima de 70%
                  </Typography>
                </Alert>
                
                <Alert severity="warning" icon={<Warning />}>
                  <Typography variant="subtitle2">
                    Leads inativos
                  </Typography>
                  <Typography variant="caption">
                    Reative leads sem contato há mais de 7 dias
                  </Typography>
                </Alert>
                
                <Alert severity="success" icon={<AutoAwesome />}>
                  <Typography variant="subtitle2">
                    Automatize follow-ups
                  </Typography>
                  <Typography variant="caption">
                    Configure lembretes automáticos para não perder oportunidades
                  </Typography>
                </Alert>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}