'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Box,
  Alert,
  Chip,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person,
  Home,
  CalendarToday,
  AccessTime,
  Phone,
  Notes,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { format, addDays } from 'date-fns';

import { 
  VisitAppointment, 
  VisitStatus,
  TimePreference,
  TIME_PREFERENCE_LABELS 
} from '@/lib/types/visit-appointment';
import { Property, Client } from '@/lib/types';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

interface CreateVisitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (visit: Partial<VisitAppointment>) => Promise<void>;
  editingVisit?: VisitAppointment | null;
  preselectedProperty?: Property;
  preselectedClient?: Client;
}

interface FormData {
  clientId: string;
  clientName: string;
  clientPhone: string;
  propertyId: string;
  scheduledDate: Date | null;
  scheduledTime: Date | null;
  duration: number;
  notes: string;
  clientRequests: string[];
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  confirmedByClient: boolean;
  reminderEnabled: boolean;
}

const defaultFormData: FormData = {
  clientId: '',
  clientName: '',
  clientPhone: '',
  propertyId: '',
  scheduledDate: null,
  scheduledTime: null,
  duration: 60,
  notes: '',
  clientRequests: [],
  agentId: '',
  agentName: '',
  agentPhone: '',
  confirmedByClient: false,
  reminderEnabled: true,
};

export default function CreateVisitDialog({ 
  open, 
  onClose, 
  onSave, 
  editingVisit, 
  preselectedProperty,
  preselectedClient 
}: CreateVisitDialogProps) {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open, editingVisit, preselectedProperty, preselectedClient]);

  // Verificar disponibilidade quando data muda
  useEffect(() => {
    if (formData.scheduledDate && tenantId) {
      checkAvailability();
    }
  }, [formData.scheduledDate, tenantId]);

  const loadData = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      if (!token) {
        console.error('Token de autenticação não disponível');
        return;
      }

      const [propertiesResponse, clientsResponse] = await Promise.all([
        fetch(`/api/properties?tenantId=${tenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`/api/clients?tenantId=${tenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ]);

      if (propertiesResponse.ok && clientsResponse.ok) {
        const [propertiesData, clientsData] = await Promise.all([
          propertiesResponse.json(),
          clientsResponse.json(),
        ]);

        setProperties(propertiesData.data || []);
        setClients(clientsData.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const resetForm = () => {
    if (editingVisit) {
      // Modo edição
      setFormData({
        clientId: editingVisit.clientId,
        clientName: editingVisit.clientName,
        clientPhone: editingVisit.clientPhone,
        propertyId: editingVisit.propertyId,
        scheduledDate: new Date(editingVisit.scheduledDate),
        scheduledTime: new Date(`2000-01-01T${editingVisit.scheduledTime}`),
        duration: editingVisit.duration,
        notes: editingVisit.notes || '',
        clientRequests: editingVisit.clientRequests || [],
        agentId: editingVisit.agentId || '',
        agentName: editingVisit.agentName || '',
        agentPhone: editingVisit.agentPhone || '',
        confirmedByClient: editingVisit.confirmedByClient || false,
        reminderEnabled: !editingVisit.reminderSent,
      });
    } else {
      // Modo criação
      let initialData = { ...defaultFormData };
      
      // Data padrão: amanhã
      initialData.scheduledDate = addDays(new Date(), 1);
      
      // Pré-selecionar propriedade se fornecida
      if (preselectedProperty) {
        initialData.propertyId = preselectedProperty.id;
      }
      
      // Pré-selecionar cliente se fornecido
      if (preselectedClient) {
        initialData.clientId = preselectedClient.id;
        initialData.clientName = preselectedClient.name;
        initialData.clientPhone = preselectedClient.phone;
      }
      
      setFormData(initialData);
    }
    setErrors({});
  };

  const checkAvailability = async () => {
    if (!formData.scheduledDate || !tenantId) return;

    try {
      setCheckingAvailability(true);
      const dateStr = format(formData.scheduledDate, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/visits/availability?tenantId=${tenantId}&date=${dateStr}`);
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      setAvailableSlots([]);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (event: any) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      scheduledDate: date
    }));
    
    if (errors.scheduledDate) {
      setErrors(prev => ({
        ...prev,
        scheduledDate: ''
      }));
    }
  };

  const handleTimeChange = (time: Date | null) => {
    setFormData(prev => ({
      ...prev,
      scheduledTime: time
    }));
    
    if (errors.scheduledTime) {
      setErrors(prev => ({
        ...prev,
        scheduledTime: ''
      }));
    }
  };

  const handleClientSelect = (client: Client | null) => {
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientPhone: ''
      }));
    }
  };

  const handlePropertySelect = (property: Property | null) => {
    setFormData(prev => ({
      ...prev,
      propertyId: property?.id || ''
    }));
  };

  const addClientRequest = (request: string) => {
    if (request.trim() && !formData.clientRequests.includes(request.trim())) {
      setFormData(prev => ({
        ...prev,
        clientRequests: [...prev.clientRequests, request.trim()]
      }));
    }
  };

  const removeClientRequest = (request: string) => {
    setFormData(prev => ({
      ...prev,
      clientRequests: prev.clientRequests.filter(r => r !== request)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId && !formData.clientName) {
      newErrors.clientId = 'Cliente é obrigatório';
    }
    
    if (!formData.propertyId) {
      newErrors.propertyId = 'Propriedade é obrigatória';
    }
    
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Data é obrigatória';
    }
    
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Horário é obrigatório';
    }
    
    if (!formData.clientPhone) {
      newErrors.clientPhone = 'Telefone é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const timeString = formData.scheduledTime 
        ? format(formData.scheduledTime, 'HH:mm')
        : '';

      const visitData: Partial<VisitAppointment> = {
        tenantId: tenantId!,
        clientId: formData.clientId,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        propertyId: formData.propertyId,
        propertyName: properties.find(p => p.id === formData.propertyId)?.name || '',
        propertyAddress: properties.find(p => p.id === formData.propertyId)?.address || '',
        scheduledDate: formData.scheduledDate!,
        scheduledTime: timeString,
        duration: formData.duration,
        status: formData.confirmedByClient ? VisitStatus.CONFIRMED : VisitStatus.SCHEDULED,
        notes: formData.notes,
        clientRequests: formData.clientRequests,
        agentId: formData.agentId || undefined,
        agentName: formData.agentName || undefined,
        agentPhone: formData.agentPhone || undefined,
        confirmedByClient: formData.confirmedByClient,
        source: 'manual',
        ...(editingVisit && { id: editingVisit.id })
      };

      await onSave(visitData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = properties.find(p => p.id === formData.propertyId);
  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {editingVisit ? 'Editar Visita' : 'Agendar Nova Visita'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Cliente */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Person />
                Dados do Cliente
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Autocomplete
                options={clients}
                getOptionLabel={(client) => `${client.name} - ${client.phone}`}
                value={selectedClient || null}
                onChange={(_, value) => handleClientSelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente"
                    error={!!errors.clientId}
                    helperText={errors.clientId}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Telefone"
                value={formData.clientPhone}
                onChange={handleInputChange('clientPhone')}
                error={!!errors.clientPhone}
                helperText={errors.clientPhone}
                required
                fullWidth
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            {/* Propriedade */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Home />
                Propriedade
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Autocomplete
                options={properties}
                getOptionLabel={(property) => `${property.name} - ${property.address}`}
                value={selectedProperty || null}
                onChange={(_, value) => handlePropertySelect(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Propriedade"
                    error={!!errors.propertyId}
                    helperText={errors.propertyId}
                    required
                  />
                )}
              />
            </Grid>

            {/* Data e Hora */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CalendarToday />
                Agendamento
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <DatePicker
                label="Data da Visita"
                value={formData.scheduledDate}
                onChange={handleDateChange}
                minDate={new Date()}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!errors.scheduledDate}
                    helperText={errors.scheduledDate}
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TimePicker
                label="Horário"
                value={formData.scheduledTime}
                onChange={handleTimeChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    error={!!errors.scheduledTime}
                    helperText={errors.scheduledTime}
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Duração (minutos)"
                type="number"
                value={formData.duration}
                onChange={handleInputChange('duration')}
                inputProps={{ min: 30, max: 180, step: 15 }}
                fullWidth
              />
            </Grid>

            {/* Horários disponíveis */}
            {formData.scheduledDate && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Horários disponíveis para {format(formData.scheduledDate, "dd 'de' MMMM", { locale: ptBR })}:
                </Typography>
                {checkingAvailability ? (
                  <Alert severity="info">Verificando disponibilidade...</Alert>
                ) : availableSlots.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {availableSlots.map(slot => (
                      <Chip
                        key={slot}
                        label={slot}
                        variant="outlined"
                        onClick={() => {
                          const time = new Date(`2000-01-01T${slot}`);
                          handleTimeChange(time);
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Alert severity="warning">
                    Nenhum horário disponível para esta data.
                  </Alert>
                )}
              </Grid>
            )}

            {/* Observações */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Notes />
                Observações
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Observações da visita"
                value={formData.notes}
                onChange={handleInputChange('notes')}
                multiline
                rows={3}
                fullWidth
                placeholder="Informações adicionais sobre a visita..."
              />
            </Grid>

            {/* Configurações */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.confirmedByClient}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmedByClient: e.target.checked }))}
                  />
                }
                label="Cliente já confirmou a visita"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.reminderEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, reminderEnabled: e.target.checked }))}
                  />
                }
                label="Enviar lembrete automático"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Salvando...' : editingVisit ? 'Atualizar' : 'Agendar Visita'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}