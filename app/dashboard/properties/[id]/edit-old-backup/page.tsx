'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Save,
  Cancel,
  Home,
  Apartment,
  Villa,
  House,
  CheckCircle,
  Schedule,
  Block,
  NavigateNext,
  NavigateBefore,
  Info,
  Settings,
  Star,
  AttachMoney,
  PhotoLibrary,
  CalendarMonth,
  Warning,
} from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { PropertyBasicInfo } from '@/components/organisms/PropertyBasicInfo/PropertyBasicInfo';
import { PropertySpecs } from '@/components/organisms/PropertySpecs/PropertySpecs';
import { PropertyAmenities } from '@/components/organisms/PropertyAmenities/PropertyAmenities';
import { PropertyPricing } from '@/components/organisms/PropertyPricing/PropertyPricing';
import PropertyMediaUpload from '@/components/organisms/PropertyMediaUpload/PropertyMediaUpload';
import AvailabilityCalendar from '@/components/organisms/AvailabilityCalendar/AvailabilityCalendar';
import { Property, PricingRule, PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { useTenant } from '@/contexts/TenantContext';
import { ApiClient } from '@/lib/utils/api-client';
import { logger } from '@/lib/utils/logger';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface StepData {
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
  validate: (data: Partial<Property>) => ValidationResult;
}

const steps: StepData[] = [
  {
    label: 'Informações Básicas',
    description: 'Título, descrição e endereço da propriedade',
    icon: <Info />,
    fields: ['title', 'description', 'address', 'category'],
    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!data.title?.trim()) errors.push('Título é obrigatório');
      else if (data.title.length < 10) warnings.push('Título muito curto (recomendado: mín. 10 caracteres)');
      
      if (!data.description?.trim()) errors.push('Descrição é obrigatória');
      else if (data.description.length < 50) warnings.push('Descrição muito curta (recomendado: mín. 50 caracteres)');
      
      if (!data.address?.trim()) errors.push('Endereço é obrigatório');
      if (!data.category) errors.push('Categoria é obrigatória');
      
      return { isValid: errors.length === 0, errors, warnings };
    }
  },
  {
    label: 'Especificações',
    description: 'Quartos, banheiros e capacidade',
    icon: <Settings />,
    fields: ['bedrooms', 'bathrooms', 'maxGuests'],
    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!data.bedrooms || data.bedrooms < 1) errors.push('Deve ter pelo menos 1 quarto');
      if (!data.bathrooms || data.bathrooms < 1) errors.push('Deve ter pelo menos 1 banheiro');
      if (!data.maxGuests || data.maxGuests < 1) errors.push('Deve acomodar pelo menos 1 hóspede');
      
      if (data.maxGuests && data.bedrooms && data.maxGuests > data.bedrooms * 3) {
        warnings.push('Capacidade muito alta para o número de quartos');
      }
      
      return { isValid: errors.length === 0, errors, warnings };
    }
  },
  {
    label: 'Comodidades',
    description: 'Facilidades e serviços oferecidos',
    icon: <Star />,
    fields: ['amenities', 'allowsPets', 'isFeatured'],
    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!data.amenities || data.amenities.length === 0) {
        warnings.push('Adicione algumas comodidades para tornar a propriedade mais atrativa');
      }
      
      return { isValid: true, errors, warnings };
    }
  },
  {
    label: 'Precificação',
    description: 'Preços e taxas da propriedade',
    icon: <AttachMoney />,
    fields: ['basePrice', 'pricePerExtraGuest', 'minimumNights', 'cleaningFee'],
    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!data.basePrice || data.basePrice <= 0) errors.push('Preço base é obrigatório e deve ser maior que 0');
      if (data.pricePerExtraGuest && data.pricePerExtraGuest < 0) errors.push('Preço por pessoa extra não pode ser negativo');
      if (data.cleaningFee && data.cleaningFee < 0) errors.push('Taxa de limpeza não pode ser negativa');
      if (data.minimumNights && data.minimumNights < 1) errors.push('Mínimo de noites deve ser pelo menos 1');
      
      if (data.basePrice && data.basePrice < 50) warnings.push('Preço muito baixo - verifique se está correto');
      if (data.basePrice && data.basePrice > 1000) warnings.push('Preço muito alto - verifique se está correto');
      
      return { isValid: errors.length === 0, errors, warnings };
    }
  },
  {
    label: 'Mídia',
    description: 'Fotos e vídeos da propriedade',
    icon: <PhotoLibrary />,
    fields: ['photos', 'videos'],
    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!data.photos || data.photos.length === 0) {
        warnings.push('Adicione pelo menos uma foto para melhorar a apresentação');
      } else if (data.photos.length < 3) {
        warnings.push('Recomendado: adicione pelo menos 3 fotos');
      }
      
      return { isValid: true, errors, warnings };
    }
  },
  {
    label: 'Disponibilidade',
    description: 'Configuração de datas e status',
    icon: <CalendarMonth />,
    fields: ['isActive', 'unavailableDates'],
    validate: (data) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (data.isActive === undefined) errors.push('Status da propriedade deve ser definido');
      
      return { isValid: errors.length === 0, errors, warnings };
    }
  }
];

const propertyTypes = [
  { value: PropertyCategory.APARTMENT, label: 'Apartamento', icon: <Apartment /> },
  { value: PropertyCategory.HOUSE, label: 'Casa', icon: <House /> },
  { value: PropertyCategory.VILLA, label: 'Villa', icon: <Villa /> },
  { value: PropertyCategory.STUDIO, label: 'Studio', icon: <Home /> },
];

const propertySchema = yup.object().shape({
  title: yup.string().required('Título é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
  address: yup.string().required('Endereço é obrigatório'),
  category: yup.string().oneOf(Object.values(PropertyCategory)).required('Categoria é obrigatória'),
  bedrooms: yup.number().min(1, 'Deve ter pelo menos 1 quarto').required('Número de quartos é obrigatório'),
  bathrooms: yup.number().min(1, 'Deve ter pelo menos 1 banheiro').required('Número de banheiros é obrigatório'),
  maxGuests: yup.number().min(1, 'Deve acomodar pelo menos 1 hóspede').required('Número máximo de hóspedes é obrigatório'),
  basePrice: yup.number().min(1, 'Preço deve ser maior que 0').required('Preço base é obrigatório'),
  pricePerExtraGuest: yup.number().min(0, 'Preço não pode ser negativo').nullable(),
  minimumNights: yup.number().min(1, 'Deve ter pelo menos 1 noite').nullable(),
  cleaningFee: yup.number().min(0, 'Taxa não pode ser negativa').nullable(),
  
  // Optional fields with proper defaults
  amenities: yup.array().of(yup.string()).nullable(),
  isFeatured: yup.boolean().nullable(),
  allowsPets: yup.boolean().nullable(),
  photos: yup.array().nullable(), // Remove required validation for photos
  videos: yup.array().nullable(),
  unavailableDates: yup.array().nullable(),
  customPricing: yup.object().nullable(),
  isActive: yup.boolean().nullable(),
});

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;
  const { services, tenantId, isReady } = useTenant();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [stepValidations, setStepValidations] = useState<ValidationResult[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });

  const methods = useForm<Property>({
    resolver: yupResolver(propertySchema) as any,
    mode: 'onChange',
  });

  const { handleSubmit, reset, formState: { isDirty, errors } } = methods;

  useEffect(() => {
    // Load property data from Firebase
    const loadProperty = async () => {
      if (!propertyId || !services || !isReady) return;
      
      
      try {
        const property = await services.properties.get(propertyId);
        
        if (!property) {
          setError('Propriedade não encontrada');
          setLoading(false);
          return;
        }

        // Convert dates back to Date objects
        const propertyData = {
          ...property,
          unavailableDates: (property as any).unavailableDates?.map((date: any) => 
            date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date)
          ) || [],
        };
        
        reset(propertyData as unknown as Property);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar propriedade');
        setLoading(false);
      }
    };

    loadProperty();
  }, [propertyId, services, isReady, reset]);

  const validateAllSteps = (data: Partial<Property>) => {
    const allValidations = steps.map(step => step.validate(data));
    setStepValidations(allValidations);
    
    const allErrors = allValidations.flatMap(v => v.errors);
    const allWarnings = allValidations.flatMap(v => v.warnings);
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  };

  const validateCurrentStep = (data: Partial<Property>) => {
    return steps[activeStep]?.validate(data) || { isValid: true, errors: [], warnings: [] };
  };

  const correctCommonIssues = (data: Property): Property => {
    const corrected = { ...data };
    
    // Corrigir campos numéricos
    if (corrected.bedrooms && corrected.bedrooms < 1) corrected.bedrooms = 1;
    if (corrected.bathrooms && corrected.bathrooms < 1) corrected.bathrooms = 1;
    if (corrected.maxGuests && corrected.maxGuests < 1) corrected.maxGuests = 1;
    if (corrected.minimumNights && corrected.minimumNights < 1) corrected.minimumNights = 1;
    if (corrected.basePrice && corrected.basePrice <= 0) corrected.basePrice = 100;
    if (corrected.pricePerExtraGuest && corrected.pricePerExtraGuest < 0) corrected.pricePerExtraGuest = 0;
    if (corrected.cleaningFee && corrected.cleaningFee < 0) corrected.cleaningFee = 0;
    
    // Corrigir strings vazias
    if (!corrected.title?.trim()) corrected.title = 'Propriedade sem título';
    if (!corrected.description?.trim()) corrected.description = 'Descrição a ser preenchida';
    if (!corrected.address?.trim()) corrected.address = 'Endereço a ser informado';
    
    // Garantir arrays válidos
    corrected.amenities = corrected.amenities || [];
    corrected.photos = corrected.photos || [];
    corrected.videos = corrected.videos || [];
    corrected.unavailableDates = corrected.unavailableDates || [];
    
    // Status padrão
    if (corrected.isActive === undefined) corrected.isActive = true;
    if (corrected.allowsPets === undefined) corrected.allowsPets = false;
    if (corrected.isFeatured === undefined) corrected.isFeatured = false;
    
    return corrected;
  };

  const onSubmit = async (data: Property) => {
    logger.info('Starting property edit submission', { propertyId, title: data.title });
    setSaving(true);
    setError(null);

    try {
      // Validar todos os steps
      const fullValidation = validateAllSteps(data);
      setValidationSummary(fullValidation);
      
      if (!fullValidation.isValid) {
        setShowValidationDialog(true);
        setSaving(false);
        return;
      }
      
      // Corrigir problemas comuns automaticamente
      const correctedData = correctCommonIssues(data);
      
      // Processar mídia
      const validPhotos = (correctedData.photos || []).filter((photo: any) => {
        const url = typeof photo === 'string' ? photo : photo?.url;
        return url && url.includes('firebasestorage.googleapis.com');
      });

      const validVideos = (correctedData.videos || []).filter((video: any) => {
        const url = typeof video === 'string' ? video : video?.url;
        return url && url.includes('firebasestorage.googleapis.com');
      });

      const cleanData: any = {
        ...correctedData,
        photos: validPhotos,
        videos: validVideos,
        amenities: correctedData.amenities || [],
        unavailableDates: correctedData.unavailableDates || [],
        customPricing: correctedData.customPricing || {},
      };

      const finalPayload = {
        ...cleanData,
        pricingRules,
        updatedAt: new Date(),
      };

      logger.info('Sending property edit request', {
        propertyId,
        title: finalPayload.title,
        hasPhotos: !!finalPayload.photos?.length,
        photosCount: finalPayload.photos?.length || 0
      });

      const response = await ApiClient.put(`/api/properties/${propertyId}`, finalPayload);
      const responseData = await response.json();

      if (!response.ok) {
        let errorMessage = responseData.error || 'Erro ao salvar alterações';
        
        if (responseData.code === 'VALIDATION_ERROR' && responseData.details) {
          logger.error('Property validation error', responseData.details);
          errorMessage += '. Dados corrigidos automaticamente - tente novamente.';
          
          // Auto-corrigir e tentar novamente
          const reCorrectedData = correctCommonIssues(data);
          reset(reCorrectedData as unknown as Property);
        }
        
        throw new Error(errorMessage);
      }

      setSuccessMessage('Propriedade atualizada com sucesso!');
      reset(correctedData as unknown as Property);
      
      setTimeout(() => {
        router.push('/dashboard/properties');
      }, 2000);
    } catch (err) {
      logger.error('Error updating property', { errorMessage: err instanceof Error ? err.message : String(err), propertyId });
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: boolean) => {
    methods.setValue('isActive', newStatus, { shouldDirty: true });
    setShowStatusDialog(false);
  };

  const getStatusChip = () => {
    const isActive = methods.watch('isActive');
    
    return (
      <Chip
        label={isActive ? 'Ativo' : 'Inativo'}
        color={isActive ? 'success' : 'error'}
        icon={isActive ? <CheckCircle /> : <Block />}
        onClick={() => setShowStatusDialog(true)}
        sx={{ cursor: 'pointer' }}
      />
    );
  };

  const handleNext = () => {
    const currentData = methods.getValues();
    const currentValidation = validateCurrentStep(currentData);
    
    if (!currentValidation.isValid) {
      setError(`Complete corretamente o passo atual: ${currentValidation.errors.join(', ')}`);
      return;
    }
    
    setError(null);
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    setError(null);
  };

  const handleStepClick = (stepIndex: number) => {
    // Permitir navegar apenas para steps já validados ou o próximo
    const currentData = methods.getValues();
    let canNavigate = true;
    
    for (let i = 0; i < stepIndex; i++) {
      const stepValidation = steps[i].validate(currentData);
      if (!stepValidation.isValid) {
        canNavigate = false;
        setError(`Complete o passo "${steps[i].label}" antes de prosseguir`);
        return;
      }
    }
    
    if (canNavigate) {
      setActiveStep(stepIndex);
      setError(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2 }}>
        <CircularProgress />
        <Typography>Carregando dados da propriedade...</Typography>
      </Box>
    );
  }

  if (error && !methods.formState.isSubmitted) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => router.push('/dashboard/properties')}>
          Voltar para Propriedades
        </Button>
      </Box>
    );
  }

  const getStepProgress = () => {
    const currentData = methods.getValues();
    const validSteps = steps.filter((step, index) => {
      if (index > activeStep) return false;
      return step.validate(currentData).isValid;
    }).length;
    return (validSteps / steps.length) * 100;
  };

  return (
    <FormProvider {...methods}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Editar Propriedade
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography variant="h6" color="text.secondary">
                {methods.watch('title') || 'Nova propriedade'}
              </Typography>
              {getStatusChip()}
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => router.push('/dashboard/properties')}
            disabled={saving}
          >
            Cancelar
          </Button>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progresso da edição
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(getStepProgress())}% concluído
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={getStepProgress()} sx={{ height: 6, borderRadius: 3 }} />
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {methods.formState.isDirty && !successMessage && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Você tem alterações não salvas. Complete todos os passos para salvar.
          </Alert>
        )}

        {/* Stepper */}
        <Card>
          <CardContent>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => {
                const currentData = methods.getValues();
                const stepValidation = step.validate(currentData);
                const isCompleted = stepValidation.isValid;
                const hasWarnings = stepValidation.warnings.length > 0;

                return (
                  <Step key={step.label} completed={isCompleted}>
                    <StepLabel
                      optional={
                        hasWarnings && (
                          <Typography variant="caption" color="warning.main">
                            {stepValidation.warnings.length} aviso(s)
                          </Typography>
                        )
                      }
                      error={!isCompleted && stepValidation.errors.length > 0}
                      onClick={() => handleStepClick(index)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {step.icon}
                        <Box>
                          <Typography variant="subtitle1" fontWeight={index === activeStep ? 600 : 400}>
                            {step.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {step.description}
                          </Typography>
                        </Box>
                      </Box>
                    </StepLabel>
                    <StepContent>
                      {/* Current Step Content */}
                      {index === 0 && <PropertyBasicInfo />}
                      {index === 1 && <PropertySpecs />}
                      {index === 2 && <PropertyAmenities />}
                      {index === 3 && <PropertyPricing />}
                      {index === 4 && <PropertyMediaUpload />}
                      {index === 5 && (
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            Gerenciar Disponibilidade e Status
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Configure o status da propriedade e datas de disponibilidade.
                          </Typography>
                          <AvailabilityCalendar 
                            propertyId={propertyId} 
                            showLegend={true}
                            showStats={true}
                          />
                        </Box>
                      )}

                      {/* Step Validation Messages */}
                      {stepValidation.errors.length > 0 && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            Corrija os seguintes problemas:
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {stepValidation.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </Alert>
                      )}

                      {stepValidation.warnings.length > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            Recomendações:
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {stepValidation.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </Alert>
                      )}

                      {/* Navigation Buttons */}
                      <Box sx={{ mb: 2, mt: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            startIcon={<NavigateBefore />}
                          >
                            Anterior
                          </Button>
                          {activeStep < steps.length - 1 ? (
                            <Button
                              variant="contained"
                              onClick={handleNext}
                              endIcon={<NavigateNext />}
                              disabled={!stepValidation.isValid}
                            >
                              Próximo
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                              onClick={handleSubmit(onSubmit)}
                              disabled={saving || !stepValidation.isValid}
                              size="large"
                            >
                              {saving ? 'Salvando...' : 'Finalizar Edição'}
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>
          </CardContent>
        </Card>

        {/* Validation Summary Dialog */}
        <Dialog open={showValidationDialog} onClose={() => setShowValidationDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Warning color="error" />
              Problemas encontrados
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              A propriedade possui alguns problemas que precisam ser corrigidos:
            </Typography>
            
            {validationSummary.errors.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Erros que impedem o salvamento:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validationSummary.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </Paper>
            )}
            
            {validationSummary.warnings.length > 0 && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Avisos e recomendações:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {validationSummary.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </Paper>
            )}

            <Typography variant="body2" color="text.secondary">
              Volte aos passos indicados para corrigir os problemas, ou clique em "Corrigir automaticamente" 
              para que o sistema tente corrigir os problemas mais comuns.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowValidationDialog(false)}>
              Voltar para correção
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                const correctedData = correctCommonIssues(methods.getValues());
                methods.reset(correctedData as unknown as Property);
                setShowValidationDialog(false);
                setError('Dados corrigidos automaticamente. Revise e salve novamente.');
              }}
            >
              Corrigir automaticamente
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Change Dialog */}
        <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)}>
          <DialogTitle>Alterar Status da Propriedade</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Selecione o novo status para a propriedade:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant={methods.watch('isActive') ? 'contained' : 'outlined'}
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => handleStatusChange(true)}
                fullWidth
              >
                Ativo - Disponível para reservas
              </Button>
              <Button
                variant={!methods.watch('isActive') ? 'contained' : 'outlined'}
                color="error"
                startIcon={<Block />}
                onClick={() => handleStatusChange(false)}
                fullWidth
              >
                Inativo - Não disponível
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </FormProvider>
  );
}