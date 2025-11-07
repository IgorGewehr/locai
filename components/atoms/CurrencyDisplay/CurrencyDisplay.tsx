// components/atoms/CurrencyDisplay/CurrencyDisplay.tsx
'use client';

import React from 'react'
import { Typography, TypographyProps, Box, useTheme, alpha } from '@mui/material'
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/financialUtils'

export interface CurrencyDisplayProps extends Omit<TypographyProps, 'children'> {
  amount: number
  currency?: string
  locale?: string
  compact?: boolean
  showTrend?: boolean
  trendValue?: number
  trendLabel?: string
  showSign?: boolean
  animated?: boolean
  precision?: number
  highlight?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'BRL',
  locale = 'pt-BR',
  compact = false,
  showTrend = false,
  trendValue,
  trendLabel,
  showSign = false,
  animated = false,
  precision = 2,
  highlight = false,
  size = 'medium',
  variant,
  color,
  ...props
}) => {
  const theme = useTheme()
  
  const formatAmount = (value: number) => {
    if (compact) {
      return formatCurrencyCompact(value)
    }
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(Math.abs(value))
  }

  const getVariantBySize = () => {
    if (variant) return variant
    
    switch (size) {
      case 'small':
        return 'body2' as const
      case 'large':
        return 'h4' as const
      default:
        return 'h6' as const
    }
  }

  const getColor = () => {
    if (color) return color
    
    if (amount > 0) {
      return 'success.main'
    } else if (amount < 0) {
      return 'error.main'
    }
    return 'text.primary'
  }

  const getTrendIcon = () => {
    if (!showTrend || trendValue === undefined) return null
    
    if (trendValue > 0) {
      return <TrendingUp sx={{ fontSize: 'inherit', color: 'success.main' }} />
    } else if (trendValue < 0) {
      return <TrendingDown sx={{ fontSize: 'inherit', color: 'error.main' }} />
    }
    return <TrendingFlat sx={{ fontSize: 'inherit', color: 'text.secondary' }} />
  }

  const getTrendColor = () => {
    if (trendValue === undefined) return 'text.secondary'
    return trendValue >= 0 ? 'success.main' : 'error.main'
  }

  const displayValue = formatAmount(amount)
  const sign = showSign && amount !== 0 ? (amount > 0 ? '+' : '-') : ''

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        ...(highlight && {
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          borderRadius: 1,
          px: 1,
          py: 0.5,
        }),
        ...(animated && {
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'scale(1.02)',
          },
        }),
      }}
    >
      <Typography
        variant={getVariantBySize()}
        color={getColor()}
        component="span"
        sx={{
          fontWeight: 600,
          fontFamily: 'monospace',
          letterSpacing: '0.02em',
          ...(animated && {
            transition: 'color 0.2s ease-in-out',
          }),
          ...props.sx,
        }}
        {...props}
      >
        {sign}{displayValue}
      </Typography>

      {showTrend && trendValue !== undefined && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            ml: 0.5,
          }}
        >
          {getTrendIcon()}
          <Typography
            variant="caption"
            color={getTrendColor()}
            sx={{
              fontWeight: 500,
              fontSize: size === 'small' ? '0.65rem' : '0.75rem',
            }}
          >
            {Math.abs(Number(trendValue) || 0).toFixed(1)}%
            {trendLabel && ` ${trendLabel}`}
          </Typography>
        </Box>
      )}
    </Box>
  )
}