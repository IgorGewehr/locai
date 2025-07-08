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
import PropertyBasicInfo from '@/components/organisms/PropertyBasicInfo/PropertyBasicInfo';
import PropertySpecs from '@/components/organisms/PropertySpecs/PropertySpecs';
import PropertyAmenities from '@/components/organisms/PropertyAmenities/PropertyAmenities';
import PropertyPricing from '@/components/organisms/PropertyPricing/PropertyPricing';
import PropertyMediaUpload from '@/components/organisms/PropertyMediaUpload/PropertyMediaUpload';
import type { Property, PricingRule } from '@/lib/types';

const steps = [
  'Informações Básicas',
  'Especificações',
  'Comodidades',
  'Precificação',
  'Fotos e Vídeos',
  'Revisão',
];

const propertyTypes = [
  { value: 'apartment', label: 'Apartamento', icon: <Apartment /> },
  { value: 'house', label: 'Casa', icon: <House /> },
  { value: 'villa', label: 'Villa', icon: <Villa /> },
  { value: 'studio', label: 'Studio', icon: <Home /> },
];

export default function CreatePropertyPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [property, setProperty] = useState<Partial<Property>>({
    name: '',
    description: '',
    type: 'apartment',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil',
    },
    coordinates: {
      lat: 0,
      lng: 0,
    },
    bedrooms: 1,
    bathrooms: 1,
    capacity: 2,
    area: 0,
    amenities: [],
    photos: [],
    videos: [],
    basePrice: 0,
    weekendMultiplier: 1.2,
    holidayMultiplier: 1.5,
    minimumStay: 2,
    cleaningFee: 0,
    securityDeposit: 0,
    rules: [],
    checkInTime: '14:00',
    checkOutTime: '11:00',
    status: 'active',
    availability: [],
  });

  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Info
        return !!(
          property.name &&
          property.description &&
          property.type &&
          property.address?.street &&
          property.address?.city
        );
      case 1: // Specs
        return !!(
          property.bedrooms &&
          property.bathrooms &&
          property.capacity &&
          property.area
        );
      case 2: // Amenities
        return true; // Optional
      case 3: // Pricing
        return !!(property.basePrice && property.basePrice > 0);
      case 4: // Media
        return property.photos && property.photos.length > 0;
      default:
        return true;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...property,
          pricingRules,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar propriedade');
      }

      const data = await response.json();
      router.push(`/dashboard/properties/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <PropertyBasicInfo
            property={property}
            onChange={(updates) => setProperty((prev) => ({ ...prev, ...updates }))}
            propertyTypes={propertyTypes}
          />
        );
      case 1:
        return (
          <PropertySpecs
            property={property}
            onChange={(updates) => setProperty((prev) => ({ ...prev, ...updates }))}
          />
        );
      case 2:
        return (
          <PropertyAmenities
            selectedAmenities={property.amenities || []}
            onChange={(amenities) => setProperty((prev) => ({ ...prev, amenities }))}
          />
        );
      case 3:
        return (
          <PropertyPricing
            property={property}
            pricingRules={pricingRules}
            onPropertyChange={(updates) => setProperty((prev) => ({ ...prev, ...updates }))}
            onPricingRulesChange={setPricingRules}
          />
        );
      case 4:
        return (
          <PropertyMediaUpload
            photos={property.photos || []}
            videos={property.videos || []}
            onPhotosChange={(photos) => setProperty((prev) => ({ ...prev, photos }))}
            onVideosChange={(videos) => setProperty((prev) => ({ ...prev, videos }))}
          />
        );
      case 5:
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
                <Typography>Nome: {property.name}</Typography>
                <Typography>Tipo: {propertyTypes.find(t => t.value === property.type)?.label}</Typography>
                <Typography>
                  Endereço: {property.address?.street}, {property.address?.number} - {property.address?.city}/{property.address?.state}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Especificações
                </Typography>
                <Typography>Quartos: {property.bedrooms}</Typography>
                <Typography>Banheiros: {property.bathrooms}</Typography>
                <Typography>Capacidade: {property.capacity} pessoas</Typography>
                <Typography>Área: {property.area}m²</Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Preços
                </Typography>
                <Typography>Diária Base: R$ {property.basePrice}</Typography>
                <Typography>Taxa de Limpeza: R$ {property.cleaningFee}</Typography>
                <Typography>Depósito de Segurança: R$ {property.securityDeposit}</Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Mídia
                </Typography>
                <Typography>{property.photos?.length || 0} fotos carregadas</Typography>
                <Typography>{property.videos?.length || 0} vídeos carregados</Typography>
              </Box>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
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
              onClick={handleSave}
              disabled={loading || !validateStep(activeStep)}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            >
              {loading ? 'Salvando...' : 'Salvar Imóvel'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep)}
              endIcon={<NavigateNext />}
            >
              Próximo
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}