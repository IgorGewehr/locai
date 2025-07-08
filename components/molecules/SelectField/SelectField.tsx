// components/molecules/SelectField/SelectField.tsx
import React from 'react'
import { 
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  useTheme,
  alpha
} from '@mui/material'
import { Controller, useFormContext } from 'react-hook-form'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectFieldProps {
  name: string
  label?: string
  helperText?: string
  required?: boolean
  options: SelectOption[]
  placeholder?: string
  showError?: boolean
  multiple?: boolean
}

export const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  helperText,
  required = false,
  options,
  placeholder = 'Selecione...',
  showError = true,
  multiple = false,
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
          <Select
            {...field}
            multiple={multiple}
            displayEmpty
            error={hasError}
            sx={{
              '&.Mui-error': {
                animation: hasError ? 'shake 0.5s ease-in-out' : 'none',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
                  '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
                },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                transition: 'all 0.2s ease-in-out',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
                borderColor: theme.palette.primary.main,
              },
            }}
          >
            {placeholder && (
              <MenuItem value="" disabled>
                <em>{placeholder}</em>
              </MenuItem>
            )}
            {options.map((option) => (
              <MenuItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
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
          {fieldError?.message}
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