import React from 'react'
import { Box, CircularProgress, Typography, Tooltip } from '@mui/material'
import { TrendingUp } from '@mui/icons-material'

interface ClientScoreProps {
  score: number
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean
}

export default function ClientScore({ 
  score, 
  size = 'medium',
  showLabel = true 
}: ClientScoreProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    if (score >= 40) return 'info'
    return 'error'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bom'
    if (score >= 40) return 'Regular'
    if (score >= 20) return 'Baixo'
    return 'Muito Baixo'
  }

  const color = getColor(score)
  const label = getScoreLabel(score)

  const sizeConfig = {
    small: { size: 32, fontSize: '0.75rem', iconSize: 12 },
    medium: { size: 48, fontSize: '0.875rem', iconSize: 16 },
    large: { size: 64, fontSize: '1rem', iconSize: 20 }
  }

  const config = sizeConfig[size]

  return (
    <Tooltip title={`Score do Cliente: ${score}/100 (${label})`}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={score}
            size={config.size}
            thickness={4}
            color={color}
            sx={{
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              component="div"
              sx={{ 
                fontSize: config.fontSize,
                fontWeight: 'bold',
                color: `${color}.main`
              }}
            >
              {score}
            </Typography>
          </Box>
        </Box>
        
        {showLabel && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp sx={{ fontSize: config.iconSize, color: `${color}.main` }} />
            <Typography 
              variant="body2" 
              sx={{ 
                color: `${color}.main`,
                fontWeight: 500
              }}
            >
              {label}
            </Typography>
          </Box>
        )}
      </Box>
    </Tooltip>
  )
}