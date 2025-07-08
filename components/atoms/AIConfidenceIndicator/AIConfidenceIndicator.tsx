import React from 'react'
import { Box, LinearProgress, Typography, Tooltip } from '@mui/material'
import { Psychology } from '@mui/icons-material'

interface AIConfidenceIndicatorProps {
  confidence: number
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
  showIcon?: boolean
}

export default function AIConfidenceIndicator({ 
  confidence, 
  size = 'medium',
  showLabel = true,
  showIcon = true
}: AIConfidenceIndicatorProps) {
  const confidencePercent = Math.round(confidence * 100)
  
  const getColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success'
    if (confidence >= 0.6) return 'warning'
    return 'error'
  }

  const getLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Muito Alta'
    if (confidence >= 0.8) return 'Alta'
    if (confidence >= 0.6) return 'Média'
    if (confidence >= 0.4) return 'Baixa'
    return 'Muito Baixa'
  }

  const color = getColor(confidence)
  const label = getLabel(confidence)

  const sizeConfig = {
    small: { height: 4, fontSize: '0.75rem', iconSize: 16 },
    medium: { height: 6, fontSize: '0.875rem', iconSize: 20 },
    large: { height: 8, fontSize: '1rem', iconSize: 24 }
  }

  const config = sizeConfig[size]

  return (
    <Tooltip title={`Confiança da IA: ${confidencePercent}% (${label})`}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
        {showIcon && (
          <Psychology 
            sx={{ 
              fontSize: config.iconSize,
              color: `${color}.main`,
              opacity: 0.8 
            }} 
          />
        )}
        
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={confidencePercent}
            color={color}
            sx={{
              height: config.height,
              borderRadius: config.height / 2,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: config.height / 2,
              }
            }}
          />
        </Box>
        
        {showLabel && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: config.fontSize,
              fontWeight: 500,
              color: `${color}.main`,
              minWidth: 'fit-content'
            }}
          >
            {confidencePercent}%
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}