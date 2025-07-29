// components/atoms/Button/Button.tsx
'use client';

import React from 'react'
import { 
  Button as MuiButton, 
  ButtonProps as MuiButtonProps,
  CircularProgress,
  useTheme
} from '@mui/material'

export interface ButtonProps extends Omit<MuiButtonProps, 'size'> {
  loading?: boolean
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({ 
  loading = false,
  disabled,
  children,
  size = 'medium',
  ...props 
}) => {
  const theme = useTheme()
  
  return (
    <MuiButton
      {...props}
      size={size}
      disabled={disabled || loading}
      sx={{
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: theme.shadows[4],
        },
        '&:active': {
          transform: 'translateY(0)',
        },
        ...props.sx,
      }}
    >
      {loading && (
        <CircularProgress
          size={20}
          sx={{
            position: 'absolute',
            color: theme.palette.primary.contrastText,
          }}
        />
      )}
      <span style={{ opacity: loading ? 0 : 1 }}>
        {children}
      </span>
    </MuiButton>
  )
}