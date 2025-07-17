'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Autocomplete,
  Avatar,
  Chip,
  Stack,
  Divider,
  InputAdornment,
  Fade,
  Slide,
  CircularProgress,
  IconButton,
  Tooltip,
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
  Search,
  Edit,
  Business,
  LocationOn,
  Schedule,
  EventAvailable,
  CreditCard,
  AccountBalance,
  Pix,
  MoneyOff,
  Info,
  Warning,
  Cancel,
  NavigateNext,
  NavigateBefore,
} from '@mui/icons-material';
import ModernButton from '@/components/atoms/ModernButton';

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
  { 
    label: 'Propriedade e Cliente', 
    icon: <Business />,
    description: 'Selecione a propriedade e o cliente'
  },
  { 
    label: 'Datas e Hóspedes', 
    icon: <CalendarMonth />,
    description: 'Defina as datas e número de hóspedes'
  },
  { 
    label: 'Pagamento e Confirmação', 
    icon: <Payment />,
    description: 'Configure o pagamento e finalize'
  }
];

export default function CreateReservationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  const [properties, setProperties] = useState<Array<{ id: string; title: string; basePrice: number }>>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string; phone: string; email: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string; phone: string; email: string } | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        // Load properties and clients in parallel
        const [propertiesResponse, clientsResponse] = await Promise.all([
          fetch('/api/properties'),
          fetch('/api/clients')
        ]);

        // Process properties
        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json();
          if (Array.isArray(propertiesData)) {
            setProperties(propertiesData.map((p: any) => ({ 
              id: p.id, 
              title: p.title, 
              basePrice: p.basePrice || 0 
            })));
          } else {
            console.error('Properties data is not an array:', propertiesData);
            setProperties([]);
          }
        } else {
          console.error('Failed to load properties:', propertiesResponse.status);
          setError('Erro ao carregar propriedades');
        }

        // Process clients
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          if (Array.isArray(clientsData)) {
            setClients(clientsData.map((c: any) => ({ 
              id: c.id, 
              name: c.name, 
              phone: c.phone, 
              email: c.email 
            })));
          } else {
            console.error('Clients data is not an array:', clientsData);
            setClients([]);
          }
        } else {
          console.error('Failed to load clients:', clientsResponse.status);
          setError('Erro ao carregar clientes');
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleInputChange = (field: keyof ReservationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const isStepComplete = (step: number) => {
    switch (step) {
      case 0:
        return formData.propertyId && formData.clientId;
      case 1:
        return formData.checkIn && formData.checkOut && formData.guests > 0;
      case 2:
        return formData.paymentMethod && formData.totalAmount > 0;
      default:
        return false;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix': return <Pix />;
      case 'credit_card': return <CreditCard />;
      case 'cash': return <AttachMoney />;
      case 'bank_transfer': return <AccountBalance />;
      default: return <Payment />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'credit_card': return 'Cartão de Crédito';
      case 'cash': return 'Dinheiro';
      case 'bank_transfer': return 'Transferência Bancária';
      default: return method;
    }
  };

  const handleClientSelection = (client: { id: string; name: string; phone: string; email: string } | null) => {
    setSelectedClient(client);
    if (client) {
      setIsNewClient(false);
      setFormData(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
      }));
    } else {
      setIsNewClient(true);
      setFormData(prev => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
      }));
    }
  };

  const handleNewClientToggle = () => {
    setIsNewClient(!isNewClient);
    setSelectedClient(null);
    setFormData(prev => ({
      ...prev,
      clientId: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
    }));
  };

  // Calculate total amount when dates or property changes
  useEffect(() => {
    if (formData.propertyId && formData.checkIn && formData.checkOut) {
      const property = properties.find(p => p.id === formData.propertyId);
      if (property) {
        const nights = Math.ceil((formData.checkOut.getTime() - formData.checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const total = property.basePrice * nights;
        handleInputChange('totalAmount', total);
      }
    }
  }, [formData.propertyId, formData.checkIn, formData.checkOut]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // If it's a new client, create the client first
      let clientId = formData.clientId;
      
      if (isNewClient && !formData.clientId) {
        const clientData = {
          name: formData.clientName,
          phone: formData.clientPhone,
          email: formData.clientEmail || undefined,
        };
        
        const clientResponse = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        
        if (clientResponse.ok) {
          const newClient = await clientResponse.json();
          clientId = newClient.id;
        } else {
          throw new Error('Erro ao criar cliente');
        }
      }

      // Create reservation data matching the API schema
      const reservationData = {
        propertyId: formData.propertyId,
        clientId: clientId,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail || undefined,
        checkIn: formData.checkIn?.toISOString(),
        checkOut: formData.checkOut?.toISOString(),
        guests: formData.guests,
        totalAmount: formData.totalAmount,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod || 'pix',
        source: formData.source,
        notes: formData.notes || undefined,
      };

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar reserva');
      }

      const result = await response.json();

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/reservations');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar reserva. Tente novamente.');
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Autocomplete
                options={properties}
                getOptionLabel={(option) => option.title}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    label="Propriedade"
                    required
                  />
                )}
                onChange={(_, value) => handleInputChange('propertyId', value?.id || '')}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="subtitle1">Cliente:</Typography>
                <Button
                  variant={isNewClient ? "contained" : "outlined"}
                  size="small"
                  onClick={handleNewClientToggle}
                >
                  {isNewClient ? "Cancelar Novo Cliente" : "Novo Cliente"}
                </Button>
              </Box>
            </Grid>
            
            {!isNewClient ? (
              <Grid item xs={12}>
                <Autocomplete
                  options={clients}
                  getOptionLabel={(option) => `${option.name} (${option.phone})`}
                  value={selectedClient}
                  onChange={(_, value) => handleClientSelection(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecionar Cliente Existente"
                      placeholder="Digite o nome ou telefone do cliente"
                      required
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="subtitle2">{option.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.phone} {option.email && `• ${option.email}`}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome do Cliente"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="E-mail do Cliente"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Telefone do Cliente"
                    value={formData.clientPhone}
                    onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                    placeholder="+55 11 99999-9999"
                    required
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Origem</InputLabel>
                <Select
                  value={formData.source}
                  label="Origem"
                  onChange={(e) => handleInputChange('source', e.target.value)}
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="whatsapp_ai">WhatsApp AI</MenuItem>
                  <MenuItem value="website">Website</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Data de Check-in"
                  value={formData.checkIn}
                  onChange={(date) => handleInputChange('checkIn', date)}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Data de Check-out"
                  value={formData.checkOut}
                  onChange={(date) => handleInputChange('checkOut', date)}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Número de Hóspedes"
                  type="number"
                  value={formData.guests}
                  onChange={(e) => handleInputChange('guests', Number(e.target.value))}
                  InputProps={{ inputProps: { min: 1 } }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
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
              {formData.checkIn && formData.checkOut && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography>
                      <strong>Período:</strong> {Math.ceil((formData.checkOut.getTime() - formData.checkIn.getTime()) / (1000 * 60 * 60 * 24))} noites
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </LocalizationProvider>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valor Total"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => handleInputChange('totalAmount', Number(e.target.value))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status da Reserva</InputLabel>
                <Select
                  value={formData.status}
                  label="Status da Reserva"
                  onChange={(e) => handleInputChange('status', e.target.value)}
                >
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="confirmed">Confirmada</MenuItem>
                  <MenuItem value="cancelled">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
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
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Resumo da Reserva
                </Typography>
                <Typography><strong>Cliente:</strong> {formData.clientName}</Typography>
                <Typography><strong>Telefone:</strong> {formData.clientPhone}</Typography>
                <Typography><strong>Propriedade:</strong> {properties.find(p => p.id === formData.propertyId)?.title || 'Não selecionada'}</Typography>
                <Typography><strong>Check-in:</strong> {formData.checkIn ? formData.checkIn.toLocaleDateString('pt-BR') : 'Não definido'}</Typography>
                <Typography><strong>Check-out:</strong> {formData.checkOut ? formData.checkOut.toLocaleDateString('pt-BR') : 'Não definido'}</Typography>
                <Typography><strong>Hóspedes:</strong> {formData.guests || 0}</Typography>
                <Typography><strong>Valor Total:</strong> R$ {(formData.totalAmount || 0).toLocaleString('pt-BR')}</Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return 'Passo desconhecido';
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Carregando dados...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Fade in={true} timeout={500}>
        <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 3 }}>
          {/* Modern Header */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                  <CalendarMonth />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    Nova Reserva
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Crie uma nova reserva de forma rápida e intuitiva
                  </Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <ModernButton
                  variant="glass"
                  size="small"
                  icon={<ArrowBack />}
                  onClick={() => router.push('/dashboard/reservations')}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  Voltar
                </ModernButton>
              </Stack>
            </Box>
          </Paper>

          <Grid container spacing={4}>
            {/* Main Content */}
            <Grid item xs={12} lg={8}>
              <Card 
                sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* Progress Stepper */}
                  <Stepper 
                    activeStep={activeStep} 
                    sx={{ 
                      mb: 4,
                      '& .MuiStepLabel-root': {
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1
                      }
                    }}
                  >
                    {steps.map((step, index) => (
                      <Step key={step.label}>
                        <StepLabel 
                          icon={
                            <Avatar 
                              sx={{ 
                                bgcolor: index <= activeStep ? 'primary.main' : 'grey.300',
                                width: 40,
                                height: 40,
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {isStepComplete(index) ? <Check /> : step.icon}
                            </Avatar>
                          }
                        >
                          <Typography variant="subtitle2" fontWeight={600}>
                            {step.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {step.description}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  {/* Step Content with Transitions */}
                  <Slide direction="left" in={true} timeout={300}>
                    <Box sx={{ mb: 4 }}>
                      {renderStepContent(activeStep)}
                    </Box>
                  </Slide>

                  {/* Navigation */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mt: 4,
                    pt: 3,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <ModernButton
                      variant="secondary"
                      size="medium"
                      icon={<NavigateBefore />}
                      onClick={handleBack}
                      disabled={activeStep === 0}
                    >
                      Anterior
                    </ModernButton>

                    <Stack direction="row" spacing={2}>
                      {activeStep === steps.length - 1 ? (
                        <ModernButton
                          variant="elegant"
                          size="large"
                          icon={<Save />}
                          onClick={handleSubmit}
                          loading={loading}
                          disabled={!isStepComplete(activeStep)}
                        >
                          Criar Reserva
                        </ModernButton>
                      ) : (
                        <ModernButton
                          variant="primary"
                          size="medium"
                          icon={<NavigateNext />}
                          onClick={handleNext}
                          disabled={!isStepComplete(activeStep)}
                        >
                          Próximo
                        </ModernButton>
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                {/* Progress Summary */}
                <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Info color="primary" />
                      Progresso
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {steps.map((step, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Avatar
                            sx={{ 
                              width: 24, 
                              height: 24,
                              bgcolor: isStepComplete(index) ? 'success.main' : 
                                      index === activeStep ? 'primary.main' : 'grey.300',
                              fontSize: '0.75rem'
                            }}
                          >
                            {isStepComplete(index) ? <Check fontSize="small" /> : index + 1}
                          </Avatar>
                          <Typography 
                            variant="body2" 
                            color={isStepComplete(index) ? 'success.main' : 'text.secondary'}
                            fontWeight={index === activeStep ? 600 : 400}
                          >
                            {step.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>

                {/* Quick Tips */}
                <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Info color="primary" />
                      Dicas Rápidas
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <Business fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">
                          Propriedades com preços base facilitam o cálculo
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                          <Person fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">
                          Cliente novo será criado automaticamente
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                          <Schedule fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">
                          Verifique conflitos de datas
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Summary Preview */}
                {(formData.propertyId || formData.clientName) && (
                  <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventAvailable color="primary" />
                        Resumo
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        {formData.propertyId && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Propriedade
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {properties.find(p => p.id === formData.propertyId)?.title || 'Selecionada'}
                            </Typography>
                          </Box>
                        )}
                        {formData.clientName && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Cliente
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formData.clientName}
                            </Typography>
                          </Box>
                        )}
                        {formData.checkIn && formData.checkOut && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Período
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formData.checkIn.toLocaleDateString()} - {formData.checkOut.toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                        {formData.totalAmount > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Valor Total
                            </Typography>
                            <Typography variant="h6" color="primary.main" fontWeight={700}>
                              R$ {(formData.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Notifications */}
          <Snackbar
            open={success}
            autoHideDuration={6000}
            onClose={() => setSuccess(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert 
              onClose={() => setSuccess(false)} 
              severity="success"
              sx={{ borderRadius: 2 }}
            >
              Reserva criada com sucesso!
            </Alert>
          </Snackbar>

          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError('')}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Alert 
              onClose={() => setError('')} 
              severity="error"
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          </Snackbar>
        </Box>
      </Fade>
    </LocalizationProvider>
  );
}