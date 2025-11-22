/**
 * Onboarding Quiz Component - Company Information Collection
 *
 * Post-signup quiz to collect company information and preferences
 * This runs AFTER the user has created their account
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
  Stack,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowForward,
  CheckCircle,
  Business,
  Home,
  LocationOn,
  Celebration,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';

// Utility functions for input sanitization and formatting
const sanitizeAndFormatInputs = {
  zipCode: (value: string): string => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    if (limited.length > 5) {
      return `${limited.slice(0, 5)}-${limited.slice(5)}`;
    }
    return limited;
  },

  state: (value: string): string => {
    if (!value) return '';
    const letters = value.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]/g, '');
    const limited = letters.slice(0, 50);
    return limited.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  },

  city: (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s\-']/g, '');
    const limited = cleaned.slice(0, 100);
    return limited.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  },

  street: (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s\-,.'º]/g, '');
    return cleaned.slice(0, 200);
  },

  neighborhood: (value: string): string => {
    if (!value) return '';
    const cleaned = value.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s\-]/g, '');
    const limited = cleaned.slice(0, 100);
    return limited.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  },

  country: (value: string): string => {
    if (!value) return 'Brasil';
    const letters = value.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]/g, '');
    const limited = letters.slice(0, 50);
    const formatted = limited.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    return formatted.trim() || 'Brasil';
  },
};

// Validation schemas for each step
const stepSchemas = {
  businessName: yup.object({
    businessName: yup.string().required('Nome da empresa é obrigatório'),
  }),
  propertiesCount: yup.object({
    propertiesCount: yup.number().min(0, 'Quantidade inválida'),
  }),
  addressDetails: yup.object({
    street: yup.string().max(200, 'Endereço muito longo'),
    number: yup.string().max(20, 'Número muito longo'),
    neighborhood: yup.string().max(100, 'Bairro muito longo'),
    city: yup.string().required('Cidade é obrigatória').min(2, 'Cidade inválida').max(100, 'Cidade muito longa'),
    state: yup.string().required('Estado é obrigatório').min(2, 'Estado inválido').max(50, 'Estado muito longo'),
    zipCode: yup.string().max(9, 'CEP inválido'),
    country: yup.string().max(50, 'País muito longo'),
  }),
};

interface QuizData {
  businessName: string;
  propertiesCount: number;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface QuizStep {
  id: keyof QuizData | 'addressDetails';
  question: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'multifield';
  icon: React.ReactNode;
  hint?: string;
  options?: { label: string; value: number }[];
  fields?: Array<{
    id: keyof QuizData;
    label: string;
    placeholder: string;
    type?: 'text';
    required?: boolean;
    gridColumn?: string;
  }>;
}

const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'businessName',
    question: 'Vamos configurar sua conta! Qual é o nome da sua empresa ou imobiliária?',
    placeholder: 'Nome da empresa',
    type: 'text',
    icon: <Business />,
    hint: 'Este nome aparecerá para seus clientes',
  },
  // ⏸️ PASSO 2 TEMPORARIAMENTE OCULTO - Será usado no futuro
  // {
  //   id: 'propertiesCount',
  //   question: 'Perfeito! Quantas propriedades você gerencia atualmente?',
  //   placeholder: 'Número de propriedades',
  //   type: 'number',
  //   icon: <Home />,
  //   hint: 'Não se preocupe, você pode adicionar mais depois',
  //   options: [
  //     { label: '1-5 propriedades', value: 3 },
  //     { label: '6-15 propriedades', value: 10 },
  //     { label: '16-50 propriedades', value: 30 },
  //     { label: '50+ propriedades', value: 50 },
  //   ],
  // },
  {
    id: 'addressDetails',
    question: 'Agora, qual é o endereço da sua imobiliária?',
    type: 'multifield',
    icon: <LocationOn />,
    hint: 'Este endereço será usado pela Sofia AI para enviar localização aos clientes',
    fields: [
      { id: 'street', label: 'Rua/Avenida', placeholder: 'Rua Exemplo', gridColumn: '2fr 1fr' },
      { id: 'number', label: 'Número', placeholder: '123', gridColumn: '1fr' },
      { id: 'zipCode', label: 'CEP', placeholder: '12345-678', gridColumn: '1fr' },
      { id: 'neighborhood', label: 'Bairro', placeholder: 'Centro', gridColumn: '1fr 1fr' },
      { id: 'city', label: 'Cidade', placeholder: 'São Paulo', required: true, gridColumn: '1fr 1fr' },
      { id: 'state', label: 'Estado', placeholder: 'São Paulo', required: true, gridColumn: '1fr 1fr' },
      { id: 'country', label: 'País', placeholder: 'Brasil', gridColumn: '1fr 1fr' },
    ],
  },
];

export default function OnboardingQuiz() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { user, getFirebaseToken } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<QuizData>>({
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

  // Verificar se usuário está autenticado
  useEffect(() => {
    if (!user) {
      router.push('/create-account');
    }
  }, [user, router]);

  const handleNext = async (data: any) => {
    try {
      setError(null);

      // For multifield steps, save all fields with sanitization
      let stepData: any;
      if (currentStep.type === 'multifield' && currentStep.fields) {
        stepData = {};
        currentStep.fields.forEach((field) => {
          const value = data[field.id];
          const formatter = sanitizeAndFormatInputs[field.id as keyof typeof sanitizeAndFormatInputs];
          stepData[field.id] = formatter ? formatter(value || '') : value;
        });
      } else {
        stepData = { [currentStep.id]: data[currentStep.id] };
      }

      setFormData((prev) => ({ ...prev, ...stepData }));

      // Mark step as completed
      setCompletedSteps((prev) => new Set([...prev, currentStepIndex]));

      if (isLastStep) {
        // Final submission
        await handleFinalSubmit({ ...formData, ...stepData } as QuizData);
      } else {
        // Move to next step
        setCurrentStepIndex((prev) => prev + 1);
        form.reset();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar. Tente novamente.');
    }
  };

  const handleFinalSubmit = async (data: QuizData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Get Firebase token
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Erro ao obter token de autenticação');
      }

      // Helper function to clean empty strings
      const cleanValue = (value: string | undefined) => {
        return value && value.trim() !== '' ? value.trim() : undefined;
      };

      const companyData = {
        tradeName: data.businessName || '',
        email: user.email || '',
        street: cleanValue(data.street),
        number: cleanValue(data.number),
        neighborhood: cleanValue(data.neighborhood),
        city: cleanValue(data.city),
        state: cleanValue(data.state),
        zipCode: cleanValue(data.zipCode),
        country: data.country || 'Brasil',
        legalName: data.businessName || '',
      };

      console.log('[ONBOARDING-QUIZ] Saving company data:', companyData);

      const response = await fetch('/api/tenant/settings/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ONBOARDING-QUIZ] Failed to save company data:', errorData);
        throw new Error('Erro ao salvar informações da empresa');
      }

      console.log('[ONBOARDING-QUIZ] Company data saved successfully');

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);

      let errorMessage = 'Erro ao salvar informações';
      if (err.message) {
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

  // Handler para formatar campos quando o usuário sair deles
  const handleFieldBlur = (fieldId: keyof QuizData, value: string) => {
    const formatter = sanitizeAndFormatInputs[fieldId as keyof typeof sanitizeAndFormatInputs];
    if (formatter) {
      const formatted = formatter(value);
      form.setValue(fieldId as any, formatted);
    }
  };

  // Loading state during submission
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
                Configuração concluída!
              </Typography>

              <Typography variant="body1" sx={{ color: '#a1a1a1', mb: 3 }}>
                Redirecionando para o dashboard...
              </Typography>

              <CircularProgress sx={{ color: '#16a34a' }} />
            </Box>
          </Fade>
        </Container>
      </Box>
    );
  }

  // If user is not authenticated, show loading
  if (!user) {
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
        <CircularProgress sx={{ color: '#16a34a' }} />
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
              Configure sua conta
            </Typography>

            <Typography variant="body1" sx={{ color: '#a1a1a1', mb: 2 }}>
              Olá, {user.name?.split(' ')[0]}! Vamos personalizar sua experiência
            </Typography>

            <Chip
              icon={<Celebration sx={{ fontSize: '1rem' }} />}
              label="Quase lá!"
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
                    {currentStep.question}
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
                    {/* Primeira linha: Rua, Número e CEP */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 0.7fr 1fr' }, gap: 2 }}>
                      {currentStep.fields.slice(0, 3).map((field) => (
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
                              onBlur={(e) => {
                                controllerField.onBlur();
                                handleFieldBlur(field.id, e.target.value);
                              }}
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
                      {currentStep.fields.slice(3, 5).map((field) => (
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
                              onBlur={(e) => {
                                controllerField.onBlur();
                                handleFieldBlur(field.id, e.target.value);
                              }}
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
                      {currentStep.fields.slice(5, 7).map((field) => (
                        <Controller
                          key={field.id}
                          name={field.id as any}
                          control={form.control}
                          defaultValue={formData[field.id] || (field.id === 'country' ? 'Brasil' : '')}
                          render={({ field: controllerField }) => (
                            <TextField
                              {...controllerField}
                              fullWidth
                              label={field.label}
                              placeholder={field.placeholder}
                              error={!!form.formState.errors[field.id]}
                              helperText={form.formState.errors[field.id]?.message as string}
                              onBlur={(e) => {
                                controllerField.onBlur();
                                handleFieldBlur(field.id, e.target.value);
                              }}
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
                        type={currentStep.type}
                        placeholder={currentStep.placeholder}
                        error={!!form.formState.errors[currentStep.id]}
                        helperText={form.formState.errors[currentStep.id]?.message}
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
                    {isLastStep ? 'Iniciar' : 'Continuar'}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </Box>
        </Slide>
      </Container>
    </Box>
  );
}
