'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Fade,
  Grid,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Snackbar,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import {
  Save,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Home,
  AttachMoney,
  Star,
  Image,
  Settings,
  CloudSync,
  CloudDone,
  History,
  Edit,
  Visibility,
  RestoreFromTrash,
  CheckCircleOutline,
  RadioButtonUnchecked,
  ExpandMore,
  ExpandLess,
  Refresh,
} from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';
import { Property } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';
import { propertySchema } from '@/lib/validation/propertySchema';
import { debounce } from 'lodash';

// Optimized components with performance improvements
import { PropertyBasicInfo } from '@/components/organisms/PropertyEdit/BasicInfo';
import { PropertySpecs } from '@/components/organisms/PropertyEdit/Specs';
import { PropertyAmenities } from '@/components/organisms/PropertyEdit/Amenities';
import { PropertyPricing } from '@/components/organisms/PropertyEdit/Pricing';
import { PropertyMedia } from '@/components/organisms/PropertyEdit/Media';

interface PropertySection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  fields: (keyof Property)[];
  isRequired: boolean;
}

const propertySections: PropertySection[] = [
  {
    id: 'basic',
    title: 'Informações Básicas',
    description: 'Título, descrição, localização e categoria',
    icon: <Home />,
    component: <PropertyBasicInfo />,
    fields: ['title', 'description', 'address', 'category', 'neighborhood', 'city'],
    isRequired: true,
  },
  {
    id: 'specs',
    title: 'Especificações',
    description: 'Quartos, banheiros, capacidade e comodidades',
    icon: <Settings />,
    component: <PropertySpecs />,
    fields: ['bedrooms', 'bathrooms', 'maxGuests', 'capacity'],
    isRequired: true,
  },
  {
    id: 'pricing',
    title: 'Preços e Políticas',
    description: 'Valores, taxas e políticas de pagamento',
    icon: <AttachMoney />,
    component: <PropertyPricing />,
    fields: ['basePrice', 'pricePerExtraGuest', 'cleaningFee', 'minimumNights'],
    isRequired: true,
  },
  {
    id: 'amenities',
    title: 'Comodidades',
    description: 'Facilidades e recursos especiais',
    icon: <Star />,
    component: <PropertyAmenities />,
    fields: ['amenities', 'isFeatured', 'allowsPets'],
    isRequired: false,
  },
  {
    id: 'media',
    title: 'Fotos e Vídeos',
    description: 'Galeria de imagens e vídeos do imóvel',
    icon: <Image />,
    component: <PropertyMedia />,
    fields: ['photos', 'videos'],
    isRequired: false,
  },
];

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;
  const { services, tenantId, isReady } = useTenant();
  const theme = useTheme();

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [originalData, setOriginalData] = useState<Property | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState<Array<{ timestamp: Date; type: 'manual' | 'auto' }>>([]);

  // Form setup with optimized validation
  const methods = useForm<Property>({
    resolver: yupResolver(propertySchema) as any,
    mode: 'onChange',
    shouldUnregister: false,
    shouldFocusError: true,
    defaultValues: {
      paymentMethodSurcharges: {
        [PaymentMethod.PIX]: 0,
        [PaymentMethod.CREDIT_CARD]: 0,
        [PaymentMethod.DEBIT_CARD]: 0,
        [PaymentMethod.CASH]: 0,
        [PaymentMethod.BANK_TRANSFER]: 0,
        [PaymentMethod.BANK_SLIP]: 0,
        [PaymentMethod.STRIPE]: 0,
      },
    },
  });

  const { handleSubmit, reset, watch, formState: { errors, isDirty, isValid, dirtyFields } } = methods;
  const watchedValues = watch();

  // Section completion calculation
  const sectionCompletions = useMemo(() => {
    const completions: Record<string, { completed: number; total: number; percentage: number }> = {};

    propertySections.forEach(section => {
      let completed = 0;
      const total = section.fields.length;

      section.fields.forEach(field => {
        const value = watchedValues[field];
        if (value !== undefined && value !== null && value !== '' && 
            (!Array.isArray(value) || value.length > 0)) {
          completed++;
        }
      });

      completions[section.id] = {
        completed,
        total,
        percentage: Math.round((completed / total) * 100)
      };
    });

    return completions;
  }, [watchedValues]);

  // Error tracking per section
  const sectionErrors = useMemo(() => {
    const errorCount: Record<string, number> = {};

    propertySections.forEach(section => {
      let count = 0;
      section.fields.forEach(field => {
        if (errors[field]) count++;
      });
      errorCount[section.id] = count;
    });

    return errorCount;
  }, [errors]);

  // Load property data with enhanced error handling
  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId || !services || !isReady) return;

      logger.info('Loading property for editing', { propertyId, tenantId });
      setLoading(true);
      setError(null);

      try {
        const property = await services.properties.get(propertyId);

        if (!property) {
          throw new Error('Propriedade não encontrada');
        }

        // Ensure all required fields have proper defaults
        const propertyData: Property = {
          ...property,
          amenities: property.amenities || [],
          photos: property.photos || [],
          videos: property.videos || [],
          paymentMethodSurcharges: {
            [PaymentMethod.PIX]: 0,
            [PaymentMethod.CREDIT_CARD]: 0,
            [PaymentMethod.DEBIT_CARD]: 0,
            [PaymentMethod.CASH]: 0,
            [PaymentMethod.BANK_TRANSFER]: 0,
            [PaymentMethod.BANK_SLIP]: 0,
            [PaymentMethod.STRIPE]: 0,
            ...property.paymentMethodSurcharges,
          },
        };

        logger.info('Property loaded successfully', {
          propertyId,
          title: propertyData.title,
          sections: propertySections.map(s => s.id)
        });

        setOriginalData(propertyData);
        reset(propertyData);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar propriedade';
        logger.error('Error loading property', { propertyId, error: errorMessage });
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadProperty();
  }, [propertyId, services, isReady, reset, tenantId]);

  // Smart auto-save with improved logic
  const autoSave = useCallback(
    debounce(async (data: Property) => {
      if (!autoSaveEnabled || !isDirty || !isValid || saving || !propertyId) return;

      setAutoSaving(true);
      logger.info('Auto-saving property changes', { propertyId, fields: Object.keys(dirtyFields) });

      try {
        const response = await fetch(`/api/properties/${propertyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            updatedAt: new Date(),
            tenantId,
          }),
        });

        if (response.ok) {
          const timestamp = new Date();
          setLastSaved(timestamp);
          setSaveHistory(prev => [...prev.slice(-4), { timestamp, type: 'auto' }]);
          setAutoSaving(false);
          logger.info('Property auto-saved successfully', { propertyId });
        } else {
          throw new Error(`Auto-save failed: ${response.status}`);
        }
      } catch (err) {
        logger.error('Auto-save failed', {
          propertyId,
          error: err instanceof Error ? err.message : String(err)
        });
        setAutoSaving(false);
        // Don't show error to user for auto-save failures
      }
    }, 2000), // Reduced debounce time
    [propertyId, isDirty, isValid, saving, autoSaveEnabled, dirtyFields, tenantId]
  );

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (isDirty && isValid && !loading && autoSaveEnabled) {
      autoSave(watchedValues as Property);
    }
  }, [watchedValues, isDirty, isValid, loading, autoSave, autoSaveEnabled]);

  // Manual save with comprehensive error handling
  const handleSave = useCallback(async (data: Property) => {
    if (!propertyId) return;

    setSaving(true);
    setError(null);

    logger.info('Manual property save initiated', { propertyId, isDirty, isValid });

    try {
      // Validate critical fields
      if (!data.title || !data.description || !data.basePrice) {
        throw new Error('Título, descrição e preço base são obrigatórios');
      }

      const processedData = {
        ...data,
        updatedAt: new Date(),
        tenantId,
        // Generate location field for search
        location: [
          data.address,
          data.neighborhood,
          data.city,
          data.title,
          data.description
        ]
          .filter(Boolean)
          .map(part => part?.trim().toLowerCase())
          .filter(part => part && part.length > 0)
          .join(' '),
      };

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao salvar: ${response.status} - ${errorText}`);
      }

      const timestamp = new Date();
      setSuccess('Propriedade salva com sucesso!');
      setLastSaved(timestamp);
      setSaveHistory(prev => [...prev.slice(-4), { timestamp, type: 'manual' }]);

      // Reset form dirty state
      reset(processedData as Property);

      logger.info('Property saved successfully', { propertyId });

      // Auto-redirect after success
      setTimeout(() => {
        router.push('/dashboard/properties');
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao salvar';
      logger.error('Property save failed', { propertyId, error: errorMessage });
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [propertyId, tenantId, reset, router]);

  // Section management
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Navigation with unsaved changes protection
  const handleExit = useCallback(() => {
    if (isDirty && autoSaveEnabled) {
      // If auto-save is enabled, just warn about recent changes
      setShowExitDialog(true);
    } else if (isDirty) {
      setShowExitDialog(true);
    } else {
      router.push('/dashboard/properties');
    }
  }, [isDirty, autoSaveEnabled, router]);

  const confirmExit = () => {
    logger.info('User exiting property edit', { propertyId, unsavedChanges: isDirty });
    router.push('/dashboard/properties');
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Box>
      </Container>
    );
  }

  // Error state
  if (error && !originalData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => router.push('/dashboard/properties')}>
              Voltar
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <FormProvider {...methods}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Enhanced Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h4" fontWeight="bold">
                  Editar Propriedade
                </Typography>
                <Chip
                  size="small"
                  label={watchedValues.isActive ? 'Ativa' : 'Inativa'}
                  color={watchedValues.isActive ? 'success' : 'default'}
                  icon={watchedValues.isActive ? <CheckCircle /> : <ErrorIcon />}
                />
                {isDirty && (
                  <Chip
                    size="small"
                    label="Alterações não salvas"
                    color="warning"
                    icon={<Warning />}
                  />
                )}
              </Box>

              <Typography variant="h6" color="text.secondary" gutterBottom>
                {watchedValues.title || 'Propriedade sem título'}
              </Typography>

              {/* Status indicators */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {lastSaved && (
                  <Chip
                    size="small"
                    label={`Salvo às ${lastSaved.toLocaleTimeString('pt-BR')}`}
                    color="info"
                    icon={<CloudDone />}
                    variant="outlined"
                  />
                )}
                {autoSaving && (
                  <Chip
                    size="small"
                    label="Salvando automaticamente..."
                    color="info"
                    icon={<CloudSync />}
                  />
                )}
              </Box>
            </Grid>

            <Grid item>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Auto-save"
                  sx={{ mr: 2 }}
                />
                <Tooltip title="Descartar alterações">
                  <IconButton onClick={handleExit} disabled={saving}>
                    <Close />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleSubmit(handleSave)}
                  disabled={saving || (!isDirty && !autoSaving)}
                  sx={{
                    minWidth: 160,
                    position: 'relative'
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Overall progress */}
          {Object.keys(sectionCompletions).length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Progresso geral
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(
                    Object.values(sectionCompletions).reduce((acc, curr) => acc + curr.percentage, 0) /
                    Object.values(sectionCompletions).length
                  )}% completo
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={
                  Object.values(sectionCompletions).reduce((acc, curr) => acc + curr.percentage, 0) /
                  Object.values(sectionCompletions).length
                }
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                }}
              />
            </Box>
          )}
        </Paper>

        {/* Error/Success messages */}
        <Collapse in={!!error}>
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
            action={
              <Button color="inherit" size="small" onClick={() => setError(null)}>
                <Refresh />
              </Button>
            }
          >
            {error}
          </Alert>
        </Collapse>

        <Collapse in={!!success}>
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Collapse>

        {/* Modern section-based editing */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {propertySections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const completion = sectionCompletions[section.id];
            const hasErrors = sectionErrors[section.id] > 0;

            return (
              <Card
                key={section.id}
                elevation={0}
                sx={{
                  border: `1px solid ${hasErrors 
                    ? alpha(theme.palette.error.main, 0.3)
                    : alpha(theme.palette.divider, 0.1)
                  }`,
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: theme.shadows[2],
                  },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleSection(section.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          backgroundColor: hasErrors
                            ? alpha(theme.palette.error.main, 0.1)
                            : alpha(theme.palette.primary.main, 0.1),
                          color: hasErrors ? theme.palette.error.main : theme.palette.primary.main,
                        }}
                      >
                        {section.icon}
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" fontWeight={600}>
                            {section.title}
                          </Typography>
                          {section.isRequired && (
                            <Chip size="small" label="Obrigatório" color="primary" />
                          )}
                          {hasErrors && (
                            <Chip
                              size="small"
                              label={`${sectionErrors[section.id]} erro${sectionErrors[section.id] > 1 ? 's' : ''}`}
                              color="error"
                              icon={<ErrorIcon />}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {section.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {completion && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {completion.completed}/{completion.total}
                          </Typography>
                          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            <CircularProgress
                              variant="determinate"
                              value={completion.percentage}
                              size={20}
                              thickness={5}
                            />
                            {completion.percentage === 100 && (
                              <CheckCircle
                                sx={{
                                  color: 'success.main',
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  fontSize: 16,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                      <IconButton size="small">
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Divider />
                  <CardContent sx={{ pt: 3 }}>
                    <Fade in={isExpanded}>
                      <Box>{section.component}</Box>
                    </Fade>
                  </CardContent>
                </Collapse>
              </Card>
            );
          })}
        </Box>

        {/* Save history (optional debug info) */}
        {saveHistory.length > 0 && (
          <Card elevation={0} sx={{ mt: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                <History fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Histórico de salvamentos
              </Typography>
              <List dense>
                {saveHistory.slice(-3).map((save, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {save.type === 'auto' ? <CloudSync fontSize="small" /> : <Save fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${save.type === 'auto' ? 'Automático' : 'Manual'}`}
                      secondary={save.timestamp.toLocaleString('pt-BR')}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Exit confirmation dialog */}
        <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" />
              {autoSaveEnabled ? 'Alterações podem não estar salvas' : 'Alterações não salvas'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              {autoSaveEnabled 
                ? 'Suas alterações mais recentes podem não ter sido salvas automaticamente ainda. Deseja sair mesmo assim?'
                : 'Você tem alterações não salvas. Deseja realmente sair sem salvar?'
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowExitDialog(false)}>
              Continuar Editando
            </Button>
            <Button onClick={confirmExit} color="error" variant="contained">
              Sair
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success notification */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </FormProvider>
  );
}