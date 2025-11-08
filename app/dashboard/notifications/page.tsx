// app/dashboard/notifications/page.tsx
'use client'

import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  useTheme,
  Card,
  CardContent,
  Stack
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
  Delete as DeleteIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  EventNote as EventNoteIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNotifications } from '@/lib/hooks/useNotifications'
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_PRIORITY_COLORS
} from '@/lib/types/notification'

export default function NotificationsPage() {
  const theme = useTheme()
  const [activeTab, setActiveTab] = useState(0)
  const [creating, setCreating] = useState(false)

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications({
    limit: 100,
    autoSubscribe: true,
    unreadOnly: activeTab === 1
  })

  // Test function to create sample notifications
  const handleCreateTestNotification = async () => {
    try {
      setCreating(true)

      const testNotifications = [
        {
          type: NotificationType.RESERVATION_CREATED,
          priority: 'high' as NotificationPriority,
          title: 'Nova Reserva Criada',
          message: 'Uma nova reserva foi criada para a Casa da Praia em Setembro 2024',
        },
        {
          type: NotificationType.PAYMENT_DUE_REMINDER,
          priority: 'medium' as NotificationPriority,
          title: 'Pagamento Pendente',
          message: 'Você tem um pagamento de R$ 2.500,00 vencendo em 3 dias',
        },
        {
          type: NotificationType.AGENDA_EVENT_REMINDER,
          priority: 'low' as NotificationPriority,
          title: 'Lembrete de Evento',
          message: 'Reunião com cliente João Silva amanhã às 14h',
        },
        {
          type: NotificationType.SYSTEM_ALERT,
          priority: 'critical' as NotificationPriority,
          title: 'Alerta do Sistema',
          message: 'WhatsApp desconectado - Reconecte agora para continuar recebendo mensagens',
        }
      ]

      // Create random notification
      const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)]

      const response = await fetch('/api/ai/functions/post-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(randomNotification)
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      console.log('Test notification created successfully')
    } catch (error) {
      console.error('Failed to create test notification:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap = {
      [NotificationType.AGENDA_EVENT_CREATED]: EventNoteIcon,
      [NotificationType.AGENDA_EVENT_REMINDER]: ScheduleIcon,
      [NotificationType.TICKET_RESPONSE_RECEIVED]: AssignmentIcon,
      [NotificationType.RESERVATION_CREATED]: HomeIcon,
      [NotificationType.PAYMENT_DUE_REMINDER]: PaymentIcon,
      [NotificationType.PAYMENT_OVERDUE]: WarningIcon,
      [NotificationType.SYSTEM_ALERT]: WarningIcon
    }

    const IconComponent = iconMap[type] || NotificationsIcon
    return <IconComponent />
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    return NOTIFICATION_PRIORITY_COLORS[priority] || theme.palette.primary.main
  }

  const formatNotificationTime = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: ptBR
    })
  }

  const filteredNotifications = activeTab === 1
    ? notifications.filter(n => !n.readAt)
    : notifications

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Notificações
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie todas as suas notificações
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleCreateTestNotification}
              disabled={creating}
              sx={{ minWidth: 180 }}
            >
              {creating ? 'Criando...' : '🧪 Criar Notificação Teste'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllAsRead}
                disabled={loading}
              >
                Marcar todas como lidas
              </Button>
            )}
          </Box>
        </Box>

        {/* Stats Cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total de Notificações
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {notifications.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Não Lidas
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {unreadCount}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Lidas
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {notifications.length - unreadCount}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label={
              <Badge badgeContent={notifications.length} color="primary" max={99}>
                <Box sx={{ mr: 2 }}>Todas</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <Box sx={{ mr: 2 }}>Não Lidas</Box>
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erro ao carregar notificações: {error.message}
        </Alert>
      )}

      {/* Notifications List */}
      {!loading && !error && (
        <Paper>
          {filteredNotifications.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <NotificationsIcon
                sx={{
                  fontSize: 80,
                  color: theme.palette.text.disabled,
                  mb: 2
                }}
              />
              <Typography variant="h6" color="text.secondary">
                {activeTab === 1 ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.readAt
                        ? 'transparent'
                        : theme.palette.action.hover,
                      '&:hover': {
                        backgroundColor: notification.readAt
                          ? theme.palette.action.hover
                          : theme.palette.action.selected
                      },
                      py: 2,
                      px: 3
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          backgroundColor: notification.readAt
                            ? theme.palette.grey[200]
                            : getPriorityColor(notification.priority),
                          width: 48,
                          height: 48
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: notification.readAt ? 500 : 700,
                              flex: 1
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.readAt && (
                            <CircleIcon
                              sx={{
                                fontSize: 10,
                                color: theme.palette.error.main
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            {notification.message}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={NOTIFICATION_TYPE_LABELS[notification.type]}
                              size="small"
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.disabled">
                              {formatNotificationTime(notification.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />

                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                      {!notification.readAt && (
                        <IconButton
                          size="small"
                          onClick={() => handleMarkAsRead(notification.id)}
                          sx={{
                            color: 'success.main',
                            '&:hover': {
                              backgroundColor: 'success.light'
                            }
                          }}
                        >
                          <DoneIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(notification.id)}
                        sx={{
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'error.light'
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Container>
  )
}
