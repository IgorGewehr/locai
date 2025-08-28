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
  Container,
  InputAdornment,
  IconButton,
  Stack,
  Fade,
  Chip,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowForward,
  CheckCircle,
  Person,
  Diamond,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';

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
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'As senhas devem ser iguais')
    .required('Confirmação de senha é obrigatória'),
});

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function CreateAccountPremiumPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  
  const router = useRouter();
  const { signUp, user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const registerForm = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      // ✅ NOVA LÓGICA: Criar conta com campo free = 7
      await signUp(data.email, data.password, data.name, { free: 7 });
      
      setRegisterSuccess(true);
      setSuccess('Conta PREMIUM criada com sucesso! Redirecionando para o dashboard...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
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
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Criação de conta não permitida no momento.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const fieldStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      border: '1px solid #d1d5db',
      fontSize: '15px',
      transition: 'all 0.15s ease',
      minHeight: '44px',
      '& fieldset': {
        border: 'none',
      },
      '&:hover': {
        border: '1px solid #9ca3af',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.06)',
      },
      '&.Mui-focused': {
        border: '1px solid #000000',
        boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.08)',
      },
    },
    '& .MuiInputLabel-root': {
      display: 'none',
    },
    '& .MuiOutlinedInput-input': {
      color: '#111827',
      padding: '12px 16px',
      fontSize: '15px',
      fontWeight: 400,
      lineHeight: 1.5,
      '&::placeholder': {
        color: '#9ca3af',
        opacity: 1,
      },
    },
    '& .MuiFormHelperText-root': {
      fontSize: '13px',
      color: '#dc2626',
      marginLeft: '0px',
      marginTop: '6px',
      fontWeight: 400,
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={600}>
          <Box
            sx={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 10px 20px -5px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e5e7eb',
              maxWidth: 400,
              mx: 'auto',
              overflow: 'hidden',
            }}
          >
            {/* Special Badge */}
            <Box 
              sx={{ 
                backgroundColor: '#000000',
                py: 2,
                textAlign: 'center',
              }}
            >
              <Chip
                icon={<Diamond />}
                label="PLANO PREMIUM"
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  '& .MuiChip-icon': {
                    color: '#000000',
                  },
                }}
              />
            </Box>

            {/* Header */}
            <Box sx={{ pt: 8, px: 8, pb: 2, textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 6,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <Image
                    src="/logo.jpg"
                    alt="Locai"
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
                  fontWeight: 600,
                  color: '#111827',
                  mb: 2,
                  fontSize: '24px',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                Conta PREMIUM
              </Typography>

              <Typography 
                variant="body2" 
                sx={{
                  color: '#6b7280',
                  fontSize: '15px',
                  lineHeight: 1.4,
                  fontWeight: 400,
                  mb: 6,
                }}
              >
                Acesso completo aos recursos premium.
              </Typography>
            </Box>

            {/* Form */}
            <Box sx={{ px: 8, pb: 8 }}>
              <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                <Stack spacing={5}>
                  <Controller
                    name="name"
                    control={registerForm.control}
                    render={({ field }) => (
                      <Box>
                        <Typography
                          component="label"
                          sx={{
                            color: '#374151',
                            fontWeight: 500,
                            mb: 1.5,
                            fontSize: '14px',
                            display: 'block',
                            lineHeight: 1.4,
                          }}
                        >
                          Nome completo
                        </Typography>
                        <TextField
                          {...field}
                          fullWidth
                          placeholder="Digite seu nome completo"
                          variant="outlined"
                          error={!!registerForm.formState.errors.name}
                          helperText={registerForm.formState.errors.name?.message}
                          sx={fieldStyles}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person sx={{ color: '#9ca3af', fontSize: 18 }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                    )}
                  />

                  <Controller
                    name="email"
                    control={registerForm.control}
                    render={({ field }) => (
                      <Box>
                        <Typography
                          component="label"
                          sx={{
                            color: '#374151',
                            fontWeight: 500,
                            mb: 1.5,
                            fontSize: '14px',
                            display: 'block',
                            lineHeight: 1.4,
                          }}
                        >
                          Email
                        </Typography>
                        <TextField
                          {...field}
                          fullWidth
                          placeholder="nome@exemplo.com"
                          type="email"
                          variant="outlined"
                          error={!!registerForm.formState.errors.email}
                          helperText={registerForm.formState.errors.email?.message}
                          sx={fieldStyles}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email sx={{ color: '#9ca3af', fontSize: 18 }} />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                    )}
                  />

                  <Controller
                    name="password"
                    control={registerForm.control}
                    render={({ field }) => (
                      <Box>
                        <Typography
                          component="label"
                          sx={{
                            color: '#374151',
                            fontWeight: 500,
                            mb: 1.5,
                            fontSize: '14px',
                            display: 'block',
                            lineHeight: 1.4,
                          }}
                        >
                          Senha
                        </Typography>
                        <TextField
                          {...field}
                          fullWidth
                          placeholder="Crie uma senha segura"
                          type={showPassword ? 'text' : 'password'}
                          variant="outlined"
                          error={!!registerForm.formState.errors.password}
                          helperText={registerForm.formState.errors.password?.message}
                          sx={fieldStyles}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock sx={{ color: '#9ca3af', fontSize: 18 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  size="small"
                                  sx={{ color: '#9ca3af' }}
                                >
                                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                    )}
                  />

                  <Controller
                    name="confirmPassword"
                    control={registerForm.control}
                    render={({ field }) => (
                      <Box>
                        <Typography
                          component="label"
                          sx={{
                            color: '#374151',
                            fontWeight: 500,
                            mb: 1.5,
                            fontSize: '14px',
                            display: 'block',
                            lineHeight: 1.4,
                          }}
                        >
                          Confirmar senha
                        </Typography>
                        <TextField
                          {...field}
                          fullWidth
                          placeholder="Confirme sua senha"
                          type={showConfirmPassword ? 'text' : 'password'}
                          variant="outlined"
                          error={!!registerForm.formState.errors.confirmPassword}
                          helperText={registerForm.formState.errors.confirmPassword?.message}
                          sx={fieldStyles}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock sx={{ color: '#9ca3af', fontSize: 18 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                  size="small"
                                  sx={{ color: '#9ca3af' }}
                                >
                                  {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Box>
                    )}
                  />

                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{
                        borderRadius: '8px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontSize: '14px',
                        '& .MuiAlert-icon': {
                          color: '#dc2626',
                        },
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  {success && (
                    <Alert 
                      severity="success" 
                      sx={{
                        borderRadius: '8px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#16a34a',
                        fontSize: '14px',
                        '& .MuiAlert-icon': {
                          color: '#16a34a',
                        },
                      }}
                    >
                      {success}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    size="large"
                    disabled={isLoading || registerSuccess}
                    endIcon={
                      isLoading ? (
                        <Box 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' }
                            }
                          }} 
                        />
                      ) : registerSuccess ? (
                        <CheckCircle sx={{ fontSize: 18 }} />
                      ) : (
                        <ArrowForward sx={{ fontSize: 18 }} />
                      )
                    }
                    sx={{
                      py: '12px',
                      borderRadius: '6px',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '15px',
                      minHeight: '44px',
                      backgroundColor: registerSuccess ? 
                        '#374151' : 
                        isLoading ? 
                          '#9ca3af' : 
                          '#000000',
                      color: '#ffffff',
                      boxShadow: 'none',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        boxShadow: 'none',
                        backgroundColor: registerSuccess ? 
                          '#374151' : 
                          isLoading ? 
                            '#9ca3af' : 
                            '#1f2937',
                        transform: isLoading || registerSuccess ? 'none' : 'translateY(-0.5px)',
                      },
                      '&:active': {
                        transform: 'translateY(0px)',
                      },
                      '&:disabled': {
                        color: '#ffffff',
                        opacity: 1,
                      },
                    }}
                  >
                    {registerSuccess ? 'Conta criada!' : isLoading ? 'Criando conta...' : 'Criar conta PREMIUM'}
                  </Button>
                </Stack>
              </form>
            </Box>

            {/* Footer */}
            <Box 
              sx={{ 
                px: 8,
                pb: 8,
                pt: 6,
                borderTop: '1px solid #f3f4f6',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{ 
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: 1.4,
                }}
              >
                Já tem uma conta?{' '}
                <Typography
                  component="span"
                  onClick={() => router.push('/login')}
                  sx={{
                    color: '#000000',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  Entre aqui
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}