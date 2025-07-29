'use client';

import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Snackbar
} from '@mui/material'
import {
  Psychology,
  Settings,
  Analytics,
  Chat,
  PlayArrow,
  Stop,
  Refresh
} from '@mui/icons-material'
import { AIAgent as AIAgentType } from '@/lib/types/ai'
import AIPersonality from '../../atoms/AIPersonality/AIPersonality'
import AIConfidenceIndicator from '../../atoms/AIConfidenceIndicator/AIConfidenceIndicator'

interface AIAgentProps {
  agent: AIAgentType
  onToggleAgent: (agentId: string, isActive: boolean) => Promise<void>
  onConfigureAgent: (agentId: string) => void
  onTestAgent: (agentId: string) => Promise<void>
  onViewAnalytics: (agentId: string) => void
  loading?: boolean
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

export default function AIAgent({
  agent,
  onToggleAgent,
  onConfigureAgent,
  onTestAgent,
  onViewAnalytics,
  loading = false
}: AIAgentProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [isToggling, setIsToggling] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)

  const handleToggleAgent = async () => {
    setIsToggling(true)
    try {
      await onToggleAgent(agent.id, !agent.isActive)
      setNotification({
        message: `Agente ${agent.isActive ? 'desativado' : 'ativado'} com sucesso`,
        severity: 'success'
      })
    } catch (error) {
      setNotification({
        message: 'Erro ao alterar status do agente',
        severity: 'error'
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleTestAgent = async () => {
    setIsTesting(true)
    try {
      await onTestAgent(agent.id)
      setNotification({
        message: 'Teste do agente executado com sucesso',
        severity: 'success'
      })
    } catch (error) {
      setNotification({
        message: 'Erro ao testar o agente',
        severity: 'error'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const formatLastUpdate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error'
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology color="primary" />
              Agente IA: {agent.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Última atualização: {formatLastUpdate(agent.updatedAt)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={agent.isActive}
                  onChange={handleToggleAgent}
                  disabled={isToggling}
                  color={getStatusColor(agent.isActive)}
                />
              }
              label={agent.isActive ? 'Ativo' : 'Inativo'}
            />
            
            <Button
              variant="outlined"
              startIcon={isTesting ? <CircularProgress size={16} /> : <PlayArrow />}
              onClick={handleTestAgent}
              disabled={isTesting || !agent.isActive}
            >
              {isTesting ? 'Testando...' : 'Testar'}
            </Button>

            <Button
              variant="contained"
              startIcon={<Settings />}
              onClick={() => onConfigureAgent(agent.id)}
            >
              Configurar
            </Button>
          </Box>
        </Box>

        {/* Status Alert */}
        {!agent.isActive && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Este agente está inativo e não processará mensagens. Ative-o para começar a receber conversas.
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 3 }}>
          <Tab icon={<Psychology />} label="Personalidade" />
          <Tab icon={<Analytics />} label="Performance" />
          <Tab icon={<Settings />} label="Configurações" />
        </Tabs>

        {/* Tab Content */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <AIPersonality 
                personality={agent.personality}
                variant="detailed"
                size="large"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Configurações de Comportamento
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Follow-up Proativo</Typography>
                      <Switch 
                        checked={agent.personality.proactiveFollowUp} 
                        size="small" 
                        disabled 
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Detecção de Urgência</Typography>
                      <Switch 
                        checked={agent.personality.urgencyDetection} 
                        size="small" 
                        disabled 
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Negociação de Preços</Typography>
                      <Switch 
                        checked={agent.personality.priceNegotiation} 
                        size="small" 
                        disabled 
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Cross-selling</Typography>
                      <Switch 
                        checked={agent.personality.crossSelling} 
                        size="small" 
                        disabled 
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {/* Performance Metrics */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {agent.performance.totalConversations}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Conversas Totais
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {Math.round(agent.performance.conversionRate * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Conversão
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {agent.performance.averageResponseTime.toFixed(1)}s
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tempo Médio de Resposta
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {Math.round(agent.performance.customerSatisfaction * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Satisfação do Cliente
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Revenue */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Receita Gerada
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(agent.performance.revenueGenerated)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total em reservas processadas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Actions */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ações Rápidas
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Analytics />}
                      onClick={() => onViewAnalytics(agent.id)}
                      fullWidth
                    >
                      Ver Analytics Detalhado
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Chat />}
                      fullWidth
                    >
                      Ver Conversas Recentes
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      fullWidth
                    >
                      Resetar Estatísticas
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {/* OpenAI Configuration */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Configuração OpenAI
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Modelo
                      </Typography>
                      <Typography variant="body1">
                        {agent.configuration.model}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Temperatura
                      </Typography>
                      <Typography variant="body1">
                        {agent.configuration.temperature}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Máximo de Tokens
                      </Typography>
                      <Typography variant="body1">
                        {agent.configuration.maxTokens}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Auto Approval Settings */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Aprovações Automáticas
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Valor Máximo para Auto-aprovação
                      </Typography>
                      <Typography variant="body1">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(agent.configuration.autoApproval.maxReservationValue)}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Desconto Máximo Automático
                      </Typography>
                      <Typography variant="body1">
                        {agent.configuration.autoApproval.maxDiscountPercentage}%
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Reservas de Clientes Confiáveis</Typography>
                      <Switch 
                        checked={agent.configuration.autoApproval.trustedClientReservations} 
                        size="small" 
                        disabled 
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Operational Limits */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Limites Operacionais
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Máx. Conversas por Hora
                        </Typography>
                        <Typography variant="h6">
                          {agent.configuration.maxConversationsPerHour}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tempo Limite de Resposta
                        </Typography>
                        <Typography variant="h6">
                          {agent.configuration.responseTimeLimit}s
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Triggers de Escalação
                        </Typography>
                        <Typography variant="h6">
                          {agent.configuration.escalationTriggers.length}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.severity || 'info'}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  )
}