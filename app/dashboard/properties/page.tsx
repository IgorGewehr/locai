'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@mui/material';
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
} from '@mui/icons-material';
import type { Property } from '@/lib/types';

// Mock data
const mockProperties: Property[] = [
  {
    id: '1',
    name: 'Casa na Praia - Ipanema',
    type: 'house',
    description: 'Linda casa de frente para o mar com vista deslumbrante',
    address: {
      street: 'Rua Vieira Souto',
      number: '500',
      neighborhood: 'Ipanema',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22420-000',
      country: 'Brasil',
    },
    coordinates: { lat: -22.9838, lng: -43.2096 },
    bedrooms: 4,
    bathrooms: 3,
    capacity: 8,
    area: 250,
    amenities: ['pool', 'wifi', 'parking', 'airConditioning', 'kitchen', 'beachAccess'],
    photos: [{ url: '/api/placeholder/400/300', order: 1, type: 'photo' }],
    basePrice: 800,
    weekendMultiplier: 1.2,
    holidayMultiplier: 1.5,
    minimumStay: 3,
    cleaningFee: 150,
    securityDeposit: 1000,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    status: 'active',
    availability: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Apartamento Vista Mar - Copacabana',
    type: 'apartment',
    description: 'Apartamento moderno com vista panorâmica',
    address: {
      street: 'Av. Atlântica',
      number: '2000',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22021-000',
      country: 'Brasil',
    },
    coordinates: { lat: -22.9711, lng: -43.1823 },
    bedrooms: 2,
    bathrooms: 2,
    capacity: 4,
    area: 120,
    amenities: ['wifi', 'airConditioning', 'kitchen', 'elevator', 'gym'],
    photos: [{ url: '/api/placeholder/400/300', order: 1, type: 'photo' }],
    basePrice: 450,
    weekendMultiplier: 1.3,
    holidayMultiplier: 1.7,
    minimumStay: 2,
    cleaningFee: 100,
    securityDeposit: 500,
    checkInTime: '15:00',
    checkOutTime: '10:00',
    status: 'active',
    availability: [],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20'),
  },
];

const propertyTypeIcons: Record<string, React.ReactNode> = {
  apartment: <Apartment />,
  house: <House />,
  villa: <Villa />,
  studio: <Home />,
};

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(mockProperties);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(property => property.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(property => property.status === statusFilter);
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
    if (selectedProperty) {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setProperties(prev => prev.filter(p => p.id !== selectedProperty.id));
      setDeleteDialogOpen(false);
      setSelectedProperty(null);
    }
  };

  const handleDuplicate = () => {
    if (selectedProperty) {
      const duplicated = {
        ...selectedProperty,
        id: Date.now().toString(),
        name: `${selectedProperty.name} (Cópia)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setProperties(prev => [...prev, duplicated]);
      handleMenuClose();
    }
  };

  const getStatusChip = (status: Property['status']) => {
    const config = {
      active: { label: 'Ativo', color: 'success' as const, icon: <CheckCircle /> },
      inactive: { label: 'Inativo', color: 'error' as const, icon: <Block /> },
      maintenance: { label: 'Manutenção', color: 'warning' as const, icon: <Schedule /> },
    };

    const { label, color, icon } = config[status];
    return <Chip label={label} color={color} size="small" icon={icon} />;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Imóveis
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => router.push('/dashboard/properties/create')}
        >
          Novo Imóvel
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar por nome, cidade ou bairro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={typeFilter}
                  label="Tipo"
                  onChange={(e) => setTypeFilter(e.target.value)}
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
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                  <MenuItem value="maintenance">Manutenção</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Chip
                  label={`${filteredProperties.length} imóveis`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <Grid container spacing={3}>
        {filteredProperties.map((property) => (
          <Grid item xs={12} sm={6} md={4} key={property.id}>
            <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                image={property.photos[0]?.url || '/api/placeholder/400/300'}
                alt={property.name}
                sx={{ objectFit: 'cover' }}
              />
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                    {property.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, property)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  {propertyTypeIcons[property.type]}
                  <Typography variant="body2" color="text.secondary">
                    {property.type === 'apartment' ? 'Apartamento' : 
                     property.type === 'house' ? 'Casa' :
                     property.type === 'villa' ? 'Villa' : 'Studio'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {property.address.neighborhood}, {property.address.city}
                  </Typography>
                </Box>

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Bed fontSize="small" color="action" />
                      <Typography variant="body2">{property.bedrooms}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Group fontSize="small" color="action" />
                      <Typography variant="body2">{property.capacity}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachMoney fontSize="small" color="action" />
                      <Typography variant="body2">{property.basePrice}</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getStatusChip(property.status)}
                  <Typography variant="body2" color="text.secondary">
                    {property.area}m²
                  </Typography>
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => router.push(`/dashboard/properties/${property.id}`)}
                >
                  Visualizar
                </Button>
                <Button
                  size="small"
                  color="primary"
                  startIcon={<Edit />}
                  onClick={() => router.push(`/dashboard/properties/${property.id}/edit`)}
                >
                  Editar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
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
            Tem certeza que deseja excluir o imóvel "{selectedProperty?.name}"?
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

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => router.push('/dashboard/properties/create')}
      >
        <Add />
      </Fab>
    </Box>
  );
}