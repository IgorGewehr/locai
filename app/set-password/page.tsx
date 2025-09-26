'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Card,
  CardContent,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Security,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';

const emailCheckSchema = yup.object().shape({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
});

const setPasswordSchema = yup.object().shape({
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Senhas não coincidem')
    .required('Confirmação de senha é obrigatória'),
});

interface EmailCheckFormData {
  email: string;
}

interface SetPasswordFormData {
  password: string;
  confirmPassword: string;
}

interface UserInfo {
  name: string;
  email: string;
  createdAt: Date;
}

export default function SetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [userEmail, setUserEmail] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const emailForm = useForm<EmailCheckFormData>({
    resolver: yupResolver(emailCheckSchema),
    defaultValues: {
      email: emailParam,
    },
  });

  const passwordForm = useForm<SetPasswordFormData>({
    resolver: yupResolver(setPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Auto-preencher email se fornecido na URL
  useEffect(() => {
    if (emailParam) {
      setUserEmail(emailParam);
      handleEmailCheck({ email: emailParam });
    }
  }, [emailParam]);

  // Verificar se email precisa definir senha
  const handleEmailCheck = async (data: EmailCheckFormData) => {
    try {
      setIsCheckingEmail(true);
      setError(null);

      const response = await fetch(`/api/auth/set-password?email=${encodeURIComponent(data.email)}`);
      const result = await response.json();

      if (result.success) {
        if (result.needsPassword && result.user) {
          setUserInfo(result.user);
          setUserEmail(data.email);
          setStep('password');
        } else {
          setError('Este usuário não precisa definir senha ou já possui uma conta ativa.');
        }
      } else {
        setError(result.error || 'Erro ao verificar email');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSetPassword = async (data: SetPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);

        // Armazenar token se fornecido
        if (result.firebaseToken) {
          localStorage.setItem('auth_token', result.firebaseToken);
        }

        // Redirecionar para dashboard após sucesso
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Erro ao definir senha');
      }
    } catch (err: any) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Voltar para etapa do email
  const handleBackToEmail = () => {
    setStep('email');
    setUserInfo(null);
    setUserEmail('');
    setError(null);
    emailForm.reset();
    passwordForm.reset();
  };

  // Função para renderizar etapa do email
  const renderEmailStep = () => (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#ffffff',
            mb: 1,
            fontSize: '1.75rem',
            textAlign: 'center',
          }}
        >
          Complete seu cadastro
        </Typography>

        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            textAlign: 'center',
            mb: 3,
          }}
        >
          Digite seu email para verificar se você precisa definir uma senha
        </Typography>

        <Alert
          severity="info"
          sx={{
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#93c5fd',
            '& .MuiAlert-icon': {
              color: '#93c5fd',
            },
            textAlign: 'left',
          }}
        >
          Esta página é para usuários que fizeram uma compra e precisam definir sua senha inicial.
        </Alert>
      </Box>

      {/* Form Email */}
      <form onSubmit={emailForm.handleSubmit(handleEmailCheck)}>
        <Stack spacing={3}>
          <Controller
            name="email"
            control={emailForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Email usado na compra"
                type="email"
                variant="outlined"
                error={!!emailForm.formState.errors.email}
                helperText={emailForm.formState.errors.email?.message}
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
            disabled={isCheckingEmail}
            startIcon={
              isCheckingEmail ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                <Security sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              py: 1.8,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              background: '#6366f1',
              color: '#ffffff',
              transition: 'all 0.15s ease',
              '&:hover': {
                background: '#5856eb',
                transform: isCheckingEmail ? 'none' : 'translateY(-1px)',
              },
              '&:disabled': {
                background: '#94a3b8',
                color: '#ffffff',
                opacity: 1,
              },
            }}
          >
            {isCheckingEmail ? 'Verificando...' : 'Verificar Email'}
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
              Já tem senha? Fazer login →
            </Typography>
          </Box>
        </Stack>
      </form>
    </Box>
  );

  // Função para renderizar etapa da senha
  const renderPasswordStep = () => (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#ffffff',
            mb: 1,
            fontSize: '1.75rem',
            textAlign: 'center',
          }}
        >
          Defina sua senha
        </Typography>

        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1rem',
            mb: 2,
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          Olá, <span style={{ color: '#10b981', fontWeight: 600 }}>{userInfo?.name}</span>! Complete seu cadastro definindo uma senha segura.
        </Typography>

        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            '& .MuiAlert-icon': {
              color: '#10b981',
            },
            textAlign: 'left',
            mb: 2,
          }}
        >
          🎉 Sua compra foi processada com sucesso! Defina uma senha para acessar sua conta.
        </Alert>

        {/* Info do email */}
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
            Email: <span style={{ color: '#10b981', fontWeight: 600 }}>{userEmail}</span>
          </Typography>
          <Button
            size="small"
            onClick={handleBackToEmail}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.75rem',
              '&:hover': {
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Alterar
          </Button>
        </Box>
      </Box>

      {/* Form Senha */}
      <form onSubmit={passwordForm.handleSubmit(handleSetPassword)}>
        <Stack spacing={3}>
          <Controller
            name="password"
            control={passwordForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Nova senha"
                type={showPassword ? 'text' : 'password'}
                variant="outlined"
                error={!!passwordForm.formState.errors.password}
                helperText={passwordForm.formState.errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
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

          <Controller
            name="confirmPassword"
            control={passwordForm.control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Confirmar senha"
                type={showConfirmPassword ? 'text' : 'password'}
                variant="outlined"
                error={!!passwordForm.formState.errors.confirmPassword}
                helperText={passwordForm.formState.errors.confirmPassword?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        size="small"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                <Security sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              py: 1.8,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              background: '#10b981',
              color: '#ffffff',
              transition: 'all 0.15s ease',
              '&:hover': {
                background: '#059669',
                transform: isLoading ? 'none' : 'translateY(-1px)',
              },
              '&:disabled': {
                background: '#94a3b8',
                color: '#ffffff',
                opacity: 1,
              },
            }}
          >
            {isLoading ? 'Definindo senha...' : 'Definir senha e entrar'}
          </Button>
        </Stack>
      </form>
    </Box>
  );

  // Página de sucesso
  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Container maxWidth="sm">
          <Fade in timeout={800}>
            <Card
              sx={{
                maxWidth: 420,
                mx: 'auto',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 3,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              <CardContent sx={{ p: 5, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 56, color: '#10b981', mb: 2 }} />

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: '#ffffff',
                    mb: 2,
                    fontSize: '1.75rem',
                  }}
                >
                  Senha definida com sucesso!
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    mb: 4,
                  }}
                >
                  Redirecionando para o dashboard...
                </Typography>

                <CircularProgress sx={{ color: '#10b981' }} />
              </CardContent>
            </Card>
          </Fade>
        </Container>
      </Box>
    );
  }

  // Layout principal
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Card
            sx={{
              maxWidth: 520,
              mx: 'auto',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 3,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <CardContent sx={{ p: { xs: 4, sm: 6 } }}>
              {/* Header com Logo */}
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
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
              </Box>

              {/* Conteúdo baseado na etapa */}
              {step === 'email' ? renderEmailStep() : renderPasswordStep()}
            </CardContent>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
}