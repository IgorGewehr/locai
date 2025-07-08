import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { ConversationStatus as ConversationStatusType } from '@/lib/types/conversation'

interface ConversationStatusProps extends Omit<ChipProps, 'label' | 'color'> {
  status: ConversationStatusType
}

const statusConfig = {
  [ConversationStatusType.ACTIVE]: {
    label: 'Ativa',
    color: 'success' as const,
    icon: '🟢'
  },
  [ConversationStatusType.WAITING_CLIENT]: {
    label: 'Aguardando Cliente',
    color: 'warning' as const,
    icon: '⏳'
  },
  [ConversationStatusType.WAITING_APPROVAL]: {
    label: 'Aguardando Aprovação',
    color: 'info' as const,
    icon: '⏸️'
  },
  [ConversationStatusType.ESCALATED]: {
    label: 'Escalada',
    color: 'error' as const,
    icon: '🚨'
  },
  [ConversationStatusType.COMPLETED]: {
    label: 'Concluída',
    color: 'default' as const,
    icon: '✅'
  },
  [ConversationStatusType.ABANDONED]: {
    label: 'Abandonada',
    color: 'error' as const,
    icon: '❌'
  }
}

export default function ConversationStatus({ status, ...props }: ConversationStatusProps) {
  const config = statusConfig[status]

  return (
    <Chip
      label={`${config.icon} ${config.label}`}
      color={config.color}
      variant="outlined"
      size="small"
      {...props}
    />
  )
}