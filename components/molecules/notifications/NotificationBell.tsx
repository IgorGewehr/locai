// components/molecules/notifications/NotificationBell.tsx
// Componente sino de notificações responsivo e profissional

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  useTheme,
  useMediaQuery,
  Tooltip,
  Chip,
  ListItemSecondaryAction,
  IconButton as MuiIconButton,
  Collapse,
  Fade
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Circle as CircleIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNotifications } from '@/lib/hooks/useNotifications'
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_PRIORITY_COLORS
} from '@/lib/types/notification'

interface NotificationBellProps {
  maxNotifications?: number
  showCount?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  maxNotifications = 10,
  showCount = true,
  size = 'medium'
}) => {
  console.log('[NotificationBell] Component rendering...', { maxNotifications, showCount, size })

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0)

  // Use custom hook for notifications with error handling
  let hookResult
  try {
    hookResult = useNotifications({
      limit: maxNotifications,
      autoSubscribe: true
    })
  } catch (error) {
    console.error('[NotificationBell] Hook error:', error)
    hookResult = {
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: error as Error,
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      deleteNotification: async () => {},
      refresh: async () => {}
    }
  }

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = hookResult

  // Debug log
  React.useEffect(() => {
    console.log('[NotificationBell] State updated:', {
      notificationsCount: notifications.length,
      unreadCount,
      loading,
      hasService: !!notificationService
    })
  }, [notifications.length, unreadCount, loading, notificationService])

  // Configurações de tamanho
  const sizeConfig = {
    small: { icon: 20, badge: 12 },
    medium: { icon: 24, badge: 16 },
    large: { icon: 28, badge: 20 }
  }

  const config = sizeConfig[size]
  const isOpen = Boolean(anchorEl)

  // Detect new notifications
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount !== 0) {
      setHasNewNotification(true)
      setTimeout(() => setHasNewNotification(false), 3000)
    }
    setPreviousUnreadCount(unreadCount)
  }, [unreadCount, previousUnreadCount])

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMarkAsRead = async (notificationId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

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
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    try {
      await deleteNotification(notificationId)
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // Toggle expansão
    if (expandedNotification === notification.id) {
      setExpandedNotification(null)
    } else {
      setExpandedNotification(notification.id)
      // Marcar como lida se não foi lida
      if (!notification.readAt) {
        handleMarkAsRead(notification.id)
      }
    }
  }

  const handleActionClick = (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // Executar ação se houver
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions.find(a => a.type === 'primary') || notification.actions[0]
      if (primaryAction.action === 'navigate' && primaryAction.config.url) {
        window.location.href = primaryAction.config.url
        handleClose()
      }
    }
  }

  const getNotificationIcon = (type: NotificationType, priority: NotificationPriority) => {
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
    const color = NOTIFICATION_PRIORITY_COLORS[priority] || theme.palette.primary.main

    return <IconComponent sx={{ color, fontSize: 20 }} />
  }

  const formatNotificationTime = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: ptBR 
    })
  }

  const getPriorityChip = (priority: NotificationPriority) => {
    const colorMap = {
      low: 'default' as const,
      medium: 'primary' as const,
      high: 'warning' as const,
      critical: 'error' as const
    }

    const labelMap = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica'
    }

    return (
      <Chip
        label={labelMap[priority]}
        color={colorMap[priority]}
        size="small"
        sx={{ fontSize: '0.75rem', height: 20 }}
      />
    )
  }

  // Always show the icon, even during loading
  const showAsDisabled = !notificationService
  const tooltipTitle = loading
    ? 'Carregando notificações...'
    : !notificationService
    ? 'Notificações indisponíveis'
    : `${unreadCount} notificações não lidas`

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <IconButton
          onClick={handleClick}
          size={size}
          disabled={showAsDisabled || loading}
          sx={{
            color: hasNewNotification || unreadCount > 0
              ? theme.palette.error.main
              : 'rgba(255, 255, 255, 0.8)',
            animation: hasNewNotification ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%': {
                transform: 'scale(1)',
              },
              '50%': {
                transform: 'scale(1.1)',
              },
              '100%': {
                transform: 'scale(1)',
              },
            },
            '&:hover': {
              backgroundColor: theme.palette.action.hover
            }
          }}
        >
          <Badge
            badgeContent={showCount ? unreadCount : undefined}
            color="error"
            max={99}
            invisible={unreadCount === 0}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                minWidth: config.badge,
                height: config.badge,
                animation: hasNewNotification ? 'badgePulse 1s infinite' : 'none',
                '@keyframes badgePulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.2)' },
                  '100%': { transform: 'scale(1)' },
                },
              }
            }}
          >
            {unreadCount > 0 || hasNewNotification ? (
              <NotificationsIcon sx={{ fontSize: config.icon }} />
            ) : (
              <NotificationsNoneIcon sx={{ fontSize: config.icon }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: isMobile ? '95vw' : 400,
            maxWidth: 400,
            maxHeight: 600,
            mt: 1.5,
            boxShadow: theme.shadows[8],
            border: `1px solid ${theme.palette.divider}`
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notificações
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
              >
                Marcar todas como lidas
              </Button>
            )}
          </Box>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {/* Lista de notificações */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon 
              sx={{ 
                fontSize: 48, 
                color: theme.palette.text.disabled,
                mb: 1 
              }} 
            />
            <Typography variant="body2" color="text.secondary">
              Nenhuma notificação
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 500, overflowY: 'auto' }}>
            {notifications.map((notification, index) => {
              const isExpanded = expandedNotification === notification.id
              
              return (
                <React.Fragment key={notification.id}>
                  <ListItem
                    button
                    onClick={(e) => handleNotificationClick(notification, e)}
                    sx={{
                      backgroundColor: notification.readAt 
                        ? 'transparent' 
                        : theme.palette.action.hover,
                      '&:hover': {
                        backgroundColor: notification.readAt
                          ? theme.palette.action.hover
                          : theme.palette.action.selected
                      },
                      py: 1.5,
                      px: 2,
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            backgroundColor: notification.readAt 
                              ? theme.palette.grey[200] 
                              : theme.palette.primary.main,
                            width: 36,
                            height: 36
                          }}
                        >
                          {getNotificationIcon(notification.type, notification.priority)}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: notification.readAt ? 500 : 600,
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {notification.priority !== 'medium' && (
                            <Box sx={{ flexShrink: 0 }}>
                              {getPriorityChip(notification.priority)}
                            </Box>
                          )}
                        </Box>
                        
                        {!isExpanded && (
                          <Box>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                mb: 0.5
                              }}
                            >
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {formatNotificationTime(notification.createdAt)}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                        {!notification.readAt && (
                          <CircleIcon 
                            sx={{ 
                              fontSize: 8, 
                              color: theme.palette.error.main,
                              animation: 'blink 1.5s infinite',
                              '@keyframes blink': {
                                '0%, 50%, 100%': { opacity: 1 },
                                '25%, 75%': { opacity: 0.3 },
                              }
                            }} 
                          />
                        )}
                        
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                          sx={{ 
                            opacity: 0.6,
                            '&:hover': {
                              opacity: 1,
                              color: theme.palette.error.main
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        
                        <IconButton size="small">
                          {isExpanded ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ pt: 2, pb: 1 }}>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
                        >
                          {notification.message}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.disabled">
                            {formatNotificationTime(notification.createdAt)}
                          </Typography>
                          
                          {notification.actions && notification.actions.length > 0 && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={(e) => handleActionClick(notification, e)}
                              sx={{ ml: 2 }}
                            >
                              {notification.actions[0].label || 'Ver Detalhes'}
                            </Button>
                          )}
                        </Box>
                        
                        {notification.entityData && (
                          <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Informações Adicionais:
                            </Typography>
                            {Object.entries(notification.entityData).map(([key, value]) => (
                              <Typography key={key} variant="caption" sx={{ display: 'block' }}>
                                <strong>{key}:</strong> {String(value)}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </ListItem>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              )
            })}
          </List>
        )}

      </Menu>
    </>
  )
}

export default NotificationBell