import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { TaskPriority } from '@/lib/types/crm';
import { crmService } from '@/lib/services/crm-service';
import { useAuth } from '@/lib/hooks/useAuth';
import { addDays } from 'date-fns';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess: () => void;
}

export default function TaskDialog({
  open,
  onClose,
  leadId,
  leadName,
  onSuccess,
}: TaskDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'follow_up' as 'call' | 'email' | 'meeting' | 'follow_up' | 'document' | 'other',
    priority: TaskPriority.MEDIUM,
    dueDate: addDays(new Date(), 1),
    reminderDate: null as Date | null,
  });

  const handleSubmit = async () => {
    try {
      await crmService.createTask({
        tenantId: user?.tenantId || '',
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        dueDate: formData.dueDate,
        reminderDate: formData.reminderDate || undefined,
        assignedTo: user?.id || '',
        assignedBy: user?.id || '',
        leadId,
        status: 'pending' as any,
        tags: [],
      } as any);
      
      onSuccess();
      handleReset();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      type: 'follow_up',
      priority: TaskPriority.MEDIUM,
      dueDate: addDays(new Date(), 1),
      reminderDate: null,
    });
  };

  const taskTypes = [
    { value: 'call', label: 'Ligação' },
    { value: 'email', label: 'E-mail' },
    { value: 'meeting', label: 'Reunião' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'document', label: 'Documento' },
    { value: 'other', label: 'Outro' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Tarefa</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Tarefa para o lead: <strong>{leadName}</strong>
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título da Tarefa"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex: Ligar para agendar visita"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    label="Tipo"
                  >
                    {taskTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Prioridade</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    label="Prioridade"
                  >
                    <MenuItem value={TaskPriority.LOW}>Baixa</MenuItem>
                    <MenuItem value={TaskPriority.MEDIUM}>Média</MenuItem>
                    <MenuItem value={TaskPriority.HIGH}>Alta</MenuItem>
                    <MenuItem value={TaskPriority.URGENT}>Urgente</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Data de Vencimento"
                  value={formData.dueDate}
                  onChange={(date) => date && setFormData({ ...formData, dueDate: date })}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Lembrete (opcional)"
                  value={formData.reminderDate}
                  onChange={(date) => setFormData({ ...formData, reminderDate: date })}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Adicione detalhes sobre a tarefa..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.title}
          >
            Criar Tarefa
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}