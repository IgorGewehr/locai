'use client';

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { AttachMoney, CalendarToday, TrendingUp } from '@mui/icons-material';
import { Property } from '@/lib/types/property';
import { format, addDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

interface PropertyPriceDisplayProps {
  property: Property;
  variant?: 'compact' | 'detailed';
  showCustomPricing?: boolean;
}

export default function PropertyPriceDisplay({ 
  property, 
  variant = 'compact',
  showCustomPricing = true 
}: PropertyPriceDisplayProps) {
  
  // Calculate average price considering custom pricing
  const calculateAveragePrice = (): { average: number; hasCustomPricing: boolean; customPriceCount: number } => {
    if (!property.customPricing || Object.keys(property.customPricing).length === 0) {
      return {
        average: property.basePrice || 0,
        hasCustomPricing: false,
        customPriceCount: 0
      };
    }

    const customPrices = Object.values(property.customPricing);
    const basePrice = property.basePrice || 0;
    
    if (customPrices.length === 0) {
      return {
        average: basePrice,
        hasCustomPricing: false,
        customPriceCount: 0
      };
    }

    // Calculate weighted average considering both base price and custom prices
    // For simplicity, we'll show the average of custom prices when they exist
    const total = customPrices.reduce((sum, price) => sum + price, 0);
    const average = total / customPrices.length;

    return {
      average,
      hasCustomPricing: true,
      customPriceCount: customPrices.length
    };
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const priceInfo = calculateAveragePrice();

  if (variant === 'compact') {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <AttachMoney fontSize="small" color="success" />
        {priceInfo.hasCustomPricing ? (
          <Tooltip 
            title={`Preço base: ${formatCurrency(property.basePrice || 0)} | ${priceInfo.customPriceCount} preços customizados`}
            arrow
          >
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="body2" fontWeight={700} color="success.main">
                {formatCurrency(priceInfo.average)}
              </Typography>
              <TrendingUp fontSize="small" color="warning" sx={{ fontSize: 14 }} />
            </Box>
          </Tooltip>
        ) : (
          <Typography variant="body2" fontWeight={700} color="success.main">
            {formatCurrency(priceInfo.average)}
          </Typography>
        )}
      </Box>
    );
  }

  // Detailed variant
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <AttachMoney color="primary" />
        <Box>
          <Typography variant="body2" color="text.secondary">
            {priceInfo.hasCustomPricing ? 'Preço médio por noite' : 'Preço base por noite'}
          </Typography>
          <Typography variant="h5" color="primary">
            {formatCurrency(priceInfo.average)}
          </Typography>
        </Box>
      </Box>

      {priceInfo.hasCustomPricing && showCustomPricing && (
        <Box mb={2}>
          <Chip
            icon={<CalendarToday />}
            label={`${priceInfo.customPriceCount} datas com preços customizados`}
            variant="outlined"
            size="small"
            color="warning"
          />
        </Box>
      )}

      {property.basePrice !== priceInfo.average && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Preço base: {formatCurrency(property.basePrice || 0)}
        </Typography>
      )}
    </Box>
  );
}