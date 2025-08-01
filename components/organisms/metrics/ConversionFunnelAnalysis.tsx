'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingDown,
  TrendingUp,
  WhatsApp,
  Chat,
  Search,
  AttachMoney,
  EventAvailable,
  CheckCircle,
  Warning,
  Insights,
  Speed,
} from '@mui/icons-material';

interface ConversionFunnelProps {
  data: {
    whatsappContacts: number;
    meaningfulConversations: number;
    propertyInquiries: number;
    priceRequests: number;
    reservationRequests: number;
    confirmedBookings: number;
    conversionRates: {
      contactToConversation: number;
      conversationToInquiry: number;
      inquiryToRequest: number;
      requestToBooking: number;
      overallConversion: number;
    };
  };
}

const FunnelStep = ({ 
  icon, 
  title, 
  value, 
  percentage, 
  conversionRate, 
  color,
  insights 
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  percentage: number;
  conversionRate?: number;
  color: string;
  insights?: string[];
}) => (
  <Box
    sx={{
      position: 'relative',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      p: 3,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      transition: 'all 0.3s ease',
      '&:hover': {
        background: 'rgba(255, 255, 255, 0.08)',
        transform: 'translateY(-2px)',
      }
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: '12px',
          background: color,
          color: 'white',
          boxShadow: `0 4px 12px ${color}40`,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
          {value.toLocaleString()}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          {title}
        </Typography>
      </Box>
      {conversionRate !== undefined && (
        <Chip
          icon={conversionRate >= 20 ? <TrendingUp /> : <TrendingDown />}
          label={`${conversionRate.toFixed(1)}%`}
          size="small"
          sx={{
            backgroundColor: conversionRate >= 20 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: conversionRate >= 20 ? '#10b981' : '#f59e0b',
            border: `1px solid ${conversionRate >= 20 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            fontWeight: 600,
          }}
        />
      )}
    </Box>

    {/* Progress Bar */}
    <Box sx={{ mb: 2 }}>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          '& .MuiLinearProgress-bar': {
            background: color,
            borderRadius: 4,
          }
        }}
      />
      <Typography 
        variant="caption" 
        sx={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          mt: 0.5, 
          display: 'block',
          textAlign: 'right'
        }}
      >
        {percentage.toFixed(1)}% do total
      </Typography>
    </Box>

    {/* Insights */}
    {insights && insights.length > 0 && (
      <Box>
        {insights.map((insight, index) => (
          <Typography
            key={index}
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              display: 'block',
              lineHeight: 1.4,
              mb: 0.5,
            }}
          >
            • {insight}
          </Typography>
        ))}
      </Box>
    )}
  </Box>
);

export default function ConversionFunnelAnalysis({ data }: ConversionFunnelProps) {
  const totalContacts = data.whatsappContacts;
  
  const funnelSteps = [
    {
      icon: <WhatsApp sx={{ fontSize: 24 }} />,
      title: 'Contatos WhatsApp',
      value: data.whatsappContacts,
      percentage: 100,
      color: 'linear-gradient(135deg, #25d366, #128C7E)',
      insights: [
        'Origem principal de leads',
        'Base para todas as conversões'
      ]
    },
    {
      icon: <Chat sx={{ fontSize: 24 }} />,
      title: 'Conversas Significativas',
      value: data.meaningfulConversations,
      percentage: (data.meaningfulConversations / totalContacts) * 100,
      conversionRate: data.conversionRates.contactToConversation,
      color: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
      insights: [
        '3+ mensagens trocadas',
        `${(data.whatsappContacts - data.meaningfulConversations)} abandonos iniciais`
      ]
    },
    {
      icon: <Search sx={{ fontSize: 24 }} />,
      title: 'Consultas de Propriedades',
      value: data.propertyInquiries,
      percentage: (data.propertyInquiries / totalContacts) * 100,
      conversionRate: data.conversionRates.conversationToInquiry,
      color: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      insights: [
        'Interesse em imóveis específicos',
        'Momento crítico de engajamento'
      ]
    },
    {
      icon: <AttachMoney sx={{ fontSize: 24 }} />,
      title: 'Solicitações de Preço',
      value: data.priceRequests,
      percentage: (data.priceRequests / totalContacts) * 100,
      conversionRate: data.conversionRates.inquiryToRequest,
      color: 'linear-gradient(135deg, #f59e0b, #d97706)',
      insights: [
        'Lead qualificado financeiramente',
        'Próximo de decisão de compra'
      ]
    },
    {
      icon: <EventAvailable sx={{ fontSize: 24 }} />,
      title: 'Pedidos de Reserva',
      value: data.reservationRequests,
      percentage: (data.reservationRequests / totalContacts) * 100,
      color: 'linear-gradient(135deg, #10b981, #059669)',
      insights: [
        'Intenção clara de locação',
        'Alta probabilidade de conversão'
      ]
    },
    {
      icon: <CheckCircle sx={{ fontSize: 24 }} />,
      title: 'Reservas Confirmadas',
      value: data.confirmedBookings,
      percentage: (data.confirmedBookings / totalContacts) * 100,
      conversionRate: data.conversionRates.requestToBooking,
      color: 'linear-gradient(135deg, #22c55e, #16a34a)',
      insights: [
        'Conversão final bem-sucedida',
        'Receita gerada efetivamente'
      ]
    },
  ];

  const getDropoffAnalysis = () => {
    const dropoffs = [
      {
        stage: 'Contato → Conversa',
        lost: data.whatsappContacts - data.meaningfulConversations,
        percentage: ((data.whatsappContacts - data.meaningfulConversations) / data.whatsappContacts * 100),
        suggestion: 'Melhorar mensagem de boas-vindas e resposta inicial rápida'
      },
      {
        stage: 'Conversa → Consulta',
        lost: data.meaningfulConversations - data.propertyInquiries,
        percentage: ((data.meaningfulConversations - data.propertyInquiries) / data.meaningfulConversations * 100),
        suggestion: 'Apresentar opções de propriedades mais cedo na conversa'
      },
      {
        stage: 'Consulta → Preço',
        lost: data.propertyInquiries - data.priceRequests,
        percentage: ((data.propertyInquiries - data.priceRequests) / data.propertyInquiries * 100),
        suggestion: 'Incluir faixas de preço nas apresentações de propriedades'
      },
      {
        stage: 'Preço → Reserva',
        lost: data.priceRequests - data.reservationRequests,
        percentage: ((data.priceRequests - data.reservationRequests) / data.priceRequests * 100),
        suggestion: 'Criar senso de urgência e facilitar processo de reserva'
      },
      {
        stage: 'Reserva → Confirmação',
        lost: data.reservationRequests - data.confirmedBookings,
        percentage: ((data.reservationRequests - data.confirmedBookings) / data.reservationRequests * 100),
        suggestion: 'Simplificar processo de pagamento e documentação'
      }
    ];

    return dropoffs.filter(d => d.lost > 0).sort((a, b) => b.lost - a.lost);
  };

  return (
    <Card 
      sx={{ 
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: 'white',
            }}
          >
            <Speed sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: '#ffffff', mb: 0.5 }}>
              Funil de Conversão Detalhado
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Análise completa do processo de conversão WhatsApp → Reservas
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto', textAlign: 'right' }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#ffffff' }}>
              {data.conversionRates.overallConversion.toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Conversão Geral
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {funnelSteps.map((step, index) => (
            <Grid item xs={12} md={6} key={index}>
              <FunnelStep {...step} />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 4 }} />

        {/* Dropoff Analysis */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
              }}
            >
              <Warning sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }}>
              Principais Pontos de Perda
            </Typography>
          </Box>

          <List sx={{ p: 0 }}>
            {getDropoffAnalysis().slice(0, 3).map((dropoff, index) => (
              <ListItem
                key={index}
                sx={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '12px',
                  mb: 1.5,
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <ListItemIcon sx={{ color: '#f59e0b', minWidth: 40 }}>
                  <TrendingDown />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" fontWeight={600} sx={{ color: '#ffffff' }}>
                        {dropoff.stage}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: '#f59e0b' }}>
                          -{dropoff.lost} leads
                        </Typography>
                        <Chip
                          label={`${dropoff.percentage.toFixed(0)}%`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            color: '#f59e0b',
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
                      💡 {dropoff.suggestion}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Performance Benchmarks */}
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 4 }} />

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
              }}
            >
              <Insights sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#ffffff' }}>
              Benchmarks da Indústria
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: data.conversionRates.overallConversion >= 15 ? '#10b981' : '#f59e0b', mb: 1 }}>
                  {data.conversionRates.overallConversion >= 15 ? '✓' : '⚠'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Conversão Geral
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Benchmark: 15%+
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: data.conversionRates.contactToConversation >= 60 ? '#10b981' : '#f59e0b', mb: 1 }}>
                  {data.conversionRates.contactToConversation >= 60 ? '✓' : '⚠'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Engajamento Inicial
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Benchmark: 60%+
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: data.conversionRates.requestToBooking >= 70 ? '#10b981' : '#f59e0b', mb: 1 }}>
                  {data.conversionRates.requestToBooking >= 70 ? '✓' : '⚠'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Fechamento
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Benchmark: 70%+
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#10b981', mb: 1 }}>
                  💰
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  ROI do Funil
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {((data.confirmedBookings * 2500) / Math.max(1, data.whatsappContacts * 50)).toFixed(1)}x
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}