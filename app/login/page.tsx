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
  CheckCircle,
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
  const [success, setSuccess] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const { signIn, signUp, resetPassword, user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Clear error and success when tab changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
    setLoginSuccess(false);
    setRegisterSuccess(false);
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
      setSuccess(null);
      
      await signIn(data.email, data.password);
      
      // Notion-style minimal feedback
      setLoginSuccess(true);
      setIsProcessing(true);
      
      // Redirect to saved path or dashboard after successful login
      setTimeout(() => {
        let targetPath = '/dashboard';
        
        try {
          const savedPath = localStorage.getItem('redirectPath');
          if (savedPath && savedPath.startsWith('/dashboard')) {
            targetPath = savedPath;
            localStorage.removeItem('redirectPath'); // Limpar após usar
          }
        } catch (error) {
          // Se der erro ao acessar localStorage, usar dashboard padrão
        }
        
        router.push(targetPath);
      }, 600);
    } catch (err: any) {
      let errorMessage = 'Email ou senha incorretos';
      
      if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Esta conta foi desativada.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'Email não encontrado.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Email ou senha incorretos.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      await signUp(data.email, data.password, data.name);
      
      // Mostrar feedback de sucesso
      setRegisterSuccess(true);
      setSuccess('Conta criada com sucesso! Redirecionando para o dashboard...');
      
      // Redirect to saved path or dashboard after successful registration
      setTimeout(() => {
        let targetPath = '/dashboard';
        
        try {
          const savedPath = localStorage.getItem('redirectPath');
          if (savedPath && savedPath.startsWith('/dashboard')) {
            targetPath = savedPath;
            localStorage.removeItem('redirectPath'); // Limpar após usar
          }
        } catch (error) {
          // Se der erro ao acessar localStorage, usar dashboard padrão
        }
        
        router.push(targetPath);
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
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError('Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

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
        borderColor: '#3b82f6',
        borderWidth: 2,
      },
    },
    '& .MuiInputLabel-root': {
      color: '#a1a1a1',
      '&.Mui-focused': {
        color: '#3b82f6',
      },
    },
    '& .MuiOutlinedInput-input': {
      color: '#ffffff',
    },
  };

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
                Bem-vindo
              </Typography>

              <Typography 
                variant="body1" 
                sx={{
                  color: '#a1a1a1',
                  fontWeight: 400,
                  fontSize: '0.95rem',
                }}
              >
                Entre na sua conta ou crie uma nova para começar
              </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: '1px solid #333333', mb: 0 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                centered
                sx={{
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#3b82f6',
                    height: 2,
                  },
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    minHeight: 48,
                    color: '#a1a1a1',
                    '&.Mui-selected': {
                      color: '#3b82f6',
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
                                sx={darkFieldStyles}
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

                          <Box sx={{ textAlign: 'right' }}>
                            <Link
                              component="button"
                              type="button"
                              variant="body2"
                              onClick={() => setShowForgotPassword(true)}
                              sx={{ 
                                color: '#3b82f6',
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

                          {success && (
                            <Alert 
                              severity="success" 
                              sx={{
                                borderRadius: 2,
                                backgroundColor: '#1b2d1b',
                                border: '1px solid #16a34a',
                                color: '#4ade80',
                                '& .MuiAlert-icon': {
                                  color: '#4ade80',
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
                                <LoginIcon sx={{ fontSize: 16 }} />
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
                            {isProcessing ? 'Logado' : isLoading ? 'Verificando...' : 'Entrar'}
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
                                sx={darkFieldStyles}
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
                                sx={darkFieldStyles}
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

                          {success && (
                            <Alert 
                              severity="success" 
                              sx={{
                                borderRadius: 2,
                                backgroundColor: '#1b2d1b',
                                border: '1px solid #16a34a',
                                color: '#4ade80',
                                '& .MuiAlert-icon': {
                                  color: '#4ade80',
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
                              ) : registerSuccess ? (
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
                              backgroundColor: registerSuccess ? '#10b981' : (isLoading ? '#6b7280' : '#1f2937'),
                              color: '#ffffff',
                              boxShadow: 'none',
                              '&:hover': {
                                backgroundColor: registerSuccess ? '#10b981' : (isLoading ? '#6b7280' : '#374151'),
                                transform: isLoading || registerSuccess ? 'none' : 'translateY(-1px)',
                                boxShadow: 'none',
                              },
                              '&:disabled': {
                                backgroundColor: registerSuccess ? '#10b981' : '#6b7280',
                                color: '#ffffff',
                                opacity: 1,
                              },
                            }}
                          >
                            {registerSuccess ? 'Redirecionando...' : isLoading ? 'Criando conta...' : 'Criar conta'}
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
                          color: '#ffffff',
                          mb: 1,
                        }}
                      >
                        Recuperar senha
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{
                          color: '#a1a1a1',
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
                      sx={darkFieldStyles}
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
                          borderColor: '#404040',
                          color: '#a1a1a1',
                          '&:hover': {
                            borderColor: '#525252',
                            backgroundColor: '#1a1a1a',
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
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          boxShadow: 'none',
                          '&:hover': {
                            backgroundColor: '#2563eb',
                            boxShadow: 'none',
                          },
                          '&:disabled': {
                            backgroundColor: '#525252',
                            color: '#a1a1a1',
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