// components/atoms/Input/Input.tsx
'use client';

import React from 'react'
import { 
  TextField, 
  TextFieldProps,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material'

export interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'outlined' | 'filled' | 'standard'
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  loading?: boolean
}

export const Input: React.FC<InputProps> = ({
  variant = 'outlined',
  startIcon,
  endIcon,
  loading = false,
  ...props
}) => {
  const theme = useTheme()
  
  return (
    <TextField
      {...props}
      variant={variant}
      disabled={props.disabled || loading}
      InputProps={{
        startAdornment: startIcon && (
          <InputAdornment position="start">
            {startIcon}
          </InputAdornment>
        ),
        endAdornment: endIcon && (
          <InputAdornment position="end">
            {endIcon}
          </InputAdornment>
        ),
        ...props.InputProps,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary.main,
            },
          },
          '&.Mui-focused': {
            '& .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: theme.palette.primary.main,
            },
          },
        },
        '& .MuiInputLabel-root': {
          color: theme.palette.text.secondary,
          '&.Mui-focused': {
            color: theme.palette.primary.main,
          },
        },
        ...props.sx,
      }}
    />
  )
}