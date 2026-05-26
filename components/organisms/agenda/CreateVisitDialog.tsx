'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '@/lib/utils/api-client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Autocomplete,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import {
  Close,
  CalendarToday,
  AccessTime,
  Person,
  Phone,
  Home,
  LocationOn,
  Notes,
  WhatsApp,
  SmartToy
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '@/contexts/TenantContext';
import { VisitStatus } from '@/lib/types/visit-appointment';
import { logger } from '@/lib/utils/logger';

interface CreateVisitDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Property {
  id: string;
  title: string;
  address?: string;
  type?: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export default function CreateVisitDialog({ open, onClose, onSuccess }: CreateVisitDialogProps) {
  const { tenantId, services } = useTenant();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date | null>(new Date());
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);
  const [isNewClient, setIsNewClient] = useState(false);
  const [sendWhatsAppConfirmation, setSendWhatsAppConfirmation] = useState(true);
  
  // Options
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open, services]);

  const loadOptions = async () => {
    if (!services) return;
    
    try {
      setLoadingOptions(true);
      
      // Load properties
      const propertiesData = await services.properties.getAll();
      setProperties(propertiesData.map(p => ({
        id: p.id,
        title: p.title || p.name || 'Propriedade sem nome',
        address: p.address,
        type: p.type
      })));
      
      // Load clients
      const clientsData = await services.clients.getAll();
      setClients(clientsData.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email
      })));
      
    } catch (error) {
      logger.error('Erro ao carregar opções', { error, component: 'CreateVisitDialog' });
      setError('Erro ao carregar propriedades e clientes');
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleClientChange = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setClientName(client.name);
      setClientPhone(client.phone);
      setClientEmail(client.email || '');
      setIsNewClient(false);
    } else {
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setIsNewClient(true);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProperty || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!tenantId) {
      setError('Erro interno: tenant não identificado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Combine date and time - Corrigir timezone mantendo data original
      // Extrair data do ISO string para manter consistência com input original
      const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD original
      const timeStr = selectedTime.toTimeString().slice(0, 5); // HH:MM
      
      // Criar data no timezone local brasileiro
      const scheduledDateTime = new Date(dateStr + 'T' + timeStr + ':00-03:00');

      const visitData = {
        clientName,
        clientPhone,
        clientId: selectedClient?.id || `temp_${Date.now()}`,
        propertyId: selectedProperty.id,
        propertyName: selectedProperty.title,
        propertyAddress: selectedProperty.address || '',
        scheduledDate: scheduledDateTime.toISOString(),
        scheduledTime: selectedTime.toTimeString().slice(0, 5),
        duration,
        notes,
        source: 'manual'
      };

      logger.info('📝 [CreateVisitDialog] Enviando dados da visita', { 
        visitData, 
        tenantId 
      });

      const response = await ApiClient.post('/api/visits', visitData);

      const data = await response.json();
      
      logger.info('📡 [CreateVisitDialog] Resposta da API', { 
        status: response.status,
        success: data.success,
        hasData: !!data.data 
      });

      if (!response.ok) {
        logger.error('❌ [CreateVisitDialog] Erro na API', { 
          status: response.status,
          error: data.error,
          details: data 
        });
        throw new Error(data.error || 'Erro ao criar visita');
      }

      if (data.success) {
        logger.info('✅ [CreateVisitDialog] Visita criada com sucesso', { 
          visitId: data.data?.id,
          propertyId: data.data?.propertyId 
        });
      }

      // If it's a new client, create the client record
      if (isNewClient && clientName && clientPhone) {
        try {
          await services?.clients.create({
            name: clientName,
            phone: clientPhone,
            email: clientEmail || undefined,
            source: 'visit',
            isActive: true,
            totalReservations: 0,
            totalSpent: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (clientError) {
          // Client creation failed, but visit was created successfully
          logger.error('Erro ao criar cliente', { error: clientError });
        }
      }

      // Send WhatsApp confirmation if enabled
      if (sendWhatsAppConfirmation) {
        try {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: clientPhone,
              message: `*Visita Agendada*\n\n` +
                      `Olá ${clientName}! Sua visita foi agendada:\n\n` +
                      `*Propriedade:* ${selectedProperty.title}\n` +
                      `*Data:* ${scheduledDateTime.toLocaleDateString('pt-BR')}\n` +
                      `*Horário:* ${selectedTime.toTimeString().slice(0, 5)}\n` +
                      `*Duração:* ${duration} minutos\n\n` +
                      `${notes ? `*Observações:* ${notes}\n\n` : ''}` +
                      `Para confirmar ou remarcar, responda esta mensagem.\n\n` +
                      `_Mensagem enviada automaticamente pela Sofia IA_`
            }),
          });
        } catch (whatsappError) {
          // WhatsApp send failed, but visit was created successfully
          logger.error('Erro ao enviar confirmação WhatsApp', { error: whatsappError });
        }
      }

      onSuccess();
      handleClose();
      
    } catch (error) {
      logger.error('Erro ao criar visita', { error, component: 'CreateVisitDialog' });
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setSelectedProperty(null);
    setSelectedClient(null);
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setNotes('');
    setDuration(60);
    setIsNewClient(false);
    setSendWhatsAppConfirmation(true);
    setError(null);
    onClose();
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#111827',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#f1f5f9',
          pb: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday sx={{ color: '#ef4444' }} />
            <Typography variant="h6" fontWeight={600}>
              Agendar Nova Visita
            </Typography>
            <Chip
              label="Sofia IA"
              size="small"
              sx={{
                bgcolor: '#dc2626',
                color: '#fff',
                fontSize: '0.75rem'
              }}
            />
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loadingOptions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Property Selection */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
                  <Home sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Propriedade
                </Typography>
                <Autocomplete
                  value={selectedProperty}
                  onChange={(_, newValue) => setSelectedProperty(newValue)}
                  options={properties}
                  getOptionLabel={(option) => option.title}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={option.id} {...otherProps}>
                        <Box>
                          <Typography variant="body1">{option.title}</Typography>
                          {option.address && (
                            <Typography variant="caption" color="text.secondary">
                              <LocationOn sx={{ fontSize: 12, mr: 0.5 }} />
                              {option.address}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Selecione uma propriedade..."
                      required
                      InputProps={{
                        ...params.InputProps,
                        sx: { color: 'white' }
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Client Selection */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
                  <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Cliente
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isNewClient}
                        onChange={(e) => {
                          setIsNewClient(e.target.checked);
                          if (e.target.checked) {
                            setSelectedClient(null);
                            setClientName('');
                            setClientPhone('');
                            setClientEmail('');
                          }
                        }}
                      />
                    }
                    label="Novo cliente"
                    sx={{ color: 'white' }}
                  />
                </Box>

                {!isNewClient && (
                  <Autocomplete
                    value={selectedClient}
                    onChange={(_, newValue) => handleClientChange(newValue)}
                    options={clients}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, option) => {
                      const { key, ...otherProps } = props;
                      return (
                        <Box component="li" key={option.id} {...otherProps}>
                          <Box>
                            <Typography variant="body1">{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              <Phone sx={{ fontSize: 12, mr: 0.5 }} />
                              {option.phone}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Selecione um cliente existente..."
                        InputProps={{
                          ...params.InputProps,
                          sx: { color: 'white' }
                        }}
                      />
                    )}
                    sx={{ mb: 2 }}
                  />
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nome do Cliente"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      disabled={!isNewClient && !!selectedClient}
                      InputProps={{
                        sx: { color: 'white' },
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person sx={{ color: 'primary.main' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      disabled={!isNewClient && !!selectedClient}
                      InputProps={{
                        sx: { color: 'white' },
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone sx={{ color: 'primary.main' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  {isNewClient && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email (opcional)"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        type="email"
                        InputProps={{
                          sx: { color: 'white' }
                        }}
                      />
                    </Grid>
                  )}
                </Grid>
              </Grid>

              {/* Date and Time */}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
                  <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Data
                </Typography>
                <DatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  minDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      InputProps: {
                        sx: { color: 'white' }
                      }
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: 'white', fontWeight: 600 }}>
                  <AccessTime sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Horário
                </Typography>
                <TextField
                  fullWidth
                  select
                  value={selectedTime ? selectedTime.toTimeString().slice(0, 5) : ''}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newTime = new Date();
                    newTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    setSelectedTime(newTime);
                  }}
                  required
                  InputProps={{
                    sx: { color: 'white' }
                  }}
                >
                  {timeSlots.map((time) => (
                    <MenuItem key={time} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Duration and Notes */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duração (minutos)"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  InputProps={{
                    sx: { color: 'white' },
                    inputProps: { min: 15, max: 240, step: 15 }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sendWhatsAppConfirmation}
                      onChange={(e) => setSendWhatsAppConfirmation(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WhatsApp sx={{ fontSize: 16 }} />
                      Enviar confirmação WhatsApp
                    </Box>
                  }
                  sx={{ color: 'white' }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre a visita..."
                  InputProps={{
                    sx: { color: 'white' },
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <Notes sx={{ color: 'primary.main' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleClose} sx={{ color: 'rgba(255, 255, 255, 0.7)', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || loadingOptions}
            startIcon={loading ? <CircularProgress size={20} /> : <SmartToy />}
            sx={{
              bgcolor: '#dc2626',
              borderRadius: '12px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#b91c1c', boxShadow: 'none' },
            }}
          >
            {loading ? 'Agendando...' : 'Agendar Visita'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}