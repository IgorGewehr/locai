/**
 * Simple Signup Component - Basic Account Creation
 *
 * Minimal signup form with name, email, and password only
 * After successful signup, redirects to /onboarding for company info
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Stack,
  Chip,
  Fade,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Email as EmailIcon,
  Lock,
  CheckCircle,
  CardGiftcard,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';

// Validation schema
const signupSchema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório').min(2, 'Nome muito curto'),
  email: yup.string().email('Email inválido').required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'As senhas devem ser iguais')
    .required('Confirmação de senha é obrigatória'),
});

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const darkFieldStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#1a1a1a',
    '& fieldset': {
      borderColor: '#404040',
    },
    '&:hover fieldset': {
      borderColor: '#525252',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#16a34a',
      borderWidth: 2,
    },
  },
  '& .MuiInputLabel-root': {
    color: '#a1a1a1',
    '&.Mui-focused': {
      color: '#16a34a',
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#ffffff',
  },
};

export default function SimpleSignup() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: yupResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // 🎁 Criar conta com 7 dias grátis garantidos
      await signUp(data.email, data.password, data.name, { free: 7 });

      // Mostrar feedback de sucesso
      setSuccess(true);

      // Redirecionar para onboarding após breve delay
      setTimeout(() => {
        router.push('/onboarding');
      }, 800);
    } catch (err: any) {
      let errorMessage = 'Erro ao criar conta';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso. Tente fazer login.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Loading state após sucesso
  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Fade in timeout={800}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(22, 163, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  border: '2px solid rgba(22, 163, 74, 0.3)',
                }}
              >
                <CheckCircle sx={{ fontSize: 48, color: '#16a34a' }} />
              </Box>

              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 2 }}>
                Conta criada com sucesso!
              </Typography>

              <Typography variant="body1" sx={{ color: '#a1a1a1', mb: 3 }}>
                Redirecionando para configuração...
              </Typography>

              <CircularProgress sx={{ color: '#16a34a' }} />
            </Box>
          </Fade>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        px: 2,
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.4,
          backgroundImage: `
            radial-gradient(circle at 25% 25%, #1a1a1a 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, #262626 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={800}>
          <Box
            sx={{
              textAlign: 'center',
              background: '#111111',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)',
              border: '1px solid #333333',
              overflow: 'hidden',
              maxWidth: 420,
              mx: 'auto',
            }}
          >
            {/* Header com Logo */}
            <Box sx={{ p: { xs: 4, sm: 5 }, pb: { xs: 2, sm: 3 } }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid #333333',
                  }}
                >
                  <Image
                    src="/logo.jpg"
                    alt="Logo"
                    fill
                    style={{
                      objectFit: 'cover',
                    }}
                    priority
                  />
                </Box>
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#ffffff',
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                }}
              >
                Criar conta
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#a1a1a1',
                  fontWeight: 400,
                  fontSize: '0.95rem',
                  mb: 2,
                }}
              >
                Comece com 7 dias grátis
              </Typography>

              {/* Chip de 7 dias grátis */}
              <Chip
                icon={<CardGiftcard sx={{ fontSize: '1rem' }} />}
                label="7 dias grátis"
                sx={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  '& .MuiChip-icon': {
                    color: '#ffffff',
                  },
                }}
              />
            </Box>

            {/* Formulário */}
            <Box sx={{ p: { xs: 4, sm: 5 }, pt: { xs: 3, sm: 4 } }}>
              <form onSubmit={form.handleSubmit(handleSubmit)}>
                <Stack spacing={3}>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Nome completo"
                        variant="outlined"
                        error={!!form.formState.errors.name}
                        helperText={form.formState.errors.name?.message}
                        sx={darkFieldStyles}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: '#a1a1a1', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Email"
                        type="email"
                        variant="outlined"
                        error={!!form.formState.errors.email}
                        helperText={form.formState.errors.email?.message}
                        sx={darkFieldStyles}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon sx={{ color: '#a1a1a1', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="password"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Senha"
                        type={showPassword ? 'text' : 'password'}
                        variant="outlined"
                        error={!!form.formState.errors.password}
                        helperText={form.formState.errors.password?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: '#a1a1a1', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                size="small"
                                sx={{ color: '#a1a1a1' }}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldStyles}
                      />
                    )}
                  />

                  <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Confirmar senha"
                        type={showConfirmPassword ? 'text' : 'password'}
                        variant="outlined"
                        error={!!form.formState.errors.confirmPassword}
                        helperText={form.formState.errors.confirmPassword?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: '#a1a1a1', fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                                size="small"
                                sx={{ color: '#a1a1a1' }}
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={darkFieldStyles}
                      />
                    )}
                  />

                  {error && (
                    <Alert
                      severity="error"
                      sx={{
                        borderRadius: 2,
                        backgroundColor: '#2d1b1b',
                        border: '1px solid #7f1d1d',
                        color: '#f87171',
                        '& .MuiAlert-icon': {
                          color: '#f87171',
                        },
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    disabled={isLoading}
                    startIcon={
                      isLoading ? (
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            border: '1.5px solid rgba(255,255,255,0.3)',
                            borderTop: '1.5px solid white',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' },
                            },
                          }}
                        />
                      ) : (
                        <CheckCircle sx={{ fontSize: 16 }} />
                      )
                    }
                    sx={{
                      py: 1.8,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1rem',
                      backgroundColor: isLoading ? '#6b7280' : '#16a34a',
                      color: '#ffffff',
                      boxShadow: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        backgroundColor: isLoading ? '#6b7280' : '#22c55e',
                        boxShadow: isLoading ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.25)',
                        transform: isLoading ? 'none' : 'translateY(-1px) scale(1.02)',
                      },
                      '&:active': {
                        transform: isLoading ? 'none' : 'translateY(0) scale(0.98)',
                        transition: 'all 0.1s ease',
                      },
                      '&:disabled': {
                        backgroundColor: '#6b7280',
                        color: '#ffffff',
                        opacity: 1,
                      },
                    }}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </Stack>
              </form>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                px: { xs: 4, sm: 5 },
                pb: { xs: 4, sm: 5 },
                pt: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: '#a1a1a1',
                }}
              >
                Já tem uma conta?{' '}
                <Button
                  onClick={() => router.push('/login')}
                  sx={{
                    color: '#16a34a',
                    textTransform: 'none',
                    fontWeight: 600,
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Faça login
                </Button>
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
