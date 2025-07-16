'use client';

import React, { useState } from 'react';
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
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Stack,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  WhatsApp,
  Email,
  Phone,
  Person,
  Home,
  CalendarToday,
  AttachMoney,
  Send,
  CheckCircle,
  Close,
  LocationOn,
  Group,
  Schedule,
  Star,
  Message,
  Camera,
  VideoCall,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  preferredContact: 'whatsapp' | 'email' | 'phone';
  propertyId: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  budget: string;
  message: string;
  preferredTime: string;
  hasVisited: boolean;
  referralSource: string;
  priorities: string[];
  tourType: 'presencial' | 'virtual' | 'ambos';
}

interface AdvancedContactFormProps {
  propertyId: string;
  propertyName: string;
  propertyPrice?: number;
  onSubmit: (data: ContactFormData) => void;
  onWhatsAppContact: (message: string) => void;
  whatsappNumber?: string;
  theme?: any;
}

const CONTACT_STEPS = [
  { title: 'Informações Básicas', icon: <Person /> },
  { title: 'Detalhes do Imóvel', icon: <Home /> },
  { title: 'Preferências', icon: <Star /> },
  { title: 'Confirmação', icon: <CheckCircle /> },
];

const PRIORITIES = [
  { value: 'location', label: 'Localização', icon: <LocationOn /> },
  { value: 'price', label: 'Preço', icon: <AttachMoney /> },
  { value: 'size', label: 'Tamanho', icon: <Home /> },
  { value: 'amenities', label: 'Comodidades', icon: <Star /> },
  { value: 'availability', label: 'Disponibilidade', icon: <Schedule /> },
];

const REFERRAL_SOURCES = [
  'Google',
  'Facebook',
  'Instagram',
  'WhatsApp',
  'Indicação de Amigo',
  'Site da Empresa',
  'Outros',
];

export default function AdvancedContactForm({
  propertyId,
  propertyName,
  propertyPrice,
  onSubmit,
  onWhatsAppContact,
  whatsappNumber,
  theme,
}: AdvancedContactFormProps) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    preferredContact: 'whatsapp',
    propertyId,
    checkIn: null,
    checkOut: null,
    guests: 1,
    budget: '',
    message: '',
    preferredTime: '',
    hasVisited: false,
    referralSource: '',
    priorities: [],
    tourType: 'presencial',
  });

  const handleInputChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (activeStep < CONTACT_STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(formData);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppQuickContact = () => {
    const message = `Olá! Tenho interesse na propriedade *${propertyName}*. Gostaria de mais informações.`;
    onWhatsAppContact(message);
  };

  const handlePriorityToggle = (priority: string) => {
    setFormData(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority],
    }));
  };

  const isStepComplete = (step: number) => {
    switch (step) {
      case 0:
        return formData.name && formData.phone;
      case 1:
        return formData.checkIn && formData.checkOut && formData.guests;
      case 2:
        return formData.priorities.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getStepContent = (step: number) => {
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
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="WhatsApp"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                placeholder="(11) 99999-9999"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Preferência de Contato</InputLabel>
                <Select
                  value={formData.preferredContact}
                  onChange={(e) => handleInputChange('preferredContact', e.target.value)}
                  label="Preferência de Contato"
                >
                  <MenuItem value="whatsapp">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WhatsApp fontSize="small" />
                      WhatsApp
                    </Box>
                  </MenuItem>
                  <MenuItem value="email">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email fontSize="small" />
                      E-mail
                    </Box>
                  </MenuItem>
                  <MenuItem value="phone">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" />
                      Telefone
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Propriedade: <strong>{propertyName}</strong>
                  {propertyPrice && (
                    <span> - R$ {propertyPrice.toLocaleString()}/noite</span>
                  )}
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Check-in"
                  value={formData.checkIn}
                  onChange={(date) => handleInputChange('checkIn', date)}
                  minDate={new Date()}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Check-out"
                  value={formData.checkOut}
                  onChange={(date) => handleInputChange('checkOut', date)}
                  minDate={formData.checkIn || new Date()}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Número de Hóspedes"
                type="number"
                value={formData.guests}
                onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 20 }}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Orçamento (R$)"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                placeholder="Ex: 1000-2000"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mensagem Adicional"
                multiline
                rows={4}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Conte-nos mais sobre suas necessidades..."
                variant="outlined"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Suas Prioridades
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Selecione os aspectos mais importantes para você:
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {PRIORITIES.map((priority) => (
                  <Chip
                    key={priority.value}
                    label={priority.label}
                    icon={priority.icon}
                    onClick={() => handlePriorityToggle(priority.value)}
                    color={formData.priorities.includes(priority.value) ? 'primary' : 'default'}
                    variant={formData.priorities.includes(priority.value) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Horário Preferido</InputLabel>
                <Select
                  value={formData.preferredTime}
                  onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                  label="Horário Preferido"
                >
                  <MenuItem value="morning">Manhã (8h - 12h)</MenuItem>
                  <MenuItem value="afternoon">Tarde (12h - 18h)</MenuItem>
                  <MenuItem value="evening">Noite (18h - 22h)</MenuItem>
                  <MenuItem value="flexible">Flexível</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Visita</InputLabel>
                <Select
                  value={formData.tourType}
                  onChange={(e) => handleInputChange('tourType', e.target.value)}
                  label="Tipo de Visita"
                >
                  <MenuItem value="presencial">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" />
                      Presencial
                    </Box>
                  </MenuItem>
                  <MenuItem value="virtual">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VideoCall fontSize="small" />
                      Virtual
                    </Box>
                  </MenuItem>
                  <MenuItem value="ambos">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Camera fontSize="small" />
                      Ambos
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Como nos encontrou?</InputLabel>
                <Select
                  value={formData.referralSource}
                  onChange={(e) => handleInputChange('referralSource', e.target.value)}
                  label="Como nos encontrou?"
                >
                  {REFERRAL_SOURCES.map((source) => (
                    <MenuItem key={source} value={source}>
                      {source}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Resumo da Solicitação
            </Typography>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Nome:
                    </Typography>
                    <Typography variant="body1">{formData.name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Contato:
                    </Typography>
                    <Typography variant="body1">{formData.phone}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Check-in:
                    </Typography>
                    <Typography variant="body1">
                      {formData.checkIn?.toLocaleDateString('pt-BR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Check-out:
                    </Typography>
                    <Typography variant="body1">
                      {formData.checkOut?.toLocaleDateString('pt-BR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Hóspedes:
                    </Typography>
                    <Typography variant="body1">{formData.guests}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Orçamento:
                    </Typography>
                    <Typography variant="body1">
                      {formData.budget ? `R$ ${formData.budget}` : 'Não informado'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Prioridades:
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                      {formData.priorities.map((priority) => (
                        <Chip
                          key={priority}
                          label={PRIORITIES.find(p => p.value === priority)?.label}
                          size="small"
                          color="primary"
                        />
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Card
        sx={{
          background: theme ? `linear-gradient(135deg, ${theme.primaryColor}15, ${theme.secondaryColor}15)` : 'background.paper',
          border: theme ? `1px solid ${theme.primaryColor}30` : '1px solid',
          borderColor: theme ? `${theme.primaryColor}30` : 'divider',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Solicitar Informações
            </Typography>
            {whatsappNumber && (
              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppQuickContact}
                size="small"
                sx={{ minWidth: 'auto' }}
              >
                {isMobile ? '' : 'WhatsApp'}
              </Button>
            )}
          </Box>

          <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
            {CONTACT_STEPS.map((step, index) => (
              <Step key={step.title}>
                <StepLabel
                  StepIconComponent={({ completed, active }) => (
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'grey.300',
                      }}
                    >
                      {step.icon}
                    </Avatar>
                  )}
                >
                  {!isMobile && step.title}
                </StepLabel>
                {isMobile && (
                  <StepContent>
                    <Box sx={{ mb: 2 }}>
                      {getStepContent(index)}
                    </Box>
                  </StepContent>
                )}
              </Step>
            ))}
          </Stepper>

          {!isMobile && (
            <>
              <Box sx={{ mt: 3, mb: 2 }}>
                {loading && <LinearProgress />}
              </Box>
              <Box sx={{ mb: 3 }}>
                {getStepContent(activeStep)}
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Voltar
            </Button>
            <Box sx={{ flex: 1 }} />
            {activeStep === CONTACT_STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Send />}
              >
                {loading ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepComplete(activeStep)}
              >
                Próximo
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onClose={() => setShowSuccess(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            Solicitação Enviada!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Sua solicitação foi enviada com sucesso! Entraremos em contato em breve.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tempo de resposta: até 30 minutos
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuccess(false)} variant="contained">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}