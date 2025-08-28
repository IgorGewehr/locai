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
import { ApiClient } from '@/lib/utils/api-client';

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
  const { services, tenantId, isReady } = useTenant();
  
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
      // ✅ CORREÇÃO: Manter mesma lógica da criação - preservar objetos PropertyPhoto/PropertyVideo
      console.log('[EditProperty] Processing media data...', {
        photosCount: data.photos?.length || 0,
        videosCount: data.videos?.length || 0,
        photosTypes: data.photos?.map(p => typeof p),
        videosTypes: data.videos?.map(v => typeof v)
      });

      // Filtrar apenas URLs Firebase válidas, mantendo estrutura de objeto
      const validPhotos = (data.photos || []).filter(photo => {
        const url = typeof photo === 'string' ? photo : photo?.url;
        return url && url.includes('firebasestorage.googleapis.com');
      });

      const validVideos = (data.videos || []).filter(video => {
        const url = typeof video === 'string' ? video : video?.url;
        return url && url.includes('firebasestorage.googleapis.com');
      });

      console.log('[EditProperty] Filtered media:', {
        validPhotosCount: validPhotos.length,
        validVideosCount: validVideos.length,
        photosData: validPhotos.map(p => ({
          type: typeof p,
          hasUrl: !!(typeof p === 'string' ? p : p?.url),
          isFirebase: (typeof p === 'string' ? p : p?.url)?.includes('firebasestorage.googleapis.com')
        }))
      });

      // ✅ CORREÇÃO: Manter consistência com criação - preservar objetos completos
      const cleanData: any = {
        ...data,
        photos: validPhotos,        // Manter objetos PropertyPhoto completos
        videos: validVideos,        // Manter objetos PropertyVideo completos
        amenities: data.amenities || [],
        unavailableDates: data.unavailableDates || [],
        customPricing: data.customPricing || {},
      };


      const finalPayload = {
        ...cleanData,
        pricingRules,
        updatedAt: new Date(),
      };

      console.log('[EditProperty] Sending to API:', {
        hasPhotos: !!finalPayload.photos,
        photosCount: finalPayload.photos?.length || 0,
        photosPreview: finalPayload.photos?.slice(0, 2).map(p => ({
          type: typeof p,
          hasUrl: !!(typeof p === 'string' ? p : p?.url),
          urlPrefix: (typeof p === 'string' ? p : p?.url)?.substring(0, 50)
        })),
        hasVideos: !!finalPayload.videos,
        videosCount: finalPayload.videos?.length || 0,
        title: finalPayload.title,
        description: finalPayload.description,
        address: finalPayload.address
      });

      const response = await ApiClient.put(`/api/properties/${propertyId}`, finalPayload);

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