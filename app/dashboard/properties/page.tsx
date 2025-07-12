'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { propertyService } from '@/lib/firebase/firestore';
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
import type { Property } from '@/lib/types/property';

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

  // Load properties from Firebase
  useEffect(() => {
    const loadProperties = async () => {
      try {
        const propertiesData = await propertyService.getAll();
        setProperties(propertiesData);
      } catch (error) {

      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  useEffect(() => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Note: The Property type doesn't have a 'type' field, so we'll skip type filtering for now
    // or map to another field

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
    if (selectedProperty) {
      try {
        await propertyService.delete(selectedProperty.id);
        setProperties(prev => prev.filter(p => p.id !== selectedProperty.id));
        setDeleteDialogOpen(false);
        setSelectedProperty(null);
      } catch (error) {

      }
    }
  };

  const handleDuplicate = async () => {
    if (selectedProperty) {
      try {
        const duplicated = {
          ...selectedProperty,
          title: `${selectedProperty.title} (Cópia)`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        delete (duplicated as any).id; // Remove id so Firebase generates a new one
        const newProperty = await propertyService.create(duplicated as Omit<Property, 'id'>);
        setProperties(prev => [...prev, newProperty]);
        handleMenuClose();
      } catch (error) {

      }
    }
  };

  // Removed getStatusChip function as status field doesn't exist in current Property interface

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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4, width: '100%' }}>
            <CircularProgress />
          </Box>
        ) : filteredProperties.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4, width: '100%' }}>
            <Typography color="text.secondary">
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
                borderRadius: 3,
                transition: 'all 0.3s ease-in-out',
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
                  image={property.photos[0]?.url || '/api/placeholder/400/300'}
                  alt={property.title}
                  className="property-image"
                  sx={{ 
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease-in-out',
                  }}
                />

                {/* Property Type Badge */}
                <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                  <Chip
                    icon={propertyTypeIcons[property.category] || <Home />}
                    label={property.category.charAt(0).toUpperCase() + property.category.slice(1)}
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
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'white',
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
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'white',
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
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'white',
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AttachMoney fontSize="small" color="success" />
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      R$ {property.basePrice}
                    </Typography>
                  </Box>
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