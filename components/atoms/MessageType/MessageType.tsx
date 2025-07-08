import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { 
  Message as MessageIcon,
  Image, 
  VideoLibrary, 
  AudioFile, 
  Description, 
  LocationOn, 
  ContactPage 
} from '@mui/icons-material'
import { MessageType as MessageTypeEnum } from '@/lib/types/conversation'

interface MessageTypeProps extends Omit<ChipProps, 'label' | 'icon'> {
  type: MessageTypeEnum
}

const typeConfig = {
  [MessageTypeEnum.TEXT]: {
    label: 'Texto',
    icon: <MessageIcon />,
    color: 'default' as const
  },
  [MessageTypeEnum.IMAGE]: {
    label: 'Imagem',
    icon: <Image />,
    color: 'primary' as const
  },
  [MessageTypeEnum.VIDEO]: {
    label: 'Vídeo',
    icon: <VideoLibrary />,
    color: 'secondary' as const
  },
  [MessageTypeEnum.AUDIO]: {
    label: 'Áudio',
    icon: <AudioFile />,
    color: 'info' as const
  },
  [MessageTypeEnum.DOCUMENT]: {
    label: 'Documento',
    icon: <Description />,
    color: 'warning' as const
  },
  [MessageTypeEnum.LOCATION]: {
    label: 'Localização',
    icon: <LocationOn />,
    color: 'success' as const
  },
  [MessageTypeEnum.CONTACT]: {
    label: 'Contato',
    icon: <ContactPage />,
    color: 'error' as const
  }
}

export default function MessageType({ type, ...props }: MessageTypeProps) {
  const config = typeConfig[type]

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