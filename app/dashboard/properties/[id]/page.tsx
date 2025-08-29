'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import PropertyPriceDisplay from '@/components/atoms/PropertyPriceDisplay';
import PropertyAvailabilityInfo from '@/components/molecules/PropertyAvailabilityInfo';
// import AvailabilityCalendar from '@/components/organisms/AvailabilityCalendar/AvailabilityCalendar';
import type { Property, Reservation } from '@/lib/types';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  ImageList,
  ImageListItem,
} from '@mui/material';
import {
  Edit,
  ArrowBack,
  LocationOn,
  Bed,
  Bathtub,
  Group,
  AttachMoney,
  CheckCircle,
  Cancel,
  Pets,
  Home,
  CalendarMonth,
  OpenInNew,
  Event,
  Schedule,
} from '@mui/icons-material';

export default function PropertyViewPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const { services, isReady } = useTenant();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!services || !isReady) return;
      
      try {
        setLoading(true);
        const propertyData = await services.properties.get(propertyId);
        if (propertyData) {
          setProperty(propertyData as Property);
          
          // Fetch reservations for this property
          const allReservations = await services.reservations.getMany([
            { field: 'propertyId', operator: '==', value: propertyId }
          ]);
          setReservations(allReservations.sort((a, b) => {
            const dateA = new Date(a.checkIn);
            const dateB = new Date(b.checkIn);
            return dateB.getTime() - dateA.getTime(); // Most recent first
          }) as Reservation[]);
        } else {
          setError('Propriedade não encontrada');
        }
      } catch (err) {
        setError('Erro ao carregar propriedade');
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, services, isReady]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'house': return <Home />;
      case 'apartment': return <Home />;
      case 'commercial': return <Home />;
      default: return <Home />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Propriedade não encontrada'}
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />}
          onClick={() => router.push('/dashboard/properties')}
        >
          Voltar às Propriedades
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => router.push('/dashboard/properties')}
            sx={{ mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {property.title || property.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" display="flex" alignItems="center">
              <LocationOn fontSize="small" sx={{ mr: 1 }} />
              {property.address}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => router.push(`/dashboard/properties/${propertyId}/edit`)}
        >
          Editar
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Main Image and Details */}
        <Grid item xs={12} md={8}>
          {/* Main Image */}
          {property.photos && property.photos.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardMedia
                component="img"
                height={400}
                image={(() => {
                  // Handle both string[] and PropertyPhoto[] formats
                  let imageUrl: string | undefined;
                  if (property.photos && property.photos.length > 0) {
                    const firstPhoto = property.photos[0];
                    if (typeof firstPhoto === 'string') {
                      // New structure: string[]
                      imageUrl = firstPhoto;
                    } else if (firstPhoto && typeof firstPhoto === 'object' && 'url' in firstPhoto) {
                      // Legacy structure: PropertyPhoto[]
                      imageUrl = (firstPhoto as any).url;
                    }
                  }
                  
                  if (imageUrl && imageUrl.startsWith('http')) {
                    return imageUrl;
                  }
                  // Use a data URI as fallback to avoid network requests
                  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiPkltYWdlbSBQcmluY2lwYWw8L3RleHQ+PC9zdmc+';
                })()}
                alt={property.title || property.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Set onError to null to prevent infinite loop
                  target.onerror = null;
                  // Use a data URI as final fallback
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiPkVycm8gYW8gQ2FycmVnYXI8L3RleHQ+PC9zdmc+';
                }}
                sx={{ 
                  objectFit: 'cover',
                  backgroundColor: '#f5f5f5',
                }}
              />
            </Card>
          )}

          {/* Property Details */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detalhes da Propriedade
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Bed color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Quartos
                      </Typography>
                      <Typography variant="h6">
                        {property.bedrooms || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Bathtub color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Banheiros
                      </Typography>
                      <Typography variant="h6">
                        {property.bathrooms || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Group color="primary" />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Hóspedes
                      </Typography>
                      <Typography variant="h6">
                        {property.maxGuests || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getCategoryIcon(property.category)}
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Tipo
                      </Typography>
                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                        {property.category || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {property.description && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Descrição
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {property.description}
                  </Typography>
                </Box>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Comodidades
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {property.amenities.map((amenity, index) => (
                      <Chip 
                        key={index} 
                        label={amenity} 
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Pricing */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <PropertyPriceDisplay property={property} variant="detailed" />
              <Divider sx={{ my: 2 }} />

              {property.cleaningFee && (
                <Box mb={1}>
                  <Typography variant="body2">
                    Taxa de limpeza: {formatCurrency(property.cleaningFee)}
                  </Typography>
                </Box>
              )}

              {property.pricePerExtraGuest && (
                <Box mb={1}>
                  <Typography variant="body2">
                    Pessoa extra: {formatCurrency(property.pricePerExtraGuest)}
                  </Typography>
                </Box>
              )}

              <Box mb={1}>
                <Typography variant="body2">
                  Mínimo de noites: {property.minimumNights || 1}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Availability and Custom Pricing */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <PropertyAvailabilityInfo property={property} variant="detailed" />
            </CardContent>
          </Card>

          {/* Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                {property.isActive ? (
                  <>
                    <CheckCircle color="success" />
                    <Typography color="success.main">
                      Propriedade Ativa
                    </Typography>
                  </>
                ) : (
                  <>
                    <Cancel color="error" />
                    <Typography color="error.main">
                      Propriedade Inativa
                    </Typography>
                  </>
                )}
              </Box>

              <Box display="flex" alignItems="center" gap={1} mb={2}>
                {property.allowsPets ? (
                  <>
                    <Pets color="primary" />
                    <Typography>
                      Aceita animais
                    </Typography>
                  </>
                ) : (
                  <>
                    <Cancel color="disabled" />
                    <Typography color="text.secondary">
                      Não aceita animais
                    </Typography>
                  </>
                )}
              </Box>

              {property.isFeatured && (
                <Chip 
                  label="Propriedade em Destaque" 
                  color="primary" 
                  variant="filled"
                  size="small"
                />
              )}
            </CardContent>
          </Card>

          {/* Reservations History */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Histórico de Reservas e Visitas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {reservations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma reserva ou visita agendada para este imóvel.
                </Typography>
              ) : (
                <Box>
                  {reservations.map((reservation) => {
                    const isVisit = reservation.status === 'visit' || reservation.totalPrice === 0;
                    const isPast = new Date(reservation.checkOut) < new Date();
                    const isCurrent = new Date(reservation.checkIn) <= new Date() && new Date(reservation.checkOut) >= new Date();
                    
                    return (
                      <Paper
                        key={reservation.id}
                        sx={{
                          p: 2,
                          mb: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                            transform: 'translateY(-2px)',
                            boxShadow: 2,
                          },
                          opacity: isPast ? 0.7 : 1,
                          backgroundColor: isCurrent ? 'action.selected' : 'background.paper',
                        }}
                        onClick={() => router.push(`/dashboard/reservations?id=${reservation.id}`)}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isVisit ? <Event color="info" /> : <CalendarMonth color="primary" />}
                            <Typography variant="subtitle2" fontWeight={600}>
                              {isVisit ? 'Visita Agendada' : 'Reserva'} #{reservation.id.slice(-6)}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/reservations?id=${reservation.id}`);
                          }}>
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Schedule fontSize="small" color="action" />
                            <Typography variant="body2">
                              {new Date(reservation.checkIn).toLocaleDateString('pt-BR')} - 
                              {new Date(reservation.checkOut).toLocaleDateString('pt-BR')}
                            </Typography>
                          </Box>
                          {isCurrent && (
                            <Chip label="Em andamento" color="primary" size="small" />
                          )}
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Cliente: {reservation.clientName || 'Não informado'}
                          </Typography>
                          {!isVisit && (
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatCurrency(reservation.totalPrice)}
                            </Typography>
                          )}
                        </Box>
                        
                        <Box mt={1}>
                          <Chip
                            label={
                              reservation.status === 'confirmed' ? 'Confirmada' :
                              reservation.status === 'pending' ? 'Pendente' :
                              reservation.status === 'cancelled' ? 'Cancelada' :
                              reservation.status === 'visit' ? 'Visita' : reservation.status
                            }
                            color={
                              reservation.status === 'confirmed' ? 'success' :
                              reservation.status === 'pending' ? 'warning' :
                              reservation.status === 'cancelled' ? 'error' :
                              reservation.status === 'visit' ? 'info' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Availability Calendar - Temporarily disabled during component restructure */}
      {/* 
      <Box mt={4}>
        <Card>
          <CardContent>
            <AvailabilityCalendar
              propertyId={propertyId}
              height={500}
              showLegend={true}
              showStats={true}
            />
          </CardContent>
        </Card>
      </Box>
      */}

      {/* Additional Images */}
      {property.photos && property.photos.length > 1 && (
        <Box mt={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Galeria de Fotos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <ImageList variant="masonry" cols={4} gap={8}>
                {property.photos.slice(1).map((photo, index) => (
                  <ImageListItem key={`photo-${index}`}>
                    <img
                      src={(() => {
                        // Safe image URL validation for gallery
                        if (typeof photo === 'string' && photo.startsWith('http')) {
                          return photo;
                        } else if (typeof photo === 'object' && photo.url && photo.url.startsWith('http')) {
                          return photo.url;
                        }
                        // Use data URI to avoid network requests
                        return `data:image/svg+xml;base64,${btoa(`<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#e5e7eb"/><text text-anchor="middle" x="150" y="100" font-family="Arial" font-size="18" fill="#9ca3af">Foto ${index + 2}</text></svg>`)}`;
                      })()}
                      alt={typeof photo === 'object' ? (photo.caption || `Foto ${index + 2}`) : `Foto ${index + 2}`}
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Prevent infinite loop by removing the error handler
                        target.onerror = null;
                        // Use data URI as fallback
                        target.src = `data:image/svg+xml;base64,${btoa(`<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#f5f5f5"/><text text-anchor="middle" x="150" y="100" font-family="Arial" font-size="18" fill="#9ca3af">Erro ${index + 2}</text></svg>`)}`;
                      }}
                      style={{
                        borderRadius: '8px',
                        width: '100%',
                        height: 'auto',
                        backgroundColor: '#f5f5f5',
                      }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}