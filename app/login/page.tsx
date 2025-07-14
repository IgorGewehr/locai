'use client';

import { useState, useEffect } from 'react';
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
  Paper,
  Link,
  Divider,
  Stack,
  Grid,
  useTheme,
  alpha,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonAdd,
  Home,
  WhatsApp,
  Assessment,
  Security,
  ArrowForward,
  Google,
  LockReset,
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
    { icon: <WhatsApp />, title: 'IA no WhatsApp', description: 'Atendimento 24/7' },
    { icon: <Home />, title: 'Gestão Completa', description: 'Propriedades e reservas' },
    { icon: <Assessment />, title: 'Analytics', description: 'Métricas em tempo real' },
    { icon: <Security />, title: 'Seguro', description: 'Dados protegidos' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
      }}
    >
      {/* Left Side - Features */}
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200%',
            height: '200%',
            background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.1)} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            transform: 'rotate(45deg)',
          },
        }}
      >
        <Box sx={{ zIndex: 1, textAlign: 'center', p: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              bgcolor: 'common.white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              fontWeight: 'bold',
              fontSize: '2rem',
              mb: 3,
              boxShadow: 3,
            }}
          >
            LA
          </Box>
          <Typography variant="h3" fontWeight={700} color="common.white" gutterBottom>
            LocAI
          </Typography>
          <Typography variant="h6" color="common.white" sx={{ mb: 6, opacity: 0.9 }}>
            Sistema Inteligente de Gestão Imobiliária
          </Typography>

          <Grid container spacing={3} sx={{ maxWidth: 400, mx: 'auto' }}>
            {features.map((feature, index) => (
              <Grid item xs={6} key={index}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.common.white, 0.1),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  }}
                  elevation={0}
                >
                  <Box sx={{ color: 'common.white', mb: 1 }}>{feature.icon}</Box>
                  <Typography variant="subtitle2" fontWeight={600} color="common.white">
                    {feature.title}
                  </Typography>
                  <Typography variant="caption" color="common.white" sx={{ opacity: 0.8 }}>
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ mb: 4, display: { md: 'none' }, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                mb: 2,
              }}
            >
              LA
            </Box>
            <Typography variant="h5" component="h1" fontWeight={600}>
              LocAI
            </Typography>
          </Box>

          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              border: 1, 
              borderColor: 'divider',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ bgcolor: 'background.default', p: 3, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button
                  variant={mode === 'login' ? 'contained' : 'text'}
                  onClick={() => setMode('login')}
                  size="small"
                >
                  Entrar
                </Button>
                <Button
                  variant={mode === 'register' ? 'contained' : 'text'}
                  onClick={() => setMode('register')}
                  size="small"
                >
                  Criar Conta
                </Button>
              </Stack>
            </Box>

            <CardContent sx={{ p: 4 }}>
              {mode === 'login' ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                  <Typography variant="h5" component="h2" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
                    Bem-vindo de volta
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
                              <Email fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 2 }}
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
                              <Lock fontSize="small" color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                size="small"
                              >
                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 1 }}
                      />
                    )}
                  />

                  <Box sx={{ textAlign: 'right', mb: 3 }}>
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={() => setShowResetDialog(true)}
                      sx={{ textDecoration: 'none' }}
                    >
                      Esqueceu a senha?
                    </Link>
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
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                    sx={{ mb: 2 }}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>

                  <Divider sx={{ my: 3 }}>ou</Divider>

                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<Google />}
                    disabled
                    sx={{ mb: 2 }}
                  >
                    Continuar com Google
                  </Button>
                </form>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  console.log('Form data:', registerData);
                  handleRegister(registerData);
                }}>
                  <Typography variant="h5" component="h2" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
                    Criar nova conta
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
                          <PersonAdd fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
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
                          <Email fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
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
                          <Lock fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
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
                          <Lock fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            size="small"
                          >
                            {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 3 }}
                  />

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
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar conta'}
                  </Button>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Ao criar uma conta, você concorda com nossos{' '}
                    <Link href="#" sx={{ textDecoration: 'none' }}>
                      Termos de Uso
                    </Link>{' '}
                    e{' '}
                    <Link href="#" sx={{ textDecoration: 'none' }}>
                      Política de Privacidade
                    </Link>
                  </Typography>
                </form>
              )}
            </CardContent>
          </Paper>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, display: 'block', textAlign: 'center' }}
          >
            © 2024 LocAI. Todos os direitos reservados.
          </Typography>
        </Container>
      </Box>

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
      >
        <DialogTitle>Recuperar Senha</DialogTitle>
        <form onSubmit={resetForm.handleSubmit(handlePasswordReset)}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Digite seu email e enviaremos um link para redefinir sua senha.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
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
                        <Email fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowResetDialog(false);
              resetForm.reset();
              setError(null);
            }}>Cancelar</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LockReset />}
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
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}