'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  LocalOffer as DiscountIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import type { Property, PropertyDiscountSettings } from '@/lib/types/property';
import PropertyDiscountDialog from './PropertyDiscountDialog';

interface PropertyDiscountsManagerProps {
  open: boolean;
  onClose: () => void;
  properties: Property[];
  onRefresh?: () => void;
}

export default function PropertyDiscountsManager({
  open,
  onClose,
  properties,
  onRefresh
}: PropertyDiscountsManagerProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEditDiscount = (property: Property) => {
    setSelectedProperty(property);
    setEditDialogOpen(true);
  };

  const handleSaveDiscount = async (settings: PropertyDiscountSettings) => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/properties/${selectedProperty.id}/discount-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações de desconto');
      }

      setSuccess(`Descontos configurados para ${selectedProperty.title}`);
      setEditDialogOpen(false);

      // Refresh property list
      if (onRefresh) {
        onRefresh();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const hasDiscounts = (property: Property): boolean => {
    if (!property.discountSettings) return false;

    const settings = property.discountSettings;
    return (
      settings.pixDiscountPercentage > 0 ||
      settings.cashDiscountPercentage > 0 ||
      settings.cardDiscountPercentage > 0 ||
      settings.weeklyStayDiscountPercentage > 0 ||
      settings.negotiationDiscountPercentage > 0 ||
      settings.lastMinuteDiscountPercentage > 0
    );
  };

  const getDiscountSummary = (property: Property): string => {
    if (!property.discountSettings) return 'Sem descontos';

    const discounts: string[] = [];
    const s = property.discountSettings;

    if (s.pixDiscountPercentage > 0) discounts.push(`PIX ${s.pixDiscountPercentage}%`);
    if (s.cashDiscountPercentage > 0) discounts.push(`Dinheiro ${s.cashDiscountPercentage}%`);
    if (s.cardDiscountPercentage > 0) discounts.push(`Cartão ${s.cardDiscountPercentage}%`);
    if (s.weeklyStayDiscountPercentage > 0) discounts.push(`Semanal ${s.weeklyStayDiscountPercentage}%`);
    if (s.negotiationDiscountPercentage > 0) discounts.push(`Negociação ${s.negotiationDiscountPercentage}%`);
    if (s.lastMinuteDiscountPercentage > 0) discounts.push(`Última Hora ${s.lastMinuteDiscountPercentage}%`);

    return discounts.length > 0 ? discounts.join(' • ') : 'Sem descontos';
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1.5}>
              <DiscountIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  Gerenciar Descontos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Configure descontos para cada propriedade
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {properties.length === 0 ? (
            <Box py={4} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Nenhuma propriedade encontrada
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {properties.map((property, index) => (
                <React.Fragment key={property.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={() => handleEditDiscount(property)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    }
                  >
                    <ListItemButton onClick={() => handleEditDiscount(property)}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={500}>
                              {property.title}
                            </Typography>
                            {hasDiscounts(property) && (
                              <CheckIcon fontSize="small" color="success" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box mt={0.5}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {property.neighborhood}, {property.city}
                            </Typography>
                            <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                              {hasDiscounts(property) ? (
                                <>
                                  {property.discountSettings!.pixDiscountPercentage > 0 && (
                                    <Chip
                                      size="small"
                                      label={`PIX ${property.discountSettings!.pixDiscountPercentage}%`}
                                      color="primary"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  )}
                                  {property.discountSettings!.weeklyStayDiscountPercentage > 0 && (
                                    <Chip
                                      size="small"
                                      label={`Semanal ${property.discountSettings!.weeklyStayDiscountPercentage}%`}
                                      color="success"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  )}
                                  {property.discountSettings!.negotiationDiscountPercentage > 0 && (
                                    <Chip
                                      size="small"
                                      label={`Negociação ${property.discountSettings!.negotiationDiscountPercentage}%`}
                                      color="warning"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  )}
                                </>
                              ) : (
                                <Chip
                                  size="small"
                                  label="Sem descontos"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} variant="outlined">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discount Configuration Dialog */}
      {selectedProperty && (
        <PropertyDiscountDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleSaveDiscount}
          currentSettings={selectedProperty.discountSettings}
          propertyName={selectedProperty.title}
        />
      )}
    </>
  );
}
