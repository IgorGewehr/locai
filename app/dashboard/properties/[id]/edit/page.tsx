'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { propertyService } from '@/lib/firebase/firestore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

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

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params?.id as string;
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  const methods = useForm<Property>({
    resolver: yupResolver(propertySchema) as any,
  });

  const { handleSubmit, reset, formState: { isDirty } } = methods;

  useEffect(() => {
    // Load property data from Firebase
    const loadProperty = async () => {
      if (!propertyId) return;
      
      try {
        const property = await propertyService.getById(propertyId);
        
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
  }, [propertyId, reset]);

  const onSubmit = async (data: Property) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          pricingRules,
          updatedAt: new Date(),
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar alterações');
      }

      alert('Alterações salvas com sucesso!');
      router.push('/dashboard/properties');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          {error}
        </Alert>
        <Button onClick={() => router.push('/dashboard/properties')}>
          Voltar para Imóveis
        </Button>
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Editar Imóvel
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Typography variant="h6" color="text.secondary">
              {methods.watch('title')}
            </Typography>
            {getStatusChip()}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => router.push('/dashboard/properties')}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            onClick={handleSubmit(onSubmit)}
            disabled={saving || !isDirty}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isDirty && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Você tem alterações não salvas
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Informações Básicas" />
            <Tab label="Especificações" />
            <Tab label="Comodidades" />
            <Tab label="Precificação" />
            <Tab label="Mídia" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={activeTab} index={0}>
            <PropertyBasicInfo />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <PropertySpecs />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <PropertyAmenities />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <PropertyPricing />
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <PropertyMediaUpload />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)}>
        <DialogTitle>Alterar Status do Imóvel</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Selecione o novo status para o imóvel:
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