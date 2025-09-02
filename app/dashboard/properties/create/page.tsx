'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  NavigateNext,
  NavigateBefore,
  Home,
  Apartment,
  Villa,
  House,
} from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { PropertyBasicInfo } from '@/components/organisms/PropertyEdit/BasicInfo';
import { PropertySpecs } from '@/components/organisms/PropertyEdit/Specs';
import { PropertyAmenities } from '@/components/organisms/PropertyEdit/Amenities';
import { PropertyPricing } from '@/components/organisms/PropertyEdit/Pricing';
import { PropertyMedia as PropertyMediaUpload } from '@/components/organisms/PropertyEdit/Media';
import { Property, PricingRule, PropertyCategory, PropertyStatus, PropertyType } from '@/lib/types/property';
import { PaymentMethod } from '@/lib/types/common';
import { useTenant } from '@/contexts/TenantContext';
import { propertyService } from '@/lib/services/property-service';
import { generateLocationField } from '@/lib/utils/locationUtils';
import { logger } from '@/lib/utils/logger';
import { CreatePropertySchema } from '@/lib/validation/property-schemas';

const steps = [
  'Informações Básicas',
  'Especificações',
  'Comodidades',
  'Precificação',
  'Fotos e Vídeos',
  'Revisão',
];

const propertyTypes = [
  { value: PropertyCategory.APARTMENT, label: 'Apartamento', icon: <Apartment /> },
  { value: PropertyCategory.HOUSE, label: 'Casa', icon: <House /> },
  { value: PropertyCategory.VILLA, label: 'Villa', icon: <Villa /> },
  { value: PropertyCategory.STUDIO, label: 'Studio', icon: <Home /> },
];

// Using unified schema for creation mode
// This ensures consistency between create and edit forms

export default function CreatePropertyPage() {
  const router = useRouter();
  const { services, tenantId, isReady } = useTenant();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  const methods = useForm<Property>({
    resolver: yupResolver(yup.object().shape({
      title: yup.string().required('Título é obrigatório').min(3, 'Mínimo 3 caracteres'),
      description: yup.string().required('Descrição é obrigatória').min(10, 'Mínimo 10 caracteres'),
      address: yup.string(),
      category: yup.string(),
      bedrooms: yup.number().min(0),
      bathrooms: yup.number().min(0),
      maxGuests: yup.number().min(1),
      basePrice: yup.number().required('Preço é obrigatório').positive('Preço deve ser positivo'),
    })) as any,
    defaultValues: {
      title: '',
      description: '',
      address: '',
      category: PropertyCategory.APARTMENT,
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      basePrice: 0,
      pricePerExtraGuest: 0,
      minimumNights: 1,
      cleaningFee: 0,
      // Analytics fields with defaults
      status: PropertyStatus.ACTIVE,
      type: PropertyType.RESIDENTIAL,
      neighborhood: '',
      city: '',
      capacity: 2,
      // Arrays
      amenities: [],
      photos: [],
      videos: [],
      customPricing: {},
      // Booleans
      isFeatured: false,
      allowsPets: false,
      isActive: true,
      // Payment configurations
      advancePaymentPercentage: 0,
      paymentMethodSurcharges: {
        [PaymentMethod.CREDIT_CARD]: 0,
        [PaymentMethod.DEBIT_CARD]: 0,
        [PaymentMethod.PIX]: 0,
        [PaymentMethod.CASH]: 0,
        [PaymentMethod.BANK_TRANSFER]: 0,
        [PaymentMethod.BANK_SLIP]: 0,
        [PaymentMethod.STRIPE]: 0,
      },
      // Optional surcharges
      weekendSurcharge: 0,
      holidaySurcharge: 0,
      decemberSurcharge: 0,
      highSeasonSurcharge: 0,
      highSeasonMonths: [],
    },
  });

  const { handleSubmit, trigger, formState: { errors } } = methods;

  const handleNext = async () => {
    const isValid = await validateStep(activeStep);
    if (isValid) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 0: // Basic Info - apenas description é obrigatória
        return await trigger(['description']);
      case 1: // Specs - tudo opcional
        return true;
      case 2: // Amenities - opcional
        return true;
      case 3: // Pricing - apenas basePrice é obrigatório
        return await trigger(['basePrice']);
      case 4: // Media - opcional
        return true;
      default:
        return true;
    }
  };

  const handleSave = async (data: Property) => {
    if (!isReady || !services || !tenantId) {
      setError('Serviços não estão prontos. Tente novamente.');
      return;
    }

    setLoading(true);
    setError(null);

    try {

      // Ensure all payment methods have valid values (no undefined)
      const cleanPaymentMethodSurcharges = {
        [PaymentMethod.CREDIT_CARD]: Number(data.paymentMethodSurcharges?.[PaymentMethod.CREDIT_CARD]) || 0,
        [PaymentMethod.DEBIT_CARD]: Number(data.paymentMethodSurcharges?.[PaymentMethod.DEBIT_CARD]) || 0,
        [PaymentMethod.PIX]: Number(data.paymentMethodSurcharges?.[PaymentMethod.PIX]) || 0,
        [PaymentMethod.CASH]: Number(data.paymentMethodSurcharges?.[PaymentMethod.CASH]) || 0,
        [PaymentMethod.BANK_TRANSFER]: Number(data.paymentMethodSurcharges?.[PaymentMethod.BANK_TRANSFER]) || 0,
        [PaymentMethod.BANK_SLIP]: Number(data.paymentMethodSurcharges?.[PaymentMethod.BANK_SLIP]) || 0,
        [PaymentMethod.STRIPE]: Number(data.paymentMethodSurcharges?.[PaymentMethod.STRIPE]) || 0,
      };

      // Create property using PropertyService with enhanced logging
      const propertyData = {
        ...data,
        // Garantir que campos string nunca sejam undefined
        title: data.title || '',
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        // Garantir outros campos obrigatórios
        paymentMethodSurcharges: cleanPaymentMethodSurcharges,
        pricingRules,
        status: data.status || PropertyStatus.ACTIVE,
        type: data.type || PropertyType.RESIDENTIAL,
        capacity: data.capacity || data.maxGuests || 1,
        advancePaymentPercentage: data.advancePaymentPercentage || 0,
        // Optional surcharges with validation
        weekendSurcharge: Number(data.weekendSurcharge) || 0,
        holidaySurcharge: Number(data.holidaySurcharge) || 0,
        decemberSurcharge: Number(data.decemberSurcharge) || 0,
        highSeasonSurcharge: Number(data.highSeasonSurcharge) || 0,
        highSeasonMonths: Array.isArray(data.highSeasonMonths) ? data.highSeasonMonths.filter(m => m && typeof m === 'string') : [],
        // Generate concatenated location field for search
        location: generateLocationField({
          address: data.address || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          title: data.title || '',
          description: data.description || ''
        }),
        // Clean arrays and filter invalid URLs
        photos: (Array.isArray(data.photos) ? data.photos : []).filter(photo => {
          if (!photo) return false;
          const url = typeof photo === 'string' ? photo : (photo?.url || '');
          return url && typeof url === 'string' && url.length > 0 && url.includes('firebasestorage.googleapis.com');
        }),
        videos: (Array.isArray(data.videos) ? data.videos : []).filter(video => {
          if (!video) return false;
          const url = typeof video === 'string' ? video : (video?.url || '');
          return url && typeof url === 'string' && url.length > 0 && url.includes('firebasestorage.googleapis.com');
        }),
        amenities: Array.isArray(data.amenities) ? data.amenities.filter(a => a && typeof a === 'string') : [],
        customPricing: data.customPricing && typeof data.customPricing === 'object' ? data.customPricing : {},
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Use API route for consistency with edit functionality
      logger.info('Sending property creation request', {
        tenantId,
        fieldsCount: Object.keys(propertyData).length
      });

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(propertyData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        let errorMessage = `Erro ${response.status}`;
        
        try {
          const parsed = JSON.parse(errorData);
          errorMessage = parsed.error || parsed.message || errorMessage;
        } catch {
          errorMessage = errorData || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const propertyId = responseData.data?.id;
      
      logger.info('Property created successfully', { propertyId, tenantId });
      
      if (propertyId) {
        router.push(`/dashboard/properties/${propertyId}`);
      } else {
        router.push('/dashboard/properties');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar propriedade';
      logger.error('Property creation failed', {
        error: errorMessage,
        tenantId
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <PropertyBasicInfo />;
      case 1:
        return <PropertySpecs />;
      case 2:
        return <PropertyAmenities />;
      case 3:
        return <PropertyPricing />;
      case 4:
        return <PropertyMediaUpload />;
      case 5:
        return <PropertyReview />;
      default:
        return null;
    }
  };

  const PropertyReview = () => {
    const { watch } = methods;
    const watchedData = watch();
    
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Revisão da Propriedade
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Informações Básicas
            </Typography>
            <Typography>Nome: {watchedData.title}</Typography>
            <Typography>Tipo: {propertyTypes.find(t => t.value === watchedData.category)?.label}</Typography>
            <Typography>Endereço: {watchedData.address}</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Especificações
            </Typography>
            <Typography>Quartos: {watchedData.bedrooms}</Typography>
            <Typography>Banheiros: {watchedData.bathrooms}</Typography>
            <Typography>Capacidade: {watchedData.maxGuests} pessoas</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Preços
            </Typography>
            <Typography>Diária Base: R$ {watchedData.basePrice}</Typography>
            <Typography>Taxa de Limpeza: R$ {watchedData.cleaningFee}</Typography>
            <Typography>Preço por Hóspede Extra: R$ {watchedData.pricePerExtraGuest}</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Mídia
            </Typography>
            <Typography>{watchedData.photos?.length || 0} fotos carregadas</Typography>
            <Typography>{watchedData.videos?.length || 0} vídeos carregados</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (!isReady || !services) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Cadastrar Novo Imóvel
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<NavigateBefore />}
          >
            Voltar
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit(handleSave)}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              >
                {loading ? 'Salvando...' : 'Salvar Imóvel'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<NavigateNext />}
              >
                Próximo
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </FormProvider>
  );
}