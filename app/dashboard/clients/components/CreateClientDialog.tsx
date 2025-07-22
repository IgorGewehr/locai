'use client';

import { useState } from 'react';
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
} from '@mui/material';
import { useTenant } from '@/contexts/TenantContext';
import type { Client } from '@/lib/types';

interface CreateClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  notes: string;
}

export default function CreateClientDialog({ open, onClose, onSuccess }: CreateClientDialogProps) {
  const { services, isReady } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    notes: '',
  });

  const handleClose = () => {
    if (loading) return;
    setFormData({
      name: '',
      phone: '',
      email: '',
      cpf: '',
      notes: '',
    });
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
      const clientData = {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email.trim() || undefined,
        document: formData.cpf.replace(/\D/g, '') || undefined,
        notes: formData.notes.trim() || undefined,
        source: 'manual' as const,
        isActive: true,
        totalReservations: 0,
        totalSpent: 0,
        whatsappNumber: formData.phone.replace(/\D/g, ''),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await services.clients.create(clientData as Omit<Client, 'id'>);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating client:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar cliente');
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Novo Cliente</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
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
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={loading}
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2 }}>
            Clientes também são adicionados automaticamente quando entram em contato pelo WhatsApp.
          </Alert>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name || !formData.phone || !services || !isReady}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Criando...' : 'Criar Cliente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}