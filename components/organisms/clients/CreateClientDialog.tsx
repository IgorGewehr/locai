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
  Typography,
  InputAdornment,
  IconButton,
  Divider,
  Snackbar,
  Fade,
  Slide,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  Description,
  Badge,
  Close,
  PersonAdd,
} from '@mui/icons-material';
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
  document: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
}

export default function CreateClientDialog({ open, onClose, onSuccess }: CreateClientDialogProps) {
  const { services, isReady } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    document: '',
    notes: '',
  });

  const handleClose = () => {
    if (loading) return;
    setFormData({
      name: '',
      phone: '',
      email: '',
      document: '',
      notes: '',
    });
    setError(null);
    setSuccess(null);
    setFormErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Telefone é obrigatório';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Telefone deve ter pelo menos 10 dígitos';
    }
    
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      errors.email = 'E-mail deve ter um formato válido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    // Validar formulário antes de enviar
    if (!validateForm()) {
      setError('Por favor, corrija os campos destacados em vermelho');
      return;
    }

    if (!services || !isReady) {
      setError('Serviços não estão prontos. Tente novamente.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Preparar dados do cliente - CORRIGIDO: campos opcionais tratados corretamente
      const clientData: Partial<Client> = {
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        source: 'manual' as const,
        isActive: true,
        totalReservations: 0,
        totalSpent: 0,
        whatsappNumber: formData.phone.replace(/\D/g, ''),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Adicionar campos opcionais apenas se preenchidos
      if (formData.email.trim()) {
        clientData.email = formData.email.trim();
      }
      
      if (formData.document.replace(/\D/g, '')) {
        clientData.document = formData.document.replace(/\D/g, '');
      }
      
      if (formData.notes.trim()) {
        clientData.notes = formData.notes.trim();
      }

      await services.clients.create(clientData as Omit<Client, 'id'>);
      
      setSuccess('Cliente criado com sucesso!');
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error creating client:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar cliente. Verifique os dados e tente novamente.');
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
    setFormData(prev => ({ ...prev, document: formatted }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, name: value }));
    
    // Validação em tempo real
    if (formErrors.name) {
      if (value.trim() && value.trim().length >= 2) {
        setFormErrors(prev => ({ ...prev, name: undefined }));
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));
    
    // Validação em tempo real
    if (formErrors.email) {
      if (!value.trim() || isValidEmail(value)) {
        setFormErrors(prev => ({ ...prev, email: undefined }));
      }
    }
  };

  const handlePhoneChangeWithValidation = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
    
    // Validação em tempo real
    if (formErrors.phone) {
      if (formatted.replace(/\D/g, '').length >= 10) {
        setFormErrors(prev => ({ ...prev, phone: undefined }));
      }
    }
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
          <PersonAdd />
          <Typography variant="h6" fontWeight={600}>
            Novo Cliente
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
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
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
                label="Nome Completo *"
                value={formData.name}
                onChange={handleNameChange}
                required
                disabled={loading}
                error={!!formErrors.name}
                helperText={formErrors.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color={formErrors.name ? "error" : "primary"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                    },
                    '&.Mui-error': {
                      boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
                    },
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone *"
                value={formData.phone}
                onChange={handlePhoneChangeWithValidation}
                placeholder="(11) 99999-9999"
                required
                disabled={loading}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
                inputProps={{ maxLength: 15 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color={formErrors.phone ? "error" : "primary"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                    },
                    '&.Mui-error': {
                      boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
                    },
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CPF (opcional)"
                value={formData.document}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                    },
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="E-mail (opcional)"
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                disabled={loading}
                error={!!formErrors.email}
                helperText={formErrors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color={formErrors.email ? "error" : "primary"} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                    },
                    '&.Mui-error': {
                      boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
                    },
                  }
                }}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Description color="primary" />
            Observações
          </Typography>
          
          <TextField
            fullWidth
            label="Observações (opcional)"
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
            sx={{
              '& .MuiOutlinedInput-root': {
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                },
                '&.Mui-focused': {
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                },
              }
            }}
          />
        </Box>

        <Alert severity="info" sx={{ mt: 3 }}>
          Clientes também são adicionados automaticamente quando entram em contato pelo WhatsApp.
        </Alert>
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
          disabled={loading || !formData.name.trim() || !formData.phone.replace(/\D/g, '') || !services || !isReady}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
          sx={{
            borderRadius: '50px',
            px: 4,
            py: 1.5,
            background: loading 
              ? 'linear-gradient(45deg, #ccc 30%, #eee 90%)'
              : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: loading 
              ? 'none'
              : '0 8px 24px rgba(33, 150, 243, 0.3)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: loading ? 'none' : 'translateY(-2px)',
              boxShadow: loading 
                ? 'none'
                : '0 12px 32px rgba(33, 150, 243, 0.4)',
            },
            '&:disabled': {
              background: 'linear-gradient(45deg, #ccc 30%, #eee 90%)',
              color: '#999',
            }
          }}
        >
          {loading ? 'Criando Cliente...' : success ? '✓ Cliente Criado!' : 'Criar Cliente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}