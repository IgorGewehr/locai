'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import NextLink from 'next/link';
import { Visibility, VisibilityOff, Person, Email, Lock } from '@mui/icons-material';

const schema = yup.object({
  name: yup.string().required('Nome é obrigatório').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: yup.string().required('Email é obrigatório').email('Email inválido'),
  password: yup.string().required('Senha é obrigatória').min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: yup.string()
    .required('Confirmação de senha é obrigatória')
    .oneOf([yup.ref('password')], 'Senhas não coincidem'),
});

type FormData = yup.InferType<typeof schema>;

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();

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
      await signUp(data.email, data.password, data.name);
    } catch (err: any) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Este email já está em uso'
          : err.code === 'auth/weak-password'
          ? 'Senha muito fraca'
          : err.code === 'auth/invalid-email'
          ? 'Email inválido'
          : 'Erro ao criar conta. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

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
            Criar Conta
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Crie sua conta para começar a usar o agente imobiliário IA
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            {...register('name')}
            fullWidth
            label="Nome completo"
            margin="normal"
            error={!!errors.name}
            helperText={errors.name?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person />
                </InputAdornment>
              ),
            }}
          />

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
          />

          <TextField
            {...register('password')}
            fullWidth
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            {...register('confirmPassword')}
            fullWidth
            label="Confirmar senha"
            type={showConfirmPassword ? 'text' : 'password'}
            margin="normal"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              ou
            </Typography>
          </Divider>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Já tem uma conta?{' '}
              <Link component={NextLink} href="/login" underline="hover">
                Faça login
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}