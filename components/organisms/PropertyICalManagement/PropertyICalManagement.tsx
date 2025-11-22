'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  LinearProgress,
  Collapse,
  Paper,
  Step,
  Stepper,
  StepLabel,
  StepContent,
  Grid,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ContentCopy,
  Sync,
  OpenInNew,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  Download,
  Upload,
  CloudSync,
  Refresh,
  Visibility,
  VisibilityOff,
  Done,
  Warning,
  ArrowForward,
  CloudDone,
  Schedule,
  Analytics,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { logger } from '@/lib/utils/logger';
import {
  extractAirbnbPropertyId,
  generateAirbnbCalendarSettingsUrl,
  isValidICalUrl,
  parseAirbnbUrl,
  isValidAirbnbUrl,
} from '@/lib/utils/airbnb-helpers';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import AirbnbICalHelper from '@/components/organisms/AirbnbICalHelper/AirbnbICalHelper';

interface PropertyICalManagementProps {
  propertyId: string;
  propertyName: string;
  currentData?: {
    iCalExportToken?: string;
    iCalImportUrl?: string;
    airbnbPropertyId?: string;
    iCalLastSync?: Date;
    externalCalendarUrls?: Array<{
      source: 'airbnb' | 'booking' | 'vrbo' | 'other';
      url: string;
      isActive: boolean;
      lastSync?: Date;
    }>;
  };
  onUpdate?: () => void;
}

export const PropertyICalManagementV2: React.FC<PropertyICalManagementProps> = ({
  propertyId,
  propertyName,
  currentData,
  onUpdate,
}) => {
  const { getFirebaseToken } = useAuth();
  const { tenantId } = useTenant();
  const theme = useTheme();

  // Export state
  const [exportFeedUrl, setExportFeedUrl] = useState<string>('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [showExportUrl, setShowExportUrl] = useState(false);

  // Import state
  const [activeStep, setActiveStep] = useState(0);
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [extractedAirbnbId, setExtractedAirbnbId] = useState<string | null>(
    currentData?.airbnbPropertyId || null
  );
  const [iCalImportUrl, setICalImportUrl] = useState(currentData?.iCalImportUrl || '');
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Dialog state
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [showSyncDetailsDialog, setShowSyncDetailsDialog] = useState(false);
  const [lastSyncDetails, setLastSyncDetails] = useState<any>(null);
  const [showICalHelper, setShowICalHelper] = useState(false);

  // Validation state
  const [airbnbUrlError, setAirbnbUrlError] = useState<string | null>(null);
  const [iCalUrlError, setICalUrlError] = useState<string | null>(null);

  useEffect(() => {
    // Load current export URL if token exists
    if (currentData?.iCalExportToken && tenantId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/ical/${tenantId}/${propertyId}?token=${currentData.iCalExportToken}`;
      setExportFeedUrl(url);
    }
  }, [currentData, tenantId, propertyId]);

  // Real-time validation for Airbnb URL
  useEffect(() => {
    if (!airbnbUrl) {
      setAirbnbUrlError(null);
      return;
    }

    const timer = setTimeout(() => {
      if (!isValidAirbnbUrl(airbnbUrl)) {
        setAirbnbUrlError('URL do Airbnb inválida. Deve conter /rooms/[ID]');
      } else {
        setAirbnbUrlError(null);
        // Auto-extract ID
        const urlInfo = parseAirbnbUrl(airbnbUrl);
        if (urlInfo.propertyId) {
          setExtractedAirbnbId(urlInfo.propertyId);
          // Auto-save Airbnb ID
          saveAirbnbPropertyId(urlInfo.propertyId);
          setActiveStep(1); // Move to next step
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [airbnbUrl]);

  // Real-time validation for iCal URL
  useEffect(() => {
    if (!iCalImportUrl) {
      setICalUrlError(null);
      return;
    }

    const timer = setTimeout(() => {
      if (!isValidICalUrl(iCalImportUrl)) {
        setICalUrlError('URL do iCal inválida. Deve ser HTTPS e terminar com .ics');
      } else {
        setICalUrlError(null);
        setActiveStep(2); // Move to next step
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [iCalImportUrl]);

  /**
   * Auto-save Airbnb Property ID
   */
  const saveAirbnbPropertyId = async (airbnbId: string) => {
    try {
      const token = await getFirebaseToken();
      const services = new TenantServiceFactory(tenantId!);

      await services.properties.update(propertyId, {
        airbnbPropertyId: airbnbId,
        updatedAt: new Date(),
      });

      logger.info('Airbnb property ID saved', { propertyId, airbnbId });
      showSnackbar('ID do Airbnb salvo automaticamente!', 'success');
    } catch (error) {
      logger.error('Error saving Airbnb ID', { error });
    }
  };

  /**
   * Show snackbar message
   */
  const showSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  /**
   * Copy to clipboard
   */
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSnackbar('✓ Copiado para área de transferência!', 'success');
    } catch (error) {
      logger.error('Error copying to clipboard', { error });
      showSnackbar('Erro ao copiar', 'error');
    }
  };

  /**
   * Generate new export token
   */
  const handleGenerateExportToken = async () => {
    try {
      setGeneratingToken(true);
      const token = await getFirebaseToken();

      const response = await fetch(`/api/properties/${propertyId}/ical/generate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      setExportFeedUrl(data.feedUrl);
      showSnackbar('✓ Link de exportação gerado com sucesso!', 'success');
      logger.info('iCal export token generated', { propertyId });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      logger.error('Error generating export token', { error });
      showSnackbar('Erro ao gerar token de exportação', 'error');
    } finally {
      setGeneratingToken(false);
    }
  };

  /**
   * Configure iCal import
   */
  const handleConfigureImport = async () => {
    if (!iCalImportUrl) {
      showSnackbar('URL do iCal é obrigatória', 'warning');
      return;
    }

    if (iCalUrlError) {
      showSnackbar('Corrija os erros antes de continuar', 'warning');
      return;
    }

    try {
      setImporting(true);
      setSyncProgress(10);
      const token = await getFirebaseToken();

      setSyncProgress(30);

      const response = await fetch('/api/calendar/sync/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId,
          iCalUrl: iCalImportUrl,
          source: extractedAirbnbId ? 'airbnb' : 'other',
          syncFrequency: 'daily',
        }),
      });

      setSyncProgress(60);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to configure import');
      }

      setSyncProgress(100);
      showSnackbar('✓ Importação configurada! Sincronização inicial em andamento...', 'success');
      setActiveStep(3); // Move to completion step
      logger.info('iCal import configured', { propertyId });

      setTimeout(() => {
        if (onUpdate) {
          onUpdate();
        }
      }, 1000);
    } catch (error) {
      logger.error('Error configuring import', { error });
      showSnackbar(
        error instanceof Error ? error.message : 'Erro ao configurar importação',
        'error'
      );
    } finally {
      setImporting(false);
      setSyncProgress(0);
    }
  };

  /**
   * Trigger manual sync
   */
  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setSyncProgress(10);
      const token = await getFirebaseToken();

      setSyncProgress(30);

      const response = await fetch(`/api/calendar/sync/${propertyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      setSyncProgress(70);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncProgress(100);
      setLastSyncDetails(data.result);
      showSnackbar(
        `✓ Sincronização concluída! ${data.result?.eventsImported || 0} eventos importados.`,
        'success'
      );
      setShowSyncDetailsDialog(true);
      logger.info('Manual sync completed', { propertyId });

      setTimeout(() => {
        if (onUpdate) {
          onUpdate();
        }
      }, 1000);
    } catch (error) {
      logger.error('Error during manual sync', { error });
      showSnackbar(
        error instanceof Error ? error.message : 'Erro ao sincronizar',
        'error'
      );
    } finally {
      setSyncing(false);
      setSyncProgress(0);
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Left Column - Export */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 3,
              height: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Header */}
                <Box>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                      }}
                    >
                      <Download sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Exportar para Airbnb
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Locai → Airbnb
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Alert
                  severity="info"
                  icon={<Info />}
                  sx={{
                    borderRadius: 2,
                    '& .MuiAlert-message': { width: '100%' },
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    Bloqueie datas no Airbnb automaticamente
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cole este link na seção "Sincronização de Calendários" do Airbnb
                  </Typography>
                </Alert>

                {!exportFeedUrl ? (
                  <Button
                    variant="contained"
                    onClick={handleGenerateExportToken}
                    disabled={generatingToken}
                    startIcon={generatingToken ? <CircularProgress size={20} /> : <CloudSync />}
                    size="large"
                    fullWidth
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }}
                  >
                    {generatingToken ? 'Gerando Link...' : 'Gerar Link de Exportação'}
                  </Button>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Link de Exportação iCal"
                      value={exportFeedUrl}
                      type={showExportUrl ? 'text' : 'password'}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title={showExportUrl ? 'Ocultar' : 'Mostrar'}>
                                <IconButton
                                  onClick={() => setShowExportUrl(!showExportUrl)}
                                  edge="end"
                                  size="small"
                                >
                                  {showExportUrl ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Copiar">
                                <IconButton
                                  onClick={() => handleCopyToClipboard(exportFeedUrl)}
                                  edge="end"
                                  size="small"
                                  color="primary"
                                >
                                  <ContentCopy />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={() => setShowInstructionsDialog(true)}
                        startIcon={<Info />}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Como Usar
                      </Button>
                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={handleGenerateExportToken}
                        disabled={generatingToken}
                        startIcon={<Refresh />}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Regenerar
                      </Button>
                    </Stack>

                    <Chip
                      icon={<CheckCircle />}
                      label="Link Ativo"
                      color="success"
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Import */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              border: `2px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              borderRadius: 3,
              height: '100%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Header */}
                <Box>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`,
                      }}
                    >
                      <Upload sx={{ color: 'white', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Importar do Airbnb
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Airbnb → Locai
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Alert
                  severity="info"
                  icon={<Info />}
                  sx={{
                    borderRadius: 2,
                    '& .MuiAlert-message': { width: '100%' },
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    Sincronize reservas do Airbnb
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reservas externas serão criadas automaticamente no Locai
                  </Typography>
                </Alert>

                {/* Stepper */}
                <Stepper activeStep={activeStep} orientation="vertical">
                  <Step>
                    <StepLabel
                      optional={
                        extractedAirbnbId && (
                          <Chip
                            icon={<CheckCircle />}
                            label={`ID: ${extractedAirbnbId.substring(0, 8)}...`}
                            size="small"
                            color="success"
                            sx={{ mt: 0.5 }}
                          />
                        )
                      }
                    >
                      Cole o link do Airbnb
                    </StepLabel>
                    <StepContent>
                      <TextField
                        fullWidth
                        placeholder="https://www.airbnb.com.br/rooms/..."
                        value={airbnbUrl}
                        onChange={(e) => setAirbnbUrl(e.target.value)}
                        error={!!airbnbUrlError}
                        helperText={airbnbUrlError || 'Ex: https://www.airbnb.com.br/rooms/123456'}
                        sx={{
                          mb: 2,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </StepContent>
                  </Step>

                  <Step>
                    <StepLabel
                      optional={
                        iCalImportUrl && !iCalUrlError && (
                          <Chip
                            icon={<CheckCircle />}
                            label="URL Válida"
                            size="small"
                            color="success"
                            sx={{ mt: 0.5 }}
                          />
                        )
                      }
                    >
                      Cole o link iCal do Airbnb
                    </StepLabel>
                    <StepContent>
                      <TextField
                        fullWidth
                        placeholder="https://www.airbnb.com.br/calendar/ical/..."
                        value={iCalImportUrl}
                        onChange={(e) => setICalImportUrl(e.target.value)}
                        error={!!iCalUrlError}
                        helperText={iCalUrlError || 'Obtenha na seção "Sincronização de Calendários"'}
                        sx={{
                          mb: 1,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setShowICalHelper(true)}
                        disabled={!extractedAirbnbId}
                        startIcon={<Info />}
                        sx={{ mb: 2 }}
                      >
                        Como configurar sincronização?
                      </Button>
                      {extractedAirbnbId && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<OpenInNew />}
                          onClick={() => {
                            const url = generateAirbnbCalendarSettingsUrl(extractedAirbnbId);
                            window.open(url, '_blank');
                          }}
                          sx={{ borderRadius: 2, textTransform: 'none', mb: 2 }}
                        >
                          Abrir Configurações do Airbnb
                        </Button>
                      )}
                    </StepContent>
                  </Step>

                  <Step>
                    <StepLabel>Configurar Importação</StepLabel>
                    <StepContent>
                      {importing && (
                        <Box sx={{ mb: 2 }}>
                          <LinearProgress variant="determinate" value={syncProgress} sx={{ mb: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            {syncProgress < 50 ? 'Validando...' : 'Configurando sincronização...'}
                          </Typography>
                        </Box>
                      )}
                      <Button
                        variant="contained"
                        onClick={handleConfigureImport}
                        disabled={importing || !iCalImportUrl || !!iCalUrlError}
                        startIcon={importing ? <CircularProgress size={20} /> : <CloudSync />}
                        fullWidth
                        sx={{
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        {importing ? 'Configurando...' : 'Configurar Importação'}
                      </Button>
                    </StepContent>
                  </Step>

                  <Step>
                    <StepLabel>Pronto!</StepLabel>
                    <StepContent>
                      <Alert severity="success" icon={<CloudDone />} sx={{ borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2" fontWeight={500}>
                          Sincronização configurada com sucesso!
                        </Typography>
                        <Typography variant="caption">
                          Suas reservas do Airbnb serão sincronizadas automaticamente.
                        </Typography>
                      </Alert>
                      <Button
                        variant="outlined"
                        onClick={handleManualSync}
                        disabled={syncing}
                        startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
                        fullWidth
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                      </Button>
                    </StepContent>
                  </Step>
                </Stepper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Last Sync Info */}
        {currentData?.iCalLastSync && (
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                borderRadius: 3,
                background: alpha(theme.palette.success.main, 0.05),
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Schedule color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      Última Sincronização
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(currentData.iCalLastSync).toLocaleString('pt-BR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }} />
                  {lastSyncDetails && (
                    <Button
                      size="small"
                      startIcon={<Analytics />}
                      onClick={() => setShowSyncDetailsDialog(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      Ver Detalhes
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Instructions Dialog */}
      <Dialog
        open={showInstructionsDialog}
        onClose={() => setShowInstructionsDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Info color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Como Importar no Airbnb
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2">
              1. Acesse{' '}
              <strong>
                Anúncios → Seu Anúncio → Disponibilidade → Sincronização de Calendários
              </strong>
            </Typography>
            <Typography variant="body2">
              2. Clique em <strong>"Importar Calendário"</strong>
            </Typography>
            <Typography variant="body2">
              3. Cole o <strong>Link de Exportação</strong> gerado acima
            </Typography>
            <Typography variant="body2">
              4. Dê um nome ao calendário (ex: "Locai") e salve
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={500}>
                Pronto! O Airbnb sincronizará automaticamente as datas bloqueadas.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstructionsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Sync Details Dialog */}
      <Dialog
        open={showSyncDetailsDialog}
        onClose={() => setShowSyncDetailsDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Analytics color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Detalhes da Sincronização
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {lastSyncDetails && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="h4" color="primary" fontWeight={700}>
                    {lastSyncDetails.eventsImported || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Eventos Importados
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="h4" color="success.main" fontWeight={700}>
                    {lastSyncDetails.periodsCreated || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Períodos Criados
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSyncDetailsDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: 2,
            fontWeight: 500,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ✅ Airbnb iCal Helper Dialog */}
      <AirbnbICalHelper
        open={showICalHelper}
        onClose={() => setShowICalHelper(false)}
        airbnbPropertyId={extractedAirbnbId}
        onICalUrlProvided={(url) => {
          setICalImportUrl(url);
          setShowICalHelper(false);
        }}
      />
    </Box>
  );
};

export default PropertyICalManagementV2;
