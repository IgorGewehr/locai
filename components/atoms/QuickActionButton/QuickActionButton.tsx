// components/atoms/QuickActionButton/QuickActionButton.tsx
import React from 'react'
import { 
  Fab, 
  FabProps, 
  Tooltip, 
  useTheme, 
  alpha,
  Badge
} from '@mui/material'

export interface QuickActionButtonProps extends Omit<FabProps, 'children'> {
  icon: React.ReactNode
  label?: string
  tooltip?: string
  badge?: number | string
  position?: 'fixed' | 'relative'
  corner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  glowing?: boolean
  pulsing?: boolean
  loading?: boolean
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  tooltip,
  badge,
  position = 'fixed',
  corner = 'bottom-right',
  glowing = false,
  pulsing = false,
  loading = false,
  size = 'large',
  color = 'primary',
  ...props
}) => {
  const theme = useTheme()

  const getPositionStyles = () => {
    if (position === 'relative') return {}

    const offset = size === 'small' ? 16 : size === 'medium' ? 20 : 24

    switch (corner) {
      case 'bottom-right':
        return { position: 'fixed', bottom: offset, right: offset }
      case 'bottom-left':
        return { position: 'fixed', bottom: offset, left: offset }
      case 'top-right':
        return { position: 'fixed', top: offset, right: offset }
      case 'top-left':
        return { position: 'fixed', top: offset, left: offset }
      default:
        return { position: 'fixed', bottom: offset, right: offset }
    }
  }

  const getGlowColor = () => {
    switch (color) {
      case 'primary':
        return theme.palette.primary.main
      case 'secondary':
        return theme.palette.secondary.main
      case 'error':
        return theme.palette.error.main
      case 'warning':
        return theme.palette.warning.main
      case 'info':
        return theme.palette.info.main
      case 'success':
        return theme.palette.success.main
      default:
        return theme.palette.primary.main
    }
  }

  const glowColor = getGlowColor()

  const buttonElement = (
    <Badge
      badgeContent={badge}
      color="error"
      overlap="circular"
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '0.75rem',
          height: 20,
          minWidth: 20,
          transform: 'scale(1) translate(50%, -50%)',
        },
      }}
    >
      <Fab
        {...props}
        size={size}
        color={color}
        disabled={loading}
        sx={{
          ...getPositionStyles(),
          zIndex: theme.zIndex.fab,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(glowing && {
            boxShadow: `0 0 20px ${alpha(glowColor, 0.6)}, ${theme.shadows[6]}`,
          }),
          ...(pulsing && {
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': {
                transform: 'scale(1)',
                boxShadow: `0 0 0 0 ${alpha(glowColor, 0.7)}`,
              },
              '70%': {
                transform: 'scale(1.05)',
                boxShadow: `0 0 0 10px ${alpha(glowColor, 0)}`,
              },
              '100%': {
                transform: 'scale(1)',
                boxShadow: `0 0 0 0 ${alpha(glowColor, 0)}`,
              },
            },
          }),
          '&:hover': {
            transform: 'scale(1.1) translateY(-2px)',
            ...(glowing && {
              boxShadow: `0 0 25px ${alpha(glowColor, 0.8)}, ${theme.shadows[8]}`,
            }),
          },
          '&:active': {
            transform: 'scale(1.05) translateY(-1px)',
          },
          ...(loading && {
            pointerEvents: 'none',
            opacity: 0.7,
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
          }),
          ...props.sx,
        }}
      >
        {icon}
      </Fab>
    </Badge>
  )

  if (tooltip) {
    return (
      <Tooltip
        title={tooltip}
        placement={corner.includes('right') ? 'left' : 'right'}
        arrow
      >
        {buttonElement}
      </Tooltip>
    )
  }

  return buttonElement
}