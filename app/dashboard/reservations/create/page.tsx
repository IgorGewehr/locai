'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Paper,
  Autocomplete,
  Avatar,
  Chip,
  Stack,
  Divider,
  InputAdornment,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Step,
  StepLabel,
  Stepper,
  StepContent,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowBack,
  Save,
  Home,
  Person,
  CalendarMonth,
  AttachMoney,
  Phone,
  Email,
  Group,
  Payment,
  Check,
  Add,
  Business,
  LocationOn,
  EventAvailable,
  CreditCard,
  Pix,
  NavigateNext,
  NavigateBefore,
  CheckCircle,
  PersonAdd,
} from '@mui/icons-material';
import ModernButton from '@/components/atoms/ModernButton';
import { useTenant } from '@/contexts/TenantContext';
import type { Client } from '@/lib/types';
import { clientServiceWrapper } from '@/lib/services/client-service';

interface ReservationFormData {
  propertyId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paymentMethod?: 'pix' | 'credit_card' | 'cash' | 'bank_transfer';
  source: 'manual' | 'whatsapp_ai' | 'website';
  notes: string;
}

const steps = [
  'Propriedade e Cliente',
  'Datas e Detalhes',
  'Confirmação'
];

export default function CreateReservationPage() {
  const router = useRouter();
  const { services, isReady, tenantId } = useTenant();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<ReservationFormData>({
    propertyId: '',
    clientId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    checkIn: null,
    checkOut: null,
    guests: 1,
    totalAmount: 0,
    status: 'pending',
    paymentStatus: 'pending',
    source: 'manual',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [properties, setProperties] = useState<Array<{ id: string; title: string; basePrice: number }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; phone: string; email: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; phone: string; email: string } | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!isReady || !services) {
        return;
      }

      setLoadingData(true);
      try {
        // Load properties using tenant services
        const [propertiesData, clientsData] = await Promise.all([
          services.properties.getAll(),
          services.clients.getAll()
        ]);

        // Process properties
        setProperties(propertiesData.map((p: any) => ({ 
          id: p.id, 
          title: p.title, 
          basePrice: p.basePrice || 0 
        })));

        // Process clients
        setClients(clientsData.map((c: any) => ({ 
          id: c.id, 
          name: c.name, 
          phone: c.phone, 
          email: c.email 
        })));
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [services, isReady]);

  const handleInputChange = (field: keyof ReservationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleNewClientToggle = () => {
    setIsNewClient(!isNewClient);
    if (!isNewClient) {
      setSelectedClient(null);
      handleInputChange('clientId', '');
    } else {
      handleInputChange('clientName', '');
      handleInputChange('clientPhone', '');
      handleInputChange('clientEmail', '');
    }
  };

  const handleSubmit = async () => {
    if (!isReady || !services) {
      setError('Serviços não estão prontos. Tente novamente.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let finalClientId = formData.clientId;

      // Se for um novo cliente, criar primeiro
      if (isNewClient) {
        // Validações básicas
        if (!formData.clientName.trim() || formData.clientName.trim().length < 2) {
          throw new Error('Nome do cliente deve ter pelo menos 2 caracteres');
        }
        
        if (!formData.clientPhone.replace(/\D/g, '') || formData.clientPhone.replace(/\D/g, '').length < 10) {
          throw new Error('Telefone deve ter pelo menos 10 dígitos');
        }

        // Validar se temos tenantId
        if (!tenantId) {
          throw new Error('TenantId não encontrado');
        }

        // Preparar dados do cliente seguindo o padrão do CreateClientDialog
        const clientData = {
          name: formData.clientName.trim(),
          phone: formData.clientPhone.replace(/\D/g, ''),
          tenantId: tenantId, // IMPORTANTE: Adicionar tenantId
          source: 'manual' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Adicionar campos opcionais apenas se preenchidos
        if (formData.clientEmail && formData.clientEmail.trim()) {
          // Validação básica de email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData.clientEmail.trim())) {
            throw new Error('E-mail deve ter um formato válido');
          }
          clientData.email = formData.clientEmail.trim();
        }

        // Usar o ClientService diretamente (com validação de duplicatas)
        const createdClient = await clientServiceWrapper.create(clientData);
        console.log('🔍 Cliente criado:', createdClient);
        finalClientId = createdClient.id;
      }

      // Validar se temos um clientId válido
      if (!finalClientId) {
        throw new Error('Erro: ID do cliente não foi definido');
      }

      // Validações adicionais
      if (!formData.propertyId) {
        throw new Error('Por favor, selecione uma propriedade');
      }

      if (!formData.checkIn || !formData.checkOut) {
        throw new Error('Por favor, selecione as datas de check-in e check-out');
      }

      if (formData.checkOut <= formData.checkIn) {
        throw new Error('A data de check-out deve ser posterior à data de check-in');
      }

      if (formData.guests < 1) {
        throw new Error('O número de hóspedes deve ser pelo menos 1');
      }

      if (formData.totalAmount <= 0) {
        throw new Error('O valor total deve ser maior que zero');
      }

      // Criar a reserva com o ID do cliente (novo ou existente)
      const reservationData = {
        propertyId: formData.propertyId,
        clientId: finalClientId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: formData.guests,
        totalAmount: formData.totalAmount,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        source: formData.source,
        notes: formData.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create reservation using tenant services
      console.log('[CreateReservation] Criando reserva com dados:', reservationData);

      const createdReservation = await services.reservations.create(reservationData);

      console.log('[CreateReservation] Reserva criada com sucesso:', createdReservation);

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/reservations');
      }, 2000);
    } catch (err) {
      console.error('[CreateReservation] Erro ao criar reserva:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar reserva. Tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        const hasProperty = formData.propertyId;
        const hasClient = isNewClient 
          ? (formData.clientName && formData.clientPhone)
          : (selectedClient && formData.clientId);
        return hasProperty && hasClient;
      case 1:
        return formData.checkIn && formData.checkOut && formData.guests > 0;
      case 2:
        return formData.totalAmount > 0;
      default:
        return false;
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={4}>
            {/* Property Selection */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Business sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Selecionar Propriedade</Typography>
                </Box>
                <Autocomplete
                  options={properties}
                  getOptionLabel={(option) => option.title}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Propriedade"
                      placeholder="Digite para buscar..."
                      required
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={key || `property-${option.id}`} {...otherProps}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Home sx={{ mr: 2, color: 'text.secondary' }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {option.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Preço base: R$ {option.basePrice.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  }}
                  onChange={(_, value) => handleInputChange('propertyId', value?.id || '')}
                  loading={loadingData}
                />
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Person sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Cliente</Typography>
                  </Box>
                  <Button
                    variant={isNewClient ? "contained" : "outlined"}
                    startIcon={<PersonAdd />}
                    onClick={handleNewClientToggle}
                    size="small"
                  >
                    {isNewClient ? "Cancelar" : "Novo Cliente"}
                  </Button>
                </Box>

                {!isNewClient ? (
                  <Autocomplete
                    options={clients}
                    getOptionLabel={(option) => option.name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Cliente Existente"
                        placeholder="Digite para buscar..."
                        required
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={key || `client-${option.id}`} {...otherProps}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Avatar sx={{ mr: 2, width: 32, height: 32, fontSize: '0.875rem' }}>
                              {option.name ? option.name.charAt(0) : '?'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {option.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.phone} • {option.email}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    }}
                    onChange={(_, value) => {
                      setSelectedClient(value);
                      handleInputChange('clientId', value?.id || '');
                    }}
                    loading={loadingData}
                  />
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12} key="client-name">
                      <TextField
                        fullWidth
                        label="Nome do Cliente"
                        value={formData.clientName}
                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                        required
                        InputProps={{
                          startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} key="client-phone">
                      <TextField
                        fullWidth
                        label="Telefone"
                        value={formData.clientPhone}
                        onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                        required
                        InputProps={{
                          startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} key="client-email">
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={4}>
            {/* Date Selection */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarMonth sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Datas da Reserva</Typography>
                </Box>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} key="checkin-date">
                      <DatePicker
                        label="Check-in"
                        value={formData.checkIn}
                        onChange={(date) => handleInputChange('checkIn', date)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} key="checkout-date">
                      <DatePicker
                        label="Check-out"
                        value={formData.checkOut}
                        onChange={(date) => handleInputChange('checkOut', date)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            required: true,
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              </CardContent>
            </Card>

            {/* Guest Details */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Group sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Detalhes da Hospedagem</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} key="guests-count">
                    <TextField
                      fullWidth
                      label="Número de Hóspedes"
                      type="number"
                      value={formData.guests || 1}
                      onChange={(e) => handleInputChange('guests', Number(e.target.value) || 1)}
                      InputProps={{ 
                        inputProps: { min: 1 },
                        startAdornment: <Group sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} key="total-amount">
                    <TextField
                      fullWidth
                      label="Valor Total"
                      type="number"
                      value={formData.totalAmount || 0}
                      onChange={(e) => handleInputChange('totalAmount', Number(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                      }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} key="notes">
                    <TextField
                      fullWidth
                      label="Observações"
                      multiline
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Observações adicionais sobre a reserva..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        );

      case 2:
        const selectedProperty = properties.find(p => p.id === formData.propertyId);
        const client = isNewClient ? 
          { name: formData.clientName, phone: formData.clientPhone, email: formData.clientEmail } :
          selectedClient;

        return (
          <Stack spacing={4}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">Confirmação da Reserva</Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6} key="property-info">
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Propriedade
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Home sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2">
                          {selectedProperty?.title || 'Propriedade não selecionada'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AttachMoney sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2">
                          Preço base: R$ {selectedProperty?.basePrice.toLocaleString() || '0'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6} key="client-info">
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Cliente
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2">
                          {client?.name || 'Cliente não selecionado'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                        <Typography variant="body2">
                          {client?.phone || 'Telefone não informado'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} key="reservation-details">
                    <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Detalhes da Reserva
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3} key="checkin-detail">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Check-in
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formData.checkIn?.toLocaleDateString('pt-BR') || 'Não informado'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3} key="checkout-detail">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Check-out
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formData.checkOut?.toLocaleDateString('pt-BR') || 'Não informado'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3} key="guests-detail">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Hóspedes
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {formData.guests} {formData.guests === 1 ? 'pessoa' : 'pessoas'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3} key="total-detail">
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Valor Total
                            </Typography>
                            <Typography variant="h6" color="primary.main" fontWeight={600}>
                              R$ {formData.totalAmount.toLocaleString()}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        );

      default:
        return null;
    }
  };

  if (!isReady || !services || loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Nova Reserva
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Crie uma nova reserva seguindo os passos abaixo
        </Typography>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={`step-${index}`}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Content */}
      <Box sx={{ mb: 4 }}>
        {getStepContent(activeStep)}
      </Box>

      {/* Actions */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              {activeStep > 0 && (
                <Button
                  onClick={handleBack}
                  startIcon={<NavigateBefore />}
                  variant="outlined"
                >
                  Voltar
                </Button>
              )}
            </Box>
            <Box>
              {activeStep < steps.length - 1 ? (
                <ModernButton
                  onClick={handleNext}
                  disabled={!isStepValid(activeStep)}
                  variant="primary"
                  icon={<NavigateNext />}
                >
                  Próximo
                </ModernButton>
              ) : (
                <ModernButton
                  onClick={handleSubmit}
                  disabled={!isStepValid(activeStep)}
                  loading={loading}
                  variant="elegant"
                  icon={<Save />}
                >
                  Criar Reserva
                </ModernButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Snackbars */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success">
          Reserva criada com sucesso! Redirecionando...
        </Alert>
      </Snackbar>
    </Box>
  );
}