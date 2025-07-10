'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientService } from '@/lib/firebase/firestore';
import type { Client, CustomerSegment, AcquisitionSource } from '@/lib/types/client';
import type { PaymentMethod } from '@/lib/types/reservation';
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
  Chip,
  OutlinedInput,
  Alert,
  Snackbar,
  Paper,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Person,
  ContactPhone,
  AttachMoney,
  Notes,
} from '@mui/icons-material';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  preferredPropertyTypes: string[];
  budgetMin: number;
  budgetMax: number;
  notes: string;
}

const propertyTypes = [
  'Casa',
  'Apartamento',
  'Villa',
  'Studio',
  'Cobertura',
  'Loft'
];

const steps = ['Informações Básicas', 'Preferências', 'Observações'];

export default function CreateClientPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    preferredPropertyTypes: [],
    budgetMin: 0,
    budgetMax: 0,
    notes: '',
  });

  const handleInputChange = (field: keyof ClientFormData, value: any) => {
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

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const clientData: Omit<Client, 'id'> = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone,
        document: '', // TODO: Add document field to form
        documentType: 'cpf',
        preferences: {
          preferredPaymentMethod: PaymentMethod.PIX,
          petOwner: false,
          smoker: false,
          communicationPreference: 'whatsapp',
          marketingOptIn: true,
        },
        totalReservations: 0,
        totalSpent: 0,
        averageRating: 0,
        lifetimeValue: 0,
        whatsappConversations: [],
        whatsappNumber: formData.whatsappNumber || formData.phone,
        customerSegment: CustomerSegment.NEW,
        acquisitionSource: AcquisitionSource.WHATSAPP,
        isActive: true,
        isVip: false,
        tags: formData.preferredPropertyTypes,
        notes: formData.notes,
        reviews: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        tenantId: 'default', // TODO: Get from auth context
      };

      await clientService.create(clientData);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/clients');
      }, 2000);
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Erro ao criar cliente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return formData.name && formData.email && formData.phone;
      case 1:
        return formData.preferredPropertyTypes.length > 0;
      case 2:
        return true;
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
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+55 11 99999-9999"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="WhatsApp"
                value={formData.whatsappNumber}
                onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                placeholder="+55 11 99999-9999"
                helperText="Deixe em branco se for o mesmo que o telefone"
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipos de Propriedade Preferidos</InputLabel>
                <Select
                  multiple
                  value={formData.preferredPropertyTypes}
                  onChange={(e) => handleInputChange('preferredPropertyTypes', e.target.value)}
                  input={<OutlinedInput label="Tipos de Propriedade Preferidos" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                >
                  {propertyTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Orçamento Mínimo"
                type="number"
                value={formData.budgetMin}
                onChange={(e) => handleInputChange('budgetMin', Number(e.target.value))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Orçamento Máximo"
                type="number"
                value={formData.budgetMax}
                onChange={(e) => handleInputChange('budgetMax', Number(e.target.value))}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>R$</Typography>,
                }}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Informações adicionais sobre o cliente..."
              />
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Resumo do Cliente
                </Typography>
                <Typography><strong>Nome:</strong> {formData.name}</Typography>
                <Typography><strong>E-mail:</strong> {formData.email}</Typography>
                <Typography><strong>Telefone:</strong> {formData.phone}</Typography>
                <Typography><strong>WhatsApp:</strong> {formData.whatsappNumber || formData.phone}</Typography>
                <Typography>
                  <strong>Tipos Preferidos:</strong> {formData.preferredPropertyTypes.join(', ') || 'Nenhum'}
                </Typography>
                <Typography>
                  <strong>Orçamento:</strong> R$ {formData.budgetMin.toLocaleString()} - R$ {formData.budgetMax.toLocaleString()}
                </Typography>
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
          onClick={() => router.push('/dashboard/clients')}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Novo Cliente
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
                      {loading ? 'Salvando...' : 'Salvar Cliente'}
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
                Dicas para Cadastro
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Typography variant="body2">
                    Informações completas ajudam na personalização do atendimento
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ContactPhone color="primary" />
                  <Typography variant="body2">
                    WhatsApp é essencial para o atendimento via IA
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney color="primary" />
                  <Typography variant="body2">
                    Orçamento ajuda a filtrar propriedades adequadas
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Notes color="primary" />
                  <Typography variant="body2">
                    Observações ficam visíveis no histórico do cliente
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
          Cliente criado com sucesso!
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