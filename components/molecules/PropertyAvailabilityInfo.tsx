'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  Block,
  AttachMoney,
  ExpandMore,
  ExpandLess,
  CalendarToday,
  EventBusy,
  TrendingUp,
} from '@mui/icons-material';
import { Property } from '@/lib/types/property';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropertyAvailabilityInfoProps {
  property: Property;
  variant?: 'summary' | 'detailed';
}

export default function PropertyAvailabilityInfo({
  property,
  variant = 'summary'
}: PropertyAvailabilityInfoProps) {
  
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showCustomPricing, setShowCustomPricing] = useState(false);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      if (!isValid(dateObj)) return 'Data inválida';
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  // Process unavailable dates
  const unavailableDates = property.unavailableDates || [];
  const hasUnavailableDates = unavailableDates.length > 0;

  // Process custom pricing
  const customPricing = property.customPricing || {};
  const customPricingEntries = Object.entries(customPricing)
    .filter(([_, price]) => price > 0)
    .map(([dateStr, price]) => ({ date: dateStr, price }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const hasCustomPricing = customPricingEntries.length > 0;

  // Calculate price statistics
  const basePrice = property.basePrice || 0;
  const customPrices = customPricingEntries.map(entry => entry.price);
  const avgCustomPrice = customPrices.length > 0 ? 
    customPrices.reduce((sum, price) => sum + price, 0) / customPrices.length : 0;
  const minCustomPrice = customPrices.length > 0 ? Math.min(...customPrices) : 0;
  const maxCustomPrice = customPrices.length > 0 ? Math.max(...customPrices) : 0;

  if (variant === 'summary') {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Disponibilidade e Preços
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Summary chips */}
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {hasUnavailableDates && (
            <Chip
              icon={<EventBusy />}
              label={`${unavailableDates.length} datas bloqueadas`}
              variant="outlined"
              color="error"
              size="small"
            />
          )}
          
          {hasCustomPricing && (
            <Chip
              icon={<TrendingUp />}
              label={`${customPricingEntries.length} preços customizados`}
              variant="outlined"
              color="warning"
              size="small"
            />
          )}

          {!hasUnavailableDates && !hasCustomPricing && (
            <Chip
              icon={<CalendarToday />}
              label="Configuração padrão"
              variant="outlined"
              color="success"
              size="small"
            />
          )}
        </Box>

        {/* Quick stats */}
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Preço base: {formatCurrency(basePrice)}
          </Typography>
          
          {hasCustomPricing && (
            <Typography variant="body2" color="text.secondary">
              Preço médio customizado: {formatCurrency(avgCustomPrice)}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Detailed variant
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Disponibilidade e Preços Customizados
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Base price info */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <AttachMoney color="primary" />
        <Box>
          <Typography variant="body2" color="text.secondary">
            Preço base por noite
          </Typography>
          <Typography variant="h6" color="primary">
            {formatCurrency(basePrice)}
          </Typography>
        </Box>
      </Box>

      {/* Unavailable dates section */}
      {hasUnavailableDates && (
        <Box mb={3}>
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1} 
            sx={{ cursor: 'pointer' }}
            onClick={() => setShowUnavailable(!showUnavailable)}
          >
            <Block color="error" />
            <Typography variant="subtitle2" fontWeight={600}>
              Datas Bloqueadas ({unavailableDates.length})
            </Typography>
            <IconButton size="small">
              {showUnavailable ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          <Collapse in={showUnavailable}>
            <Box mt={1}>
              <List dense>
                {unavailableDates.slice(0, 10).map((date, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <EventBusy fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={formatDate(date)}
                      secondary="Data indisponível"
                    />
                  </ListItem>
                ))}
                {unavailableDates.length > 10 && (
                  <ListItem sx={{ pl: 0 }}>
                    <ListItemText 
                      primary={`... e mais ${unavailableDates.length - 10} datas`}
                      sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Custom pricing section */}
      {hasCustomPricing ? (
        <Box mb={3}>
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1} 
            sx={{ cursor: 'pointer' }}
            onClick={() => setShowCustomPricing(!showCustomPricing)}
          >
            <TrendingUp color="warning" />
            <Typography variant="subtitle2" fontWeight={600}>
              Preços Customizados ({customPricingEntries.length})
            </Typography>
            <IconButton size="small">
              {showCustomPricing ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          {/* Price statistics */}
          <Box mt={1} mb={2}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip
                label={`Média: ${formatCurrency(avgCustomPrice)}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Mín: ${formatCurrency(minCustomPrice)}`}
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Máx: ${formatCurrency(maxCustomPrice)}`}
                size="small"
                color="error"
                variant="outlined"
              />
            </Box>
          </Box>
          
          <Collapse in={showCustomPricing}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Preço</TableCell>
                    <TableCell align="right">Diferença</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customPricingEntries.slice(0, 10).map((entry, index) => {
                    const difference = entry.price - basePrice;
                    const percentChange = basePrice > 0 ? ((difference / basePrice) * 100) : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {(() => {
                            try {
                              const date = parseISO(entry.date);
                              return format(date, "dd/MM/yyyy - EEE", { locale: ptBR });
                            } catch {
                              return entry.date;
                            }
                          })()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(entry.price)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: difference >= 0 ? 'success.main' : 'error.main',
                            fontWeight: 500
                          }}
                        >
                          {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                          {basePrice > 0 && (
                            <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
                              ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {customPricingEntries.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                        ... e mais {customPricingEntries.length - 10} preços customizados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nenhum preço customizado configurado. Todas as datas usam o preço base de {formatCurrency(basePrice)}.
        </Alert>
      )}

      {!hasUnavailableDates && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Nenhuma data bloqueada. Propriedade disponível para todas as datas.
        </Alert>
      )}
    </Box>
  );
}