// components/atoms/OccupancyIndicator/OccupancyIndicator.tsx
import React from 'react'
import { 
  Box, 
  Typography, 
  LinearProgress, 
  useTheme,
  alpha,
  Tooltip
} from '@mui/material'
import { Home, Hotel, Group } from '@mui/icons-material'

export interface OccupancyIndicatorProps {
  current: number
  total: number
  type?: 'properties' | 'rooms' | 'guests'
  size?: 'small' | 'medium' | 'large'
  showPercentage?: boolean
  showNumbers?: boolean
  showIcon?: boolean
  animated?: boolean
  colorThresholds?: {
    low: number // 0-30%
    medium: number // 31-70%
    high: number // 71-100%
  }
  orientation?: 'horizontal' | 'vertical'
}

export const OccupancyIndicator: React.FC<OccupancyIndicatorProps> = ({
  current,
  total,
  type = 'properties',
  size = 'medium',
  showPercentage = true,
  showNumbers = true,
  showIcon = true,
  animated = true,
  colorThresholds = { low: 30, medium: 70, high: 100 },
  orientation = 'horizontal',
}) => {
  const theme = useTheme()
  
  const percentage = total > 0 ? (current / total) * 100 : 0
  const safePercentage = Math.min(Math.max(percentage, 0), 100)

  const getColor = () => {
    if (safePercentage <= colorThresholds.low) {
      return theme.palette.error.main
    } else if (safePercentage <= colorThresholds.medium) {
      return theme.palette.warning.main
    } else {
      return theme.palette.success.main
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'rooms':
        return <Hotel />
      case 'guests':
        return <Group />
      default:
        return <Home />
    }
  }

  const getLabel = () => {
    switch (type) {
      case 'rooms':
        return 'quartos'
      case 'guests':
        return 'hóspedes'
      default:
        return 'imóveis'
    }
  }

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          height: 6,
          fontSize: '0.75rem',
          iconSize: 16,
          spacing: 1,
        }
      case 'large':
        return {
          height: 12,
          fontSize: '1.25rem',
          iconSize: 32,
          spacing: 2,
        }
      default:
        return {
          height: 8,
          fontSize: '1rem',
          iconSize: 24,
          spacing: 1.5,
        }
    }
  }

  const sizeConfig = getSizeConfig()
  const color = getColor()

  if (orientation === 'vertical') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: sizeConfig.spacing,
        }}
      >
        {showIcon && (
          <Box sx={{ color, fontSize: sizeConfig.iconSize }}>
            {getIcon()}
          </Box>
        )}

        <Box
          sx={{
            width: sizeConfig.height * 3,
            height: 100,
            backgroundColor: alpha(color, 0.2),
            borderRadius: sizeConfig.height / 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${safePercentage}%`,
              backgroundColor: color,
              borderRadius: sizeConfig.height / 2,
              ...(animated && {
                transition: 'height 0.8s ease-in-out',
              }),
            }}
          />
        </Box>

        {(showPercentage || showNumbers) && (
          <Box sx={{ textAlign: 'center' }}>
            {showPercentage && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: sizeConfig.fontSize,
                  fontWeight: 600,
                  color,
                }}
              >
                {safePercentage.toFixed(0)}%
              </Typography>
            )}
            {showNumbers && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: sizeConfig.fontSize * 0.8,
                  display: 'block',
                }}
              >
                {current}/{total}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Tooltip 
      title={`${current} de ${total} ${getLabel()} ocupados (${safePercentage.toFixed(1)}%)`}
      arrow
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: sizeConfig.spacing,
          cursor: 'default',
        }}
      >
        {showIcon && (
          <Box sx={{ color, fontSize: sizeConfig.iconSize }}>
            {getIcon()}
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 100 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            {showNumbers && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: sizeConfig.fontSize * 0.9,
                  fontWeight: 500,
                }}
              >
                {current}/{total}
              </Typography>
            )}
            {showPercentage && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: sizeConfig.fontSize * 0.9,
                  fontWeight: 600,
                  color,
                }}
              >
                {safePercentage.toFixed(0)}%
              </Typography>
            )}
          </Box>

          <LinearProgress
            variant="determinate"
            value={safePercentage}
            sx={{
              height: sizeConfig.height,
              borderRadius: sizeConfig.height / 2,
              backgroundColor: alpha(color, 0.2),
              '& .MuiLinearProgress-bar': {
                backgroundColor: color,
                borderRadius: sizeConfig.height / 2,
                ...(animated && {
                  transition: 'transform 0.8s ease-in-out',
                }),
              },
            }}
          />
        </Box>
      </Box>
    </Tooltip>
  )
}