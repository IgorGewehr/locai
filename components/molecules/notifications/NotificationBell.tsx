// components/molecules/notifications/NotificationBell.tsx
// Real-time notification bell with improved UX/UI

'use client'

import React, { useState, useEffect } from 'react'
import {
  Badge,
  IconButton,
  Popover,
  Typography,
  Box,
  List,
  ListItem,
  Avatar,
  Button,
  Tooltip,
  Chip,
  Fade,
  Slide,
  alpha,
  useTheme,
  CircularProgress,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  Payment as PaymentIcon,
  Home as HomeIcon,
  Warning as WarningIcon,
  KeyboardArrowRight as ArrowIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNotifications } from '@/lib/hooks/useNotifications'
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '@/lib/types/notification'

interface NotificationBellProps {
  maxNotifications?: number
  showCount?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  maxNotifications = 20,
  showCount = true,
  size = 'medium'
}) => {
  const theme = useTheme()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [hasNewNotification, setHasNewNotification] = useState(false)
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications({
    limit: maxNotifications,
    autoSubscribe: true
  })

  const isOpen = Boolean(anchorEl)

  // Detect new notifications with animation and sound
  useEffect(() => {
    if (unreadCount > previousUnreadCount && previousUnreadCount !== 0) {
      setHasNewNotification(true)

      // Play subtle notification sound (optional)
      // const audio = new Audio('/sounds/notification.mp3')
      // audio.volume = 0.3
      // audio.play().catch(() => {}) // Ignore errors if user hasn't interacted

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

  const handleMarkAsRead = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await markAsRead(notificationId)
      setSnackbar({ open: true, message: 'Notificação marcada como lida', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao marcar notificação', severity: 'error' })
    }
  }

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await deleteNotification(notificationId)
      setSnackbar({ open: true, message: 'Notificação excluída', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao excluir notificação', severity: 'error' })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setSnackbar({ open: true, message: 'Todas notificações marcadas como lidas', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao marcar todas como lidas', severity: 'error' })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.readAt) {
      markAsRead(notification.id).catch(() => {})
    }

    // Navigate if there's an action
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions.find(a => a.type === 'primary') || notification.actions[0]
      if (primaryAction.action === 'navigate' && primaryAction.config.url) {
        window.location.href = primaryAction.config.url
        handleClose()
      }
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    const iconMap = {
      [NotificationType.AGENDA_EVENT_CREATED]: EventNoteIcon,
      [NotificationType.AGENDA_EVENT_REMINDER]: ScheduleIcon,
      [NotificationType.AGENDA_EVENT_UPDATED]: EventNoteIcon,
      [NotificationType.AGENDA_EVENT_CANCELLED]: CloseIcon,
      [NotificationType.TICKET_RESPONSE_RECEIVED]: AssignmentIcon,
      [NotificationType.TICKET_ASSIGNED]: AssignmentIcon,
      [NotificationType.TICKET_STATUS_CHANGED]: AssignmentIcon,
      [NotificationType.RESERVATION_CREATED]: HomeIcon,
      [NotificationType.RESERVATION_CHECK_IN_REMINDER]: HomeIcon,
      [NotificationType.RESERVATION_CHECK_OUT_REMINDER]: HomeIcon,
      [NotificationType.PAYMENT_DUE_REMINDER]: PaymentIcon,
      [NotificationType.PAYMENT_OVERDUE]: WarningIcon,
      [NotificationType.PAYMENT_RECEIVED]: PaymentIcon,
      [NotificationType.SYSTEM_ALERT]: WarningIcon,
      [NotificationType.SYSTEM_MAINTENANCE]: WarningIcon,
    }
    return iconMap[type] || NotificationsIcon
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    const colorMap = {
      low: theme.palette.info.main,
      medium: theme.palette.primary.main,
      high: theme.palette.warning.main,
      critical: theme.palette.error.main,
    }
    return colorMap[priority]
  }

  const tooltipTitle = loading
    ? 'Carregando notificações...'
    : error
    ? 'Erro ao carregar notificações'
    : unreadCount === 0
    ? 'Nenhuma notificação nova'
    : `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <IconButton
          onClick={handleClick}
          size={size}
          disabled={loading}
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: hasNewNotification ? 'bellRing 0.5s ease-in-out' : 'none',
            '@keyframes bellRing': {
              '0%, 100%': { transform: 'rotate(0deg)' },
              '10%, 30%': { transform: 'rotate(-10deg)' },
              '20%, 40%': { transform: 'rotate(10deg)' },
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'scale(1.1)',
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
                fontSize: '0.7rem',
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                borderRadius: '9px',
                border: `2px solid ${theme.palette.background.paper}`,
                animation: hasNewNotification ? 'badgePulse 1s ease-in-out' : 'none',
                '@keyframes badgePulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.3)' },
                },
              }
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsIcon sx={{ fontSize: 24 }} />
            ) : (
              <NotificationsNoneIcon sx={{ fontSize: 24 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        TransitionComponent={Fade}
        transitionDuration={200}
        PaperProps={{
          elevation: 12,
          sx: {
            width: 440,
            maxWidth: '95vw',
            maxHeight: '85vh',
            mt: 1.5,
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(135deg,
              ${alpha(theme.palette.background.paper, 0.98)} 0%,
              ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }
        }}
      >
        {/* Header */}
        <Box sx={{
          p: 2.5,
          background: `linear-gradient(135deg,
            ${alpha(theme.palette.primary.main, 0.08)} 0%,
            ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
                Notificações
              </Typography>
              {unreadCount > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                  {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                startIcon={<MarkEmailReadIcon sx={{ fontSize: 16 }} />}
                sx={{
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                Marcar todas
              </Button>
            )}
          </Box>
        </Box>

        {/* Loading State */}
        {loading && notifications.length === 0 && (
          <Box sx={{
            p: 6,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <CircularProgress size={40} sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Carregando notificações...
            </Typography>
          </Box>
        )}

        {/* Empty State */}
        {!loading && notifications.length === 0 && (
          <Box sx={{
            p: 6,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}>
            <NotificationsNoneIcon sx={{
              fontSize: 64,
              color: alpha(theme.palette.text.disabled, 0.3),
            }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Você está em dia!
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Nenhuma notificação no momento
            </Typography>
          </Box>
        )}

        {/* Notifications List */}
        {!loading && notifications.length > 0 && (
          <List sx={{ p: 0, maxHeight: 520, overflowY: 'auto' }}>
            {notifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type)
              const priorityColor = getPriorityColor(notification.priority)
              const isUnread = !notification.readAt

              return (
                <Slide
                  key={notification.id}
                  direction="down"
                  in={true}
                  timeout={200 + index * 50}
                  unmountOnExit
                >
                  <ListItem
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      px: 2.5,
                      py: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: isUnread
                        ? alpha(theme.palette.primary.main, 0.04)
                        : 'transparent',
                      borderLeft: `3px solid ${isUnread ? priorityColor : 'transparent'}`,
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 44,
                        height: 44,
                        mr: 2,
                        backgroundColor: alpha(priorityColor, 0.1),
                        color: priorityColor,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 22 }} />
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: isUnread ? 700 : 500,
                            fontSize: '0.9rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {(notification.priority === 'high' || notification.priority === 'critical') && (
                          <Chip
                            label={notification.priority === 'critical' ? 'Urgente' : 'Alta'}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              backgroundColor: alpha(priorityColor, 0.15),
                              color: priorityColor,
                            }}
                          />
                        )}
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.8rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          mb: 0.5,
                        }}
                      >
                        {notification.message}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                          {formatDistanceToNow(notification.createdAt, {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </Typography>
                        {notification.actions && notification.actions.length > 0 && (
                          <ArrowIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                      {isUnread && (
                        <Tooltip title="Marcar como lida">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            sx={{
                              color: 'primary.main',
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              }
                            }}
                          >
                            <CheckCircleIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDelete(notification.id, e)}
                          sx={{
                            color: 'text.disabled',
                            '&:hover': {
                              color: 'error.main',
                              backgroundColor: alpha(theme.palette.error.main, 0.1),
                            }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                </Slide>
              )
            })}
          </List>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{
            p: 1.5,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            textAlign: 'center',
          }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: '0.7rem',
                fontStyle: 'italic'
              }}
            >
              Exibindo {notifications.length} de {notifications.length} notificações
            </Typography>
          </Box>
        )}
      </Popover>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default NotificationBell
