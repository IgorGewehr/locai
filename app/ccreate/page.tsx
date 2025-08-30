'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  Stack,
  Fade,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  PersonAdd,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';
import { darkFieldStyles } from './shared-styles';

const registerSchema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório'),
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
});

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

export default function CreateAccountPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const { signUp, user, loading } = useAuth();

  // Redirecionar usuários já autenticados
  useEffect(() => {
    if (!loading && user) {
      const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
      if (isAlreadyRedirecting) {
        sessionStorage.removeItem('redirecting');
        return;
      }
      
      sessionStorage.setItem('redirecting', 'true');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const form = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await signUp(data.email, data.password, data.name);
      setSuccess(true);
      setIsProcessing(true);
      
      // Redirecionar imediatamente para o dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (err: any) {
      let errorMessage = 'Erro ao criar conta';
      
      if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
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
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (success) {
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
                p: { xs: 4, sm: 5 },
              }}
            >
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
                  color: '#16a34a',
                  mb: 2,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                }}
              >
                Conta criada com sucesso!
              </Typography>

              <Typography 
                variant="body1" 
                sx={{
                  color: '#a1a1a1',
                  mb: 4,
                }}
              >
                Redirecionando para o dashboard...
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
      {/* Background Pattern - Subtle */}
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
                }}
              >
                Preencha os dados para criar sua conta
              </Typography>
            </Box>

            {/* Form */}
            <Box sx={{ p: { xs: 4, sm: 5 }, pt: { xs: 3, sm: 4 } }}>
              <form onSubmit={form.handleSubmit(handleRegister)}>
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
                    disabled={isLoading || isProcessing}
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
                              '100%': { transform: 'rotate(360deg)' }
                            }
                          }} 
                        />
                      ) : isProcessing ? (
                        <CheckCircle sx={{ fontSize: 16, color: 'white' }} />
                      ) : (
                        <PersonAdd sx={{ fontSize: 16 }} />
                      )
                    }
                    sx={{
                      py: 1.8,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1rem',
                      backgroundColor: isProcessing ? '#10b981' : (isLoading ? '#6b7280' : '#1f2937'),
                      color: '#ffffff',
                      boxShadow: 'none',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        backgroundColor: isProcessing ? '#10b981' : (isLoading ? '#6b7280' : '#374151'),
                        boxShadow: 'none',
                        transform: isLoading || isProcessing ? 'none' : 'translateY(-1px)',
                      },
                      '&:disabled': {
                        backgroundColor: isProcessing ? '#10b981' : '#6b7280',
                        color: '#ffffff',
                        opacity: 1,
                      },
                    }}
                  >
                    {isProcessing ? 'Conta criada' : isLoading ? 'Criando...' : 'Criar conta'}
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
                variant="caption"
                sx={{ 
                  color: '#525252',
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                }}
              >
                © 2024 Locai. Todos os direitos reservados.
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}