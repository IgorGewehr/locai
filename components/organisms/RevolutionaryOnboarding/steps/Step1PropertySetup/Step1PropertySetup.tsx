/**
 * Step 1: Property Setup Component
 * Main component for property creation/import in onboarding
 * Offers 3 options: Import from Airbnb, Create Manually, or Skip
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Grid,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Home,
  Close,
  CloudUpload,
  Edit,
  ArrowForward,
  CheckCircle,
  Lightbulb,
  Speed,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import AirbnbQuickTips from './AirbnbQuickTips';
import PropertyImportWizard from '@/components/organisms/PropertyImportWizard/PropertyImportWizard';
import { logger } from '@/lib/utils/logger';

interface Step1PropertySetupProps {
  open: boolean;
  onClose: () => void;
  onComplete: (data?: any) => void;
  onSkip?: () => void;
}

type SetupMode = 'select' | 'import_airbnb' | 'create_manual' | 'view_tips';

const MotionCard = motion(Card);

export default function Step1PropertySetup({
  open,
  onClose,
  onComplete,
  onSkip,
}: Step1PropertySetupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mode, setMode] = useState<SetupMode>('select');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Handle option selection
  const handleSelectMode = (selectedMode: SetupMode) => {
    logger.info('🎯 [Step1] Modo selecionado', { mode: selectedMode });
    setMode(selectedMode);

    if (selectedMode === 'import_airbnb') {
      // Open import dialog
      setShowImportDialog(true);
    } else if (selectedMode === 'create_manual') {
      // For now, close and let user go to create page
      // TODO: Add embedded create form
      handleManualCreation();
    }
  };

  // Handle import success
  const handleImportSuccess = (result: any) => {
    logger.info('✅ [Step1] Importação concluída', { result });
    setShowImportDialog(false);
    onComplete(result);
  };

  // Handle manual creation
  const handleManualCreation = () => {
    logger.info('📝 [Step1] Criação manual selecionada');
    // Redirect to create page or show embedded form
    onComplete({ mode: 'manual' });
  };

  // Handle skip
  const handleSkip = () => {
    if (onSkip) {
      logger.info('⏭️ [Step1] Passo pulado');
      onSkip();
    }
    onClose();
  };

  // Options for property setup
  const options = [
    {
      id: 'import_airbnb',
      title: 'Importar do Airbnb',
      description: 'Importe todas as informações, fotos e configurações automaticamente',
      icon: CloudUpload,
      color: '#dc2626',
      recommended: true,
      features: ['Importação completa', 'Fotos incluídas', 'Dados validados', 'Mais rápido'],
      time: '2-3 min',
    },
    {
      id: 'create_manual',
      title: 'Criar Manualmente',
      description: 'Preencha os dados da propriedade passo a passo',
      icon: Edit,
      color: '#10b981',
      features: ['Controle total', 'Adicione detalhes', 'Sem dependências', 'Personalizável'],
      time: '5-10 min',
    },
  ];

  const renderModeSelection = () => (
    <Box>
      {/* Header */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #dc2626, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
              }}
            >
              <Home sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                }}
              >
                Adicionar Primeira Propriedade
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.7) }}>
                Escolha como deseja adicionar sua propriedade
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={onClose} sx={{ color: alpha('#ffffff', 0.6) }}>
            <Close />
          </IconButton>
        </Stack>

        {/* Info Alert */}
        <Alert
          severity="info"
          icon={<Lightbulb />}
          sx={{
            backgroundColor: alpha('#3b82f6', 0.1),
            border: `1px solid ${alpha('#3b82f6', 0.2)}`,
            color: '#93c5fd',
            '& .MuiAlert-icon': { color: '#60a5fa' },
          }}
        >
          <Typography variant="body2">
            <strong>Recomendado:</strong> Se você já tem um anúncio no Airbnb, importe para
            economizar tempo. Caso contrário, crie manualmente.
          </Typography>
        </Alert>
      </Stack>

      {/* Options Grid */}
      <Grid container spacing={2}>
        {options.map((option, index) => {
          const Icon = option.icon;

          return (
            <Grid item xs={12} md={6} key={option.id}>
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(option.color, 0.15)}, ${alpha(option.color, 0.05)})`,
                  border: `2px solid ${alpha(option.color, 0.3)}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'visible',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    border: `2px solid ${alpha(option.color, 0.6)}`,
                    boxShadow: `0 12px 40px ${alpha(option.color, 0.3)}`,
                  },
                }}
                onClick={() => handleSelectMode(option.id as SetupMode)}
              >
                {/* Recommended Badge */}
                {option.recommended && (
                  <Chip
                    label="Recomendado"
                    size="small"
                    icon={<Speed sx={{ fontSize: 14 }} />}
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: 16,
                      backgroundColor: option.color,
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      boxShadow: `0 4px 12px ${alpha(option.color, 0.4)}`,
                    }}
                  />
                )}

                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${option.color}, ${alpha(option.color, 0.7)})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                      }}
                    >
                      <Icon sx={{ color: 'white', fontSize: 32 }} />
                    </Box>

                    {/* Title */}
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ color: 'white', fontWeight: 600, mb: 0.5 }}
                      >
                        {option.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: alpha('#ffffff', 0.7), lineHeight: 1.6 }}
                      >
                        {option.description}
                      </Typography>
                    </Box>

                    {/* Features */}
                    <Stack spacing={0.5}>
                      {option.features.map((feature) => (
                        <Stack
                          key={feature}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <CheckCircle
                            sx={{ fontSize: 16, color: option.color }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ color: alpha('#ffffff', 0.8), fontSize: '0.8125rem' }}
                          >
                            {feature}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>

                    {/* Time estimate */}
                    <Chip
                      label={`⏱️ ${option.time}`}
                      size="small"
                      sx={{
                        backgroundColor: alpha(option.color, 0.2),
                        color: alpha('#ffffff', 0.9),
                        fontSize: '0.75rem',
                        width: 'fit-content',
                      }}
                    />

                    {/* Action Button */}
                    <Button
                      variant="contained"
                      fullWidth
                      endIcon={<ArrowForward />}
                      sx={{
                        mt: 1,
                        background: `linear-gradient(135deg, ${option.color}, ${alpha(option.color, 0.8)})`,
                        fontWeight: 600,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(option.color, 0.9)}, ${alpha(option.color, 0.7)})`,
                        },
                      }}
                    >
                      Escolher esta opção
                    </Button>
                  </Stack>
                </CardContent>
              </MotionCard>
            </Grid>
          );
        })}
      </Grid>

      {/* View Tips Button */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<Lightbulb />}
          onClick={() => setMode('view_tips')}
          sx={{
            borderColor: alpha('#f59e0b', 0.3),
            color: '#fbbf24',
            '&:hover': {
              borderColor: alpha('#f59e0b', 0.5),
              backgroundColor: alpha('#f59e0b', 0.1),
            },
          }}
        >
          Ver Dicas de Importação do Airbnb
        </Button>
      </Box>

      {/* Skip Button */}
      {onSkip && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="text"
            onClick={handleSkip}
            sx={{
              color: alpha('#ffffff', 0.6),
              '&:hover': {
                backgroundColor: alpha('#ffffff', 0.05),
              },
            }}
          >
            Pular por enquanto
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderContent = () => {
    switch (mode) {
      case 'view_tips':
        return (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                Dicas de Importação Airbnb
              </Typography>
              <IconButton onClick={() => setMode('select')} sx={{ color: alpha('#ffffff', 0.6) }}>
                <Close />
              </IconButton>
            </Stack>
            <AirbnbQuickTips
              onComplete={() => {
                setMode('import_airbnb');
                setShowImportDialog(true);
              }}
              embedded
            />
          </Box>
        );

      case 'select':
      default:
        return renderModeSelection();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%)',
            borderRadius: isMobile ? 0 : '20px',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* ✅ Import Wizard (Airbnb) - Improved UX */}
      <PropertyImportWizard
        open={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setMode('select');
        }}
        onSuccess={handleImportSuccess}
      />
    </>
  );
}
