'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Badge,
  Avatar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import ModernButton from '@/components/atoms/ModernButton';
import ModernFAB from '@/components/atoms/ModernFAB';
import PropertyPriceDisplay from '@/components/atoms/PropertyPriceDisplay';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  ContentCopy,
  Home,
  Apartment,
  Villa,
  House,
  LocationOn,
  Bed,
  Group,
  AttachMoney,
  CheckCircle,
  Block,
  Schedule,
  CloudUpload,
  Policy,
  Business,
} from '@mui/icons-material';
import type { Property } from '@/lib/types/property';
import PropertyImportDialog from '@/components/organisms/PropertyImport/PropertyImportDialog';
import CancellationPolicyEditor from '@/app/dashboard/settings/components/CancellationPolicyEditor';
import type { CancellationPolicy } from '@/lib/services/settings-service';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

const propertyTypeIcons: Record<string, React.ReactElement> = {
  apartment: <Apartment />,
  house: <House />,
  villa: <Villa />,
  studio: <Home />,
};

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [companyAddress, setCompanyAddress] = useState({
    address: '',
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Brasil'
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const { services, isReady, tenantId } = useTenant();

  // Create local SVG placeholder for property images
  const createPropertyPlaceholder = (text: string, width: number = 400, height: number = 300) => {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" 
              fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Load properties from Firebase
  useEffect(() => {
    const loadProperties = async () => {
      if (!services || !isReady) return;

      try {
        const propertiesData = await services.properties.getAll();
        setProperties(propertiesData);
      } catch (error) {
        // Property loading error handled
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [services, isReady]);

  // Load cancellation policy
  useEffect(() => {
    const loadPolicy = async () => {
      if (!tenantId || !isReady) return;

      try {
        const { createSettingsService } = await import('@/lib/services/settings-service');
        const settingsService = createSettingsService(tenantId);
        const settings = await settingsService.getSettings(tenantId);

        if (settings?.cancellationPolicy) {
          setCancellationPolicy(settings.cancellationPolicy);
        } else {
          // ✅ CORREÇÃO: Fornecer política padrão se não existir
          setCancellationPolicy({
            enabled: true,
            rules: [
              { daysBeforeCheckIn: 7, refundPercentage: 100, description: 'Reembolso total' },
              { daysBeforeCheckIn: 3, refundPercentage: 50, description: 'Reembolso parcial' },
              { daysBeforeCheckIn: 0, refundPercentage: 0, description: 'Sem reembolso' },
            ],
            defaultRefundPercentage: 0,
            forceMajeure: true,
          });
        }
      } catch (error) {
        // ✅ CORREÇÃO: Mesmo em erro, fornecer política padrão
        setCancellationPolicy({
          enabled: true,
          rules: [
            { daysBeforeCheckIn: 7, refundPercentage: 100, description: 'Reembolso total' },
            { daysBeforeCheckIn: 3, refundPercentage: 50, description: 'Reembolso parcial' },
            { daysBeforeCheckIn: 0, refundPercentage: 0, description: 'Sem reembolso' },
          ],
          defaultRefundPercentage: 0,
          forceMajeure: true,
        });
      }
    };

    loadPolicy();
  }, [tenantId, isReady]);

  useEffect(() => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (property.city && property.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (property.neighborhood && property.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by type (mapping typeFilter to property.category)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(property => property.category === typeFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(property => property.isActive);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(property => !property.isActive);
      }
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, typeFilter, statusFilter]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, property: Property) => {
    setAnchorEl(event.currentTarget);
    setSelectedProperty(property);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (selectedProperty && services) {
      try {
        await services.properties.delete(selectedProperty.id);
        setProperties(prev => prev.filter(p => p.id !== selectedProperty.id));
        setDeleteDialogOpen(false);
        setSelectedProperty(null);
      } catch (error) {
        // Property deletion error handled
      }
    }
  };

  const handleDuplicate = async () => {
    if (selectedProperty && services) {
      try {
        const duplicated = {
          ...selectedProperty,
          title: `${selectedProperty.title} (Cópia)`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        delete (duplicated as any).id; // Remove id so Firebase generates a new one
        const newPropertyId = await services.properties.create(duplicated as Omit<Property, 'id'>);
        
        // Reload properties to get the new one
        const propertiesData = await services.properties.getAll();
        setProperties(propertiesData);
        
        handleMenuClose();
      } catch (error) {
        // Property duplication error handled

      }
    }
  };

  const handleImportSuccess = async (result: any) => {
    // Reload properties after successful import
    if (services && isReady) {
      try {
        const propertiesData = await services.properties.getAll();
        setProperties(propertiesData);
      } catch (error) {
        // Property loading error handled
      }
    }
    setImportDialogOpen(false);
  };

  const handleSavePolicy = async (policy: CancellationPolicy) => {
    if (!tenantId) return;

    setSavingPolicy(true);
    try {
      const { createSettingsService } = await import('@/lib/services/settings-service');
      const settingsService = createSettingsService(tenantId);
      await settingsService.updateCancellationPolicy(tenantId, policy);
      setCancellationPolicy(policy);
    } catch (error) {
      // Policy save error handled
    } finally {
      setSavingPolicy(false);
    }
  };

  // Load company address
  useEffect(() => {
    const loadAddress = async () => {
      if (!tenantId || !isReady) return;

      try {
        const { createSettingsService } = await import('@/lib/services/settings-service');
        const settingsService = createSettingsService(tenantId);
        const settings = await settingsService.getSettings(tenantId);

        if (settings?.company) {
          setCompanyAddress({
            address: settings.company.address || '',
            street: settings.company.street || '',
            neighborhood: settings.company.neighborhood || '',
            city: settings.company.city || '',
            state: settings.company.state || '',
            zipCode: settings.company.zipCode || '',
            country: settings.company.country || 'Brasil'
          });
        }
      } catch (error) {
        // Address loading error handled silently
      }
    };

    loadAddress();
  }, [tenantId, isReady]);

  const handleSaveAddress = async () => {
    if (!tenantId) return;

    setSavingAddress(true);
    try {
      const { createSettingsService } = await import('@/lib/services/settings-service');
      const settingsService = createSettingsService(tenantId);

      await settingsService.updateCompanySettings(tenantId, {
        address: companyAddress.address,
        street: companyAddress.street,
        neighborhood: companyAddress.neighborhood,
        city: companyAddress.city,
        state: companyAddress.state,
        zipCode: companyAddress.zipCode,
        country: companyAddress.country
      });

      setAddressDialogOpen(false);
    } catch (error) {
      // Address save error handled
    } finally {
      setSavingAddress(false);
    }
  };

  // Removed getStatusChip function as status field doesn't exist in current Property interface

  return (
    <Box>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: { xs: 2, md: 3 },
        gap: { xs: 1.5, md: 2 }
      }}>
        <Typography
          variant="h4"
          component="h1"
          fontWeight="bold"
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            color: 'text.primary'
          }}
        >
          Imóveis
        </Typography>
        <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}>
          <ModernButton
            variant="outlined"
            size="large"
            icon={<Policy />}
            onClick={() => setPolicyDialogOpen(true)}
            sx={{ minWidth: { xs: 'auto', sm: '160px' } }}
          >
            Políticas
          </ModernButton>
          <ModernButton
            variant="outlined"
            size="large"
            icon={<Business />}
            onClick={() => setAddressDialogOpen(true)}
            sx={{ minWidth: { xs: 'auto', sm: '160px' } }}
          >
            Endereço
          </ModernButton>
          <ModernButton
            variant="outlined"
            size="large"
            icon={<CloudUpload />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ minWidth: { xs: 'auto', sm: '160px' } }}
          >
            Importar
          </ModernButton>
          <ModernButton
            variant="elegant"
            size="large"
            icon={<Add />}
            onClick={() => router.push('/dashboard/properties/create')}
          >
            Novo Imóvel
          </ModernButton>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por nome, cidade ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: { xs: 44, md: 48 },
                    borderRadius: 2,
                  },
                  '& .MuiInputBase-input': {
                    fontSize: { xs: '0.875rem', md: '1rem' },
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ fontSize: { xs: 18, md: 20 } }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>Tipo</InputLabel>
                <Select
                  value={typeFilter}
                  label="Tipo"
                  onChange={(e) => setTypeFilter(e.target.value)}
                  sx={{
                    minHeight: { xs: 44, md: 48 },
                    borderRadius: 2,
                    '& .MuiSelect-select': {
                      fontSize: { xs: '0.875rem', md: '1rem' },
                    }
                  }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="apartment">Apartamento</MenuItem>
                  <MenuItem value="house">Casa</MenuItem>
                  <MenuItem value="villa">Villa</MenuItem>
                  <MenuItem value="studio">Studio</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    minHeight: { xs: 44, md: 48 },
                    borderRadius: 2,
                    '& .MuiSelect-select': {
                      fontSize: { xs: '0.875rem', md: '1rem' },
                    }
                  }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                  <MenuItem value="maintenance">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                justifyContent: { xs: 'center', md: 'flex-end' },
                alignItems: 'center'
              }}>
                <Chip
                  label={`${filteredProperties.length} imóveis`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    height: { xs: 28, md: 32 },
                    borderRadius: 2,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, width: '100%' }}>
            <CircularProgress />
          </Box>
        ) : filteredProperties.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4, width: '100%' }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
              Nenhuma propriedade encontrada
            </Typography>
          </Box>
        ) : (
          filteredProperties.map((property) => (
          <Grid item xs={12} sm={6} md={4} lg={3} xl={3} key={property.id}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: { xs: 2, md: 3 },
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                  '& .property-image': {
                    transform: 'scale(1.05)',
                  },
                  '& .property-actions': {
                    opacity: 1,
                    transform: 'translateY(0)',
                  }
                }
              }}
            >
              <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={(() => {
                    // Safe image URL with multiple fallbacks
                    // Handle both new structure (string[]) and legacy structure ({ url: string }[])
                    let imageUrl: string | undefined;
                    
                    if (property.photos && property.photos.length > 0) {
                      const firstPhoto = property.photos[0];
                      // New structure: string[]
                      if (typeof firstPhoto === 'string') {
                        imageUrl = firstPhoto;
                      } 
                      // Legacy structure: { url: string }[]
                      else if (firstPhoto && typeof firstPhoto === 'object' && 'url' in firstPhoto) {
                        imageUrl = (firstPhoto as any).url;
                      }
                    }
                    
                    if (imageUrl && imageUrl.startsWith('http')) {
                      return imageUrl;
                    }
                    
                    // Fallback to local placeholder
                    return createPropertyPlaceholder('Sem Imagem');
                  })()}
                  alt={property.title}
                  className="property-image"
                  onError={(e) => {
                    // Additional fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = createPropertyPlaceholder('Erro ao Carregar');
                  }}
                  sx={{ 
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease-in-out',
                    backgroundColor: '#f5f5f5',
                  }}
                />

                {/* Property Type Badge */}
                <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                  <Chip
                    icon={propertyTypeIcons[property.category] || <Home />}
                    label={property.category ? property.category.charAt(0).toUpperCase() + property.category.slice(1) : 'Outros'}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      fontWeight: 600,
                      '& .MuiChip-icon': {
                        fontSize: '16px',
                      }
                    }}
                  />
                </Box>

                {/* Status Badge */}
                <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                  <Chip
                    label={property.isActive ? 'Ativo' : 'Inativo'}
                    color={property.isActive ? 'success' : 'default'}
                    size="small"
                    icon={property.isActive ? <CheckCircle /> : <Block />}
                    sx={{
                      backgroundColor: property.isActive ? 'rgba(46, 125, 50, 0.9)' : 'rgba(158, 158, 158, 0.9)',
                      color: 'white',
                      fontWeight: 600,
                      '& .MuiChip-icon': {
                        color: 'white',
                        fontSize: '16px',
                      }
                    }}
                  />
                </Box>

                {/* Hover Actions Overlay */}
                <Box 
                  className="property-actions"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    p: 2,
                    opacity: 0,
                    transform: 'translateY(20px)',
                    transition: 'all 0.3s ease-in-out',
                    display: 'flex',
                    gap: 1,
                    justifyContent: 'center',
                  }}
                >
                  <IconButton
                    size="small"
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        transform: 'scale(1.1)',
                      }
                    }}
                    onClick={() => router.push(`/dashboard/properties/${property.id}`)}
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        transform: 'scale(1.1)',
                      }
                    }}
                    onClick={() => router.push(`/dashboard/properties/${property.id}/edit`)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        transform: 'scale(1.1)',
                      }
                    }}
                    onClick={(e) => handleMenuOpen(e, property)}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Typography 
                  variant="h6" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 700,
                    mb: 1,
                    fontSize: '1.1rem',
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {property.title}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {property.address}
                  </Typography>
                </Box>

                {/* Property Features */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Bed fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={600}>
                      {property.bedrooms}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Group fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={600}>
                      {property.maxGuests}
                    </Typography>
                  </Box>
                  <PropertyPriceDisplay property={property} variant="compact" />
                </Box>

                {/* Additional Info */}
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  {property.bedrooms} quartos • {property.bathrooms} banheiros
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )))}
      </Grid>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          router.push(`/dashboard/properties/${selectedProperty?.id}/edit`);
          handleMenuClose();
        }}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ContentCopy fontSize="small" sx={{ mr: 1 }} />
          Duplicar
        </MenuItem>
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          handleMenuClose();
        }} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o imóvel "{selectedProperty?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Property Import Dialog */}
      <PropertyImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Cancellation Policy Dialog */}
      <Dialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}>
          <Policy color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Políticas de Cancelamento
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie as regras de cancelamento para todas as propriedades
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {cancellationPolicy ? (
            <CancellationPolicyEditor
              initialPolicy={cancellationPolicy}
              onSave={handleSavePolicy}
              loading={savingPolicy}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Carregando políticas...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          px: 3,
          pb: 3,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button
            onClick={() => setPolicyDialogOpen(false)}
            disabled={savingPolicy}
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Address Dialog */}
      <Dialog
        open={addressDialogOpen}
        onClose={() => setAddressDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}>
          <Business color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Endereço da Imobiliária
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure o endereço usado pela Sofia AI para enviar localização
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Endereço Completo"
              value={companyAddress.address}
              onChange={(e) => setCompanyAddress({ ...companyAddress, address: e.target.value })}
              placeholder="Rua Exemplo, 123 - Bairro - Cidade/Estado"
              helperText="Endereço completo usado para geocodificação"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
              <TextField
                label="Rua/Avenida"
                value={companyAddress.street}
                onChange={(e) => setCompanyAddress({ ...companyAddress, street: e.target.value })}
                placeholder="Rua Exemplo, 123"
              />
              <TextField
                label="CEP"
                value={companyAddress.zipCode}
                onChange={(e) => setCompanyAddress({ ...companyAddress, zipCode: e.target.value })}
                placeholder="12345-678"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Bairro"
                value={companyAddress.neighborhood}
                onChange={(e) => setCompanyAddress({ ...companyAddress, neighborhood: e.target.value })}
                placeholder="Centro"
              />
              <TextField
                label="Cidade"
                value={companyAddress.city}
                onChange={(e) => setCompanyAddress({ ...companyAddress, city: e.target.value })}
                placeholder="São Paulo"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Estado"
                value={companyAddress.state}
                onChange={(e) => setCompanyAddress({ ...companyAddress, state: e.target.value })}
                placeholder="SP"
              />
              <TextField
                label="País"
                value={companyAddress.country}
                onChange={(e) => setCompanyAddress({ ...companyAddress, country: e.target.value })}
                placeholder="Brasil"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          px: 3,
          pb: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          gap: 1
        }}>
          <Button
            onClick={() => setAddressDialogOpen(false)}
            disabled={savingAddress}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAddress}
            disabled={savingAddress || !companyAddress.address}
          >
            {savingAddress ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <ModernFAB
        variant="elegant"
        size="large"
        tooltip="Novo Imóvel"
        icon={<Add />}
        onClick={() => router.push('/dashboard/properties/create')}
      />
    </Box>
  );
}