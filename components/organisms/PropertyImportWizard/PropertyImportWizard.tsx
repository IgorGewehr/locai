'use client';

/**
 * Property Import Wizard - Final Redesigned UX
 *
 * NEW FLOW (6 steps):
 * 1. Airbnb URL → Extract property ID
 * 2. Import & Create Property → Create with BASIC data only (no completion dialog)
 * 3. iCal Sync → Preview & auto-create reservations (updates availability)
 * 4. Export iCal → Generate our iCal URL for user to import in Airbnb/Booking
 * 5. Review Property → Edit property details (availability now populated)
 * 6. Success with complete statistics
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Box,
  Typography,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Paper,
  LinearProgress,
  CircularProgress,
  alpha,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  Home,
  Link as LinkIcon,
  CheckCircle,
  CalendarMonth,
  CloudSync,
  Error as ErrorIcon,
  NavigateNext,
  Done,
  Visibility,
  OpenInNew,
  Close,
  NightsStay,
  Edit,
  ContentCopy,
  FileDownload,
} from '@mui/icons-material';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import {
  extractAirbnbPropertyId,
  isValidAirbnbUrl,
  isValidICalUrl,
  generateAirbnbCalendarSettingsUrl,
} from '@/lib/utils/airbnb-helpers';
import { importFromAirbnbUrl } from '@/lib/services/airbnb-import-service';
import { mapAirbnbToProperty, validateMappedProperty } from '@/lib/utils/airbnb-mapper';
import { PropertyCompletionDialog } from '@/components/organisms/PropertyCompletionDialog';
import { logger } from '@/lib/utils/logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PropertyImportWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const wizardSteps = [
  'URL do Airbnb',
  'Criar Imóvel',
  'Sincronizar Calendário',
  'Exportar iCal',
  'Revisar Detalhes',
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

  // Step 2: Import & Create
  const [importedData, setImportedData] = useState<any>(null);
  const [mappedProperty, setMappedProperty] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Step 3: iCal sync
  const [iCalUrl, setICalUrl] = useState('');
  const [iCalError, setICalError] = useState<string | null>(null);
  const [iCalPreviewLoading, setICalPreviewLoading] = useState(false);
  const [iCalPreview, setICalPreview] = useState<any>(null);
  const [creatingReservations, setCreatingReservations] = useState(false);
  const [reservationsCreated, setReservationsCreated] = useState(0);

  // Step 4: iCal Export
  const [iCalExportUrl, setICalExportUrl] = useState<string | null>(null);
  const [iCalExportToken, setICalExportToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  // Step 5: Review property
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // Step 6: Result
  const [result, setResult] = useState<any>(null);

  /**
   * Step 1: Validate and extract Airbnb URL
   */
  const handleUrlChange = (url: string) => {
    setAirbnbUrl(url);
    setUrlError(null);
    setAirbnbPropertyId(null);

    if (!url.trim()) return;

    if (!isValidAirbnbUrl(url)) {
      setUrlError('Link inválido. Cole o link do anúncio (ex: airbnb.com/rooms/12345)');
      return;
    }

    const propertyId = extractAirbnbPropertyId(url);
    if (propertyId) {
      setAirbnbPropertyId(propertyId);
    } else {
      setUrlError('Não foi possível identificar o ID do anúncio neste link');
    }
  };

  /**
   * Step 1 → Step 2
   */
  const handleProceedToImport = () => {
    if (!airbnbPropertyId) {
      setUrlError('Forneça uma URL válida do Airbnb');
      return;
    }
    setActiveStep(1);
  };

  /**
   * Step 2: Import data from Airbnb and CREATE property immediately
   */
  const handleImportAndCreate = async () => {
    if (!airbnbUrl || !tenantId) return;

    // Prevent duplicate creation if property already exists
    if (createdPropertyId) {
      logger.warn('[PropertyImportWizard] Property already created, skipping', {
        propertyId: createdPropertyId,
      });
      setActiveStep(2); // Just move to next step
      return;
    }

    setLoading(true);
    setImportError(null);

    try {
      // 1. Import from Airbnb
      const importResult = await importFromAirbnbUrl(airbnbUrl);

      if (!importResult.success || !importResult.data) {
        throw new Error(importResult.error || 'Erro ao importar do Airbnb');
      }

      setImportedData(importResult.data);

      // 2. Map to our Property format
      const mapped = mapAirbnbToProperty(importResult.data, tenantId);
      const validation = validateMappedProperty(mapped);

      if (!validation.valid) {
        throw new Error('Dados inválidos: ' + validation.errors.join(', '));
      }

      setMappedProperty(mapped);

      // 3. Create property immediately with basic data
      const token = await getFirebaseToken();
      if (!token) throw new Error('Token não disponível');

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(mapped),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar propriedade');
      }

      const createdProperty = await response.json();

      // API pode retornar: { data: "id-string" } ou { data: { id: "id-string" } }
      const propertyId = typeof createdProperty.data === 'string'
        ? createdProperty.data
        : createdProperty.data?.id;

      if (!propertyId) {
        logger.error('[PropertyImportWizard] Property ID not found in response', {
          response: createdProperty,
          dataType: typeof createdProperty.data,
        });
        throw new Error('ID da propriedade não retornado');
      }

      logger.info('[PropertyImportWizard] Property ID extracted', {
        propertyId,
        dataType: typeof createdProperty.data,
      });

      setCreatedPropertyId(propertyId);

      logger.info('[PropertyImportWizard] Property created', {
        propertyId,
        propertyName: mapped.title,
      });

      // Move to Step 3 (iCal sync)
      setActiveStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setImportError(errorMessage);
      logger.error('[PropertyImportWizard] Import and create failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Validate and preview iCal
   */
  const handleICalUrlChange = async (url: string) => {
    setICalUrl(url);
    setICalError(null);
    setICalPreview(null);

    if (!url.trim()) return;

    if (!isValidICalUrl(url)) {
      setICalError('URL inválida. Deve ser HTTPS e terminar com .ics');
      return;
    }

    // Fetch preview automatically
    await handleFetchICalPreview(url);
  };

  /**
   * Fetch iCal preview
   */
  const handleFetchICalPreview = async (url?: string) => {
    const urlToFetch = url || iCalUrl;

    if (!urlToFetch) return;

    setICalPreviewLoading(true);
    setICalError(null);

    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Token não disponível');

      const response = await fetch('/api/calendar/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ iCalUrl: urlToFetch }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar preview');
      }

      const previewData = await response.json();
      setICalPreview(previewData.data);

      logger.info('[PropertyImportWizard] iCal preview loaded', {
        totalReservations: previewData.data.futureReservations,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setICalError(errorMessage);
      logger.error('[PropertyImportWizard] iCal preview failed', { error: errorMessage });
    } finally {
      setICalPreviewLoading(false);
    }
  };

  /**
   * Step 3: Create reservations from iCal
   */
  const handleCreateReservations = async () => {
    if (!createdPropertyId) {
      setICalError('ID da propriedade não encontrado');
      logger.error('[PropertyImportWizard] Property ID not found', { createdPropertyId });
      return;
    }

    // Prevent duplicate reservation creation
    if (reservationsCreated > 0) {
      logger.warn('[PropertyImportWizard] Reservations already created, skipping', {
        reservationsCreated,
      });
      setActiveStep(3); // Just move to next step
      return;
    }

    setCreatingReservations(true);

    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Token não disponível');

      logger.info('[PropertyImportWizard] Starting reservation creation', {
        propertyId: createdPropertyId,
        iCalUrl: iCalUrl.substring(0, 50),
      });

      // Configure iCal sync
      const configResponse = await fetch('/api/calendar/sync/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId: createdPropertyId,
          iCalUrl,
          source: 'airbnb',
          syncFrequency: 'daily',
        }),
      });

      if (!configResponse.ok) {
        const errorData = await configResponse.json();
        throw new Error(errorData.message || 'Erro ao configurar sincronização');
      }

      // Trigger sync to create reservations
      const syncResponse = await fetch(`/api/calendar/sync/${createdPropertyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.message || 'Erro ao criar reservas');
      }

      const syncResult = await syncResponse.json();
      const eventsImported = syncResult.result?.eventsImported || 0;

      setReservationsCreated(eventsImported);

      logger.info('[PropertyImportWizard] Reservations created successfully', {
        propertyId: createdPropertyId,
        eventsImported,
      });

      // Move to Step 4 (Export iCal)
      setActiveStep(3);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setICalError(errorMessage);
      logger.error('[PropertyImportWizard] Reservation creation failed', {
        error: errorMessage,
        propertyId: createdPropertyId,
      });
    } finally {
      setCreatingReservations(false);
    }
  };

  /**
   * Step 3: Skip iCal and go to export
   */
  const handleSkipICal = () => {
    setActiveStep(3);
  };

  /**
   * Step 4: Generate iCal export token and URL
   */
  const handleGenerateICalToken = async () => {
    if (!createdPropertyId) {
      setExportError('ID da propriedade não encontrado');
      return;
    }

    // If token already generated, just proceed
    if (iCalExportUrl) {
      setActiveStep(4);
      return;
    }

    setGeneratingToken(true);
    setExportError(null);

    try {
      const token = await getFirebaseToken();
      if (!token) throw new Error('Token não disponível');

      const response = await fetch(`/api/properties/${createdPropertyId}/ical/generate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao gerar token');
      }

      const tokenData = await response.json();

      setICalExportToken(tokenData.token);
      setICalExportUrl(tokenData.feedUrl);

      logger.info('[PropertyImportWizard] iCal export token generated', {
        propertyId: createdPropertyId,
        feedUrl: tokenData.feedUrl.substring(0, 50),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setExportError(errorMessage);
      logger.error('[PropertyImportWizard] Token generation failed', { error: errorMessage });
    } finally {
      setGeneratingToken(false);
    }
  };

  /**
   * Step 4: Copy iCal URL to clipboard
   */
  const handleCopyICalUrl = async () => {
    if (!iCalExportUrl) return;

    try {
      await navigator.clipboard.writeText(iCalExportUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 3000);
    } catch (err) {
      logger.error('[PropertyImportWizard] Failed to copy URL', { error: err });
    }
  };

  /**
   * Step 4: Skip export and go to review
   */
  const handleSkipExport = () => {
    setActiveStep(4);
  };

  /**
   * Step 5: Open property review dialog
   */
  const handleOpenReviewDialog = () => {
    setShowReviewDialog(true);
  };

  /**
   * Step 5: Property review completed (property updated)
   */
  const handlePropertyReviewComplete = async (updatedData: any) => {
    try {
      setLoading(true);

      const token = await getFirebaseToken();
      if (!token) throw new Error('Token não disponível');

      // Update property
      const response = await fetch(`/api/properties/${createdPropertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar propriedade');
      }

      setShowReviewDialog(false);

      logger.info('[PropertyImportWizard] Property updated', {
        propertyId: createdPropertyId,
      });

      // Move to success step (Step 6)
      setActiveStep(5);
      setResult({
        success: true,
        propertyId: createdPropertyId,
        propertyName: mappedProperty?.title || mappedProperty?.name,
        reservationsCreated,
        iCalConfigured: !!iCalUrl,
        iCalExported: !!iCalExportUrl,
      });

      if (onSuccess) {
        onSuccess({
          success: true,
          propertyId: createdPropertyId,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setShowReviewDialog(false);
      setImportError(errorMessage);
      logger.error('[PropertyImportWizard] Property update failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 5: Skip review and go to success
   */
  const handleSkipReview = () => {
    setActiveStep(5);
    setResult({
      success: true,
      propertyId: createdPropertyId,
      propertyName: mappedProperty?.title || mappedProperty?.name,
      reservationsCreated,
      iCalConfigured: !!iCalUrl,
      iCalExported: !!iCalExportUrl,
    });

    if (onSuccess) {
      onSuccess({
        success: true,
        propertyId: createdPropertyId,
      });
    }
  };

  /**
   * Open Airbnb settings
   */
  const handleOpenAirbnbSettings = () => {
    if (airbnbPropertyId) {
      const url = generateAirbnbCalendarSettingsUrl(airbnbPropertyId);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * Reset and close
   */
  const handleClose = () => {
    if (!loading && !creatingReservations) {
      // Reset state
      setActiveStep(0);
      setAirbnbUrl('');
      setAirbnbPropertyId(null);
      setUrlError(null);
      setImportedData(null);
      setMappedProperty(null);
      setImportError(null);
      setCreatedPropertyId(null);
      setICalUrl('');
      setICalError(null);
      setICalPreview(null);
      setReservationsCreated(0);
      setICalExportUrl(null);
      setICalExportToken(null);
      setExportError(null);
      setUrlCopied(false);
      setShowReviewDialog(false);
      setResult(null);

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
        disableEscapeKeyDown={loading || creatingReservations}
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
          },
        }}
      >
        {/* Compact Header */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Home sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Importar do Airbnb
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {wizardSteps[activeStep]}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} disabled={loading || creatingReservations}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {/* Progress indicator */}
          {(loading || creatingReservations) && (
            <LinearProgress
              sx={{
                mb: 3,
                borderRadius: 1,
                height: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              }}
            />
          )}

          {/* Stepper */}
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* STEP 0: Airbnb URL */}
            <Step>
              <StepLabel>Cole a URL do anúncio no Airbnb</StepLabel>
              <StepContent>
                <TextField
                  fullWidth
                  placeholder="https://www.airbnb.com.br/rooms/..."
                  value={airbnbUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  error={!!urlError}
                  helperText={urlError}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <LinkIcon
                        sx={{
                          mr: 1.5,
                          color: airbnbPropertyId ? 'success.main' : 'action.active',
                        }}
                      />
                    ),
                  }}
                  autoFocus
                />

                {airbnbPropertyId && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                    URL válida! ID: <strong>{airbnbPropertyId}</strong>
                  </Alert>
                )}

                <Button
                  variant="contained"
                  onClick={handleProceedToImport}
                  disabled={!airbnbPropertyId || loading}
                  endIcon={<NavigateNext />}
                >
                  Continuar
                </Button>
              </StepContent>
            </Step>

            {/* STEP 1: Import & Create Property */}
            <Step>
              <StepLabel>Importar e criar imóvel</StepLabel>
              <StepContent>
                {!createdPropertyId && !importError && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Vamos buscar e criar o imóvel com os dados do Airbnb
                    </Typography>
                    <Box display="flex" gap={2}>
                      <Button onClick={() => setActiveStep(0)} disabled={loading}>
                        Voltar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleImportAndCreate}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <CloudSync />}
                      >
                        {loading ? 'Criando...' : 'Importar e Criar'}
                      </Button>
                    </Box>
                  </Box>
                )}

                {createdPropertyId && (
                  <Box>
                    <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                      Imóvel criado com sucesso!
                    </Alert>

                    {mappedProperty && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.04),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          {mappedProperty.title}
                        </Typography>
                        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {mappedProperty.bedrooms} quarto(s) • {mappedProperty.bathrooms} banheiro(s) • {mappedProperty.maxGuests} hóspedes
                          </Typography>
                        </Box>
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2" color="text.secondary">
                            {mappedProperty.photos?.length || 0} foto(s) importada(s)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {mappedProperty.amenities?.length || 0} comodidade(s)
                          </Typography>
                          <Typography
                            variant="body2"
                            color={mappedProperty.basePrice > 0 ? 'success.main' : 'warning.main'}
                            fontWeight={600}
                          >
                            {mappedProperty.basePrice > 0
                              ? `R$ ${mappedProperty.basePrice} / noite`
                              : 'Preço a definir'}
                          </Typography>
                        </Box>
                        {mappedProperty.needsPriceConfiguration && (
                          <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                            O imóvel ficará inativo até você definir o preço na etapa de revisão.
                          </Typography>
                        )}
                      </Paper>
                    )}

                    <Box display="flex" gap={2}>
                      <Button onClick={() => setActiveStep(0)} disabled={loading}>
                        Voltar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(2)}
                        disabled={loading}
                        endIcon={<NavigateNext />}
                      >
                        Continuar
                      </Button>
                    </Box>
                  </Box>
                )}

                {importError && (
                  <Box>
                    <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                      {importError}
                    </Alert>
                    <Box display="flex" gap={2}>
                      <Button onClick={() => setActiveStep(0)} disabled={loading}>
                        Voltar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleImportAndCreate}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <CloudSync />}
                      >
                        Tentar Novamente
                      </Button>
                    </Box>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* STEP 2: iCal Sync */}
            <Step>
              <StepLabel>Sincronizar calendário (opcional)</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Importe reservas do Airbnb e atualize as disponibilidades
                </Typography>

                {/* Direct Airbnb button */}
                <Button
                  variant="outlined"
                  startIcon={<OpenInNew />}
                  onClick={handleOpenAirbnbSettings}
                  disabled={!airbnbPropertyId}
                  sx={{ mb: 2 }}
                  fullWidth
                >
                  Abrir Airbnb para obter link iCal
                </Button>

                {/* iCal URL field */}
                <TextField
                  fullWidth
                  placeholder="https://www.airbnb.com/calendar/ical/12345678.ics?s=..."
                  value={iCalUrl}
                  onChange={(e) => handleICalUrlChange(e.target.value)}
                  error={!!iCalError}
                  helperText={iCalError || 'Cole o link do calendário iCal'}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <CalendarMonth
                        sx={{ mr: 1, color: iCalUrl && !iCalError ? 'success.main' : 'action.active' }}
                      />
                    ),
                  }}
                />

                {/* Loading preview */}
                {iCalPreviewLoading && (
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Carregando preview...</Typography>
                  </Box>
                )}

                {/* Preview */}
                {iCalPreview && iCalPreview.futureReservations > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Reservas encontradas: {iCalPreview.futureReservations}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      As seguintes reservas futuras serão importadas:
                    </Typography>
                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {iCalPreview.reservations?.slice(0, 10).map((res: any, idx: number) => (
                        <ListItem key={idx} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <NightsStay fontSize="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${format(new Date(res.checkIn), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(res.checkOut), 'dd/MM/yyyy', { locale: ptBR })}`}
                            secondary={`${res.nights} noite(s) • ${res.summary}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                    {iCalPreview.reservations?.length > 10 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        ...e mais {iCalPreview.reservations.length - 10} reserva(s)
                      </Typography>
                    )}
                  </Paper>
                )}

                {/* No reservations found */}
                {iCalPreview && iCalPreview.futureReservations === 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Nenhuma reserva futura encontrada no calendário
                  </Alert>
                )}

                {/* Actions */}
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button onClick={() => setActiveStep(1)} disabled={creatingReservations}>
                    Voltar
                  </Button>
                  <Button variant="outlined" onClick={handleSkipICal} disabled={creatingReservations}>
                    Pular
                  </Button>
                  {iCalUrl && iCalPreview && iCalPreview.futureReservations > 0 && (
                    <Button
                      variant="contained"
                      onClick={handleCreateReservations}
                      disabled={creatingReservations || !!iCalError}
                      startIcon={
                        creatingReservations ? <CircularProgress size={20} /> : <CheckCircle />
                      }
                    >
                      {creatingReservations
                        ? 'Criando...'
                        : `Criar ${iCalPreview.futureReservations} reserva(s)`}
                    </Button>
                  )}
                  {/* Fallback: If user came back from Step 4 */}
                  {reservationsCreated > 0 && !creatingReservations && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(3)}
                      endIcon={<NavigateNext />}
                    >
                      Continuar para Export
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>

            {/* STEP 4: Export iCal */}
            <Step>
              <StepLabel>Exportar iCal do AlugaZap</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gere a URL do iCal do AlugaZap para importar no Airbnb/Booking e manter sincronização bidirecional
                </Typography>

                {!iCalExportUrl && !generatingToken && (
                  <Alert severity="info" icon={<FileDownload />} sx={{ mb: 3 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Por que exportar?
                    </Typography>
                    <Typography variant="caption">
                      • Reservas feitas no AlugaZap bloqueiam automaticamente no Airbnb<br />
                      • Evita overbooking (dupla reserva)<br />
                      • Sincronização automática a cada hora
                    </Typography>
                  </Alert>
                )}

                {exportError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {exportError}
                  </Alert>
                )}

                {generatingToken && (
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2">Gerando URL segura...</Typography>
                  </Box>
                )}

                {iCalExportUrl && (
                  <Box>
                    <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                      ✓ URL de exportação gerada com sucesso!
                    </Alert>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        mb: 3,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} color="text.secondary" gutterBottom display="block">
                        URL DO ICAL DO ALUGAZAP:
                      </Typography>
                      <Box display="flex" gap={1} alignItems="center">
                        <TextField
                          fullWidth
                          value={iCalExportUrl}
                          size="small"
                          InputProps={{
                            readOnly: true,
                            sx: {
                              fontFamily: 'monospace',
                              fontSize: '12px',
                            },
                          }}
                        />
                        <Button
                          variant="contained"
                          onClick={handleCopyICalUrl}
                          startIcon={<ContentCopy />}
                          sx={{ minWidth: '120px' }}
                        >
                          {urlCopied ? '✓ Copiado' : 'Copiar'}
                        </Button>
                      </Box>
                    </Paper>

                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Como importar no Airbnb:
                      </Typography>
                      <Typography variant="caption" component="div">
                        1. Copie a URL acima<br />
                        2. Acesse as configurações de calendário do Airbnb<br />
                        3. Clique em "Importar calendário"<br />
                        4. Cole a URL e salve
                      </Typography>
                    </Alert>
                  </Box>
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button onClick={() => setActiveStep(2)} disabled={generatingToken}>
                    Voltar
                  </Button>
                  <Button variant="outlined" onClick={handleSkipExport} disabled={generatingToken}>
                    Pular Export
                  </Button>
                  {!iCalExportUrl && (
                    <Button
                      variant="contained"
                      onClick={handleGenerateICalToken}
                      disabled={generatingToken}
                      startIcon={generatingToken ? <CircularProgress size={20} /> : <FileDownload />}
                    >
                      {generatingToken ? 'Gerando...' : 'Gerar URL de Export'}
                    </Button>
                  )}
                  {iCalExportUrl && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(4)}
                      endIcon={<NavigateNext />}
                      color="success"
                    >
                      Continuar para Revisão
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>

            {/* STEP 5: Review Property */}
            <Step>
              <StepLabel>Revisar detalhes do imóvel</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {reservationsCreated > 0
                    ? `${reservationsCreated} reserva(s) criada(s)! Revise os detalhes do imóvel antes de finalizar.`
                    : 'Revise os detalhes do imóvel antes de finalizar.'}
                </Typography>

                {reservationsCreated > 0 && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                    ✓ Disponibilidades atualizadas com as reservas importadas
                  </Alert>
                )}

                <Box display="flex" gap={2} flexWrap="wrap">
                  <Button onClick={() => setActiveStep(3)} disabled={loading}>
                    Voltar
                  </Button>
                  <Button variant="outlined" onClick={handleSkipReview} disabled={loading}>
                    Pular Revisão
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleOpenReviewDialog}
                    disabled={loading}
                    startIcon={<Edit />}
                  >
                    Revisar e Editar
                  </Button>
                  {/* Fallback: If user came back from Step 6 */}
                  {result?.success && (
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(5)}
                      endIcon={<NavigateNext />}
                      color="success"
                    >
                      Ver Resultado
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>

            {/* STEP 6: Success */}
            <Step>
              <StepLabel>Concluído!</StepLabel>
              <StepContent>
                {result?.success ? (
                  <Box>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)}, ${alpha(theme.palette.success.main, 0.05)})`,
                        border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        borderRadius: 2,
                        textAlign: 'center',
                        mb: 3,
                      }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.4)}`,
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
                      </Box>

                      <Typography variant="h5" fontWeight={700} color="success.main" gutterBottom>
                        Importação Concluída!
                      </Typography>

                      <Typography variant="h6" fontWeight={500} sx={{ mb: 2 }}>
                        {result.propertyName}
                      </Typography>

                      <Box display="flex" justifyContent="center" gap={3} sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="h4" fontWeight={700} color="success.main">
                            ✓
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Imóvel Criado
                          </Typography>
                        </Box>

                        {result.reservationsCreated > 0 && (
                          <Box>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                              {result.reservationsCreated}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Reservas Criadas
                            </Typography>
                          </Box>
                        )}

                        {result.iCalConfigured && (
                          <Box>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                              ✓
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Sync Configurado
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {result.iCalConfigured && (
                        <Alert
                          severity="success"
                          icon={<CalendarMonth />}
                          sx={{
                            backgroundColor: alpha(theme.palette.success.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                          }}
                        >
                          Sincronização automática ativa • Disponibilidades atualizadas
                        </Alert>
                      )}
                    </Paper>

                    <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleClose}
                        startIcon={<Done />}
                        fullWidth
                        color="success"
                      >
                        Concluir
                      </Button>

                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => router.push(`/dashboard/properties/${result.propertyId}`)}
                        startIcon={<Visibility />}
                        fullWidth
                      >
                        Ver Imóvel
                      </Button>
                    </Box>
                  </Box>
                ) : null}
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Property Review Dialog */}
      {mappedProperty && createdPropertyId && (
        <PropertyCompletionDialog
          open={showReviewDialog}
          onClose={() => {
            setShowReviewDialog(false);
          }}
          propertyData={mappedProperty}
          onComplete={handlePropertyReviewComplete}
        />
      )}
    </>
  );
}
