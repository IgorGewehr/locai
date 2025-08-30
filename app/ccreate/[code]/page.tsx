'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import FeaturesBanner from '../components/FeaturesBanner';

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

const TRIAL_CONFIGS: Record<string, number> = {
  '7r3fr33': 7,
  '0n3fr33': 1,
};

const fieldStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#ffffff',
    '& fieldset': {
      borderColor: '#e2e8f0',
    },
    '&:hover fieldset': {
      borderColor: '#cbd5e1',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#3b82f6',
      borderWidth: 2,
    },
  },
  '& .MuiInputLabel-root': {
    color: '#64748b',
    '&.Mui-focused': {
      color: '#3b82f6',
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#0f172a',
  },
};

export default function CreateAccountPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { signUp, user, loading } = useAuth();
  
  // Get free days based on code
  const freeDays = TRIAL_CONFIGS[code] || 0;

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
      
      // Include free days if applicable
      const extraData = freeDays > 0 ? { free: freeDays } : undefined;
      
      await signUp(data.email, data.password, data.name, extraData);
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
          background: '#ffffff',
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
          background: '#ffffff',
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
                background: '#ffffff',
                borderRadius: 3,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
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
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Image
                    src="/logo.jpg"
                    alt="AlugaZap"
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
                  color: '#64748b',
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, lg: 0 },
      }}
    >
      <Container maxWidth="lg" sx={{ p: 0 }}>
        <Box
          sx={{
            display: 'flex',
            minHeight: { xs: 'auto', lg: '80vh' },
            maxHeight: '90vh',
            borderRadius: { xs: 0, lg: 3 },
            overflow: 'hidden',
            boxShadow: { xs: 'none', lg: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
            border: { xs: 'none', lg: '1px solid rgba(255, 255, 255, 0.15)' },
          }}
        >
          {/* Sidebar - Features Banner */}
          {!isMobile && (
            <Box sx={{ width: '45%', display: 'flex' }}>
              <FeaturesBanner freeDays={freeDays} />
            </Box>
          )}

          {/* Form Section */}
          <Box
            sx={{
              width: { xs: '100%', lg: '55%' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 4, sm: 6, lg: 8 },
              background: 'rgba(15, 23, 42, 0.95)',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 400,
              }}
            >
              {/* Mobile Header */}
              {isMobile && (
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        mr: 3,
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
                    <Box>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: '#ffffff',
                          fontSize: '1.5rem',
                          lineHeight: 1.2,
                        }}
                      >
                        AlugaZap
                      </Typography>
                      <Typography
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                      >
                        Imobiliária Digital
                      </Typography>
                    </Box>
                  </Box>

                  {/* Mobile Free Days Offer */}
                  {freeDays > 0 && (
                    <Box
                      sx={{
                        p: 3,
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 2,
                        mb: 3,
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#16a34a',
                          fontSize: '0.875rem',
                        }}
                      >
                        🎁 {freeDays} dias grátis incluídos
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              <Fade in timeout={800}>
                <Box sx={{ width: '100%' }}>
                  {/* Header */}
                  <Box sx={{ mb: 4 }}>
                    <Typography 
                      variant="h4" 
                      sx={{
                        fontWeight: 700,
                        color: '#ffffff',
                        mb: 1,
                        fontSize: { xs: '1.75rem', sm: '2rem' },
                        textAlign: 'left',
                      }}
                    >
                      Criar conta
                    </Typography>

                    <Typography 
                      sx={{
                        color: freeDays > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '1rem',
                        fontWeight: freeDays > 0 ? 600 : 500,
                        textAlign: 'left',
                      }}
                    >
                      {freeDays > 0 
                        ? `Teste ${freeDays} dias grátis - Sem compromisso`
                        : 'Comece agora mesmo'
                      }
                    </Typography>
                  </Box>

                  {/* Form */}
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
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.25)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#6366f1',
                                  borderWidth: 2,
                                },
                              },
                              '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': {
                                  color: '#6366f1',
                                },
                              },
                              '& .MuiOutlinedInput-input': {
                                color: '#ffffff',
                              },
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
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.25)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#6366f1',
                                  borderWidth: 2,
                                },
                              },
                              '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': {
                                  color: '#6366f1',
                                },
                              },
                              '& .MuiOutlinedInput-input': {
                                color: '#ffffff',
                              },
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
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                    size="small"
                                    sx={{ color: '#64748b' }}
                                  >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                '& fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.15)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(255, 255, 255, 0.25)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#6366f1',
                                  borderWidth: 2,
                                },
                              },
                              '& .MuiInputLabel-root': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&.Mui-focused': {
                                  color: '#6366f1',
                                },
                              },
                              '& .MuiOutlinedInput-input': {
                                color: '#ffffff',
                              },
                            }}
                          />
                        )}
                      />

                      {error && (
                        <Alert 
                          severity="error" 
                          sx={{
                            borderRadius: 2,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
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
                          background: freeDays > 0 ? '#16a34a' : '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            background: freeDays > 0 ? '#15803d' : '#1e293b',
                            transform: isLoading || isProcessing ? 'none' : 'translateY(-1px)',
                          },
                          '&:disabled': {
                            background: isProcessing ? '#10b981' : '#94a3b8',
                            color: '#ffffff',
                            opacity: 1,
                          },
                        }}
                      >
                        {isProcessing 
                          ? 'Conta criada' 
                          : isLoading 
                            ? 'Criando...' 
                            : freeDays > 0 
                              ? `Testar ${freeDays} dias grátis`
                              : 'Criar conta grátis'
                        }
                      </Button>

                      {/* Login Link */}
                      <Box sx={{ textAlign: 'center', pt: 2 }}>
                        <Typography
                          component="a"
                          href="/login"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              color: '#ffffff',
                            },
                          }}
                        >
                          Já tem uma conta? Fazer login →
                        </Typography>
                      </Box>
                    </Stack>
                  </form>
                </Box>
              </Fade>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}