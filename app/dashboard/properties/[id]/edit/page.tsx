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
import AvailabilityCalendar from '@/components/organisms/AvailabilityCalendar/AvailabilityCalendar';
import { Property, PricingRule, PropertyCategory, PaymentMethod, PropertyStatus, PropertyType } from '@/lib/types/property';
import { useTenant } from '@/contexts/TenantContext';

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
  const { services, isReady } = useTenant();
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

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

  const onSubmit = async (data: Property) => {
    console.log('Form submitted with data:', data);
    setSaving(true);
    setError(null);

    try {
      // Filtrar apenas fotos com URLs válidas do Firebase
      const validPhotos = data.photos?.filter(photo => 
        photo.url && 
        photo.id &&
        photo.filename &&
        typeof photo.order === 'number' &&
        typeof photo.isMain === 'boolean' &&
        (photo.url.includes('firebasestorage.googleapis.com') || 
         photo.url.startsWith('https://'))
      ) || [];

      const validVideos = data.videos?.filter(video => 
        video.url && 
        video.id &&
        video.filename &&
        video.title &&
        typeof video.order === 'number' &&
        (video.url.includes('firebasestorage.googleapis.com') || 
         video.url.startsWith('https://'))
      ) || [];

      // Limpar dados para envio - remover campos undefined/null
      const cleanData: any = {};
      
      // Copiar apenas campos definidos
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          cleanData[key] = value;
        }
      });
      
      // Sobrescrever com dados limpos obrigatórios
      cleanData.photos = validPhotos;
      cleanData.videos = validVideos;
      cleanData.amenities = data.amenities || [];
      cleanData.unavailableDates = data.unavailableDates || [];
      cleanData.customPricing = data.customPricing || {};
      
      // Garantir booleans são definidos
      if (data.isFeatured !== undefined) cleanData.isFeatured = data.isFeatured;
      if (data.allowsPets !== undefined) cleanData.allowsPets = data.allowsPets;
      if (data.isActive !== undefined) cleanData.isActive = data.isActive;
      
      // Garantir números opcionais válidos apenas se definidos
      if (data.pricePerExtraGuest !== undefined && data.pricePerExtraGuest !== null) {
        cleanData.pricePerExtraGuest = data.pricePerExtraGuest;
      }
      if (data.minimumNights !== undefined && data.minimumNights !== null) {
        cleanData.minimumNights = data.minimumNights;
      }
      if (data.cleaningFee !== undefined && data.cleaningFee !== null) {
        cleanData.cleaningFee = data.cleaningFee;
      }

      // Debug: mostrar dados sendo enviados
      console.log('🔍 [Debug] Dados limpos para envio:', {
        totalPhotos: data.photos?.length || 0,
        validPhotos: validPhotos.length,
        totalVideos: data.videos?.length || 0,
        validVideos: validVideos.length,
        invalidPhotos: data.photos?.filter(p => !p.url?.includes('firebasestorage') && !p.url?.startsWith('https://')) || [],
        samplePhoto: validPhotos[0],
        cleanDataKeys: Object.keys(cleanData),
      });

      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cleanData,
          pricingRules,
          updatedAt: new Date(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Mostrar detalhes de validação se disponíveis
        let errorMessage = responseData.error || 'Erro ao salvar alterações';
        
        if (responseData.code === 'VALIDATION_ERROR' && responseData.details) {
          console.error('❌ [Debug] Detalhes de validação:', responseData.details);
          errorMessage += '. Verifique os dados inseridos e tente novamente.';
          
          // Log detalhado para debug
          if (responseData.details.fieldErrors) {
            console.error('Campos com erro:', responseData.details.fieldErrors);
          }
        }
        
        throw new Error(errorMessage);
      }

      setSuccessMessage('Alterações salvas com sucesso!');
      // Reset form to clear dirty state
      reset(data);
      // Redirect after 2 seconds to show success message
      setTimeout(() => {
        router.push('/dashboard/properties');
      }, 2000);
    } catch (err) {
      console.error('Error saving property:', err);
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
            disabled={saving}
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

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {isDirty && !successMessage && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Você tem alterações não salvas
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
            <Tab label="Informações Básicas" />
            <Tab label="Especificações" />
            <Tab label="Comodidades" />
            <Tab label="Precificação" />
            <Tab label="Mídia" />
            <Tab label="Disponibilidade" />
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

          <TabPanel value={activeTab} index={5}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Gerenciar Disponibilidade
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure as datas disponíveis, bloqueadas ou em manutenção para este imóvel.
              </Typography>
              <AvailabilityCalendar 
                propertyId={propertyId} 
                showLegend={true}
                showStats={true}
              />
            </Box>
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