// app/dashboard/test-notifications/page.tsx
// Página para testar o sistema de notificações

'use client'

import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  TextField,
  Alert,
  Divider,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  useTheme
} from '@mui/material'
import {
  Send as SendIcon,
  EventNote as EventIcon,
  Assignment as TicketIcon,
  Home as ReservationIcon,
  Payment as PaymentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { useTenant } from '@/contexts/TenantContext'
import { useAuth } from '@/lib/hooks/useAuth'
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority } from '@/lib/types/notification'
import { logger } from '@/lib/utils/logger'

const TestNotificationsPage = () => {
  const theme = useTheme()
  const { tenant } = useTenant()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  const notificationService = tenant?.id ? NotificationServiceFactory.getInstance(tenant.id) : null

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // Teste de notificação de agenda
  const testAgendaNotification = async () => {
    if (!notificationService || !user?.uid) {
      showMessage('error', 'Serviço de notificação não disponível')
      return
    }

    setLoading(true)
    try {
      const eventDate = new Date()
      eventDate.setHours(eventDate.getHours() + 2) // 2 horas no futuro

      await notificationService.createAgendaEventNotification({
        targetUserId: user.uid,
        targetUserName: user.displayName || user.email,
        eventId: `test-event-${Date.now()}`,
        eventTitle: 'Visita à Propriedade - Teste',
        eventDate: eventDate,
        eventType: 'visita',
        source: 'test'
      })

      showMessage('success', 'Notificação de agenda criada com sucesso!')
      logger.info('✅ Notificação de agenda teste criada')

    } catch (error) {
      showMessage('error', 'Erro ao criar notificação de agenda')
      logger.error('❌ Erro ao criar notificação de agenda teste', error as Error)
    } finally {
      setLoading(false)
    }
  }

  // Teste de notificação de ticket
  const testTicketNotification = async () => {
    if (!notificationService || !user?.uid) {
      showMessage('error', 'Serviço de notificação não disponível')
      return
    }

    setLoading(true)
    try {
      await notificationService.createTicketResponseNotification({
        targetUserId: user.uid,
        targetUserName: user.displayName || user.email,
        ticketId: `test-ticket-${Date.now()}`,
        ticketTitle: 'Dúvida sobre Reserva - Teste',
        respondedBy: 'Administrador Teste',
        responsePreview: 'Olá! Recebemos sua dúvida sobre a reserva. Nossa equipe está analisando e retornará em breve com uma resposta detalhada.'
      })

      showMessage('success', 'Notificação de ticket criada com sucesso!')
      logger.info('✅ Notificação de ticket teste criada')

    } catch (error) {
      showMessage('error', 'Erro ao criar notificação de ticket')
      logger.error('❌ Erro ao criar notificação de ticket teste', error as Error)
    } finally {
      setLoading(false)
    }
  }

  // Teste de notificação customizada
  const testCustomNotification = async () => {
    if (!notificationService || !user?.uid || !customTitle || !customMessage) {
      showMessage('error', 'Preencha título e mensagem ou verifique o serviço')
      return
    }

    setLoading(true)
    try {
      await notificationService.createNotification({
        targetUserId: user.uid,
        targetUserName: user.displayName || user.email,
        type: NotificationType.SYSTEM_ALERT,
        title: customTitle,
        message: customMessage,
        entityType: 'system',
        entityId: `test-custom-${Date.now()}`,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          source: 'test-custom',
          triggerEvent: 'manual_test'
        }
      })

      showMessage('success', 'Notificação customizada criada com sucesso!')
      logger.info('✅ Notificação customizada teste criada')
      
      // Limpar campos
      setCustomTitle('')
      setCustomMessage('')

    } catch (error) {
      showMessage('error', 'Erro ao criar notificação customizada')
      logger.error('❌ Erro ao criar notificação customizada teste', error as Error)
    } finally {
      setLoading(false)
    }
  }

  // Teste do endpoint de agenda (simular N8N)
  const testAgendaEndpoint = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/agenda-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-n8n-webhook': 'true'
        },
        body: JSON.stringify({
          tenantId: tenant?.id,
          userId: user?.uid,
          userName: user?.displayName || user?.email,
          eventId: `endpoint-test-${Date.now()}`,
          eventTitle: 'Reunião de Negócios - Teste Endpoint',
          eventDate: new Date(Date.now() + 3600000).toISOString(), // 1 hora no futuro
          eventType: 'meeting',
          eventDescription: 'Teste do endpoint de agenda via API',
          source: 'test-endpoint'
        })
      })

      const result = await response.json()

      if (response.ok) {
        showMessage('success', 'Endpoint de agenda testado com sucesso!')
        logger.info('✅ Endpoint de agenda teste executado', result)
      } else {
        showMessage('error', `Erro no endpoint: ${result.error}`)
        logger.error('❌ Erro no endpoint de agenda teste', result)
      }

    } catch (error) {
      showMessage('error', 'Erro ao testar endpoint de agenda')
      logger.error('❌ Erro ao testar endpoint de agenda', error as Error)
    } finally {
      setLoading(false)
    }
  }

  if (!tenant || !user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Você precisa estar logado e em um tenant válido para testar as notificações.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Teste do Sistema de Notificações
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Use esta página para testar todos os recursos do sistema de notificações
        </Typography>
      </Box>

      {/* Mensagem de status */}
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Informações do usuário */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" gutterBottom>
          Informações do Teste:
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Chip label={`Tenant: ${tenant.id}`} size="small" />
          <Chip label={`Usuário: ${user.uid}`} size="small" />
          <Chip label={`Email: ${user.email}`} size="small" />
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Testes pré-definidos */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Testes Pré-definidos
              </Typography>
              
              <Stack spacing={3}>
                {/* Teste Agenda */}
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EventIcon sx={{ mr: 1 }} />
                    Notificação de Agenda
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Simula a criação de um evento na agenda (como o que o N8N enviaria)
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={testAgendaNotification}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <EventIcon />}
                  >
                    Testar Notificação de Agenda
                  </Button>
                </Box>

                <Divider />

                {/* Teste Ticket */}
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TicketIcon sx={{ mr: 1 }} />
                    Resposta de Ticket
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Simula quando um admin responde um ticket de suporte
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={testTicketNotification}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <TicketIcon />}
                  >
                    Testar Resposta de Ticket
                  </Button>
                </Box>

                <Divider />

                {/* Teste Endpoint */}
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <RefreshIcon sx={{ mr: 1 }} />
                    Endpoint API (N8N)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Testa o endpoint que o N8N usará para enviar eventos de agenda
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={testAgendaEndpoint}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  >
                    Testar Endpoint N8N
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Teste customizado */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notificação Customizada
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  label="Título"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="Ex: Nova reserva confirmada"
                />
                
                <TextField
                  label="Mensagem"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Ex: A reserva #123 foi confirmada para o período de..."
                />
                
                <Button
                  variant="contained"
                  onClick={testCustomNotification}
                  disabled={loading || !customTitle || !customMessage}
                  startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                  fullWidth
                >
                  Criar Notificação
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Como usar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                1. Execute os testes pré-definidos<br/>
                2. Verifique o ícone de notificações no header<br/>
                3. O ícone ficará <strong style={{ color: theme.palette.error.main }}>vermelho</strong> com novas notificações<br/>
                4. Clique no ícone para ver as notificações<br/>
                5. Clique em uma notificação para expandí-la<br/>
                6. Use o ícone de lixeira para deletar<br/>
                7. Verifique os logs no console
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default TestNotificationsPage