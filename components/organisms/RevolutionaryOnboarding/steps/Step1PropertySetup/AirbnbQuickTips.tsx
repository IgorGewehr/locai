/**
 * Airbnb Quick Tips Component
 * Visual tips showing how to get hasData, URL, and iCal link from Airbnb
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  IconButton,
  Chip,
  Button,
  Collapse,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Code,
  Link as LinkIcon,
  CalendarMonth,
  ExpandMore,
  ExpandLess,
  ContentCopy,
  CheckCircle,
  Info,
  PlayCircleOutline,
  Lightbulb,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface AirbnbQuickTipsProps {
  onComplete?: () => void;
  embedded?: boolean;
}

const MotionCard = motion(Card);
const MotionBox = motion(Box);

export default function AirbnbQuickTips({ onComplete, embedded = false }: AirbnbQuickTipsProps) {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [expandedTip, setExpandedTip] = useState<number | null>(0);

  const tips = [
    {
      id: 'hasdata',
      title: 'Como pegar o hasData do Airbnb',
      icon: Code,
      color: '#6366f1',
      difficulty: 'Intermediário',
      time: '2 min',
      steps: [
        {
          label: 'Abra seu anúncio no Airbnb',
          description: 'Entre no site do Airbnb e acesse a página do seu anúncio',
          tip: 'Use o modo de edição do anúncio para ter acesso completo',
        },
        {
          label: 'Abra o Console do Navegador',
          description: 'Pressione F12 (ou Cmd+Option+I no Mac) para abrir as Ferramentas do Desenvolvedor',
          tip: 'No Chrome: botão direito → Inspecionar → Console',
        },
        {
          label: 'Digite o comando',
          description: 'No console, digite: window.hasData',
          code: 'window.hasData',
          copyable: true,
        },
        {
          label: 'Copie o resultado',
          description: 'Clique com o botão direito no resultado e selecione "Copy object"',
          tip: 'O resultado é um objeto JSON grande com todas as informações do anúncio',
        },
        {
          label: 'Cole aqui no Locai',
          description: 'Cole o hasData copiado no campo de importação do Locai',
          tip: 'Validaremos automaticamente os dados antes de importar',
        },
      ],
    },
    {
      id: 'url',
      title: 'Como pegar a URL da propriedade',
      icon: LinkIcon,
      color: '#10b981',
      difficulty: 'Fácil',
      time: '30 seg',
      steps: [
        {
          label: 'Acesse seu anúncio',
          description: 'Entre na página pública do seu anúncio no Airbnb',
          tip: 'Use o link "Ver anúncio" no painel de administração',
        },
        {
          label: 'Copie a URL completa',
          description: 'Copie a URL da barra de endereços do navegador',
          code: 'https://www.airbnb.com.br/rooms/12345678',
          copyable: true,
        },
        {
          label: 'Cole no campo URL',
          description: 'Cole a URL no campo de importação por URL',
          tip: 'Suportamos URLs de qualquer região do Airbnb',
        },
      ],
    },
    {
      id: 'ical',
      title: 'Como pegar o link iCal de sincronização',
      icon: CalendarMonth,
      color: '#f59e0b',
      difficulty: 'Fácil',
      time: '1 min',
      steps: [
        {
          label: 'Vá para Calendário',
          description: 'No painel do Airbnb, acesse: Anúncios → Seu anúncio → Calendário',
          tip: 'Você precisa estar logado como proprietário',
        },
        {
          label: 'Abra Disponibilidade',
          description: 'Clique em "Disponibilidade" ou "Configurações de calendário"',
        },
        {
          label: 'Encontre "Sincronização de calendários"',
          description: 'Role até a seção "Sincronização de calendários" ou "iCal"',
        },
        {
          label: 'Exporte o calendário',
          description: 'Clique em "Exportar calendário" para revelar o link iCal',
          tip: 'O link iCal começa com "https://www.airbnb.com.br/calendar/ical/"',
        },
        {
          label: 'Copie o link',
          description: 'Copie o link iCal completo',
          code: 'https://www.airbnb.com.br/calendar/ical/12345678.ics?s=...',
          copyable: true,
        },
        {
          label: 'Cole aqui',
          description: 'Cole o link iCal no Locai para sincronizar disponibilidade automaticamente',
          tip: 'Sincronizamos automaticamente a cada 12 horas',
        },
      ],
    },
  ];

  const handleCopyCode = (code: string, stepIndex: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, tips.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lightbulb sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{ color: 'white', fontWeight: 600, fontSize: { xs: '1.125rem', md: '1.25rem' } }}
            >
              Guia Rápido de Importação Airbnb
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
              Siga os passos abaixo para importar sua propriedade
            </Typography>
          </Box>
        </Stack>

        {/* Info Alert */}
        <Alert
          severity="info"
          icon={<Info />}
          sx={{
            backgroundColor: alpha('#3b82f6', 0.1),
            border: `1px solid ${alpha('#3b82f6', 0.2)}`,
            color: '#93c5fd',
            '& .MuiAlert-icon': { color: '#60a5fa' },
          }}
        >
          <Typography variant="body2">
            <strong>Dica Pro:</strong> Use o hasData para importação completa com todas as
            informações, fotos e configurações do seu anúncio
          </Typography>
        </Alert>
      </Stack>

      {/* Tips Cards */}
      <Stack spacing={2}>
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          const isActive = activeStep === index;
          const isExpanded = expandedTip === index;

          return (
            <MotionCard
              key={tip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              sx={{
                background: isActive
                  ? `linear-gradient(135deg, ${alpha(tip.color, 0.15)}, ${alpha(tip.color, 0.05)})`
                  : alpha(theme.palette.background.paper, 0.5),
                border: `2px solid ${isActive ? alpha(tip.color, 0.4) : alpha(theme.palette.divider, 0.2)}`,
                borderRadius: '16px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(tip.color, 0.2)}`,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  {/* Tip Header */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    onClick={() => setExpandedTip(isExpanded ? null : index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '10px',
                          background: `linear-gradient(135deg, ${tip.color}, ${alpha(tip.color, 0.7)})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon sx={{ color: 'white', fontSize: 24 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                          {tip.title}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip
                            label={tip.difficulty}
                            size="small"
                            sx={{
                              backgroundColor: alpha(tip.color, 0.2),
                              color: tip.color,
                              fontSize: '0.75rem',
                              height: 20,
                            }}
                          />
                          <Chip
                            label={tip.time}
                            size="small"
                            sx={{
                              backgroundColor: alpha('#ffffff', 0.1),
                              color: alpha('#ffffff', 0.7),
                              fontSize: '0.75rem',
                              height: 20,
                            }}
                          />
                        </Stack>
                      </Box>
                    </Stack>

                    <IconButton
                      size="small"
                      sx={{ color: alpha('#ffffff', 0.7) }}
                    >
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Stack>

                  {/* Tip Steps */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ mt: 2 }}>
                      <Stepper activeStep={-1} orientation="vertical">
                        {tip.steps.map((step, stepIndex) => (
                          <Step key={stepIndex} expanded>
                            <StepLabel
                              StepIconComponent={() => (
                                <Box
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${tip.color}, ${alpha(tip.color, 0.7)})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'white',
                                  }}
                                >
                                  {stepIndex + 1}
                                </Box>
                              )}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ color: 'white', fontWeight: 600 }}
                              >
                                {step.label}
                              </Typography>
                            </StepLabel>
                            <StepContent>
                              <Typography
                                variant="body2"
                                sx={{ color: alpha('#ffffff', 0.7), mb: 1 }}
                              >
                                {step.description}
                              </Typography>

                              {/* Code snippet */}
                              {step.code && (
                                <Paper
                                  sx={{
                                    p: 1.5,
                                    backgroundColor: alpha('#000000', 0.3),
                                    border: `1px solid ${alpha(tip.color, 0.2)}`,
                                    borderRadius: '8px',
                                    mb: 1,
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontFamily: 'monospace',
                                        color: '#10b981',
                                        fontSize: '0.875rem',
                                        wordBreak: 'break-all',
                                      }}
                                    >
                                      {step.code}
                                    </Typography>
                                    {step.copyable && (
                                      <IconButton
                                        size="small"
                                        onClick={() => handleCopyCode(step.code!, stepIndex)}
                                        sx={{ color: alpha('#ffffff', 0.7) }}
                                      >
                                        {copiedStep === stepIndex ? (
                                          <CheckCircle sx={{ fontSize: 18, color: '#10b981' }} />
                                        ) : (
                                          <ContentCopy sx={{ fontSize: 18 }} />
                                        )}
                                      </IconButton>
                                    )}
                                  </Stack>
                                </Paper>
                              )}

                              {/* Tip */}
                              {step.tip && (
                                <Alert
                                  severity="success"
                                  icon={<Lightbulb sx={{ fontSize: 16 }} />}
                                  sx={{
                                    py: 0.5,
                                    backgroundColor: alpha(tip.color, 0.1),
                                    border: `1px solid ${alpha(tip.color, 0.2)}`,
                                    '& .MuiAlert-message': {
                                      fontSize: '0.8125rem',
                                      color: alpha('#ffffff', 0.8),
                                    },
                                    '& .MuiAlert-icon': {
                                      color: tip.color,
                                    },
                                  }}
                                >
                                  {step.tip}
                                </Alert>
                              )}
                            </StepContent>
                          </Step>
                        ))}
                      </Stepper>
                    </Box>
                  </Collapse>
                </Stack>
              </CardContent>
            </MotionCard>
          );
        })}
      </Stack>

      {/* Complete Button */}
      {onComplete && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<CheckCircle />}
            onClick={handleComplete}
            sx={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              px: 4,
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #059669, #047857)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Entendi, Vamos Importar!
          </Button>
        </Box>
      )}
    </Box>
  );
}
