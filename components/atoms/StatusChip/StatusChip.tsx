// components/atoms/StatusChip/StatusChip.tsx
import React from 'react'
import { Chip, ChipProps, useTheme, alpha } from '@mui/material'
import { 
  ReservationStatus, 
  PaymentStatus,
  RESERVATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS
} from '@/lib/types/reservation'
import { CustomerSegment, CUSTOMER_SEGMENT_LABELS } from '@/lib/types/client'
import {
  CheckCircle,
  Schedule,
  Cancel,
  Warning,
  HourglassEmpty,
  AccountBalance,
  Person,
  Stars
} from '@mui/icons-material'

export interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: ReservationStatus | PaymentStatus | CustomerSegment
  type: 'reservation' | 'payment' | 'customer'
  showIcon?: boolean
  animated?: boolean
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  type,
  showIcon = true,
  animated = false,
  ...props
}) => {
  const theme = useTheme()
  
  const getStatusConfig = () => {
    switch (type) {
      case 'reservation':
        return getReservationStatusConfig(status as ReservationStatus, theme)
      case 'payment':
        return getPaymentStatusConfig(status as PaymentStatus, theme)
      case 'customer':
        return getCustomerStatusConfig(status as CustomerSegment, theme)
      default:
        return { color: theme.palette.grey[500], label: status, icon: null }
    }
  }

  const { color, backgroundColor, label, icon, pulse } = getStatusConfig()

  return (
    <Chip
      {...props}
      label={label}
      icon={showIcon ? icon : undefined}
      sx={{
        backgroundColor,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        height: 24,
        '& .MuiChip-icon': {
          color: color,
          fontSize: 16,
        },
        transition: 'all 0.2s ease-in-out',
        ...(animated && {
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[2],
          },
        }),
        ...(pulse && {
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              boxShadow: `0 0 0 0 ${alpha(color, 0.7)}`,
            },
            '70%': {
              boxShadow: `0 0 0 4px ${alpha(color, 0)}`,
            },
            '100%': {
              boxShadow: `0 0 0 0 ${alpha(color, 0)}`,
            },
          },
        }),
        ...props.sx,
      }}
    />
  )
}

function getReservationStatusConfig(status: ReservationStatus, theme: any) {
  switch (status) {
    case ReservationStatus.PENDING:
      return {
        color: theme.palette.warning.contrastText,
        backgroundColor: theme.palette.warning.main,
        label: RESERVATION_STATUS_LABELS[status],
        icon: <HourglassEmpty />,
        pulse: true
      }
    case ReservationStatus.CONFIRMED:
      return {
        color: theme.palette.success.contrastText,
        backgroundColor: theme.palette.success.main,
        label: RESERVATION_STATUS_LABELS[status],
        icon: <CheckCircle />
      }
    case ReservationStatus.CHECKED_IN:
      return {
        color: theme.palette.info.contrastText,
        backgroundColor: theme.palette.info.main,
        label: RESERVATION_STATUS_LABELS[status],
        icon: <Person />
      }
    case ReservationStatus.CHECKED_OUT:
      return {
        color: theme.palette.grey[100],
        backgroundColor: theme.palette.grey[600],
        label: RESERVATION_STATUS_LABELS[status],
        icon: <CheckCircle />
      }
    case ReservationStatus.CANCELLED:
      return {
        color: theme.palette.error.contrastText,
        backgroundColor: theme.palette.error.main,
        label: RESERVATION_STATUS_LABELS[status],
        icon: <Cancel />
      }
    case ReservationStatus.NO_SHOW:
      return {
        color: theme.palette.error.contrastText,
        backgroundColor: alpha(theme.palette.error.main, 0.8),
        label: RESERVATION_STATUS_LABELS[status],
        icon: <Warning />
      }
    default:
      return {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.grey[200],
        label: status,
        icon: <Schedule />
      }
  }
}

function getPaymentStatusConfig(status: PaymentStatus, theme: any) {
  switch (status) {
    case PaymentStatus.PENDING:
      return {
        color: theme.palette.warning.contrastText,
        backgroundColor: theme.palette.warning.main,
        label: PAYMENT_STATUS_LABELS[status],
        icon: <Schedule />,
        pulse: true
      }
    case PaymentStatus.PAID:
      return {
        color: theme.palette.success.contrastText,
        backgroundColor: theme.palette.success.main,
        label: PAYMENT_STATUS_LABELS[status],
        icon: <CheckCircle />
      }
    case PaymentStatus.OVERDUE:
      return {
        color: theme.palette.error.contrastText,
        backgroundColor: theme.palette.error.main,
        label: PAYMENT_STATUS_LABELS[status],
        icon: <Warning />,
        pulse: true
      }
    case PaymentStatus.CANCELLED:
      return {
        color: theme.palette.error.contrastText,
        backgroundColor: alpha(theme.palette.error.main, 0.7),
        label: PAYMENT_STATUS_LABELS[status],
        icon: <Cancel />
      }
    case PaymentStatus.REFUNDED:
      return {
        color: theme.palette.info.contrastText,
        backgroundColor: theme.palette.info.main,
        label: PAYMENT_STATUS_LABELS[status],
        icon: <AccountBalance />
      }
    case PaymentStatus.PARTIAL:
      return {
        color: theme.palette.warning.contrastText,
        backgroundColor: alpha(theme.palette.warning.main, 0.8),
        label: PAYMENT_STATUS_LABELS[status],
        icon: <HourglassEmpty />
      }
    default:
      return {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.grey[200],
        label: status,
        icon: <Schedule />
      }
  }
}

function getCustomerStatusConfig(status: CustomerSegment, theme: any) {
  switch (status) {
    case CustomerSegment.NEW:
      return {
        color: theme.palette.primary.contrastText,
        backgroundColor: theme.palette.primary.main,
        label: CUSTOMER_SEGMENT_LABELS[status],
        icon: <Person />
      }
    case CustomerSegment.OCCASIONAL:
      return {
        color: theme.palette.warning.contrastText,
        backgroundColor: theme.palette.warning.main,
        label: CUSTOMER_SEGMENT_LABELS[status],
        icon: <Schedule />
      }
    case CustomerSegment.REGULAR:
      return {
        color: theme.palette.success.contrastText,
        backgroundColor: theme.palette.success.main,
        label: CUSTOMER_SEGMENT_LABELS[status],
        icon: <CheckCircle />
      }
    case CustomerSegment.VIP:
      return {
        color: theme.palette.secondary.contrastText,
        backgroundColor: theme.palette.secondary.main,
        label: CUSTOMER_SEGMENT_LABELS[status],
        icon: <Stars />
      }
    case CustomerSegment.CHURNED:
      return {
        color: theme.palette.grey[100],
        backgroundColor: theme.palette.grey[600],
        label: CUSTOMER_SEGMENT_LABELS[status],
        icon: <Cancel />
      }
    default:
      return {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.grey[200],
        label: status,
        icon: <Person />
      }
  }
}