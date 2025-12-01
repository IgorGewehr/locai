'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  Description,
  Badge,
  Close,
  Edit,
  ToggleOn,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import type { Client } from '@/lib/types';

interface EditClientDialogProps {
  open: boolean;
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  notes: string;
  isActive: boolean;
}

export default function EditClientDialog({ open, client, onClose, onSuccess }: EditClientDialogProps) {
  const { services, isReady } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    if (client && open) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        cpf: client.document || '',
        notes: client.notes || '',
        isActive: client.isActive !== false,
      });
      setError(null);
    }
  }, [client, open]);

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      setError('Nome e telefone são obrigatórios');
      return;
    }

    if (!services || !isReady) {
      setError('Serviços não estão prontos. Tente novamente.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email.trim() || undefined,
        document: formData.cpf.replace(/\D/g, '') || undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
        whatsappNumber: formData.phone.replace(/\D/g, ''),
        updatedAt: new Date(),
      };

      await services.clients.update(client.id, updateData);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating client:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar cliente');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit />
          <Typography variant="h6" fontWeight={600}>
            Editar Cliente
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{ color: 'white' }}
          disabled={loading}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Person color="primary" />
            Informações Pessoais
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                required
                disabled={loading}
                inputProps={{ maxLength: 15 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CPF"
                value={formData.cpf}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                disabled={loading}
                inputProps={{ maxLength: 14 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Badge color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="E-mail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Description color="primary" />
            Observações
          </Typography>
          
          <TextField
            fullWidth
            label="Observações"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            disabled={loading}
            placeholder="Adicione observações sobre o cliente..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <Description color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <ToggleOn color="primary" />
            Configurações
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                disabled={loading}
              />
            }
            label="Cliente Ativo"
            sx={{ mb: 2 }}
          />

          {client.source === 'whatsapp' && (
            <Alert severity="info">
              Este cliente foi adicionado automaticamente via WhatsApp.
            </Alert>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
          sx={{ borderRadius: '50px', px: 3 }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name || !formData.phone || !services || !isReady}
          startIcon={loading ? <CircularProgress size={20} /> : <Edit />}
          sx={{
            borderRadius: '50px',
            px: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}