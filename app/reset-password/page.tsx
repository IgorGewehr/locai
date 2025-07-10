'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Link,
  Alert,
  InputAdornment,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import NextLink from 'next/link';
import { Email, ArrowBack } from '@mui/icons-material';

const schema = yup.object({
  email: yup.string().required('Email é obrigatório').email('Email inválido'),
});

type FormData = yup.InferType<typeof schema>;

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');

    try {
      await resetPassword(data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.code === 'auth/user-not-found'
          ? 'Email não encontrado'
          : err.code === 'auth/too-many-requests'
          ? 'Muitas tentativas. Tente novamente mais tarde.'
          : 'Erro ao enviar email de redefinição. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            p: 4,
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="success.main">
            Email Enviado!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Enviamos um link de redefinição de senha para seu email. 
            Verifique sua caixa de entrada e siga as instruções.
          </Typography>
          <Button
            component={NextLink}
            href="/login"
            variant="contained"
            startIcon={<ArrowBack />}
          >
            Voltar ao Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          p: 4,
          borderRadius: 2,
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Redefinir Senha
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Digite seu email para receber um link de redefinição de senha
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('email')}
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            error={!!errors.email}
            helperText={errors.email?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 3, py: 1.5 }}
          >
            {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link component={NextLink} href="/login" underline="hover" startIcon={<ArrowBack />}>
              Voltar ao login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}