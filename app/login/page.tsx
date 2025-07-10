'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Chip,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Home,
  WhatsApp,
  Analytics,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import NextLink from 'next/link';

// Validation schema
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
});

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signIn } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await signIn(data.email, data.password);
    } catch (err: any) {
      setError(
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Email ou senha incorretos'
          : err.code === 'auth/too-many-requests'
          ? 'Muitas tentativas. Tente novamente mais tarde.'
          : err.code === 'auth/user-disabled'
          ? 'Conta desabilitada'
          : 'Erro ao fazer login. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <Card
          elevation={8}
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'white',
                  mb: 2,
                }}
              >
                <Home sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                LocAI
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Sistema de Gestão Imobiliária com IA
              </Typography>
            </Box>

            {/* Features Preview */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom textAlign="center">
                Recursos Principais
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Chip
                  icon={<WhatsApp />}
                  label="WhatsApp AI"
                  color="success"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  icon={<Analytics />}
                  label="Analytics"
                  color="primary"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  icon={<Home />}
                  label="Propriedades"
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Login Form */}
            <form onSubmit={handleSubmit(handleLogin)}>
              <Box sx={{ mb: 3 }}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      type="email"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 2 }}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Senha"
                      type={showPassword ? 'text' : 'password'}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
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
                  )}
                />
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{ mb: 2 }}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>


              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Link component={NextLink} href="/reset-password" variant="body2" color="primary">
                  Esqueceu a senha?
                </Link>
              </Box>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  ou
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Não tem uma conta?{' '}
                  <Link component={NextLink} href="/signup" underline="hover">
                    Criar conta
                  </Link>
                </Typography>
              </Box>
            </form>

          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}