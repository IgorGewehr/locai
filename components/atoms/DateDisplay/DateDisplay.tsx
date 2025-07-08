// components/atoms/DateDisplay/DateDisplay.tsx
import React from 'react'
import { Typography, TypographyProps, Box, Chip, useTheme } from '@mui/material'
import { 
  format, 
  formatDistanceToNow, 
  isToday, 
  isTomorrow, 
  isYesterday,
  isPast,
  isFuture,
  differenceInDays,
  differenceInHours
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Schedule, 
  Today, 
  Warning, 
  CheckCircle,
  Event
} from '@mui/icons-material'

export interface DateDisplayProps extends Omit<TypographyProps, 'children'> {
  date: Date | string
  format?: 'full' | 'short' | 'relative' | 'time' | 'date' | 'datetime' | 'custom'
  customFormat?: string
  showIcon?: boolean
  showRelativeTime?: boolean
  showUrgency?: boolean
  urgencyThreshold?: number // days
  showStatus?: boolean
  interactive?: boolean
  timezone?: string
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format: dateFormat = 'short',
  customFormat,
  showIcon = false,
  showRelativeTime = false,
  showUrgency = false,
  urgencyThreshold = 3,
  showStatus = false,
  interactive = false,
  timezone,
  variant = 'body2',
  ...props
}) => {
  const theme = useTheme()
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const formatDate = () => {
    switch (dateFormat) {
      case 'full':
        return format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      case 'short':
        return format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
      case 'relative':
        return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR })
      case 'time':
        return format(dateObj, 'HH:mm', { locale: ptBR })
      case 'date':
        return format(dateObj, 'dd/MM', { locale: ptBR })
      case 'datetime':
        return format(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR })
      case 'custom':
        return customFormat ? format(dateObj, customFormat, { locale: ptBR }) : format(dateObj, 'dd/MM/yyyy')
      default:
        return format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
    }
  }

  const getIcon = () => {
    if (!showIcon) return null

    if (isToday(dateObj)) {
      return <Today sx={{ fontSize: 'inherit', color: 'primary.main' }} />
    } else if (isFuture(dateObj)) {
      return <Event sx={{ fontSize: 'inherit', color: 'info.main' }} />
    } else if (isPast(dateObj)) {
      return <Schedule sx={{ fontSize: 'inherit', color: 'text.secondary' }} />
    }
    return <Event sx={{ fontSize: 'inherit' }} />
  }

  const getUrgencyStatus = () => {
    if (!showUrgency) return null

    const daysFromNow = differenceInDays(dateObj, new Date())
    const hoursFromNow = differenceInHours(dateObj, new Date())

    if (isToday(dateObj)) {
      return {
        severity: 'high' as const,
        label: 'Hoje',
        color: 'error.main',
        icon: <Warning sx={{ fontSize: 12 }} />
      }
    } else if (isTomorrow(dateObj)) {
      return {
        severity: 'medium' as const,
        label: 'Amanhã',
        color: 'warning.main',
        icon: <Schedule sx={{ fontSize: 12 }} />
      }
    } else if (daysFromNow > 0 && daysFromNow <= urgencyThreshold) {
      return {
        severity: 'low' as const,
        label: `Em ${daysFromNow} dias`,
        color: 'info.main',
        icon: <Event sx={{ fontSize: 12 }} />
      }
    } else if (isPast(dateObj)) {
      const daysOverdue = Math.abs(daysFromNow)
      return {
        severity: 'overdue' as const,
        label: daysOverdue === 1 ? 'Ontem' : `${daysOverdue} dias atrás`,
        color: 'error.main',
        icon: <Warning sx={{ fontSize: 12 }} />
      }
    }

    return null
  }

  const getStatusLabel = () => {
    if (!showStatus) return null

    if (isToday(dateObj)) {
      return 'Hoje'
    } else if (isTomorrow(dateObj)) {
      return 'Amanhã'
    } else if (isYesterday(dateObj)) {
      return 'Ontem'
    }
    return null
  }

  const getTextColor = () => {
    if (props.color) return props.color

    if (showUrgency) {
      const urgency = getUrgencyStatus()
      if (urgency) {
        switch (urgency.severity) {
          case 'high':
            return 'error.main'
          case 'medium':
            return 'warning.main'
          case 'overdue':
            return 'error.main'
          default:
            return 'text.primary'
        }
      }
    }

    return 'text.primary'
  }

  const urgencyStatus = getUrgencyStatus()
  const statusLabel = getStatusLabel()

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ...(interactive && {
          cursor: 'pointer',
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }),
      }}
    >
      {getIcon()}
      
      <Typography
        variant={variant}
        color={getTextColor()}
        component="span"
        sx={{
          fontWeight: urgencyStatus?.severity === 'high' ? 600 : 400,
          ...props.sx,
        }}
        {...props}
      >
        {formatDate()}
      </Typography>

      {showRelativeTime && dateFormat !== 'relative' && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="span"
          sx={{ ml: 0.5 }}
        >
          ({formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR })})
        </Typography>
      )}

      {urgencyStatus && (
        <Chip
          label={urgencyStatus.label}
          icon={urgencyStatus.icon}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 500,
            backgroundColor: urgencyStatus.color,
            color: 'white',
            '& .MuiChip-icon': {
              color: 'white',
            },
          }}
        />
      )}

      {statusLabel && !urgencyStatus && (
        <Chip
          label={statusLabel}
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: '0.65rem',
            fontWeight: 500,
          }}
        />
      )}
    </Box>
  )
}