// components/atoms/Chip/Chip.tsx
import React from 'react'
import { 
  Chip as MuiChip, 
  ChipProps as MuiChipProps,
  useTheme,
  alpha
} from '@mui/material'

export interface ChipProps extends MuiChipProps {
  interactive?: boolean
  pulse?: boolean
}

export const Chip: React.FC<ChipProps> = ({
  interactive = false,
  pulse = false,
  ...props
}) => {
  const theme = useTheme()
  
  return (
    <MuiChip
      {...props}
      sx={{
        transition: 'all 0.2s ease-in-out',
        ...(interactive && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          },
        }),
        ...(pulse && {
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.7)}`,
            },
            '70%': {
              boxShadow: `0 0 0 10px ${alpha(theme.palette.primary.main, 0)}`,
            },
            '100%': {
              boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0)}`,
            },
          },
        }),
        ...props.sx,
      }}
    />
  )
}