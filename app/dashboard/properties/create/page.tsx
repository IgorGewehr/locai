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
import { PropertyBasicInfo } from '@/components/organisms/PropertyBasicInfo/PropertyBasicInfo';
import { PropertySpecs } from '@/components/organisms/PropertySpecs/PropertySpecs';
import { PropertyAmenities } from '@/components/organisms/PropertyAmenities/PropertyAmenities';
import { PropertyPricing } from '@/components/organisms/PropertyPricing/PropertyPricing';
import PropertyMediaUpload from '@/components/organisms/PropertyMediaUpload/PropertyMediaUpload';
import { Property, PricingRule, PropertyCategory, PaymentMethod, PropertyStatus, PropertyType } from '@/lib/types/property';

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

const propertySchema = yup.object().shape({
  title: yup.string().required('Título é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
  address: yup.string().required('Endereço é obrigatório'),
  category: yup.string().oneOf(Object.values(PropertyCategory)).required('Categoria é obrigatória'),
  bedrooms: yup.number().min(1, 'Deve ter pelo menos 1 quarto').required('Número de quartos é obrigatório'),
  bathrooms: yup.number().min(1, 'Deve ter pelo menos 1 banheiro').required('Número de banheiros é obrigatório'),
  maxGuests: yup.number().min(1, 'Deve acomodar pelo menos 1 hóspede').required('Número máximo de hóspedes é obrigatório'),
  basePrice: yup.number().min(1, 'Preço deve ser maior que 0').required('Preço base é obrigatório'),
  pricePerExtraGuest: yup.number().min(0, 'Preço não pode ser negativo').required(),
  minimumNights: yup.number().min(1, 'Deve ter pelo menos 1 noite').required('Número mínimo de noites é obrigatório'),
  cleaningFee: yup.number().min(0, 'Taxa não pode ser negativa').required(),
  
  // Analytics fields
  status: yup.string().oneOf(Object.values(PropertyStatus)).default(PropertyStatus.ACTIVE),
  type: yup.string().oneOf(Object.values(PropertyType)).default(PropertyType.RESIDENTIAL),
  neighborhood: yup.string().default(''),
  city: yup.string().default(''),
  capacity: yup.number().min(1).default(1),
  
  // Other fields
  amenities: yup.array().of(yup.string()).default([]),
  isFeatured: yup.boolean().default(false),
  allowsPets: yup.boolean().default(false),
  paymentMethodSurcharges: yup.object().shape({
    [PaymentMethod.CREDIT_CARD]: yup.number().min(0).default(0),
    [PaymentMethod.PIX]: yup.number().min(0).default(0),
    [PaymentMethod.CASH]: yup.number().min(0).default(0),
    [PaymentMethod.BANK_TRANSFER]: yup.number().min(0).default(0),
  }),
  photos: yup.array().min(1, 'Deve ter pelo menos 1 foto').required('Pelo menos uma foto é obrigatória'),
  videos: yup.array().default([]),
  unavailableDates: yup.array().default([]),
  customPricing: yup.object().default({}),
  isActive: yup.boolean().default(true),
  
  // Timestamps
  createdAt: yup.date().default(() => new Date()),
  updatedAt: yup.date().default(() => new Date()),
  tenantId: yup.string().default(''),
});

export default function CreatePropertyPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  const methods = useForm<Property>({
    resolver: yupResolver(propertySchema) as any,
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
      amenities: [],
      isFeatured: false,
      allowsPets: false,
      paymentMethodSurcharges: {
        [PaymentMethod.CREDIT_CARD]: 0,
        [PaymentMethod.PIX]: 0,
        [PaymentMethod.CASH]: 0,
        [PaymentMethod.BANK_TRANSFER]: 0,
      },
      photos: [],
      videos: [],
      unavailableDates: [],
      customPricing: {},
      isActive: true,
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
      case 0: // Basic Info
        return await trigger(['title', 'description', 'category', 'address']);
      case 1: // Specs
        return await trigger(['bedrooms', 'bathrooms', 'maxGuests']);
      case 2: // Amenities
        return true; // Optional
      case 3: // Pricing
        return await trigger(['basePrice', 'pricePerExtraGuest', 'minimumNights', 'cleaningFee', 'paymentMethodSurcharges']);
      case 4: // Media
        return await trigger(['photos']);
      default:
        return true;
    }
  };

  const handleSave = async (data: Property) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          pricingRules,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar propriedade');
      }

      const result = await response.json();
      router.push(`/dashboard/properties/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
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