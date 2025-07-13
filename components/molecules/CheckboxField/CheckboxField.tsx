// components/molecules/CheckboxField/CheckboxField.tsx
import React from 'react'
import { 
  Box,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Checkbox,
  useTheme,
  alpha
} from '@mui/material'
import { Controller, useFormContext } from 'react-hook-form'

export interface CheckboxFieldProps {
  name: string
  label: string
  helperText?: string
  required?: boolean
  showError?: boolean
  color?: 'primary' | 'secondary' | 'default'
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  helperText,
  required = false,
  showError = true,
  color = 'primary',
}) => {
  const theme = useTheme()
  const { control, formState: { errors } } = useFormContext()
  
  const fieldError = errors[name]
  const hasError = Boolean(fieldError)
  
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                checked={field.value || false}
                color={color}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: color === 'default' 
                      ? theme.palette.action.hover 
                      : alpha(theme.palette[color as 'primary' | 'secondary'].main, 0.1),
                    transform: 'scale(1.1)',
                  },
                  '&.Mui-checked': {
                    animation: 'checkboxPulse 0.3s ease-in-out',
                    '@keyframes checkboxPulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.2)' },
                      '100%': { transform: 'scale(1)' },
                    },
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
              </Box>
            }
            sx={{
              '& .MuiFormControlLabel-label': {
                fontSize: '0.875rem',
                fontWeight: 500,
                color: theme.palette.text.primary,
              },
            }}
          />
        )}
      />
      
      {showError && hasError && (
        <FormHelperText 
          error
          sx={{
            ml: 0,
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
        <FormHelperText sx={{ ml: 0, fontSize: '0.875rem' }}>
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  )
}