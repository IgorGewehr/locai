'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Edit,
} from '@mui/icons-material';
import ModernButton from '@/components/atoms/ModernButton';
import { useTenant } from '@/contexts/TenantContext';
import type { Client, Reservation } from '@/lib/types';
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out' | 'visit';
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'refunded';
  paymentMethod?: 'pix' | 'credit_card' | 'cash' | 'bank_transfer';
  source: 'manual' | 'whatsapp_ai' | 'website';
  notes: string;
}

const steps = [
  'Propriedade e Cliente',
  'Datas e Detalhes',
  'Confirmação'
];

export default function EditReservationPage() {
  const router = useRouter();
  const params = useParams();
  const reservationId = params?.id as string;
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
  const [originalReservation, setOriginalReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!isReady || !services || !reservationId) {
        return;
      }

      setLoadingData(true);
      try {
        // Load reservation, properties, and clients
        const [reservationData, propertiesData, clientsData] = await Promise.all([
          services.reservations.getById(reservationId),
          services.properties.getAll(),
          services.clients.getAll()
        ]);

        if (!reservationData) {
          throw new Error('Reserva não encontrada');
        }

        setOriginalReservation(reservationData);

        // Process properties
        setProperties(propertiesData.map((p: any) => ({
          id: p.id,
          title: p.title,
          basePrice: p.basePrice || 0
        })));

        // Process clients
        const processedClients = clientsData.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email
        }));
        setClients(processedClients);

        // Find and set selected client
        const client = processedClients.find(c => c.id === reservationData.clientId);
        if (client) {
          setSelectedClient(client);
        }

        // Convert Firebase Timestamps to JavaScript Dates
        const checkInDate = reservationData.checkIn instanceof Date
          ? reservationData.checkIn
          : reservationData.checkIn?.toDate ? reservationData.checkIn.toDate() : new Date(reservationData.checkIn);
        const checkOutDate = reservationData.checkOut instanceof Date
          ? reservationData.checkOut
          : reservationData.checkOut?.toDate ? reservationData.checkOut.toDate() : new Date(reservationData.checkOut);

        // Populate form with existing data
        setFormData({
          propertyId: reservationData.propertyId || '',
          clientId: reservationData.clientId || '',
          clientName: client?.name || '',
          clientPhone: client?.phone || '',
          clientEmail: client?.email || '',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests: reservationData.guests || 1,
          totalAmount: reservationData.totalPrice || reservationData.totalAmount || 0,
          status: reservationData.status || 'pending',
          paymentStatus: reservationData.paymentStatus || 'pending',
          paymentMethod: reservationData.paymentMethod,
          source: reservationData.source || 'manual',
          notes: reservationData.notes || '',
        });

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [services, isReady, reservationId]);

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
    if (!isReady || !services || !reservationId) {
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
          tenantId: tenantId,
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

      // Preparar dados para atualização
      const updateData = {
        propertyId: formData.propertyId,
        clientId: finalClientId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: formData.guests,
        totalPrice: formData.totalAmount, // Usar totalPrice para manter compatibilidade
        totalAmount: formData.totalAmount, // Também manter totalAmount se usado
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        source: formData.source,
        notes: formData.notes,
        updatedAt: new Date(),
      };

      // Update reservation using tenant services
      await services.reservations.update(reservationId, updateData);

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/reservations');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar reserva. Tente novamente.');
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
        return formData.totalAmount >= 0; // Permitir valor 0 para visitas
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
                  value={properties.find(p => p.id === formData.propertyId) || null}
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
                    value={selectedClient}
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
                      if (value) {
                        handleInputChange('clientName', value.name);
                        handleInputChange('clientPhone', value.phone);
                        handleInputChange('clientEmail', value.email);
                      }
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

            {/* Reservation Details */}
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Group sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Detalhes da Reserva</Typography>
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
                  <Grid item xs={12} sm={6} key="status">
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={formData.status}
                        label="Status"
                        onChange={(e) => handleInputChange('status', e.target.value)}
                      >
                        <MenuItem value="pending">Pendente</MenuItem>
                        <MenuItem value="confirmed">Confirmada</MenuItem>
                        <MenuItem value="checked_in">Check-in</MenuItem>
                        <MenuItem value="checked_out">Check-out</MenuItem>
                        <MenuItem value="cancelled">Cancelada</MenuItem>
                        <MenuItem value="visit">Visita</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} key="payment-status">
                    <FormControl fullWidth>
                      <InputLabel>Status do Pagamento</InputLabel>
                      <Select
                        value={formData.paymentStatus}
                        label="Status do Pagamento"
                        onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                      >
                        <MenuItem value="pending">Pendente</MenuItem>
                        <MenuItem value="paid">Pago</MenuItem>
                        <MenuItem value="overdue">Atrasado</MenuItem>
                        <MenuItem value="refunded">Reembolsado</MenuItem>
                      </Select>
                    </FormControl>
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
                  <Typography variant="h6">Confirmação das Alterações</Typography>
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
            Editar Reserva
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Edite os dados da reserva #{reservationId?.slice(-6).toUpperCase()}
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
                  Salvar Alterações
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
          Reserva atualizada com sucesso! Redirecionando...
        </Alert>
      </Snackbar>
    </Box>
  );
}