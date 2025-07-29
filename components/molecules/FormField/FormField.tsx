// components/molecules/FormField/FormField.tsx
'use client';

import React from 'react'
import { 
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  useTheme,
  alpha
} from '@mui/material'
import { Controller, useFormContext } from 'react-hook-form'
import { Input, InputProps } from '@/components/atoms'

export interface FormFieldProps extends Omit<InputProps, 'name'> {
  name: string
  label?: string
  helperText?: string
  required?: boolean
  showError?: boolean
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  helperText,
  required = false,
  showError = true,
  ...inputProps
}) => {
  const theme = useTheme()
  const { control, formState: { errors } } = useFormContext()
  
  const fieldError = errors[name]
  const hasError = Boolean(fieldError)
  
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      {label && (
        <FormLabel 
          sx={{ 
            mb: 1,
            color: theme.palette.text.primary,
            fontWeight: 500,
            '&.Mui-focused': {
              color: theme.palette.primary.main,
            },
          }}
        >
          {label}
          {required && (
            <Box 
              component="span" 
              sx={{ 
                color: theme.palette.error.main,
                ml: 0.5 
              }}
            >
              *
            </Box>
          )}
        </FormLabel>
      )}
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            {...inputProps}
            error={hasError}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-error': {
                  animation: hasError ? 'shake 0.5s ease-in-out' : 'none',
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
                  },
                },
              },
              ...inputProps.sx,
            }}
          />
        )}
      />
      
      {showError && hasError && (
        <FormHelperText 
          error
          sx={{
            mt: 1,
            fontSize: '0.875rem',
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0, transform: 'translateY(-10px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {(typeof fieldError === 'object' && 'message' in fieldError ? fieldError.message : '') as React.ReactNode}
        </FormHelperText>
      )}
      
      {helperText && !hasError && (
        <FormHelperText sx={{ mt: 1, fontSize: '0.875rem' }}>
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  )
}