// components/molecules/StepperNavigation/StepperNavigation.tsx
import React from 'react'
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material'
import { Typography } from '@/components/atoms'

export interface StepInfo {
  label: string
  description: string
  icon?: React.ReactNode
  optional?: boolean
}

export interface StepperNavigationProps {
  steps: StepInfo[]
  activeStep: number
  completed?: boolean[]
  orientation?: 'horizontal' | 'vertical'
  alternativeLabel?: boolean
}

export const StepperNavigation: React.FC<StepperNavigationProps> = ({
  steps,
  activeStep,
  completed = [],
  orientation = 'horizontal',
  alternativeLabel = true,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const stepperOrientation = isMobile ? 'vertical' : orientation
  
  return (
    <Stepper 
      activeStep={activeStep}
      orientation={stepperOrientation}
      alternativeLabel={alternativeLabel && !isMobile}
      sx={{
        mb: 4,
        '& .MuiStepLabel-root': {
          cursor: 'pointer',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            '& .MuiStepLabel-label': {
              color: theme.palette.primary.main,
            },
          },
        },
        '& .MuiStepIcon-root': {
          transition: 'all 0.3s ease-in-out',
          '&.Mui-active': {
            color: theme.palette.primary.main,
            transform: 'scale(1.2)',
          },
          '&.Mui-completed': {
            color: theme.palette.success.main,
            animation: 'bounce 0.5s ease-in-out',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.2)' },
            },
          },
        },
        '& .MuiStepConnector-line': {
          transition: 'all 0.3s ease-in-out',
          '&.Mui-active': {
            borderColor: theme.palette.primary.main,
            borderWidth: 2,
          },
          '&.Mui-completed': {
            borderColor: theme.palette.success.main,
            borderWidth: 2,
          },
        },
      }}
    >
      {steps.map((step, index) => (
        <Step 
          key={step.label}
          completed={completed[index]}
          sx={{
            '& .MuiStepLabel-labelContainer': {
              maxWidth: alternativeLabel ? '140px' : 'none',
            },
          }}
        >
          <StepLabel
            optional={step.optional && (
              <Typography variant="caption" color="text.secondary">
                Opcional
              </Typography>
            )}
            sx={{
              '& .MuiStepLabel-label': {
                fontWeight: activeStep === index ? 600 : 400,
                color: activeStep === index 
                  ? theme.palette.primary.main 
                  : theme.palette.text.primary,
              },
            }}
          >
            <Box>
              <Typography 
                variant="subtitle2"
                sx={{
                  fontWeight: activeStep === index ? 600 : 500,
                  color: activeStep === index 
                    ? theme.palette.primary.main 
                    : theme.palette.text.primary,
                }}
              >
                {step.label}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  opacity: activeStep === index ? 1 : 0.7,
                }}
              >
                {step.description}
              </Typography>
            </Box>
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  )
}