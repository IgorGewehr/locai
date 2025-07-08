import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { 
  Message,
  Event,
  Schedule,
  Visibility,
  AttachMoney,
  PersonOff,
  NotificationImportant
} from '@mui/icons-material'
import { TriggerType } from '@/lib/types/automation'

interface AutomationTriggerProps extends Omit<ChipProps, 'label' | 'icon'> {
  triggerType: TriggerType
}

const triggerConfig = {
  [TriggerType.MESSAGE_RECEIVED]: {
    label: 'Mensagem Recebida',
    icon: <Message />,
    color: 'primary' as const
  },
  [TriggerType.RESERVATION_CREATED]: {
    label: 'Reserva Criada',
    icon: <Event />,
    color: 'success' as const
  },
  [TriggerType.PAYMENT_OVERDUE]: {
    label: 'Pagamento Atrasado',
    icon: <AttachMoney />,
    color: 'error' as const
  },
  [TriggerType.CHECK_IN_REMINDER]: {
    label: 'Lembrete Check-in',
    icon: <NotificationImportant />,
    color: 'info' as const
  },
  [TriggerType.FOLLOW_UP_DUE]: {
    label: 'Follow-up Devido',
    icon: <Schedule />,
    color: 'warning' as const
  },
  [TriggerType.SCHEDULED]: {
    label: 'Agendado',
    icon: <Schedule />,
    color: 'default' as const
  },
  [TriggerType.CLIENT_INACTIVE]: {
    label: 'Cliente Inativo',
    icon: <PersonOff />,
    color: 'error' as const
  },
  [TriggerType.PROPERTY_VIEWED]: {
    label: 'Propriedade Visualizada',
    icon: <Visibility />,
    color: 'secondary' as const
  },
  [TriggerType.PRICE_INQUIRY]: {
    label: 'Consulta de Preço',
    icon: <AttachMoney />,
    color: 'info' as const
  },
  [TriggerType.BOOKING_ABANDONED]: {
    label: 'Reserva Abandonada',
    icon: <PersonOff />,
    color: 'warning' as const
  }
}

export default function AutomationTrigger({ triggerType, ...props }: AutomationTriggerProps) {
  const config = triggerConfig[triggerType]

  return (
    <Chip
      label={config.label}
      icon={config.icon}
      color={config.color}
      variant="outlined"
      size="small"
      {...props}
    />
  )
}