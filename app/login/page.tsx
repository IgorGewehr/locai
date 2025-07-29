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
  useTheme,
  alpha,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Backdrop,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonAdd,
  WhatsApp,
  Assessment,
  Security,
  LockReset,
  Business,
  Speed,
  AutoAwesome,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { auth } from '@/lib/firebase/config';

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

const resetSchema = yup.object().shape({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
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

interface ResetFormData {
  email: string;
}

export default function LoginPage() {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Test Firebase connectivity on mount
  useEffect(() => {
    const testFirebaseConnection = async () => {
      try {
        // Simple connectivity test - just check if auth object is properly initialized
        console.log('Firebase Auth initialized:', !!auth);
        console.log('Current environment:', process.env.NODE_ENV);
      } catch (error) {
        console.error('Firebase connection test failed:', error);
      }
    };
    
    testFirebaseConnection();
  }, []);
  
  // Simple state for register form
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();

  // Clear error when mode changes
  useEffect(() => {
    setError(null);
  }, [mode]);

  // Debug: Log form values
  useEffect(() => {
    console.log('Register form values:', registerData);
  }, [registerData]);

  const loginForm = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  const resetForm = useForm<ResetFormData>({
    resolver: yupResolver(resetSchema),
    defaultValues: {
      email: '',
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
      
      // Validação básica
      if (!data.name || !data.email || !data.password) {
        setError('Todos os campos são obrigatórios');
        return;
      }
      
      if (data.password !== data.confirmPassword) {
        setError('As senhas não conferem');
        return;
      }
      
      console.log('Attempting to register with:', { email: data.email, name: data.name });
      
      // Enhanced error handling for network issues
      await signUp(data.email, data.password, data.name);
      setSnackbar({
        open: true,
        message: 'Conta criada com sucesso!',
        severity: 'success',
      });
      setMode('login');
      loginForm.setValue('email', data.email);
      setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Error in registration:', err);
      
      // Enhanced error messages for network issues
      let errorMessage = 'Erro ao criar conta';
      
      if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso. Tente fazer login ou use outro email.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido. Verifique o formato do email.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (data: ResetFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(data.email);
      setSnackbar({
        open: true,
        message: 'Email de recuperação enviado!',
        severity: 'success',
      });
      setShowResetDialog(false);
      resetForm.reset();
    } catch (err: any) {
      console.error('Error in password reset:', err);
      setSnackbar({
        open: true,
        message: 'Erro ao enviar email de recuperação. Verifique se o email está correto.',
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: <WhatsApp />, title: 'IA no WhatsApp', description: 'Atendimento automatizado 24/7' },
    { icon: <Business />, title: 'Gestão Completa', description: 'CRM + Propriedades + Reservas' },
    { icon: <Assessment />, title: 'Analytics Avançado', description: 'Métricas e insights em tempo real' },
    { icon: <Security />, title: 'Segurança Enterprise', description: 'Multi-tenant com criptografia' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f23 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)
          `,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            linear-gradient(45deg, transparent 49%, rgba(255, 255, 255, 0.03) 50%, transparent 51%),
            linear-gradient(-45deg, transparent 49%, rgba(255, 255, 255, 0.03) 50%, transparent 51%)
          `,
          backgroundSize: '60px 60px',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, px: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 0, lg: 8 },
            flexDirection: { xs: 'column', lg: 'row' },
          }}
        >
          {/* Left Side - Branding & Features */}
          <Box
            sx={{
              flex: 1,
              maxWidth: { xs: '100%', lg: '500px' },
              textAlign: { xs: 'center', lg: 'left' },
              mb: { xs: 4, lg: 0 },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {/* Logo */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: { xs: 'center', lg: 'flex-start' }, 
              mb: 4,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
            }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  mr: { xs: 0, sm: 3 },
                  boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                }}
              >
                LA
              </Box>
              <Box>
                <Typography 
                  variant="h3" 
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5,
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  }}
                >
                  LocAI
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontWeight: 500,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Enterprise Real Estate AI
                </Typography>
              </Box>
            </Box>

            {/* Features Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 4 }}>
              {features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    },
                  }}
                >
                  <Box sx={{ color: '#a5b4fc', mb: 1.5 }}>{feature.icon}</Box>
                  <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600, mb: 0.5 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {feature.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right Side - Login Form */}
          <Box
            sx={{
              flex: 1,
              maxWidth: { xs: '100%', lg: '450px' },
              width: '100%',
            }}
          >
            {/* Glass Card */}
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: { xs: 3, sm: 4 },
                overflow: 'hidden',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
                mx: { xs: 1, sm: 0 },
              }}
            >
              {/* Mode Selector */}
              <Box
                sx={{
                  p: { xs: 2, sm: 3 },
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: 2, p: 0.5 }}>
                  <Button
                    onClick={() => setMode('login')}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      ...(mode === 'login'
                        ? {
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white',
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                          }
                        : {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'white',
                            },
                          }),
                    }}
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => setMode('register')}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      ...(mode === 'register'
                        ? {
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white',
                            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                          }
                        : {
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'white',
                            },
                          }),
                    }}
                  >
                    Criar Conta
                  </Button>
                </Stack>
              </Box>

              {/* Form Content */}
              <Box sx={{ p: { xs: 3, sm: 4 } }}>
                {mode === 'login' ? (
                  <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                    <Typography 
                      variant="h5" 
                      component="h2" 
                      sx={{
                        fontWeight: 700,
                        color: 'white',
                        mb: 1,
                      }}
                    >
                      Bem-vindo de volta
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4 }}>
                      Entre na sua conta para acessar o sistema
                    </Typography>

                    <Controller
                      name="email"
                      control={loginForm.control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email"
                          type="email"
                          error={!!loginForm.formState.errors.email}
                          helperText={loginForm.formState.errors.email?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366f1',
                                boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: 'rgba(255, 255, 255, 0.6)',
                            },
                            '& .MuiInputBase-input': {
                              color: 'white',
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
                          error={!!loginForm.formState.errors.password}
                          helperText={loginForm.formState.errors.password?.message}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  size="small"
                                  sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                >
                                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                              },
                              '&:hover fieldset': {
                                borderColor: 'rgba(255, 255, 255, 0.3)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366f1',
                                boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: 'rgba(255, 255, 255, 0.6)',
                            },
                            '& .MuiInputBase-input': {
                              color: 'white',
                            },
                          }}
                        />
                      )}
                    />

                    <Box sx={{ textAlign: 'right', mb: 4 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => setShowResetDialog(true)}
                        sx={{ 
                          color: '#a5b4fc',
                          textDecoration: 'none',
                          '&:hover': {
                            color: '#c7d2fe',
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
                          mb: 3,
                          background: 'rgba(244, 67, 54, 0.1)',
                          border: '1px solid rgba(244, 67, 54, 0.3)',
                          color: '#ffcdd2',
                          '& .MuiAlert-icon': {
                            color: '#ff5252',
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
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                      sx={{
                        mb: 3,
                        py: 1.8,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5855eb 0%, #7c3aed 100%)',
                          boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
                          transform: 'translateY(-1px)',
                        },
                        '&:disabled': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.4)',
                        },
                      }}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>

                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        textAlign: 'center',
                        display: 'block',
                      }}
                    >
                      🔒 Conexão segura e criptografada
                    </Typography>
                  </form>
                ) : (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    console.log('Form data:', registerData);
                    handleRegister(registerData);
                  }}>
                    <Typography 
                      variant="h5" 
                      component="h2" 
                      sx={{
                        fontWeight: 700,
                        color: 'white',
                        mb: 1,
                      }}
                    >
                      Criar nova conta
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 4 }}>
                      Comece a usar o sistema mais avançado do mercado
                    </Typography>

                    <TextField
                      fullWidth
                      label="Nome completo"
                      placeholder="Digite seu nome completo"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonAdd fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#6366f1',
                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                        '& .MuiInputBase-input': {
                          color: 'white',
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      placeholder="Digite seu email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#6366f1',
                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                        '& .MuiInputBase-input': {
                          color: 'white',
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Senha"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                              sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                            >
                              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#6366f1',
                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                        '& .MuiInputBase-input': {
                          color: 'white',
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Confirmar senha"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirme sua senha"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              size="small"
                              sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                            >
                              {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 4,
                        '& .MuiOutlinedInput-root': {
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#6366f1',
                            boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                        '& .MuiInputBase-input': {
                          color: 'white',
                        },
                      }}
                    />

                    {error && (
                      <Alert 
                        severity="error" 
                        sx={{ 
                          mb: 3,
                          background: 'rgba(244, 67, 54, 0.1)',
                          border: '1px solid rgba(244, 67, 54, 0.3)',
                          color: '#ffcdd2',
                          '& .MuiAlert-icon': {
                            color: '#ff5252',
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
                      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                      sx={{
                        mb: 3,
                        py: 1.8,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '1rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5855eb 0%, #7c3aed 100%)',
                          boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
                          transform: 'translateY(-1px)',
                        },
                        '&:disabled': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.4)',
                        },
                      }}
                    >
                      {isLoading ? 'Criando conta...' : 'Criar conta'}
                    </Button>

                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', display: 'block' }}>
                      Ao criar uma conta, você concorda com nossos{' '}
                      <Link href="#" sx={{ color: '#a5b4fc', textDecoration: 'none' }}>
                        Termos de Uso
                      </Link>{' '}
                      e{' '}
                      <Link href="#" sx={{ color: '#a5b4fc', textDecoration: 'none' }}>
                        Política de Privacidade
                      </Link>
                    </Typography>
                  </form>
                )}
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 4, px: 2 }}>
              <Typography
                variant="caption"
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <AutoAwesome sx={{ fontSize: 16 }} />
                © 2024 LocAI. Todos os direitos reservados.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* Password Reset Dialog */}
      <Dialog 
        open={showResetDialog} 
        onClose={() => {
          setShowResetDialog(false);
          resetForm.reset();
          setError(null);
        }} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 3,
          },
        }}
        BackdropComponent={Backdrop}
        BackdropProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
          },
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 600 }}>Recuperar Senha</DialogTitle>
        <form onSubmit={resetForm.handleSubmit(handlePasswordReset)}>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
              Digite seu email e enviaremos um link para redefinir sua senha.
            </Typography>
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: '#ffcdd2',
                  '& .MuiAlert-icon': {
                    color: '#ff5252',
                  },
                }}
              >
                {error}
              </Alert>
            )}
            
            <Controller
              name="email"
              control={resetForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  type="email"
                  placeholder="Digite seu email"
                  error={!!resetForm.formState.errors.email}
                  helperText={resetForm.formState.errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6366f1',
                        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.6)',
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                    },
                  }}
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => {
                setShowResetDialog(false);
                resetForm.reset();
                setError(null);
              }}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LockReset />}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5855eb 0%, #7c3aed 100%)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.4)',
                },
              }}
            >
              {isLoading ? 'Enviando...' : 'Enviar email'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            background: snackbar.severity === 'success' 
              ? 'rgba(76, 175, 80, 0.1)'
              : 'rgba(244, 67, 54, 0.1)',
            border: snackbar.severity === 'success' 
              ? '1px solid rgba(76, 175, 80, 0.3)'
              : '1px solid rgba(244, 67, 54, 0.3)',
            color: snackbar.severity === 'success' ? '#c8e6c9' : '#ffcdd2',
            backdropFilter: 'blur(20px)',
            '& .MuiAlert-icon': {
              color: snackbar.severity === 'success' ? '#4caf50' : '#ff5252',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}