// components/atoms/PaymentMethodIcon/PaymentMethodIcon.tsx
'use client';

import React from 'react'
import { SvgIcon, SvgIconProps, useTheme } from '@mui/material'
import { PaymentMethod, PAYMENT_METHOD_LABELS } from '@/lib/types/reservation'
import {
  CreditCard,
  AccountBalance,
  LocalAtm,
  QrCode,
  Receipt,
  Payment
} from '@mui/icons-material'

export interface PaymentMethodIconProps extends Omit<SvgIconProps, 'children'> {
  method: PaymentMethod
  showTooltip?: boolean
  animated?: boolean
  size?: 'small' | 'medium' | 'large'
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({
  method,
  showTooltip = false,
  animated = false,
  size = 'medium',
  ...props
}) => {
  const theme = useTheme()

  const getIconComponent = () => {
    switch (method) {
      case PaymentMethod.PIX:
        return PixIcon
      case PaymentMethod.CREDIT_CARD:
        return CreditCard
      case PaymentMethod.DEBIT_CARD:
        return CreditCard
      case PaymentMethod.CASH:
        return LocalAtm
      case PaymentMethod.BANK_TRANSFER:
        return AccountBalance
      case PaymentMethod.BANK_SLIP:
        return Receipt
      default:
        return Payment
    }
  }

  const getColor = () => {
    switch (method) {
      case PaymentMethod.PIX:
        return '#00a859' // Verde PIX
      case PaymentMethod.CREDIT_CARD:
        return '#1976d2' // Azul cartão
      case PaymentMethod.DEBIT_CARD:
        return '#2196f3' // Azul claro
      case PaymentMethod.CASH:
        return '#4caf50' // Verde dinheiro
      case PaymentMethod.BANK_TRANSFER:
        return '#ff9800' // Laranja banco
      case PaymentMethod.BANK_SLIP:
        return '#9c27b0' // Roxo boleto
      default:
        return theme.palette.text.secondary
    }
  }

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 16
      case 'large':
        return 32
      default:
        return 24
    }
  }

  const IconComponent = getIconComponent();
  const finalTitleAccess = showTooltip ? PAYMENT_METHOD_LABELS[method] : props.titleAccess;
  
  return (
    <IconComponent
      {...props}
      sx={{
        color: getColor(),
        fontSize: getFontSize(),
        ...(animated && {
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            filter: 'brightness(1.2)',
          },
        }),
        ...props.sx,
      }}
      {...(finalTitleAccess && { titleAccess: finalTitleAccess })}
    />
  )
}

// Ícone customizado do PIX
const PixIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M7.93 12l2.12-2.12c.39-.39 1.02-.39 1.41 0L12 10.41l.54-.53c.39-.39 1.02-.39 1.41 0L16.07 12l-2.12 2.12c-.39.39-1.02.39-1.41 0L12 13.59l-.54.53c-.39.39-1.02.39-1.41 0L7.93 12z"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8.5 8.5L10 10l-1.5 1.5L7 10l1.5-1.5zm7 7L14 17l-1.5-1.5L14 14l1.5 1.5z"/>
  </SvgIcon>
)