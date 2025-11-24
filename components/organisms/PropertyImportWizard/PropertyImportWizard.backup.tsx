'use client';

/**
 * Property Import Wizard - Improved UX
 *
 * Step-by-step flow:
 * 1. Paste Airbnb URL → Extract Property ID
 * 2. Import property data from Airbnb
 * 3. Configure iCal sync (Optional but recommended)
 * 4. Complete missing details
 * 5. Success!
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Chip,
  Paper,
  LinearProgress,
  CircularProgress,
  alpha,
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Home,
  Link as LinkIcon,
  CheckCircle,
  CalendarMonth,
  CloudSync,
  Error as ErrorIcon,
  Info,
  ArrowForward,
  NavigateNext,
  Settings,
  Done,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import {
  extractAirbnbPropertyId,
  isValidAirbnbUrl,
  isValidICalUrl,
} from '@/lib/utils/airbnb-helpers';
import { importFromAirbnbUrl } from '@/lib/services/airbnb-import-service';
import { mapAirbnbToProperty, validateMappedProperty } from '@/lib/utils/airbnb-mapper';
import AirbnbICalHelper from '@/components/organisms/AirbnbICalHelper/AirbnbICalHelper';
import { PropertyCompletionDialog } from '@/components/organisms/PropertyCompletionDialog';
import { logger } from '@/lib/utils/logger';

interface PropertyImportWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const wizardSteps = [
  'URL do Airbnb',
  'Dados do Imóvel',
  'Sincronizar Calendário',
  'Concluído',
];

export default function PropertyImportWizard({
  open,
  onClose,
  onSuccess,
}: PropertyImportWizardProps) {
  const { getFirebaseToken } = useAuth();
  const { tenantId } = useTenant();
  const theme = useTheme();
  const router = useRouter();

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Airbnb URL
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [airbnbPropertyId, setAirbnbPropertyId] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Step 2: Import data
  const [importedData, setImportedData] = useState<any>(null);
  const [mappedProperty, setMappedProperty] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Step 2: Complete details (merged into step 2)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [propertyCompleted, setPropertyCompleted] = useState(false);

  // Step 3: iCal config + reservations
  const [iCalUrl, setICalUrl] = useState('');
  const [iCalError, setICalError] = useState<string | null>(null);
  const [skipICalConfig, setSkipICalConfig] = useState(false);
  const [iCalReservations, setICalReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [creatingReservations, setCreatingReservations] = useState(false);

  // Step 4: Result
  const [result, setResult] = useState<any>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  /**
   * Step 1: Validate and extract Airbnb URL
   */
  const handleUrlChange = (url: string) => {
    setAirbnbUrl(url);
    setUrlError(null);
    setAirbnbPropertyId(null);

    if (!url.trim()) return;

    // Validate URL
    if (!isValidAirbnbUrl(url)) {
      setUrlError('URL inválida. Use um link do Airbnb (ex: airbnb.com.br/rooms/123...)');
      return;
    }

    // Extract property ID
    const propertyId = extractAirbnbPropertyId(url);
    if (propertyId) {
      setAirbnbPropertyId(propertyId);
      logger.info('[PropertyImportWizard] Airbnb property ID extracted', { propertyId });
    } else {
      setUrlError('Não foi possível extrair o ID da propriedade');
    }
  };

  /**
   * Step 1 → Step 2: Proceed to import
   */
  const handleProceedToImport = () => {
    if (!airbnbPropertyId) {
      setUrlError('Forneça uma URL válida do Airbnb');
      return;
    }

    setActiveStep(1);
  };

  /**
   * Step 2: Import property data from Airbnb
   */
  const handleImportData = async () => {
    if (!airbnbUrl || !tenantId) return;

    setLoading(true);
    setImportError(null);

    try {
      // Import from Airbnb
      const importResult = await importFromAirbnbUrl(airbnbUrl);

      if (!importResult.success || !importResult.data) {
        throw new Error(importResult.error || 'Erro ao importar do Airbnb');
      }

      setImportedData(importResult.data);

      // Map to our Property format
      const mapped = mapAirbnbToProperty(importResult.data, tenantId);

      // Validate mapped property
      const validation = validateMappedProperty(mapped);

      if (!validation.valid) {
        throw new Error(
          'Dados da propriedade inválidos:\n' + validation.errors.join('\n')
        );
      }

      setMappedProperty(mapped);

      logger.info('[PropertyImportWizard] Property data imported successfully', {
        propertyName: mapped.name,
      });

      // Open completion dialog to review/complete data
      setShowCompletionDialog(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setImportError(errorMessage);
      logger.error('[PropertyImportWizard] Import failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Validate iCal URL
   */
  const handleICalUrlChange = (url: string) => {
    setICalUrl(url);
    setICalError(null);

    if (!url.trim()) return;

    if (!isValidICalUrl(url)) {
      setICalError('URL inválida. Deve ser HTTPS e terminar com .ics');
    }
  };

  /**
   * Step 3 → Step 4: Proceed to complete details
   */
  const handleProceedToCompletion = () => {
    if (!skipICalConfig && iCalUrl && iCalError) {
      return; // Block if iCal URL is invalid
    }

    setActiveStep(3);
    setShowCompletionDialog(true);
  };

  /**
   * Step 4: Complete property details
   */
  const handlePropertyCompletion = async (completedData: any) => {
    try {
      setLoading(true);

      // Create property via API
      const token = await getFirebaseToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação');
      }

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(completedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar propriedade');
      }

      const createdProperty = await response.json();
      const propertyId = createdProperty.data?.id;

      if (!propertyId) {
        throw new Error('Propriedade criada mas ID não retornado');
      }

      logger.info('[PropertyImportWizard] Property created', { propertyId });

      // Close completion dialog first
      setShowCompletionDialog(false);

      // Configure iCal sync if URL provided
      let syncResult = null;
      if (iCalUrl && !skipICalConfig) {
        try {
          const syncResponse = await fetch('/api/calendar/sync/configure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              propertyId,
              iCalUrl,
              source: 'airbnb',
              syncFrequency: 'daily',
            }),
          });

          if (syncResponse.ok) {
            // Trigger first sync
            const firstSyncResponse = await fetch(`/api/calendar/sync/${propertyId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });

            if (firstSyncResponse.ok) {
              syncResult = await firstSyncResponse.json();
              logger.info('[PropertyImportWizard] First sync completed', {
                eventsImported: syncResult.result?.eventsImported || 0,
              });
            }
          }
        } catch (syncError) {
          logger.warn('[PropertyImportWizard] iCal sync failed', { syncError });
        }
      }

      // Move to success step
      setActiveStep(4);
      setResult({
        success: true,
        propertyId,
        propertyName: completedData.title || 'Propriedade',
        eventsImported: syncResult?.result?.eventsImported || 0,
        iCalConfigured: !!iCalUrl && !skipICalConfig,
      });

      logger.info('[PropertyImportWizard] Import wizard completed successfully');

      // Call success callback
      if (onSuccess) {
        onSuccess({
          success: true,
          propertyId,
          propertyName: completedData.name || completedData.title,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setShowCompletionDialog(false);
      setResult({
        success: false,
        error: errorMessage,
      });
      logger.error('[PropertyImportWizard] Property completion failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset wizard and close
   */
  const handleClose = () => {
    if (!loading) {
      // Reset all state
      setActiveStep(0);
      setAirbnbUrl('');
      setAirbnbPropertyId(null);
      setUrlError(null);
      setImportedData(null);
      setMappedProperty(null);
      setImportError(null);
      setICalUrl('');
      setICalError(null);
      setSkipICalConfig(false);
      setResult(null);
      setShowCompletionDialog(false);

      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={loading}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha('#1e293b', 0.98)}, ${alpha('#0f172a', 0.98)})`,
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        {/* Modern Header with Gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)',
            p: 4,
            pb: 5,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative background elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: alpha('#ffffff', 0.1),
              filter: 'blur(40px)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: alpha('#ffffff', 0.08),
              filter: 'blur(30px)',
            }}
          />

          {/* Header Content */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  background: alpha('#ffffff', 0.15),
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${alpha('#ffffff', 0.2)}`,
                }}
              >
                <Home sx={{ fontSize: 28, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    letterSpacing: '-0.02em',
                  }}
                >
                  Importar do Airbnb
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha('#ffffff', 0.9),
                    fontWeight: 500,
                  }}
                >
                  Configure sua propriedade em poucos minutos
                </Typography>
              </Box>
            </Box>

            {/* Progress Steps */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mt: 3,
                flexWrap: 'wrap',
              }}
            >
              {wizardSteps.map((step, index) => (
                <Chip
                  key={index}
                  label={step}
                  size="small"
                  sx={{
                    backgroundColor:
                      activeStep >= index
                        ? alpha('#ffffff', 0.25)
                        : alpha('#ffffff', 0.1),
                    color: 'white',
                    fontWeight: activeStep === index ? 700 : 500,
                    border: `1px solid ${
                      activeStep >= index
                        ? alpha('#ffffff', 0.3)
                        : alpha('#ffffff', 0.15)
                    }`,
                    backdropFilter: 'blur(10px)',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        <DialogContent sx={{ p: 4, pt: 3 }}>
          {/* Progress indicator */}
          {loading && (
            <LinearProgress
              sx={{
                mb: 3,
                borderRadius: 2,
                height: 6,
                backgroundColor: alpha('#6366f1', 0.1),
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #d946ef)',
                  borderRadius: 2,
                },
              }}
            />
          )}

          {/* Stepper */}
          <Stepper
            activeStep={activeStep}
            orientation="vertical"
            sx={{
              '& .MuiStepLabel-root': {
                padding: 0,
              },
              '& .MuiStepContent-root': {
                borderLeft: `2px solid ${alpha('#6366f1', 0.2)}`,
                ml: 2.5,
                pl: 3,
              },
              '& .MuiStepConnector-line': {
                borderColor: alpha('#6366f1', 0.2),
                borderWidth: 2,
              },
            }}
          >
            {/* ============================================ */}
            {/* STEP 0: Airbnb URL                           */}
            {/* ============================================ */}
            <Step>
              <StepLabel
                StepIconProps={{
                  sx: {
                    color: alpha('#6366f1', 0.3),
                    '&.Mui-active': {
                      color: '#6366f1',
                    },
                    '&.Mui-completed': {
                      color: '#10b981',
                    },
                  },
                }}
                optional={
                  airbnbPropertyId && (
                    <Chip
                      label={`ID: ${airbnbPropertyId}`}
                      size="small"
                      sx={{
                        mt: 0.5,
                        backgroundColor: alpha('#10b981', 0.15),
                        color: '#10b981',
                        border: `1px solid ${alpha('#10b981', 0.3)}`,
                        fontWeight: 600,
                      }}
                    />
                  )
                }
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: activeStep === 0 ? '#6366f1' : alpha('#ffffff', 0.7),
                  },
                }}
              >
                Cole a URL do anúncio no Airbnb
              </StepLabel>
              <StepContent>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: alpha('#6366f1', 0.05),
                    border: `1px solid ${alpha('#6366f1', 0.1)}`,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: alpha('#ffffff', 0.7),
                      mb: 2,
                      fontSize: '0.9375rem',
                      lineHeight: 1.6,
                    }}
                  >
                    Copie o link completo do seu anúncio no Airbnb para importar todas as informações automaticamente.
                  </Typography>

                  <TextField
                    fullWidth
                    placeholder="https://www.airbnb.com.br/rooms/1537685406266226838"
                    value={airbnbUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    error={!!urlError}
                    helperText={urlError || 'Cole a URL completa do anúncio do Airbnb'}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha('#ffffff', 0.05),
                        borderRadius: 2,
                        fontSize: '0.9375rem',
                        '& fieldset': {
                          borderColor: alpha('#6366f1', 0.2),
                          borderWidth: 2,
                        },
                        '&:hover fieldset': {
                          borderColor: alpha('#6366f1', 0.4),
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366f1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        py: 1.5,
                      },
                      '& .MuiFormHelperText-root': {
                        fontSize: '0.8125rem',
                        mt: 1,
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <LinkIcon
                          sx={{
                            mr: 1.5,
                            color: airbnbPropertyId ? '#10b981' : alpha('#ffffff', 0.4),
                            fontSize: 22,
                          }}
                        />
                      ),
                    }}
                    autoFocus
                  />

                  {airbnbPropertyId && (
                    <Alert
                      severity="success"
                      icon={<CheckCircle />}
                      sx={{
                        backgroundColor: alpha('#10b981', 0.15),
                        border: `1px solid ${alpha('#10b981', 0.3)}`,
                        borderRadius: 2,
                        '& .MuiAlert-message': {
                          color: '#10b981',
                        },
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        ✓ URL válida detectada!
                      </Typography>
                      <Typography variant="caption" display="block">
                        ID da propriedade: <strong>{airbnbPropertyId}</strong>
                      </Typography>
                    </Alert>
                  )}
                </Box>

                <Box display="flex" gap={2}>
                  <Button
                    variant="contained"
                    onClick={handleProceedToImport}
                    disabled={!airbnbPropertyId || loading}
                    endIcon={<NavigateNext />}
                    size="large"
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      boxShadow: `0 4px 16px ${alpha('#6366f1', 0.3)}`,
                      fontWeight: 600,
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 20px ${alpha('#6366f1', 0.4)}`,
                      },
                      '&:disabled': {
                        background: alpha('#6366f1', 0.2),
                        color: alpha('#ffffff', 0.4),
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Continuar
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* ============================================ */}
            {/* STEP 1: Import Data                          */}
            {/* ============================================ */}
            <Step>
              <StepLabel
                StepIconProps={{
                  sx: {
                    color: alpha('#6366f1', 0.3),
                    '&.Mui-active': {
                      color: '#6366f1',
                    },
                    '&.Mui-completed': {
                      color: '#10b981',
                    },
                  },
                }}
                optional={
                  mappedProperty && (
                    <Chip
                      label="Dados importados"
                      size="small"
                      sx={{
                        mt: 0.5,
                        backgroundColor: alpha('#10b981', 0.15),
                        color: '#10b981',
                        border: `1px solid ${alpha('#10b981', 0.3)}`,
                        fontWeight: 600,
                      }}
                    />
                  )
                }
                error={!!importError}
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: activeStep === 1 ? '#6366f1' : alpha('#ffffff', 0.7),
                  },
                }}
              >
                Importar dados da propriedade
              </StepLabel>
              <StepContent>
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha('#ffffff', 0.7),
                    mb: 2,
                    fontSize: '0.9375rem',
                  }}
                >
                  Vamos buscar as informações do seu anúncio no Airbnb automaticamente
                </Typography>

                {!mappedProperty && !importError && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      mt: 2,
                      mb: 2,
                      textAlign: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    }}
                  >
                    <Home sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Pronto para importar
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Clique em "Importar Dados" para buscar:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Fotos do imóvel" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Comodidades e regras" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Descrição e localização" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Capacidade de hóspedes" />
                      </ListItem>
                    </List>
                  </Paper>
                )}

                {mappedProperty && !importError && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      mt: 2,
                      mb: 2,
                      background: `linear-gradient(135deg, ${alpha('#10b981', 0.1)}, ${alpha('#059669', 0.05)})`,
                      border: `2px solid ${alpha('#10b981', 0.3)}`,
                      borderRadius: 2,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 4px 16px ${alpha('#10b981', 0.3)}`,
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 32, color: 'white' }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" color="success.main" fontWeight={700}>
                          ✓ Dados Importados com Sucesso!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {mappedProperty.title || mappedProperty.name}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" gap={2} flexWrap="wrap">
                      <Chip
                        icon={<Home />}
                        label={`${mappedProperty.bedrooms || 0} quartos`}
                        size="small"
                        sx={{
                          backgroundColor: alpha('#10b981', 0.1),
                          border: `1px solid ${alpha('#10b981', 0.3)}`,
                        }}
                      />
                      <Chip
                        icon={<CheckCircle />}
                        label={`${mappedProperty.photos?.length || 0} fotos`}
                        size="small"
                        sx={{
                          backgroundColor: alpha('#10b981', 0.1),
                          border: `1px solid ${alpha('#10b981', 0.3)}`,
                        }}
                      />
                      <Chip
                        icon={<CheckCircle />}
                        label={`${mappedProperty.amenities?.length || 0} comodidades`}
                        size="small"
                        sx={{
                          backgroundColor: alpha('#10b981', 0.1),
                          border: `1px solid ${alpha('#10b981', 0.3)}`,
                        }}
                      />
                    </Box>
                  </Paper>
                )}

                {importError && (
                  <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2">{importError}</Typography>
                  </Alert>
                )}

                <Box display="flex" gap={2}>
                  <Button
                    onClick={() => setActiveStep(0)}
                    disabled={loading}
                    size="large"
                    sx={{
                      borderColor: alpha('#ffffff', 0.2),
                      color: alpha('#ffffff', 0.7),
                      fontWeight: 600,
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      '&:hover': {
                        borderColor: alpha('#ffffff', 0.3),
                        backgroundColor: alpha('#ffffff', 0.05),
                      },
                    }}
                  >
                    Voltar
                  </Button>
                  {!mappedProperty && (
                    <Button
                      variant="contained"
                      onClick={handleImportData}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <CloudSync />}
                      size="large"
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: `0 4px 16px ${alpha('#6366f1', 0.3)}`,
                        fontWeight: 600,
                        py: 1.5,
                        px: 3,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 20px ${alpha('#6366f1', 0.4)}`,
                        },
                        '&:disabled': {
                          background: alpha('#6366f1', 0.2),
                          color: alpha('#ffffff', 0.4),
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {loading ? 'Importando...' : 'Importar Dados'}
                    </Button>
                  )}
                  {mappedProperty && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(2)}
                      endIcon={<NavigateNext />}
                      size="large"
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: `0 4px 16px ${alpha('#6366f1', 0.3)}`,
                        fontWeight: 600,
                        py: 1.5,
                        px: 3,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 20px ${alpha('#6366f1', 0.4)}`,
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Continuar
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>

            {/* ============================================ */}
            {/* STEP 2: iCal Configuration (Optional)        */}
            {/* ============================================ */}
            <Step>
              <StepLabel
                optional={
                  <Chip
                    label="Opcional"
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                }
              >
                Configurar sincronização de calendário
              </StepLabel>
              <StepContent>
                <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Recomendado:</strong> Sincronize seu calendário para:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • Importar reservas do Airbnb automaticamente<br />
                    • Bloquear datas no Airbnb com reservas internas<br />
                    • Evitar double booking
                  </Typography>
                </Alert>

                <TextField
                  fullWidth
                  placeholder="https://www.airbnb.com/calendar/ical/12345678.ics?s=..."
                  value={iCalUrl}
                  onChange={(e) => handleICalUrlChange(e.target.value)}
                  error={!!iCalError}
                  helperText={iCalError || 'Cole o link do calendário iCal do Airbnb'}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: <CalendarMonth sx={{ mr: 1, color: iCalUrl && !iCalError ? 'success.main' : 'action.active' }} />,
                  }}
                />

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowICalHelper(true)}
                  disabled={!airbnbPropertyId}
                  startIcon={<Info />}
                  sx={{ mb: 2 }}
                >
                  Como encontrar meu link iCal?
                </Button>

                <Box display="flex" gap={1}>
                  <Button onClick={() => setActiveStep(1)} disabled={loading}>
                    Voltar
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSkipICalConfig(true);
                      handleProceedToCompletion();
                    }}
                    disabled={loading}
                  >
                    Pular (Configurar depois)
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleProceedToCompletion}
                    disabled={loading || (!!iCalUrl && !!iCalError)}
                    endIcon={<NavigateNext />}
                  >
                    {iCalUrl ? 'Configurar e Continuar' : 'Continuar sem iCal'}
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* ============================================ */}
            {/* STEP 3: Complete Details                     */}
            {/* ============================================ */}
            <Step>
              <StepLabel>Completar detalhes da propriedade</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Preencha as informações faltantes...
                </Typography>
                {/* PropertyCompletionDialog handles this step */}
              </StepContent>
            </Step>

            {/* ============================================ */}
            {/* STEP 4: Success                              */}
            {/* ============================================ */}
            <Step>
              <StepLabel>Concluído!</StepLabel>
              <StepContent>
                {result?.success ? (
                  <Box>
                    {/* Success Card - Inspired by RevolutionaryOnboarding */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        background: `linear-gradient(135deg, ${alpha('#10b981', 0.15)}, ${alpha('#059669', 0.1)})`,
                        border: `2px solid ${alpha('#10b981', 0.3)}`,
                        borderRadius: 3,
                        textAlign: 'center',
                        mb: 3,
                      }}
                    >
                      {/* Success Icon with Animation */}
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          boxShadow: `0 8px 24px ${alpha('#10b981', 0.4)}`,
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 48, color: 'white' }} />
                      </Box>

                      {/* Success Title */}
                      <Typography
                        variant="h5"
                        sx={{
                          color: '#10b981',
                          fontWeight: 700,
                          mb: 1,
                        }}
                      >
                        🎉 Propriedade Importada!
                      </Typography>

                      {/* Property Name */}
                      <Typography
                        variant="h6"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 500,
                          mb: 3,
                        }}
                      >
                        {result.propertyName}
                      </Typography>

                      {/* Success Stats */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: 3,
                          flexWrap: 'wrap',
                          mb: 3,
                        }}
                      >
                        <Box>
                          <Typography variant="h4" color="success.main" fontWeight={700}>
                            ✓
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Dados Importados
                          </Typography>
                        </Box>

                        {result.iCalConfigured && (
                          <Box>
                            <Typography variant="h4" color="success.main" fontWeight={700}>
                              {result.eventsImported || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Reservas Sincronizadas
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* iCal Success Message */}
                      {result.iCalConfigured && (
                        <Alert
                          severity="success"
                          icon={<CalendarMonth />}
                          sx={{
                            mb: 2,
                            backgroundColor: alpha('#10b981', 0.1),
                            border: `1px solid ${alpha('#10b981', 0.3)}`,
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            📅 Sincronização Automática Configurada
                          </Typography>
                          <Typography variant="caption" display="block">
                            Suas reservas do Airbnb serão sincronizadas automaticamente
                            {result.eventsImported > 0 && ` • ${result.eventsImported} reserva(s) já importada(s)`}
                          </Typography>
                        </Alert>
                      )}
                    </Paper>

                    {/* Action Buttons */}
                    <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleClose}
                        startIcon={<Done />}
                        fullWidth
                        sx={{
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          boxShadow: `0 4px 16px ${alpha('#10b981', 0.3)}`,
                          fontWeight: 600,
                          py: 1.5,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 6px 20px ${alpha('#10b981', 0.4)}`,
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        Concluir e Voltar
                      </Button>

                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => router.push(`/dashboard/properties/${result.propertyId}`)}
                        startIcon={<Visibility />}
                        fullWidth
                        sx={{
                          borderColor: alpha('#10b981', 0.3),
                          color: '#10b981',
                          fontWeight: 600,
                          py: 1.5,
                          '&:hover': {
                            borderColor: alpha('#10b981', 0.5),
                            backgroundColor: alpha('#10b981', 0.1),
                          },
                        }}
                      >
                        Ver Propriedade
                      </Button>
                    </Box>
                  </Box>
                ) : result?.error ? (
                  <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Erro ao importar propriedade
                    </Typography>
                    <Typography variant="caption" display="block">
                      {result.error}
                    </Typography>
                  </Alert>
                ) : null}
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Property Completion Dialog */}
      {mappedProperty && (
        <PropertyCompletionDialog
          open={showCompletionDialog}
          onClose={() => {
            setShowCompletionDialog(false);
            setActiveStep(2); // Go back to iCal step
          }}
          propertyData={mappedProperty}
          onComplete={handlePropertyCompletion}
        />
      )}

      {/* Airbnb iCal Helper Dialog */}
      <AirbnbICalHelper
        open={showICalHelper}
        onClose={() => setShowICalHelper(false)}
        airbnbPropertyId={airbnbPropertyId}
        onICalUrlProvided={(url) => {
          setICalUrl(url);
          handleICalUrlChange(url);
          setShowICalHelper(false);
        }}
      />
    </>
  );
}
