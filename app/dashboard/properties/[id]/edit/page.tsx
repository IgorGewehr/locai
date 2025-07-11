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
import PropertyBasicInfo from '@/components/organisms/PropertyBasicInfo/PropertyBasicInfo';
import PropertySpecs from '@/components/organisms/PropertySpecs/PropertySpecs';
import PropertyAmenities from '@/components/organisms/PropertyAmenities/PropertyAmenities';
import PropertyPricing from '@/components/organisms/PropertyPricing/PropertyPricing';
import PropertyMediaUpload from '@/components/organisms/PropertyMediaUpload/PropertyMediaUpload';
import type { Property, PricingRule } from '@/lib/types';

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
  { value: 'apartment', label: 'Apartamento', icon: <Apartment /> },
  { value: 'house', label: 'Casa', icon: <House /> },
  { value: 'villa', label: 'Villa', icon: <Villa /> },
  { value: 'studio', label: 'Studio', icon: <Home /> },
];


export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [property, setProperty] = useState<Property | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  useEffect(() => {
    // Load property data from Firebase
    const loadProperty = async () => {
      try {
        const response = await fetch(`/api/properties/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch property');
        }
        
        const propertyData = await response.json();
        setProperty(propertyData);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar propriedade');
        setLoading(false);
      }
    };

    loadProperty();
  }, [params.id]);

  const handlePropertyChange = (updates: Partial<Property>) => {
    if (property) {
      setProperty({ ...property, ...updates });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...property,
          pricingRules,
          updatedAt: new Date(),
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar alterações');
      }

      setHasChanges(false);
      alert('Alterações salvas com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: Property['status']) => {
    if (property) {
      setProperty({ ...property, status: newStatus });
      setHasChanges(true);
      setShowStatusDialog(false);
    }
  };

  const getStatusChip = () => {
    if (!property) return null;

    const config = {
      active: { label: 'Ativo', color: 'success' as const, icon: <CheckCircle /> },
      inactive: { label: 'Inativo', color: 'error' as const, icon: <Block /> },
      maintenance: { label: 'Manutenção', color: 'warning' as const, icon: <Schedule /> },
    };

    const { label, color, icon } = config[property.status];
    return (
      <Chip
        label={label}
        color={color}
        icon={icon}
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

  if (error || !property) {
    return (
      <Alert severity="error">
        {error || 'Propriedade não encontrada'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Editar Imóvel
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Typography variant="h6" color="text.secondary">
              {property.name}
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
            onClick={handleSave}
            disabled={saving || !hasChanges}
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

      {hasChanges && (
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
            <PropertyBasicInfo
              property={property}
              onChange={handlePropertyChange}
              propertyTypes={propertyTypes}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <PropertySpecs
              property={property}
              onChange={handlePropertyChange}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <PropertyAmenities
              selectedAmenities={property.amenities}
              onChange={(amenities) => handlePropertyChange({ amenities })}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <PropertyPricing
              property={property}
              pricingRules={pricingRules}
              onPropertyChange={handlePropertyChange}
              onPricingRulesChange={setPricingRules}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <PropertyMediaUpload
              photos={property.photos}
              videos={property.videos}
              onPhotosChange={(photos) => handlePropertyChange({ photos })}
              onVideosChange={(videos) => handlePropertyChange({ videos })}
            />
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
              variant={property.status === 'active' ? 'contained' : 'outlined'}
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => handleStatusChange('active')}
              fullWidth
            >
              Ativo - Disponível para reservas
            </Button>
            <Button
              variant={property.status === 'inactive' ? 'contained' : 'outlined'}
              color="error"
              startIcon={<Block />}
              onClick={() => handleStatusChange('inactive')}
              fullWidth
            >
              Inativo - Não disponível
            </Button>
            <Button
              variant={property.status === 'maintenance' ? 'contained' : 'outlined'}
              color="warning"
              startIcon={<Schedule />}
              onClick={() => handleStatusChange('maintenance')}
              fullWidth
            >
              Manutenção - Temporariamente indisponível
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
  );
}