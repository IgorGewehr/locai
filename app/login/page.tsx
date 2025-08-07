'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
  Link,
  Stack,
  Fade,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonAdd,
  LockReset,
  ArrowForward,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';

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

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function LoginPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = login, 1 = register
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();

  // Clear error when tab changes
  useEffect(() => {
    setError(null);
  }, [activeTab]);

  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await signIn(data.email, data.password);
    } catch (err: any) {
      setError('Email ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await signUp(data.email, data.password, data.name);
      // Switch to login after successful registration
      setActiveTab(0);
      loginForm.setValue('email', data.email);
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

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError('Digite seu email');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(forgotEmail);
      setShowForgotPassword(false);
      setForgotEmail('');
      // Show success message
      setError(null);
    } catch (err: any) {
      setError('Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

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
            radial-gradient(circle at 25% 25%, #f3f4f6 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, #f9fafb 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={800}>
          <Box
            sx={{
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: 3,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
              border: '1px solid #e5e7eb',
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
                    border: '1px solid #e5e7eb',
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
                  color: '#111827',
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                }}
              >
                Bem-vindo
              </Typography>

              <Typography 
                variant="body1" 
                sx={{
                  color: '#6b7280',
                  fontWeight: 400,
                  fontSize: '0.95rem',
                }}
              >
                Entre na sua conta ou crie uma nova para começar
              </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: '1px solid #f3f4f6', mb: 0 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                centered
                sx={{
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#2563eb',
                    height: 2,
                  },
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    minHeight: 48,
                    color: '#6b7280',
                    '&.Mui-selected': {
                      color: '#2563eb',
                    },
                  },
                }}
              >
                <Tab label="Entrar" />
                <Tab label="Criar conta" />
              </Tabs>
            </Box>

            {/* Forms */}
            <Box sx={{ p: { xs: 4, sm: 5 }, pt: { xs: 3, sm: 4 } }}>
              {!showForgotPassword ? (
                <>
                  {/* Login Form */}
                  {activeTab === 0 && (
                    <Fade in timeout={300}>
                      <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                        <Stack spacing={3}>
                          <Controller
                            name="email"
                            control={loginForm.control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Email"
                                type="email"
                                variant="outlined"
                                error={!!loginForm.formState.errors.email}
                                helperText={loginForm.formState.errors.email?.message}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#9ca3af',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#2563eb',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: '#6b7280',
                                    '&.Mui-focused': {
                                      color: '#2563eb',
                                    },
                                  },
                                }}
                              />
                            )}
                          />

                          <Controller
                            name="password"
                            control={loginForm.control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Senha"
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                error={!!loginForm.formState.errors.password}
                                helperText={loginForm.formState.errors.password?.message}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        size="small"
                                        sx={{ color: '#6b7280' }}
                                      >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                      </IconButton>
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#9ca3af',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#2563eb',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: '#6b7280',
                                    '&.Mui-focused': {
                                      color: '#2563eb',
                                    },
                                  },
                                }}
                              />
                            )}
                          />

                          <Box sx={{ textAlign: 'right' }}>
                            <Link
                              component="button"
                              type="button"
                              variant="body2"
                              onClick={() => setShowForgotPassword(true)}
                              sx={{ 
                                color: '#2563eb',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              Esqueceu a senha?
                            </Link>
                          </Box>

                          {error && (
                            <Alert 
                              severity="error" 
                              sx={{
                                borderRadius: 2,
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                '& .MuiAlert-icon': {
                                  color: '#dc2626',
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
                            endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
                            sx={{
                              py: 1.8,
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '1rem',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              boxShadow: 'none',
                              '&:hover': {
                                backgroundColor: '#1d4ed8',
                                boxShadow: 'none',
                              },
                              '&:disabled': {
                                backgroundColor: '#9ca3af',
                                color: '#ffffff',
                              },
                            }}
                          >
                            {isLoading ? 'Entrando...' : 'Entrar'}
                          </Button>
                        </Stack>
                      </form>
                    </Fade>
                  )}

                  {/* Register Form */}
                  {activeTab === 1 && (
                    <Fade in timeout={300}>
                      <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                        <Stack spacing={3}>
                          <Controller
                            name="name"
                            control={registerForm.control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Nome completo"
                                variant="outlined"
                                error={!!registerForm.formState.errors.name}
                                helperText={registerForm.formState.errors.name?.message}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#9ca3af',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#2563eb',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: '#6b7280',
                                    '&.Mui-focused': {
                                      color: '#2563eb',
                                    },
                                  },
                                }}
                              />
                            )}
                          />

                          <Controller
                            name="email"
                            control={registerForm.control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Email"
                                type="email"
                                variant="outlined"
                                error={!!registerForm.formState.errors.email}
                                helperText={registerForm.formState.errors.email?.message}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#9ca3af',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#2563eb',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: '#6b7280',
                                    '&.Mui-focused': {
                                      color: '#2563eb',
                                    },
                                  },
                                }}
                              />
                            )}
                          />

                          <Controller
                            name="password"
                            control={registerForm.control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Senha"
                                type={showPassword ? 'text' : 'password'}
                                variant="outlined"
                                error={!!registerForm.formState.errors.password}
                                helperText={registerForm.formState.errors.password?.message}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        size="small"
                                        sx={{ color: '#6b7280' }}
                                      >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                      </IconButton>
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#9ca3af',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#2563eb',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: '#6b7280',
                                    '&.Mui-focused': {
                                      color: '#2563eb',
                                    },
                                  },
                                }}
                              />
                            )}
                          />

                          <Controller
                            name="confirmPassword"
                            control={registerForm.control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                label="Confirmar senha"
                                type={showConfirmPassword ? 'text' : 'password'}
                                variant="outlined"
                                error={!!registerForm.formState.errors.confirmPassword}
                                helperText={registerForm.formState.errors.confirmPassword?.message}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      <IconButton
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        edge="end"
                                        size="small"
                                        sx={{ color: '#6b7280' }}
                                      >
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                      </IconButton>
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#f9fafb',
                                    '& fieldset': {
                                      borderColor: '#d1d5db',
                                    },
                                    '&:hover fieldset': {
                                      borderColor: '#9ca3af',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#2563eb',
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: '#6b7280',
                                    '&.Mui-focused': {
                                      color: '#2563eb',
                                    },
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
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                '& .MuiAlert-icon': {
                                  color: '#dc2626',
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
                            endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
                            sx={{
                              py: 1.8,
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '1rem',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              boxShadow: 'none',
                              '&:hover': {
                                backgroundColor: '#1d4ed8',
                                boxShadow: 'none',
                              },
                              '&:disabled': {
                                backgroundColor: '#9ca3af',
                                color: '#ffffff',
                              },
                            }}
                          >
                            {isLoading ? 'Criando conta...' : 'Criar conta'}
                          </Button>
                        </Stack>
                      </form>
                    </Fade>
                  )}
                </>
              ) : (
                /* Forgot Password Form */
                <Fade in timeout={300}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{
                          fontWeight: 600,
                          color: '#111827',
                          mb: 1,
                        }}
                      >
                        Recuperar senha
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{
                          color: '#6b7280',
                        }}
                      >
                        Digite seu email e enviaremos um link para redefinir sua senha.
                      </Typography>
                    </Box>

                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      variant="outlined"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: '#f9fafb',
                          '& fieldset': {
                            borderColor: '#d1d5db',
                          },
                          '&:hover fieldset': {
                            borderColor: '#9ca3af',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#2563eb',
                            borderWidth: 2,
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#2563eb',
                          },
                        },
                      }}
                    />

                    {error && (
                      <Alert 
                        severity="error" 
                        sx={{
                          borderRadius: 2,
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          '& .MuiAlert-icon': {
                            color: '#dc2626',
                          },
                        }}
                      >
                        {error}
                      </Alert>
                    )}

                    <Stack direction="row" spacing={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotEmail('');
                          setError(null);
                        }}
                        sx={{
                          py: 1.8,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: '#d1d5db',
                          color: '#6b7280',
                          '&:hover': {
                            borderColor: '#9ca3af',
                            backgroundColor: '#f9fafb',
                          },
                        }}
                      >
                        Voltar
                      </Button>
                      <Button
                        fullWidth
                        size="large"
                        disabled={isLoading}
                        onClick={handleForgotPassword}
                        endIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <LockReset />}
                        sx={{
                          py: 1.8,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '1rem',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          boxShadow: 'none',
                          '&:hover': {
                            backgroundColor: '#1d4ed8',
                            boxShadow: 'none',
                          },
                          '&:disabled': {
                            backgroundColor: '#9ca3af',
                            color: '#ffffff',
                          },
                        }}
                      >
                        {isLoading ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </Stack>
                  </Stack>
                </Fade>
              )}
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
                  color: '#9ca3af',
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