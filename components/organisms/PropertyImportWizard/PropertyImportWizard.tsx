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
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
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
  'Importar Dados',
  'Sincronização (Opcional)',
  'Completar Detalhes',
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

  // Step 3: iCal config
  const [iCalUrl, setICalUrl] = useState('');
  const [iCalError, setICalError] = useState<string | null>(null);
  const [skipICalConfig, setSkipICalConfig] = useState(false);
  const [showICalHelper, setShowICalHelper] = useState(false);

  // Step 4: Complete details
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Step 5: Result
  const [result, setResult] = useState<any>(null);

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

      // Move to Step 3 (iCal config)
      setActiveStep(2);
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
      setActiveStep(4); // Move to final step
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

      // Success!
      setShowCompletionDialog(false);
      setResult({
        success: true,
        propertyId,
        propertyName: completedData.name || 'Propriedade',
        eventsImported: syncResult?.result?.eventsImported || 0,
        iCalConfigured: !!iCalUrl && !skipICalConfig,
      });

      logger.info('[PropertyImportWizard] Import wizard completed successfully');

      // Call success callback
      if (onSuccess) {
        onSuccess({
          success: true,
          propertyId,
          propertyName: completedData.name,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
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
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 2,
          }}
        >
          <Home color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Importar Propriedade do Airbnb
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ mt: 3 }}>
          {/* Progress indicator */}
          {loading && <LinearProgress sx={{ mb: 3 }} />}

          {/* Stepper */}
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* ============================================ */}
            {/* STEP 0: Airbnb URL                           */}
            {/* ============================================ */}
            <Step>
              <StepLabel
                optional={
                  airbnbPropertyId && (
                    <Chip
                      label={`ID: ${airbnbPropertyId}`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )
                }
              >
                Cole a URL do anúncio no Airbnb
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Copie o link completo do seu anúncio no Airbnb (ex: airbnb.com.br/rooms/123...)
                </Typography>

                <TextField
                  fullWidth
                  placeholder="https://www.airbnb.com.br/rooms/1537685406266226838"
                  value={airbnbUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  error={!!urlError}
                  helperText={urlError || 'Cole a URL completa do anúncio'}
                  sx={{ mt: 2, mb: 2 }}
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: airbnbPropertyId ? 'success.main' : 'action.active' }} />,
                  }}
                  autoFocus
                />

                {airbnbPropertyId && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      ✓ URL válida! ID da propriedade: <strong>{airbnbPropertyId}</strong>
                    </Typography>
                  </Alert>
                )}

                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    onClick={handleProceedToImport}
                    disabled={!airbnbPropertyId || loading}
                    endIcon={<NavigateNext />}
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
                optional={
                  mappedProperty && (
                    <Chip
                      label="Dados importados"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )
                }
                error={!!importError}
              >
                Importar dados da propriedade
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Vamos buscar as informações do seu anúncio no Airbnb
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
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>✓ Dados importados com sucesso!</strong>
                    </Typography>
                    <Typography variant="caption">
                      Propriedade: {mappedProperty.name}
                    </Typography>
                  </Alert>
                )}

                {importError && (
                  <Alert severity="error" icon={<ErrorIcon />} sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2">{importError}</Typography>
                  </Alert>
                )}

                <Box display="flex" gap={1}>
                  <Button onClick={() => setActiveStep(0)} disabled={loading}>
                    Voltar
                  </Button>
                  {!mappedProperty && (
                    <Button
                      variant="contained"
                      onClick={handleImportData}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <CloudSync />}
                    >
                      {loading ? 'Importando...' : 'Importar Dados'}
                    </Button>
                  )}
                  {mappedProperty && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(2)}
                      endIcon={<NavigateNext />}
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
                  <Paper
                    sx={{
                      p: 3,
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      borderRadius: 2,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <CheckCircle color="success" sx={{ fontSize: 48 }} />
                      <Box>
                        <Typography variant="h6" color="success.main" gutterBottom>
                          Propriedade importada com sucesso!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {result.propertyName}
                        </Typography>
                      </Box>
                    </Box>

                    {result.iCalConfigured && (
                      <Alert severity="success" icon={<CalendarMonth />} sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          ✓ Sincronização de calendário configurada!<br />
                          {result.eventsImported > 0 && `${result.eventsImported} reserva(s) importada(s).`}
                        </Typography>
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      onClick={handleClose}
                      startIcon={<Done />}
                      fullWidth
                    >
                      Concluir
                    </Button>
                  </Paper>
                ) : result?.error ? (
                  <Alert severity="error" icon={<ErrorIcon />}>
                    <Typography variant="body2">{result.error}</Typography>
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
