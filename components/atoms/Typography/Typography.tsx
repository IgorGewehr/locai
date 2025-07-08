// components/atoms/Typography/Typography.tsx
import React from 'react'
import { 
  Typography as MuiTypography, 
  TypographyProps as MuiTypographyProps,
  useTheme
} from '@mui/material'

export interface TypographyProps extends MuiTypographyProps {
  gradient?: boolean
  animate?: boolean
}

export const Typography: React.FC<TypographyProps> = ({
  gradient = false,
  animate = false,
  children,
  ...props
}) => {
  const theme = useTheme()
  
  return (
    <MuiTypography
      {...props}
      sx={{
        ...(gradient && {
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }),
        ...(animate && {
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        }),
        ...props.sx,
      }}
    >
      {children}
    </MuiTypography>
  )
}