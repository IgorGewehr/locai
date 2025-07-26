import React, { useState, useEffect, useMemo } from 'react'
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  LinearProgress,
  Chip
} from '@mui/material'
import {
  TrendingUp,
  ChatBubble,
  MonetizationOn,
  Speed,
  Favorite,
  Psychology,
  Person,
  CheckCircle,
  Warning
} from '@mui/icons-material'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js'
import { AIAgent } from '@/lib/types/ai'
import { useAIAgent } from '@/lib/hooks/useAIAgent'
import { useConversations } from '@/lib/hooks/useConversations'
import { subDays } from 'date-fns'
import { safeFormatDate } from '@/lib/utils/date-formatter'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface AnalyticsDashboardProps {
  tenantId?: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function AnalyticsDashboard({ tenantId = 'default' }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [period, setPeriod] = useState('7d')
  const [selectedAgent, setSelectedAgent] = useState<string>('all')
  
  const { agents, loading: agentsLoading } = useAIAgent({ tenantId })
  const { conversations, stats, loading: conversationsLoading } = useConversations({ 
    tenantId, 
    limit: 100 
  })

  // Generate performance data from real Firebase conversations
  const performanceData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const endDate = new Date()
    const startDate = subDays(endDate, days - 1)
    
    // Create labels for each day
    const labels = Array.from({ length: days }, (_, i) => 
      safeFormatDate(subDays(endDate, days - 1 - i), 'dd/MM')
    )
    
    // Group conversations by date
    const conversationsByDate = new Map<string, number>()
    const conversionsByDate = new Map<string, number>()
    
    conversations.forEach(conversation => {
      const date = safeFormatDate(conversation.createdAt, 'dd/MM')
      conversationsByDate.set(date, (conversationsByDate.get(date) || 0) + 1)
      
      // Count conversions (completed conversations)
      if (conversation.status === 'resolved' || conversation.status === 'completed') {
        conversionsByDate.set(date, (conversionsByDate.get(date) || 0) + 1)
      }
    })
    
    return {
      labels,
      datasets: [
        {
          label: 'Conversas',
          data: labels.map(label => conversationsByDate.get(label) || 0),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'y',
        },
        {
          label: 'Conversões',
          data: labels.map(label => conversionsByDate.get(label) || 0),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          yAxisID: 'y1',
        },
      ],
    }
  }, [period, conversations])

  const sentimentData = useMemo(() => {
    // Calculate real sentiment data from conversations
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
    const total = conversations.length
    
    conversations.forEach(conversation => {
      if (conversation.sentiment) {
        sentimentCounts[conversation.sentiment]++
      } else {
        sentimentCounts.neutral++ // Default to neutral if no sentiment
      }
    })
    
    // Convert to percentages or use raw counts
    const positiveCount = sentimentCounts.positive
    const neutralCount = sentimentCounts.neutral
    const negativeCount = sentimentCounts.negative
    
    return {
      labels: ['Positivo', 'Neutro', 'Negativo'],
      datasets: [
        {
          data: [positiveCount, neutralCount, negativeCount],
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }
  }, [conversations])

  const agentPerformanceData = useMemo(() => ({
    labels: agents.map(agent => agent.name),
    datasets: [
      {
        label: 'Taxa de Conversão (%)',
        data: agents.map(agent => Math.round(agent.performance.conversionRate * 100)),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  }), [agents])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Conversas' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Conversões' },
        grid: { drawOnChartArea: false }
      }
    }
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Taxa de Conversão (%)' }
      }
    }
  }

  if (agentsLoading || conversationsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando analytics...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Analytics do Agente IA
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Período</InputLabel>
            <Select
              value={period}
              label="Período"
              onChange={(e) => setPeriod(e.target.value)}
            >
              <MenuItem value="7d">7 dias</MenuItem>
              <MenuItem value="30d">30 dias</MenuItem>
              <MenuItem value="90d">90 dias</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Agente</InputLabel>
            <Select
              value={selectedAgent}
              label="Agente"
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <MenuItem value="all">Todos os Agentes</MenuItem>
              {agents.map(agent => (
                <MenuItem key={agent.id} value={agent.id}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 3 }}>
        <Tab icon={<TrendingUp />} label="Visão Geral" />
        <Tab icon={<Psychology />} label="Performance dos Agentes" />
        <Tab icon={<ChatBubble />} label="Análise de Conversas" />
      </Tabs>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        {/* KPIs Principais */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ChatBubble sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6">Conversas</Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  {stats?.total || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total no período
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6">Conversões</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {stats?.conversions || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Conversas → Reservas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MonetizationOn sx={{ color: 'warning.main', mr: 1 }} />
                  <Typography variant="h6">Taxa Conv.</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {stats?.total ? Math.round((stats.conversions / stats.total) * 100) : 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Taxa de conversão
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Speed sx={{ color: 'info.main', mr: 1 }} />
                  <Typography variant="h6">Resp. Média</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {stats?.averageMessages ? stats.averageMessages.toFixed(1) : 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mensagens por conversa
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Favorite sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="h6">Confiança</Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {stats?.averageConfidence ? Math.round(stats.averageConfidence * 100) : 0}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Confiança média da IA
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Performance Diária
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={performanceData} options={chartOptions} />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Análise de Sentimento
              </Typography>
              <Box sx={{ height: 300 }}>
                <Doughnut data={sentimentData} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {/* Agent Performance Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Taxa de Conversão por Agente
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar data={agentPerformanceData} options={barChartOptions} />
              </Box>
            </Paper>
          </Grid>

          {/* Agent Stats */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Estatísticas dos Agentes
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {agents.map(agent => (
                  <Box key={agent.id} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {agent.name}
                      </Typography>
                      <Chip
                        label={agent.isActive ? 'Ativo' : 'Inativo'}
                        color={agent.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Conversas: {agent.performance.totalConversations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conversões: {agent.performance.conversionsToReservation}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taxa: {Math.round(agent.performance.conversionRate * 100)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {/* Recent Conversations */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Conversas Recentes
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }} className="scrollbar-card">
                {conversations.slice(0, 10).map(conversation => (
                  <Box key={conversation.id} sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2">
                        {conversation.whatsappPhone}
                      </Typography>
                      <Chip
                        label={conversation.status}
                        color={conversation.status === 'completed' ? 'success' : 'primary'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      Estágio: {conversation.stage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mensagens: {conversation.messages?.length || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {safeFormatDate(conversation.startedAt, 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Conversation Stages */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Distribuição por Estágio
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { stage: 'greeting', label: 'Saudação', count: 5 },
                  { stage: 'discovery', label: 'Descoberta', count: 15 },
                  { stage: 'property_showing', label: 'Apresentação', count: 10 },
                  { stage: 'negotiation', label: 'Negociação', count: 8 },
                  { stage: 'booking', label: 'Reserva', count: 3 },
                  { stage: 'confirmation', label: 'Confirmação', count: 2 }
                ].map(item => (
                  <Box key={item.stage} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {item.label}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / 43) * 100}
                      sx={{ flex: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item.count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  )
}