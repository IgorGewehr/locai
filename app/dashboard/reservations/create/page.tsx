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
  Autocomplete,
  DatePicker,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowBack,
  Save,
  Home,
  Person,
  CalendarMonth,
  AttachMoney,
} from '@mui/icons-material';

interface ReservationFormData {
  propertyId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'overdue';
  source: 'manual' | 'whatsapp_ai' | 'website';
  notes: string;
}

const steps = ['Propriedade e Cliente', 'Datas e Hóspedes', 'Pagamento e Confirmação'];

// Mock properties for selection
const mockProperties = [
  { id: '1', name: 'Propriedade 1', basePrice: 200 },
  { id: '2', name: 'Propriedade 2', basePrice: 300 },
  { id: '3', name: 'Propriedade 3', basePrice: 150 },
];

export default function CreateReservationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<ReservationFormData>({
    propertyId: '',
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

  const handleInputChange = (field: keyof ReservationFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate total amount when dates or property changes
  useEffect(() => {
    if (formData.propertyId && formData.checkIn && formData.checkOut) {
      const property = mockProperties.find(p => p.id === formData.propertyId);
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
      // TODO: Implement reservation creation with Firebase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/reservations');
      }, 2000);
    } catch (err) {
      setError('Erro ao criar reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return formData.propertyId && formData.clientName && formData.clientPhone;
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
                options={mockProperties}
                getOptionLabel={(option) => option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Propriedade"
                    required
                  />
                )}
                onChange={(_, value) => handleInputChange('propertyId', value?.id || '')}
              />
            </Grid>
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
                <Typography><strong>Propriedade:</strong> {mockProperties.find(p => p.id === formData.propertyId)?.name || 'Não selecionada'}</Typography>
                <Typography><strong>Check-in:</strong> {formData.checkIn ? formData.checkIn.toLocaleDateString('pt-BR') : 'Não definido'}</Typography>
                <Typography><strong>Check-out:</strong> {formData.checkOut ? formData.checkOut.toLocaleDateString('pt-BR') : 'Não definido'}</Typography>
                <Typography><strong>Hóspedes:</strong> {formData.guests}</Typography>
                <Typography><strong>Valor Total:</strong> R$ {formData.totalAmount.toLocaleString('pt-BR')}</Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return 'Passo desconhecido';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/dashboard/reservations')}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Nova Reserva
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              {/* Stepper */}
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Step Content */}
              <Box sx={{ mb: 4 }}>
                {renderStepContent(activeStep)}
              </Box>

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  Voltar
                </Button>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={loading || !isStepValid(activeStep)}
                      startIcon={<Save />}
                    >
                      {loading ? 'Salvando...' : 'Criar Reserva'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!isStepValid(activeStep)}
                    >
                      Próximo
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dicas para Nova Reserva
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home color="primary" />
                  <Typography variant="body2">
                    Selecione a propriedade primeiro para calcular automaticamente o valor
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Typography variant="body2">
                    Dados completos do cliente facilitam o atendimento
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth color="primary" />
                  <Typography variant="body2">
                    Verifique a disponibilidade da propriedade nas datas
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney color="primary" />
                  <Typography variant="body2">
                    O valor é calculado automaticamente mas pode ser ajustado
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Success/Error Messages */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Reserva criada com sucesso!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}