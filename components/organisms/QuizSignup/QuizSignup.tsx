/**
 * Quiz Signup Component - Conversational Account Creation
 *
 * Interactive multi-step signup flow that feels like a conversation
 * Following Locai design system and best practices
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Fade,
  Slide,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowForward,
  CheckCircle,
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  Business,
  Home,
  Celebration,
  LocationOn,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';

// Validation schemas for each step
const stepSchemas = {
  name: yup.object({
    name: yup.string().required('Por favor, digite seu nome').min(2, 'Nome muito curto'),
  }),
  businessName: yup.object({
    businessName: yup.string().required('Nome da empresa é obrigatório'),
  }),
  propertiesCount: yup.object({
    propertiesCount: yup.number().min(0, 'Quantidade inválida'),
  }),
  address: yup.object({
    address: yup.string().required('Endereço completo é obrigatório'),
  }),
  addressDetails: yup.object({
    street: yup.string(),
    neighborhood: yup.string(),
    city: yup.string().required('Cidade é obrigatória'),
    state: yup.string().required('Estado é obrigatório'),
    zipCode: yup.string(),
    country: yup.string(),
  }),
  email: yup.object({
    email: yup.string().email('Email inválido').required('Email é obrigatório'),
  }),
  password: yup.object({
    password: yup.string().min(6, 'Senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
  }),
};

interface QuizSignupData {
  name: string;
  businessName: string;
  propertiesCount: number;
  address: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  email: string;
  password: string;
}

interface QuizStep {
  id: keyof QuizSignupData | 'address' | 'addressDetails';
  question: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'multifield';
  icon: React.ReactNode;
  hint?: string;
  options?: { label: string; value: number }[];
  fields?: Array<{
    id: keyof QuizSignupData;
    label: string;
    placeholder: string;
    type?: 'text';
    required?: boolean;
    gridColumn?: string;
  }>;
}

const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'name',
    question: 'Olá! 👋 Vamos começar pelo básico. Qual é o seu nome?',
    placeholder: 'Digite seu nome completo',
    type: 'text',
    icon: <Person />,
    hint: 'Como gostaria de ser chamado?',
  },
  {
    id: 'businessName',
    question: 'Ótimo, {name}! Qual é o nome da sua empresa ou imobiliária?',
    placeholder: 'Nome da empresa',
    type: 'text',
    icon: <Business />,
    hint: 'Este nome aparecerá para seus clientes',
  },
  {
    id: 'propertiesCount',
    question: 'Perfeito! Quantas propriedades você gerencia atualmente?',
    placeholder: 'Número de propriedades',
    type: 'number',
    icon: <Home />,
    hint: 'Não se preocupe, você pode adicionar mais depois',
    options: [
      { label: '1-5 propriedades', value: 3 },
      { label: '6-15 propriedades', value: 10 },
      { label: '16-50 propriedades', value: 30 },
      { label: '50+ propriedades', value: 50 },
    ],
  },
  {
    id: 'address',
    question: 'Agora, qual é o endereço da sua imobiliária?',
    placeholder: 'Rua Exemplo, 123 - Bairro - Cidade/Estado',
    type: 'text',
    icon: <LocationOn />,
    hint: 'Este endereço será usado pela Sofia AI para enviar localização aos clientes',
  },
  {
    id: 'addressDetails',
    question: 'Complete os detalhes do endereço:',
    type: 'multifield',
    icon: <LocationOn />,
    hint: 'Essas informações ajudam a Sofia a fornecer dados precisos',
    fields: [
      { id: 'street', label: 'Rua/Avenida', placeholder: 'Rua Exemplo, 123', gridColumn: '2fr 1fr' },
      { id: 'zipCode', label: 'CEP', placeholder: '12345-678', gridColumn: '2fr 1fr' },
      { id: 'neighborhood', label: 'Bairro', placeholder: 'Centro', gridColumn: '1fr 1fr' },
      { id: 'city', label: 'Cidade', placeholder: 'São Paulo', required: true, gridColumn: '1fr 1fr' },
      { id: 'state', label: 'Estado', placeholder: 'SP', required: true, gridColumn: '1fr 1fr' },
      { id: 'country', label: 'País', placeholder: 'Brasil', gridColumn: '1fr 1fr' },
    ],
  },
  {
    id: 'email',
    question: 'Ótimo! Agora, qual é o melhor email para sua conta?',
    placeholder: 'seu@email.com',
    type: 'email',
    icon: <Email />,
    hint: 'Usaremos este email para login e notificações importantes',
  },
  {
    id: 'password',
    question: 'Por último, escolha uma senha segura para sua conta:',
    placeholder: 'Mínimo 6 caracteres',
    type: 'password',
    icon: <Lock />,
    hint: 'Use uma senha forte com letras, números e símbolos',
  },
];

export default function QuizSignup() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { signUp } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<Partial<QuizSignupData>>({
    propertiesCount: 0,
    country: 'Brasil',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = QUIZ_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === QUIZ_STEPS.length - 1;
  const progress = ((currentStepIndex + 1) / QUIZ_STEPS.length) * 100;

  const form = useForm({
    resolver: yupResolver(stepSchemas[currentStep.id]),
    mode: 'onChange',
  });

  // Focus input when step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  const handleNext = async (data: any) => {
    try {
      setError(null);

      // For multifield steps, save all fields
      let stepData: any;
      if (currentStep.type === 'multifield' && currentStep.fields) {
        stepData = {};
        currentStep.fields.forEach((field) => {
          stepData[field.id] = data[field.id];
        });
      } else {
        stepData = { [currentStep.id]: data[currentStep.id] };
      }

      setFormData((prev) => ({ ...prev, ...stepData }));

      // Mark step as completed
      setCompletedSteps((prev) => new Set([...prev, currentStepIndex]));

      if (isLastStep) {
        // Final submission
        await handleFinalSubmit({ ...formData, ...stepData } as QuizSignupData);
      } else {
        // Move to next step
        setCurrentStepIndex((prev) => prev + 1);
        form.reset();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar. Tente novamente.');
    }
  };

  const handleFinalSubmit = async (data: QuizSignupData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create account with 7 days free trial
      await signUp(data.email, data.password, data.name, {
        free: 7,
        businessName: data.businessName,
        propertiesCount: data.propertiesCount,
      });

      // Get current user to extract tenantId
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser) {
        // Save company address to settings
        try {
          const { createSettingsService } = await import('@/lib/services/settings-service');
          const settingsService = createSettingsService(currentUser.uid);

          await settingsService.updateCompanySettings(currentUser.uid, {
            address: data.address || '',
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipCode || '',
            country: data.country || 'Brasil',
          });
        } catch (addressError) {
          // Log error but don't block signup completion
          console.error('Failed to save company address:', addressError);
        }
      }

      // Force immediate redirect after successful signup
      setTimeout(() => {
        router.push('/dashboard');
      }, 800); // Short delay to show success message
    } catch (err: any) {
      setIsSubmitting(false);

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
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      form.reset();
      setError(null);
    }
  };

  const handleQuickSelect = (value: number) => {
    form.setValue(currentStep.id as any, value);
    form.handleSubmit(handleNext)();
  };

  const interpolateQuestion = (question: string) => {
    return question.replace('{name}', formData.name?.split(' ')[0] || '');
  };

  if (isSubmitting) {
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
                  backgroundColor: alpha('#16a34a', 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  border: `2px solid ${alpha('#16a34a', 0.3)}`,
                }}
              >
                <CheckCircle sx={{ fontSize: 48, color: '#16a34a' }} />
              </Box>

              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 2 }}>
                Conta criada com sucesso!
              </Typography>

              <Typography variant="body1" sx={{ color: '#a1a1a1', mb: 3 }}>
                Você ganhou <strong style={{ color: '#16a34a' }}>7 dias grátis</strong> para testar todas as funcionalidades.
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
        py: 4,
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

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid #333333',
                mx: 'auto',
                mb: 3,
              }}
            >
              <Image
                src="/logo.jpg"
                alt="Logo"
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </Box>

            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
              Crie sua conta
            </Typography>

            <Chip
              icon={<Celebration sx={{ fontSize: '1rem' }} />}
              label="7 dias grátis"
              sx={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#ffffff' },
              }}
            />
          </Box>
        </Fade>

        {/* Progress Bar */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                height: 6,
                backgroundColor: '#1a1a1a',
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid #333333',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                  transition: 'width 0.5s ease',
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{ color: '#a1a1a1', mt: 1, display: 'block', textAlign: 'center' }}
            >
              Passo {currentStepIndex + 1} de {QUIZ_STEPS.length}
            </Typography>
          </Box>
        </Fade>

        {/* Question Card */}
        <Slide direction="left" in timeout={500} key={currentStepIndex}>
          <Box
            sx={{
              background: '#111111',
              borderRadius: 3,
              border: '1px solid #333333',
              p: { xs: 3, md: 5 },
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <form onSubmit={form.handleSubmit(handleNext)}>
              <Stack spacing={4}>
                {/* Icon */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    backgroundColor: alpha('#16a34a', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${alpha('#16a34a', 0.3)}`,
                  }}
                >
                  {React.cloneElement(currentStep.icon as React.ReactElement, {
                    sx: { fontSize: 28, color: '#16a34a' },
                  })}
                </Box>

                {/* Question */}
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#ffffff',
                      fontWeight: 600,
                      mb: 1,
                      fontSize: { xs: '1.25rem', md: '1.5rem' },
                    }}
                  >
                    {interpolateQuestion(currentStep.question)}
                  </Typography>
                  {currentStep.hint && (
                    <Typography variant="body2" sx={{ color: '#a1a1a1' }}>
                      {currentStep.hint}
                    </Typography>
                  )}
                </Box>

                {/* Quick Options for properties count */}
                {currentStep.options && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {currentStep.options.map((option) => (
                      <Button
                        key={option.value}
                        variant="outlined"
                        onClick={() => handleQuickSelect(option.value)}
                        sx={{
                          borderRadius: 2,
                          borderColor: '#333333',
                          color: '#ffffff',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#16a34a',
                            backgroundColor: alpha('#16a34a', 0.1),
                          },
                        }}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </Box>
                )}

                {/* Input Field(s) */}
                {currentStep.type === 'multifield' && currentStep.fields ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Primeira linha: Rua e CEP */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
                      {currentStep.fields.slice(0, 2).map((field) => (
                        <Controller
                          key={field.id}
                          name={field.id as any}
                          control={form.control}
                          defaultValue={formData[field.id] || ''}
                          render={({ field: controllerField }) => (
                            <TextField
                              {...controllerField}
                              fullWidth
                              label={field.label}
                              placeholder={field.placeholder}
                              error={!!form.formState.errors[field.id]}
                              helperText={form.formState.errors[field.id]?.message as string}
                              sx={{
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
                                '& .MuiOutlinedInput-input': {
                                  color: '#ffffff',
                                },
                                '& .MuiInputLabel-root': {
                                  color: '#a1a1a1',
                                },
                              }}
                            />
                          )}
                        />
                      ))}
                    </Box>
                    {/* Segunda linha: Bairro e Cidade */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      {currentStep.fields.slice(2, 4).map((field) => (
                        <Controller
                          key={field.id}
                          name={field.id as any}
                          control={form.control}
                          defaultValue={formData[field.id] || ''}
                          render={({ field: controllerField }) => (
                            <TextField
                              {...controllerField}
                              fullWidth
                              label={field.label}
                              placeholder={field.placeholder}
                              error={!!form.formState.errors[field.id]}
                              helperText={form.formState.errors[field.id]?.message as string}
                              sx={{
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
                                '& .MuiOutlinedInput-input': {
                                  color: '#ffffff',
                                },
                                '& .MuiInputLabel-root': {
                                  color: '#a1a1a1',
                                },
                              }}
                            />
                          )}
                        />
                      ))}
                    </Box>
                    {/* Terceira linha: Estado e País */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      {currentStep.fields.slice(4, 6).map((field) => (
                        <Controller
                          key={field.id}
                          name={field.id as any}
                          control={form.control}
                          defaultValue={formData[field.id] || 'Brasil'}
                          render={({ field: controllerField }) => (
                            <TextField
                              {...controllerField}
                              fullWidth
                              label={field.label}
                              placeholder={field.placeholder}
                              error={!!form.formState.errors[field.id]}
                              helperText={form.formState.errors[field.id]?.message as string}
                              sx={{
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
                                '& .MuiOutlinedInput-input': {
                                  color: '#ffffff',
                                },
                                '& .MuiInputLabel-root': {
                                  color: '#a1a1a1',
                                },
                              }}
                            />
                          )}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Controller
                    name={currentStep.id as any}
                    control={form.control}
                    defaultValue={formData[currentStep.id] || ''}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        inputRef={inputRef}
                        fullWidth
                        type={currentStep.type === 'password' && showPassword ? 'text' : currentStep.type}
                        placeholder={currentStep.placeholder}
                        error={!!form.formState.errors[currentStep.id]}
                        helperText={form.formState.errors[currentStep.id]?.message}
                        InputProps={{
                          endAdornment: currentStep.type === 'password' && (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                sx={{ color: '#a1a1a1' }}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: '#1a1a1a',
                            fontSize: '1.1rem',
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
                          '& .MuiOutlinedInput-input': {
                            color: '#ffffff',
                          },
                        }}
                      />
                    )}
                  />
                )}

                {error && (
                  <Alert
                    severity="error"
                    sx={{
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

                {/* Actions */}
                <Stack direction="row" spacing={2} justifyContent="space-between">
                  {currentStepIndex > 0 && (
                    <Button
                      onClick={handleBack}
                      sx={{
                        color: '#a1a1a1',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: alpha('#ffffff', 0.05),
                        },
                      }}
                    >
                      Voltar
                    </Button>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<ArrowForward />}
                    disabled={!form.formState.isValid}
                    sx={{
                      ml: 'auto',
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1rem',
                      backgroundColor: '#16a34a',
                      '&:hover': {
                        backgroundColor: '#22c55e',
                      },
                      '&:disabled': {
                        backgroundColor: '#333333',
                        color: '#666666',
                      },
                    }}
                  >
                    {isLastStep ? 'Criar Conta' : 'Continuar'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Box>
        </Slide>

        {/* Footer */}
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="body2" sx={{ color: '#a1a1a1' }}>
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
        </Fade>
      </Container>
    </Box>
  );
}
