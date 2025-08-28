'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge,
  useTheme,
  alpha,
  Fade,
  Zoom,
  Grid,
} from '@mui/material';
import {
  Save,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info as InfoIcon,
  Home,
  AttachMoney,
  Star,
  Image,
  CalendarMonth,
  Settings,
  AutorenewOutlined,
  CloudDone,
  CloudUpload,
  History,
  Check,
} from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';
import { Property, PropertyCategory } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';
import { propertySchema } from '@/lib/validation/propertySchema';
import { usePropertyValidation } from '@/hooks/usePropertyValidation';
import { validateBeforeSave } from '@/lib/validation/property-validation-v2';
import { debounce } from 'lodash';

// Components for each tab
import { PropertyBasicInfo } from '@/components/organisms/PropertyEdit/BasicInfo';
import { PropertySpecs } from '@/components/organisms/PropertyEdit/Specs';
import { PropertyAmenities } from '@/components/organisms/PropertyEdit/Amenities';
import { PropertyPricing } from '@/components/organisms/PropertyEdit/Pricing';
import { PropertyMedia } from '@/components/organisms/PropertyEdit/Media';
import { PropertyAvailability } from '@/components/organisms/PropertyEdit/Availability';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  fields: (keyof Property)[];
  required?: boolean;
}

const tabsConfig: TabConfig[] = [
  {
    id: 'basic',
    label: 'Informações',
    icon: <Home />,
    component: <PropertyBasicInfo />,
    fields: ['title', 'description', 'address', 'category'],
    required: true,
  },
  {
    id: 'specs',
    label: 'Especificações',
    icon: <Settings />,
    component: <PropertySpecs />,
    fields: ['bedrooms', 'bathrooms', 'maxGuests'],
    required: true,
  },
  {
    id: 'pricing',
    label: 'Preços',
    icon: <AttachMoney />,
    component: <PropertyPricing />,
    fields: ['basePrice', 'pricePerExtraGuest', 'cleaningFee', 'minimumNights'],
    required: true,
  },
  {
    id: 'amenities',
    label: 'Comodidades',
    icon: <Star />,
    component: <PropertyAmenities />,
    fields: ['amenities', 'isFeatured', 'allowsPets'],
  },
  {
    id: 'media',
    label: 'Mídia',
    icon: <Image />,
    component: <PropertyMedia />,
    fields: ['photos', 'videos'],
  },
  {
    id: 'availability',
    label: 'Disponibilidade',
    icon: <CalendarMonth />,
    component: <PropertyAvailability />,
    fields: ['isActive', 'unavailableDates'],
  },
];

// Enhanced validation with specific field schemas
const createFieldSchema = (fields: (keyof Property)[]) => {
  const schemaFields: any = {};
  fields.forEach(field => {
    if (propertySchema.fields[field as any]) {
      schemaFields[field] = propertySchema.fields[field as any];
    }
  });
  return yup.object(schemaFields);
};

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;
  const { services, tenantId, isReady } = useTenant();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabErrors, setTabErrors] = useState<Record<string, number>>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [originalData, setOriginalData] = useState<Property | null>(null);

  const methods = useForm<Property>({
    resolver: yupResolver(propertySchema) as any,
    mode: 'onChange',
  });

  const { handleSubmit, reset, watch, formState: { errors, isDirty, isValid } } = methods;

  // Enhanced validation hook
  const { 
    validateProperty, 
    validationResult, 
    getFieldErrors, 
    hasFieldError,
    isValidating: validatingCustom
  } = usePropertyValidation({
    strict: false,
    autoFix: true,
    realTimeValidation: true,
  });

  // Watch all form values for changes
  const watchedValues = watch();

  // Calculate tab errors
  useEffect(() => {
    const newTabErrors: Record<string, number> = {};
    
    tabsConfig.forEach(tab => {
      let errorCount = 0;
      tab.fields.forEach(field => {
        if (errors[field]) {
          errorCount++;
        }
      });
      if (errorCount > 0) {
        newTabErrors[tab.id] = errorCount;
      }
    });
    
    setTabErrors(newTabErrors);
    
    // Log validation state for debugging
    if (Object.keys(errors).length > 0) {
      logger.warn('Property form validation errors', { 
        propertyId, 
        errors: Object.keys(errors).map(key => ({
          field: key,
          message: errors[key as keyof Property]?.message
        }))
      });
    }
  }, [errors, propertyId]);

  // Load property data
  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId || !services || !isReady) return;
      
      logger.info('Loading property for editing', { propertyId, tenantId });
      
      try {
        const property = await services.properties.get(propertyId);
        
        if (!property) {
          logger.error('Property not found', { propertyId });
          setError('Propriedade não encontrada');
          setLoading(false);
          return;
        }

        // Convert dates and ensure all fields have proper defaults
        const propertyData = {
          ...property,
          amenities: property.amenities || [],
          photos: property.photos || [],
          videos: property.videos || [],
          unavailableDates: (property as any).unavailableDates?.map((date: any) => 
            date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date)
          ) || [],
          paymentMethodSurcharges: property.paymentMethodSurcharges || {
            [PaymentMethod.PIX]: 0,
            [PaymentMethod.CREDIT_CARD]: 0,
            [PaymentMethod.DEBIT_CARD]: 0,
            [PaymentMethod.CASH]: 0,
            [PaymentMethod.BANK_TRANSFER]: 0,
            [PaymentMethod.BANK_SLIP]: 0,
            [PaymentMethod.STRIPE]: 0,
          },
        };
        
        logger.info('Property loaded successfully', { 
          propertyId, 
          title: propertyData.title,
          hasPhotos: propertyData.photos.length > 0,
          photosCount: propertyData.photos.length
        });
        
        setOriginalData(propertyData as Property);
        reset(propertyData as Property);
        setLoading(false);
      } catch (err) {
        logger.error('Error loading property', { 
          propertyId, 
          error: err instanceof Error ? err.message : String(err) 
        });
        setError('Erro ao carregar propriedade');
        setLoading(false);
      }
    };

    loadProperty();
  }, [propertyId, services, isReady, reset, tenantId]);

  // Auto-save functionality with debounce
  const autoSave = useCallback(
    debounce(async (data: Property) => {
      if (!isDirty || !isValid || saving) return;
      
      setAutoSaving(true);
      logger.info('Auto-saving property changes', { propertyId, title: data.title });
      
      try {
        const response = await ApiClient.put(`/api/properties/${propertyId}`, {
          ...data,
          updatedAt: new Date(),
        });
        
        if (response.ok) {
          setLastSaved(new Date());
          setAutoSaving(false);
          logger.info('Property auto-saved successfully', { propertyId });
        }
      } catch (err) {
        logger.error('Auto-save failed', { 
          propertyId, 
          error: err instanceof Error ? err.message : String(err) 
        });
        setAutoSaving(false);
      }
    }, 3000),
    [propertyId, isDirty, isValid, saving]
  );

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (isDirty && isValid && !loading) {
      autoSave(watchedValues as Property);
    }
  }, [watchedValues, isDirty, isValid, loading, autoSave]);

  // Main save function with enhanced validation
  const onSubmit = async (data: Property) => {
    logger.info('Starting property save with enhanced validation', { 
      propertyId, 
      title: data.title,
      isDirty,
      isValid 
    });
    
    setSaving(true);
    setError(null);

    try {
      // Enhanced validation and sanitization
      const { isValid: customValid, sanitizedProperty, validationResult } = await validateBeforeSave(data);
      
      if (!customValid && validationResult.errors) {
        const errorMessages = Object.values(validationResult.errors)
          .flat()
          .join(', ');
        throw new Error(`Validação falhou: ${errorMessages}`);
      }

      // Additional processing
      const processedData = {
        ...sanitizedProperty,
        // Ensure Firebase storage URLs only
        photos: (sanitizedProperty.photos || []).filter(p => 
          p && typeof p === 'string' && p.includes('firebasestorage')
        ),
        videos: (sanitizedProperty.videos || []).filter(v => 
          v && typeof v === 'string' && v.includes('firebasestorage')
        ),
        // Metadata
        updatedAt: new Date(),
        tenantId,
      };

      logger.info('Submitting enhanced validated property update', { 
        propertyId,
        hasPhotos: processedData.photos.length > 0,
        photosCount: processedData.photos.length,
        amenitiesCount: processedData.amenities?.length || 0,
        fixedIssues: validationResult.fixedIssues.length,
        warningsCount: Object.keys(validationResult.warnings).length,
      });

      const response = await ApiClient.put(`/api/properties/${propertyId}`, processedData);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Erro ao salvar propriedade');
      }

      logger.info('Property updated successfully with enhanced validation', { 
        propertyId, 
        title: data.title,
        appliedFixes: validationResult.fixedIssues
      });
      
      // Show fixes applied if any
      if (validationResult.fixedIssues.length > 0) {
        setSuccess(`Propriedade atualizada com sucesso! ${validationResult.fixedIssues.length} correção(ões) aplicada(s) automaticamente.`);
      } else {
        setSuccess('Propriedade atualizada com sucesso!');
      }
      
      setLastSaved(new Date());
      reset(processedData as Property);
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard/properties');
      }, 2000);
    } catch (err) {
      logger.error('Enhanced property save failed', { 
        propertyId,
        error: err instanceof Error ? err.message : String(err) 
      });
      setError(err instanceof Error ? err.message : 'Erro ao salvar propriedade');
    } finally {
      setSaving(false);
    }
  };

  // Handle tab change with validation
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    logger.debug('Tab change', { from: activeTab, to: newValue });
    setActiveTab(newValue);
  };

  // Calculate completion percentage
  const getCompletionPercentage = useMemo(() => {
    const totalFields = tabsConfig.reduce((acc, tab) => acc + tab.fields.length, 0);
    let completedFields = 0;
    
    tabsConfig.forEach(tab => {
      tab.fields.forEach(field => {
        const value = watchedValues[field];
        if (value !== undefined && value !== null && value !== '' && 
            (!Array.isArray(value) || value.length > 0)) {
          completedFields++;
        }
      });
    });
    
    return Math.round((completedFields / totalFields) * 100);
  }, [watchedValues]);

  // Handle navigation away
  const handleExit = () => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      router.push('/dashboard/properties');
    }
  };

  const confirmExit = () => {
    logger.info('User exiting without saving', { propertyId, isDirty });
    setShowExitDialog(false);
    router.push('/dashboard/properties');
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '50vh', 
        gap: 2 
      }}>
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Carregando propriedade...
        </Typography>
      </Box>
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
        {/* Header */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          }}
        >
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Editar Propriedade
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h6" color="text.secondary">
                  {watchedValues.title || 'Sem título'}
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
                {lastSaved && (
                  <Chip
                    size="small"
                    label={`Salvo às ${lastSaved.toLocaleTimeString('pt-BR')}`}
                    color="info"
                    icon={<CloudDone />}
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Descartar alterações">
                  <IconButton onClick={handleExit} disabled={saving}>
                    <Close />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleSubmit(onSubmit)}
                  disabled={saving || !isDirty || !isValid}
                  size="large"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {/* Progress bar */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Progresso do preenchimento
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getCompletionPercentage}% completo
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={getCompletionPercentage} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }
              }}
            />
          </Box>
        </Paper>

        {/* Auto-save indicator */}
        <Fade in={autoSaving}>
          <Alert 
            severity="info" 
            icon={<AutorenewOutlined />}
            sx={{ mb: 2 }}
          >
            Salvando automaticamente...
          </Alert>
        </Fade>

        {/* Error/Success messages */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        {/* Main content */}
        <Paper sx={{ borderRadius: 2 }}>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 500,
              },
            }}
          >
            {tabsConfig.map((tab, index) => (
              <Tab
                key={tab.id}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Badge 
                      badgeContent={tabErrors[tab.id]} 
                      color="error"
                      sx={{ 
                        '& .MuiBadge-badge': { 
                          fontSize: '0.7rem',
                          minWidth: 16,
                          height: 16,
                        } 
                      }}
                    >
                      {tab.icon}
                    </Badge>
                    <Box>
                      <Typography variant="body2">
                        {tab.label}
                      </Typography>
                      {tab.required && (
                        <Typography variant="caption" color="text.secondary">
                          Obrigatório
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
                icon={
                  Object.keys(errors).some(key => 
                    tab.fields.includes(key as keyof Property)
                  ) ? <ErrorIcon color="error" fontSize="small" /> : 
                  tab.fields.every(field => {
                    const value = watchedValues[field];
                    return value !== undefined && value !== null && value !== '' &&
                           (!Array.isArray(value) || value.length > 0);
                  }) ? <CheckCircle color="success" fontSize="small" /> : null
                }
                iconPosition="end"
              />
            ))}
          </Tabs>

          {/* Tab Content */}
          <Box sx={{ p: 4, minHeight: 400 }}>
            {tabsConfig.map((tab, index) => (
              <div
                key={tab.id}
                role="tabpanel"
                hidden={activeTab !== index}
              >
                {activeTab === index && (
                  <Fade in timeout={300}>
                    <Box>{tab.component}</Box>
                  </Fade>
                )}
              </div>
            ))}
          </Box>

          {/* Navigation buttons */}
          <Box 
            sx={{ 
              p: 3, 
              borderTop: 1, 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button
              variant="text"
              onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
              disabled={activeTab === 0}
            >
              Anterior
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {tabsConfig.map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: index === activeTab ? 'primary.main' : 'grey.300',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab(index)}
                />
              ))}
            </Box>
            
            <Button
              variant="contained"
              onClick={() => setActiveTab(Math.min(tabsConfig.length - 1, activeTab + 1))}
              disabled={activeTab === tabsConfig.length - 1}
            >
              Próximo
            </Button>
          </Box>
        </Paper>

        {/* Exit confirmation dialog */}
        <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="warning" />
              Alterações não salvas
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              Você tem alterações não salvas. Deseja realmente sair sem salvar?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowExitDialog(false)}>
              Continuar Editando
            </Button>
            <Button onClick={confirmExit} color="error" variant="contained">
              Sair sem Salvar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </FormProvider>
  );
}