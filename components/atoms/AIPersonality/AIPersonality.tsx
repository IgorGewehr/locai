import React from 'react'
import { Avatar, Chip, Box, Typography } from '@mui/material'
import { 
  Psychology,
  Business,
  Chat,
  Speed,
  School
} from '@mui/icons-material'
import { AIPersonality as AIPersonalityType } from '@/lib/types/ai'

interface AIPersonalityProps {
  personality: AIPersonalityType
  variant?: 'minimal' | 'detailed'
  size?: 'small' | 'medium' | 'large'
}

const toneIcons = {
  professional: <Business />,
  friendly: <Chat />,
  casual: <Chat />,
  formal: <School />
}

const toneColors = {
  professional: 'primary' as const,
  friendly: 'success' as const,
  casual: 'info' as const,
  formal: 'secondary' as const
}

const styleColors = {
  consultative: 'primary' as const,
  direct: 'warning' as const,
  persuasive: 'error' as const,
  educational: 'info' as const
}

export default function AIPersonality({ 
  personality, 
  variant = 'minimal',
  size = 'medium'
}: AIPersonalityProps) {
  const getInitials = (name: string) => {
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const sizeConfig = {
    small: { avatar: 32, fontSize: '0.75rem' },
    medium: { avatar: 40, fontSize: '0.875rem' },
    large: { avatar: 56, fontSize: '1rem' }
  }

  const config = sizeConfig[size]

  if (variant === 'minimal') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar
          sx={{ 
            width: config.avatar, 
            height: config.avatar,
            bgcolor: toneColors[personality.tone] + '.main',
            fontSize: config.fontSize
          }}
        >
          {getInitials(personality.name)}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {personality.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {personality.tone} • {personality.style}
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar
          sx={{ 
            width: config.avatar, 
            height: config.avatar,
            bgcolor: toneColors[personality.tone] + '.main'
          }}
        >
          {getInitials(personality.name)}
        </Avatar>
        <Box>
          <Typography variant="h6">{personality.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip
              icon={toneIcons[personality.tone]}
              label={personality.tone}
              color={toneColors[personality.tone]}
              size="small"
              variant="outlined"
            />
            <Chip
              label={personality.style}
              color={styleColors[personality.style]}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {personality.greetingMessage}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {personality.specialityFocus.map((focus, index) => (
          <Chip
            key={index}
            label={focus}
            size="small"
            variant="outlined"
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {personality.proactiveFollowUp && (
          <Chip
            icon={<Psychology />}
            label="Follow-up Proativo"
            size="small"
            color="success"
            variant="filled"
          />
        )}
        {personality.urgencyDetection && (
          <Chip
            icon={<Speed />}
            label="Detecção de Urgência"
            size="small"
            color="warning"
            variant="filled"
          />
        )}
        {personality.priceNegotiation && (
          <Chip
            icon={<Business />}
            label="Negociação"
            size="small"
            color="info"
            variant="filled"
          />
        )}
        {personality.crossSelling && (
          <Chip
            icon={<Chat />}
            label="Cross-selling"
            size="small"
            color="secondary"
            variant="filled"
          />
        )}
      </Box>
    </Box>
  )
}