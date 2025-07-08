// components/atoms/Icon/Icon.tsx
import React from 'react'
import { 
  SvgIcon, 
  SvgIconProps,
  useTheme,
  alpha
} from '@mui/material'

export interface IconProps extends SvgIconProps {
  animated?: boolean
  spin?: boolean
  pulse?: boolean
}

export const Icon: React.FC<IconProps> = ({
  animated = false,
  spin = false,
  pulse = false,
  children,
  ...props
}) => {
  const theme = useTheme()
  
  return (
    <SvgIcon
      {...props}
      sx={{
        transition: 'all 0.2s ease-in-out',
        ...(animated && {
          '&:hover': {
            transform: 'scale(1.1)',
            color: theme.palette.primary.main,
          },
        }),
        ...(spin && {
          animation: 'spin 2s linear infinite',
          '@keyframes spin': {
            '0%': {
              transform: 'rotate(0deg)',
            },
            '100%': {
              transform: 'rotate(360deg)',
            },
          },
        }),
        ...(pulse && {
          animation: 'iconPulse 2s infinite',
          '@keyframes iconPulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.5,
            },
          },
        }),
        ...props.sx,
      }}
    >
      {children}
    </SvgIcon>
  )
}